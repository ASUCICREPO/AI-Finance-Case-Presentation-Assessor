"""AI Finance Case Presentation Assessor — Bedrock AgentCore voice agent.

Handles bidirectional voice streaming via Nova 2 Sonic for stakeholder Q&A
sessions. Evaluates student understanding of group financial case analyses
through persona-based questioning.

Key differences from Real Estate Program:
- Workbook-aware: Loads and references parsed Excel data during questioning
- Assessment-focused: Generates rubric-based scoring after sessions
- Multi-category evaluation: Financial reasoning, assumption validation, etc.
"""

from starlette.websockets import WebSocket, WebSocketDisconnect
from strands.experimental.bidi import BidiAgent
from strands.experimental.bidi.types.events import (
    BidiAudioInputEvent,
    BidiAudioStreamEvent,
    BidiTextInputEvent,
    BidiTranscriptStreamEvent,
    BidiInterruptionEvent,
    BidiResponseCompleteEvent,
)
from strands.experimental.bidi.types.io import BidiInput, BidiOutput, BidiOutputEvent
from strands.experimental.bidi.models import BidiNovaSonicModel
from strands.experimental.hooks.events import BidiMessageAddedEvent
from strands.hooks.registry import HookRegistry
from strands.experimental.bidi.tools import stop_conversation
from bedrock_agentcore import BedrockAgentCoreApp, RequestContext, PingStatus
from typing import Literal
from datetime import datetime, timezone
import asyncio
import boto3
import aioboto3
import os
import json
import re
import time
from collections import deque
from jinja2 import Template
from opentelemetry import baggage, context as otel_context

# ── Configuration ────────────────────────────────────────────────────
VALID_VOICES = ["matthew", "tiffany", "amy", "ambre", "florian",
                "beatrice", "lorenzo", "greta", "lennart", "lupe", "carlos"]
DEFAULT_VOICE_ID = os.getenv("VOICE_ID", "matthew")
if DEFAULT_VOICE_ID not in VALID_VOICES:
    raise ValueError(f"Invalid VOICE_ID '{DEFAULT_VOICE_ID}'. Must be one of: {VALID_VOICES}.")

REGION = os.getenv("AWS_REGION", "us-east-1")
MODEL_ID = os.getenv("MODEL_ID", "amazon.nova-2-sonic-v1:0")
QA_ANALYTICS_MODEL_ID = os.environ.get("QA_ANALYTICS_MODEL_ID", "global.amazon.nova-2-lite-v1:0")
ASSESSMENT_MODEL_ID = os.environ.get("ASSESSMENT_MODEL_ID", "us.anthropic.claude-3-5-sonnet-20241022-v2:0")
_runtime_name = os.getenv("AGENT_RUNTIME_NAME", "")
GUARDRAIL_ID = os.environ.get("BEDROCK_GUARDRAIL_ID", "")
GUARDRAIL_VERSION = os.environ.get("BEDROCK_GUARDRAIL_VERSION", "")

# Guardrail gate tuning
GUARDRAIL_SCREEN_CHAR_BUDGET = 120
GUARDRAIL_GATE_TIMEOUT_SEC = 0.8
_SENTENCE_TERMINATOR_RE = re.compile(r'[.!?]\s')

_bedrock_runtime_client = boto3.client('bedrock-runtime', region_name=REGION)

# Default rubric weights for assessment scoring
DEFAULT_RUBRIC = {
    'financial_reasoning': 20,
    'understanding_calculations': 20,
    'assumption_validation': 15,
    'recommendation_defense': 15,
    'analytical_depth': 15,
    'decision_making_quality': 10,
    'communication_effectiveness': 5,
}


# ── Guardrail helpers ────────────────────────────────────────────────

async def apply_guardrail_to_text(text: str, source: Literal['INPUT', 'OUTPUT']) -> tuple[bool, str]:
    """Run Bedrock guardrail against transcript text. Fails open on error."""
    if not text or not text.strip() or not GUARDRAIL_ID:
        return False, text
    try:
        response = await asyncio.to_thread(
            lambda: _bedrock_runtime_client.apply_guardrail(
                guardrailIdentifier=GUARDRAIL_ID,
                guardrailVersion=GUARDRAIL_VERSION,
                source=source,
                content=[{'text': {'text': text}}],
            )
        )
    except Exception as e:
        print(f"[Guardrail] apply_guardrail({source}) failed, failing open: {e}", flush=True)
        return False, text

    if response.get('action') != 'GUARDRAIL_INTERVENED':
        return False, text

    outputs = response.get('outputs') or []
    sanitized = outputs[0]['text'] if outputs and 'text' in outputs[0] else text
    return True, sanitized


# ── System prompt builder ────────────────────────────────────────────

def build_qa_system_prompt(persona_name, persona_role, persona_prompt, custom_instructions,
                           workbook_summary, session_duration, previous_qa_context=None):
    """Build Q&A system prompt from persona and workbook context."""
    qa_duration = session_duration // 60
    if qa_duration <= 0:
        qa_duration = 1

    with open("qa_system_prompt.jinja2", "r") as f:
        template_file = f.read()
    template = Template(template_file)

    prompt = template.render(
        persona_name=persona_name,
        persona_role=persona_role,
        persona_prompt=persona_prompt,
        custom_instructions=custom_instructions if custom_instructions else None,
        workbook_summary=workbook_summary,
        qa_limit=qa_duration,
        previous_qa_context=previous_qa_context if previous_qa_context else None,
    )
    return prompt


# ── Nova Sonic model factory ─────────────────────────────────────────

def create_nova_sonic_model(voice_id=None):
    """Create a BidiNovaSonicModel with the given voice configuration."""
    voice = voice_id if voice_id and voice_id in VALID_VOICES else DEFAULT_VOICE_ID
    return BidiNovaSonicModel(
        model_id=MODEL_ID,
        provider_config={
            "audio": {
                "input_rate": 16000,
                "output_rate": 16000,
                "voice": voice,
                "channels": 1,
                "format": "pcm",
            }
        },
        client_config={
            "boto_session": boto3.Session(region_name=REGION),
        },
    )


# ── Session time guard ───────────────────────────────────────────────

class SessionTimeGuard:
    """Hook that monitors elapsed time and nudges the agent to wrap up."""

    def __init__(self, duration_sec: int):
        self._start = time.monotonic()
        self._duration = duration_sec
        self.time_nudge: str | None = None
        self.force_stop = False

    def register_hooks(self, registry: HookRegistry) -> None:
        registry.add_callback(BidiMessageAddedEvent, self.on_message_added)

    async def on_message_added(self, event: BidiMessageAddedEvent):
        if event.message['role'] != 'user':
            return
        elapsed = time.monotonic() - self._start
        remaining = max(0, self._duration - elapsed)
        if remaining <= 0:
            self.time_nudge = (
                "TIME EXPIRED. Thank the student briefly and use stop_conversation immediately."
            )
            self.force_stop = True
        elif remaining <= 30:
            self.time_nudge = (
                f"TIME CHECK: Only {remaining:.0f}s remaining. "
                "This should be your last question. Wrap up and use stop_conversation soon."
            )


# ── WebSocket Input ──────────────────────────────────────────────────

class WebSocketBidiInput(BidiInput):
    """Bridge browser WebSocket audio into BidiAgent input events."""

    def __init__(self, websocket: WebSocket, time_guard: SessionTimeGuard | None = None):
        self._ws = websocket
        self._stopped = False
        self._analytics_requested = asyncio.Event()
        self._time_guard = time_guard

    async def start(self, agent: BidiAgent) -> None:
        self._stopped = False
        self._agent = agent
        await agent.send(BidiTextInputEvent(
            text="Please introduce yourself and begin the Q&A session.",
            role="user",
        ))

    async def _drain_time_nudge(self) -> None:
        if not self._time_guard or not self._time_guard.time_nudge:
            return
        nudge = self._time_guard.time_nudge
        self._time_guard.time_nudge = None
        await self._agent.send(BidiTextInputEvent(text=nudge, role="user"))
        if self._time_guard.force_stop:
            await asyncio.sleep(10)
            self._stopped = True
            raise asyncio.CancelledError("session time expired")

    async def __call__(self) -> BidiAudioInputEvent:
        while not self._stopped:
            await self._drain_time_nudge()
            try:
                msg = await self._ws.receive_json()
            except WebSocketDisconnect:
                self._stopped = True
                raise asyncio.CancelledError("client disconnected")

            action = msg.get("action", "")
            if action == "audio":
                return BidiAudioInputEvent(
                    audio=msg["data"],
                    format="pcm",
                    sample_rate=16000,
                    channels=1,
                )
            elif action == "get_analytics":
                self._analytics_requested.set()
            elif action == "end":
                self._stopped = True
                raise asyncio.CancelledError("client ended session")
        raise asyncio.CancelledError("input stopped")

    async def stop(self) -> None:
        self._stopped = True


# ── WebSocket Output (with guardrail gate) ───────────────────────────

class WebSocketBidiOutput(BidiOutput):
    """Bridge BidiAgent output events back to the browser WebSocket."""

    def __init__(self, websocket: WebSocket):
        self._ws = websocket
        self.transcript_entries: list[dict] = []
        self._agent: BidiAgent | None = None
        self._gate = asyncio.Event()
        self._gate.set()
        self._pending_audio: deque[str] = deque()
        self._speculative_buffer: str = ""
        self._screened_chars: int = 0
        self._turn_blocked: bool = False
        self._screen_lock = asyncio.Lock()

    async def start(self, agent: BidiAgent) -> None:
        self._agent = agent

    def _reset_turn_state(self) -> None:
        self._gate.set()
        self._pending_audio.clear()
        self._speculative_buffer = ""
        self._screened_chars = 0
        self._turn_blocked = False

    def _should_screen_now(self) -> bool:
        suffix = self._speculative_buffer[self._screened_chars:]
        if not suffix:
            return False
        if _SENTENCE_TERMINATOR_RE.search(suffix):
            return True
        return len(suffix) >= GUARDRAIL_SCREEN_CHAR_BUDGET

    async def _screen_speculative(self) -> None:
        async with self._screen_lock:
            text_to_screen = self._speculative_buffer
            if len(text_to_screen) <= self._screened_chars:
                return
            self._gate.clear()
            try:
                intervened, sanitized = await asyncio.wait_for(
                    apply_guardrail_to_text(text_to_screen, 'OUTPUT'),
                    timeout=GUARDRAIL_GATE_TIMEOUT_SEC,
                )
            except (asyncio.TimeoutError, Exception):
                await self._release_pending_audio()
                self._screened_chars = len(text_to_screen)
                self._gate.set()
                return
            if intervened:
                await self._handle_blocked_turn(sanitized)
                return
            self._screened_chars = len(text_to_screen)
            await self._release_pending_audio()
            self._gate.set()

    async def _release_pending_audio(self) -> None:
        while self._pending_audio:
            chunk = self._pending_audio.popleft()
            try:
                await self._ws.send_json({"type": "audio", "data": chunk})
            except (WebSocketDisconnect, Exception):
                self._pending_audio.clear()
                return

    async def _handle_blocked_turn(self, sanitized: str) -> None:
        self._turn_blocked = True
        self._pending_audio.clear()
        self._gate.clear()
        try:
            await self._ws.send_json({"type": "audio_clear"})
            await self._ws.send_json({
                "type": "guardrail_intervention",
                "role": "assistant",
                "sanitized_text": sanitized,
            })
        except (WebSocketDisconnect, Exception):
            pass
        if self._agent is not None:
            try:
                await self._agent.send(BidiTextInputEvent(
                    text="SYSTEM NOTICE: Your previous response was blocked by content policy. "
                         "Ask a different question grounded in the student's workbook.",
                    role="user",
                ))
            except Exception:
                pass

    async def __call__(self, event: BidiOutputEvent) -> None:
        try:
            if isinstance(event, BidiAudioStreamEvent):
                if self._turn_blocked:
                    return
                if self._gate.is_set():
                    await self._ws.send_json({"type": "audio", "data": event.audio})
                else:
                    self._pending_audio.append(event.audio)

            elif isinstance(event, BidiTranscriptStreamEvent):
                await self._ws.send_json({
                    "type": "transcript",
                    "role": event.role,
                    "text": event.text,
                    "is_partial": not event.is_final,
                })
                if event.role == "assistant" and not event.is_final and not self._turn_blocked and event.text:
                    self._speculative_buffer += event.text
                    if self._should_screen_now():
                        asyncio.create_task(self._screen_speculative())
                if event.is_final and event.text and event.text.strip():
                    if event.role == "user" or not self._turn_blocked:
                        self.transcript_entries.append({"role": event.role, "text": event.text.strip()})

            elif isinstance(event, BidiInterruptionEvent):
                self._reset_turn_state()
                try:
                    await self._ws.send_json({"type": "interruption"})
                except (WebSocketDisconnect, Exception):
                    pass

            elif isinstance(event, BidiResponseCompleteEvent):
                if not self._turn_blocked and self._speculative_buffer and self._screened_chars < len(self._speculative_buffer):
                    try:
                        await self._screen_speculative()
                    except Exception:
                        pass
                self._reset_turn_state()

        except WebSocketDisconnect:
            pass
        except Exception as e:
            print(f"[Warning] Output event error: {e}", flush=True)

    async def stop(self) -> None:
        pass


# ── Data loaders ─────────────────────────────────────────────────────

async def load_persona(persona_id: str) -> dict:
    """Load persona configuration from DynamoDB."""
    table_name = os.getenv('PERSONA_TABLE_NAME')
    if not table_name:
        return {}
    try:
        session = aioboto3.Session()
        async with session.resource('dynamodb', region_name=REGION) as dynamodb:
            table = await dynamodb.Table(table_name)
            response = await table.get_item(Key={'personaID': persona_id})
            return response.get('Item', {})
    except Exception as e:
        print(f"Failed to load persona {persona_id}: {e}")
        return {}


async def load_workbook_summary(user_id: str, session_id: str) -> str:
    """Load parsed workbook summary from S3 for the AI agent to reference."""
    bucket_name = os.getenv('UPLOADS_BUCKET')
    if not bucket_name:
        return "No workbook data available."
    s3_key = f"sessions/{session_id}/parsed_workbook.json"
    try:
        session = aioboto3.Session()
        async with session.client('s3', region_name=REGION) as s3:
            response = await s3.get_object(Bucket=bucket_name, Key=s3_key)
            content = await response['Body'].read()
            workbook_data = json.loads(content)

            # Format workbook data into a readable summary for the prompt
            summary_parts = []
            for sheet_name, sheet_data in workbook_data.items():
                if sheet_name == 'error':
                    continue
                headers = sheet_data.get('headers', [])
                rows = sheet_data.get('rows', [])
                row_count = sheet_data.get('rowCount', 0)

                summary_parts.append(f"\n--- Sheet: {sheet_name} ({row_count} rows) ---")
                if headers:
                    summary_parts.append(f"Columns: {', '.join(str(h) for h in headers)}")
                # Include first 10 rows as sample data
                for row in rows[:10]:
                    row_str = ' | '.join(str(cell) if cell is not None else '' for cell in row)
                    summary_parts.append(row_str)
                if row_count > 10:
                    summary_parts.append(f"... ({row_count - 10} more rows)")

            return '\n'.join(summary_parts) if summary_parts else "Workbook uploaded but no data extracted."
    except Exception as e:
        print(f"Failed to load workbook summary: {e}")
        return "No workbook data available."


# ── Assessment scoring (post-session) ────────────────────────────────

async def generate_assessment_report(transcript_entries: list[dict], persona_data: dict, rubric_weights: dict = None) -> dict:
    """Generate structured assessment report using Claude for rubric scoring."""
    if not transcript_entries:
        return {}

    weights = rubric_weights or DEFAULT_RUBRIC
    persona_name = persona_data.get('name', 'Stakeholder')
    persona_role = persona_data.get('role', 'Executive')

    conversation = "\n".join(
        f"{'[{persona_name}]' if e['role'] == 'assistant' else '[Student]'}: {e['text']}"
        for e in transcript_entries
    )

    prompt = f"""You are evaluating a student's Q&A session where {persona_name} ({persona_role}) asked questions about the student's financial case analysis.

Q&A Transcript:
{conversation}

Evaluate the student across these categories with the given weights:
{json.dumps(weights, indent=2)}

For each category, provide:
1. A score from 0-100
2. A brief justification citing specific evidence from the transcript
3. Key strengths and areas for improvement

Also provide an overall assessment summary."""

    tool_config = {
        "tools": [{
            "toolSpec": {
                "name": "provide_assessment",
                "description": "Provide structured assessment scoring and feedback",
                "inputSchema": {
                    "json": {
                        "type": "object",
                        "properties": {
                            "overallScore": {"type": "number", "description": "Weighted overall score 0-100"},
                            "overallSummary": {"type": "string"},
                            "categoryScores": {
                                "type": "object",
                                "properties": {
                                    "financial_reasoning": {"type": "object", "properties": {"score": {"type": "number"}, "justification": {"type": "string"}}},
                                    "understanding_calculations": {"type": "object", "properties": {"score": {"type": "number"}, "justification": {"type": "string"}}},
                                    "assumption_validation": {"type": "object", "properties": {"score": {"type": "number"}, "justification": {"type": "string"}}},
                                    "recommendation_defense": {"type": "object", "properties": {"score": {"type": "number"}, "justification": {"type": "string"}}},
                                    "analytical_depth": {"type": "object", "properties": {"score": {"type": "number"}, "justification": {"type": "string"}}},
                                    "decision_making_quality": {"type": "object", "properties": {"score": {"type": "number"}, "justification": {"type": "string"}}},
                                    "communication_effectiveness": {"type": "object", "properties": {"score": {"type": "number"}, "justification": {"type": "string"}}},
                                },
                            },
                            "strengths": {"type": "array", "items": {"type": "string"}},
                            "improvements": {"type": "array", "items": {"type": "string"}},
                            "evidenceCitations": {"type": "array", "items": {"type": "string"}},
                        },
                        "required": ["overallScore", "overallSummary", "categoryScores", "strengths", "improvements"],
                    }
                },
            }
        }],
        "toolChoice": {"tool": {"name": "provide_assessment"}},
    }

    response = await asyncio.to_thread(
        lambda: _bedrock_runtime_client.converse(
            modelId=ASSESSMENT_MODEL_ID,
            messages=[{'role': 'user', 'content': [{'text': prompt}]}],
            toolConfig=tool_config,
        )
    )
    return response['output']['message']['content'][0]['toolUse']['input']


async def save_assessment(user_id: str, session_id: str, transcript_entries: list[dict], assessment: dict):
    """Save Q&A transcript and assessment report to S3."""
    bucket_name = os.getenv('UPLOADS_BUCKET')
    if not bucket_name:
        return
    s3_prefix = f"sessions/{session_id}"
    session = aioboto3.Session()
    async with session.client('s3', region_name=REGION) as s3_client:
        await s3_client.put_object(
            Bucket=bucket_name,
            Key=f"{s3_prefix}/qa_transcript.json",
            Body=json.dumps(transcript_entries, indent=2),
            ContentType='application/json',
        )
        result = {
            "status": "completed",
            "sessionId": session_id,
            "userId": user_id,
            "assessment": assessment,
            "totalQuestions": sum(1 for e in transcript_entries if e['role'] == 'assistant'),
            "totalResponses": sum(1 for e in transcript_entries if e['role'] == 'user'),
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "model": ASSESSMENT_MODEL_ID,
        }
        await s3_client.put_object(
            Bucket=bucket_name,
            Key=f"{s3_prefix}/qa_analytics.json",
            Body=json.dumps(result, indent=2),
            ContentType='application/json',
        )


# ── App and WebSocket handler ────────────────────────────────────────

app = BedrockAgentCoreApp()


@app.ping
def health_check():
    return PingStatus.HEALTHY


@app.websocket
async def websocket_handler(websocket, context: RequestContext):
    """WebSocket handler for finance case Q&A sessions.

    Client sends setup message after connection:
      {"action": "setup", "personaId": "...", "userId": "...",
       "sessionId": "...", "voiceId": "...", "rubricWeights": {...}}
    """
    await websocket.accept()

    # Wait for setup frame
    try:
        raw = await asyncio.wait_for(websocket.receive_json(), timeout=10)
    except asyncio.TimeoutError:
        await websocket.send_json({"type": "error", "message": "Setup not received within 10s"})
        await websocket.close()
        return
    except WebSocketDisconnect:
        return

    if raw.get("action") != "setup":
        await websocket.send_json({"type": "error", "message": "First message must be {action: 'setup', ...}"})
        await websocket.close()
        return

    persona_id = raw.get("personaId", "")
    user_id = raw.get("userId", "")
    voice_id = raw.get("voiceId", DEFAULT_VOICE_ID)
    session_id = raw.get("sessionId", "") or (context.session_id or "")
    previous_context = raw.get("previousContext", "")
    qa_time_limit_override = int(raw.get("qaTimeLimitSec", 0))
    rubric_weights = raw.get("rubricWeights", DEFAULT_RUBRIC)

    print(f"[WebSocket] Setup: user={user_id} persona={persona_id} session={session_id}", flush=True)

    _otel_ctx = baggage.set_baggage("session.id", session_id)
    _otel_token = otel_context.attach(_otel_ctx)

    if not persona_id or not user_id or not session_id:
        await websocket.send_json({"type": "error", "message": "Missing personaId, userId, or sessionId"})
        await websocket.close()
        return

    agent = None
    ws_output = None
    ws_input = None
    client_disconnected = False

    try:
        # Load persona
        persona_data = await load_persona(persona_id)
        if not persona_data:
            await websocket.send_json({"type": "error", "message": "Persona not found"})
            await websocket.close()
            return

        # Load workbook data for context-aware questioning
        workbook_summary = await load_workbook_summary(user_id, session_id)

        session_duration = qa_time_limit_override if qa_time_limit_override > 0 else int(persona_data.get('qaTimeLimitSec', 900))

        system_prompt = build_qa_system_prompt(
            persona_name=persona_data.get('name', 'Stakeholder'),
            persona_role=persona_data.get('role', 'Executive'),
            persona_prompt=persona_data.get('personaPrompt', persona_data.get('systemPrompt', '')),
            custom_instructions=persona_data.get('description', ''),
            workbook_summary=workbook_summary,
            session_duration=session_duration,
            previous_qa_context=previous_context if previous_context else None,
        )

        effective_voice = persona_data.get('voiceId', voice_id)
        model = create_nova_sonic_model(effective_voice)
        time_guard = SessionTimeGuard(session_duration)
        agent = BidiAgent(
            model=model,
            tools=[stop_conversation],
            system_prompt=system_prompt,
            hooks=[time_guard],
        )

        await websocket.send_json({
            "type": "session_started",
            "persona_name": persona_data.get('name', 'Stakeholder'),
            "persona_role": persona_data.get('role', 'Executive'),
            "session_id": session_id,
            "duration_sec": session_duration,
        })

        ws_input = WebSocketBidiInput(websocket, time_guard=time_guard)
        ws_output = WebSocketBidiOutput(websocket)

        async def analytics_watcher():
            await ws_input._analytics_requested.wait()
            if not ws_output.transcript_entries:
                return
            try:
                assessment = await generate_assessment_report(
                    ws_output.transcript_entries, persona_data, rubric_weights
                )
                await websocket.send_json({
                    "type": "assessment_report",
                    "assessment": assessment,
                    "totalQuestions": sum(1 for e in ws_output.transcript_entries if e['role'] == 'assistant'),
                    "totalResponses": sum(1 for e in ws_output.transcript_entries if e['role'] == 'user'),
                })
                await save_assessment(user_id, session_id, ws_output.transcript_entries, assessment)
            except Exception as e:
                print(f"[WebSocket] Analytics error: {e}", flush=True)

        try:
            analytics_task = asyncio.create_task(analytics_watcher())
            await agent.run(inputs=[ws_input], outputs=[ws_output])
        except WebSocketDisconnect:
            client_disconnected = True
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"[WebSocket] Agent run error: {e}", flush=True)
        finally:
            analytics_task.cancel()
            try:
                await analytics_task
            except (asyncio.CancelledError, Exception):
                pass

        # Generate and save assessment regardless of how session ended
        if ws_output and ws_output.transcript_entries:
            if not ws_input._analytics_requested.is_set():
                try:
                    assessment = await generate_assessment_report(
                        ws_output.transcript_entries, persona_data, rubric_weights
                    )
                    await save_assessment(user_id, session_id, ws_output.transcript_entries, assessment)
                    if not client_disconnected:
                        try:
                            await websocket.send_json({
                                "type": "assessment_report",
                                "assessment": assessment,
                                "totalQuestions": sum(1 for e in ws_output.transcript_entries if e['role'] == 'assistant'),
                                "totalResponses": sum(1 for e in ws_output.transcript_entries if e['role'] == 'user'),
                            })
                        except Exception:
                            pass
                except Exception as e:
                    print(f"[WebSocket] Fallback assessment error: {e}", flush=True)

    except Exception as e:
        print(f"[WebSocket] Handler error: {e}", flush=True)
    finally:
        if _otel_token is not None:
            otel_context.detach(_otel_token)
        if agent:
            try:
                await agent.stop()
            except Exception:
                pass
        try:
            await websocket.send_json({"type": "session_ended", "reason": "server_complete"})
        except Exception:
            pass
        try:
            await websocket.close()
        except Exception:
            pass


if __name__ == "__main__":
    app.run()
