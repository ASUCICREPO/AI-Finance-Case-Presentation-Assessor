/**
 * AgentCore WebSocket Client
 * Handles bidirectional voice streaming with the Bedrock AgentCore runtime
 * for live stakeholder Q&A sessions.
 *
 * Protocol:
 * 1. Client connects to WebSocket URL (SigV4-signed)
 * 2. Client sends setup frame: { action: "setup", personaId, userId, sessionId, ... }
 * 3. Server responds: { type: "session_started", persona_name, session_id, duration_sec }
 * 4. Client streams audio: { action: "audio", data: base64PCM }
 * 5. Server streams back: { type: "audio" | "transcript" | "interruption" | ... }
 * 6. Session ends: { type: "session_ended", reason }
 */

import { config, AssessmentReport } from '../config/config';
import { Sha256 } from '@aws-crypto/sha256-js';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

export interface AgentCoreSetupParams {
  personaId: string;
  userId: string;
  sessionId: string;
  voiceId?: string;
  qaTimeLimitSec?: number;
  previousContext?: string;
  presentationTranscript?: string; // Student's presentation content
  workbookContext?: string; // Summary of spreadsheet data
  rubricWeights?: Record<string, number>;
}

export interface TranscriptEntry {
  role: 'user' | 'assistant';
  text: string;
  isFinal: boolean;
  timestamp: number;
}

export type AgentCoreEvent =
  | { type: 'session_started'; persona_name: string; persona_role: string; session_id: string; duration_sec: number }
  | { type: 'audio'; data: string }
  | { type: 'audio_clear' }
  | { type: 'transcript'; role: 'user' | 'assistant'; text: string; is_partial: boolean }
  | { type: 'interruption' }
  | { type: 'assessment_report'; assessment: AssessmentReport; totalQuestions: number; totalResponses: number }
  | { type: 'guardrail_intervention'; role: string; sanitized_text: string }
  | { type: 'session_ended'; reason: string }
  | { type: 'error'; message: string };

export type AgentCoreEventHandler = (event: AgentCoreEvent) => void;

// ──────────────────────────────────────────────────────────
// WebSocket Client
// ──────────────────────────────────────────────────────────

export class AgentCoreClient {
  private ws: WebSocket | null = null;
  private eventHandlers: Set<AgentCoreEventHandler> = new Set();
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private audioWorklet: AudioWorkletNode | null = null;
  private isConnected = false;
  private setupParams: AgentCoreSetupParams | null = null;

  // Audio playback queue (prevents overlapping/muffled audio)
  private playbackContext: AudioContext | null = null;
  private playbackGain: GainNode | null = null;
  private playbackQueue: Float32Array[] = [];
  private isPlaying = false;

  // Public state
  public transcript: TranscriptEntry[] = [];
  public isSessionActive = false;
  public personaName: string | null = null;
  public sessionDuration: number = 0;
  public muteAudioPlayback = false; // Set true when Anam handles TTS

  /**
   * Subscribe to AgentCore events.
   */
  on(handler: AgentCoreEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  private emit(event: AgentCoreEvent) {
    this.eventHandlers.forEach((handler) => handler(event));
  }

  /**
   * Connect to AgentCore WebSocket and start Q&A session.
   */
  async connect(params: AgentCoreSetupParams): Promise<void> {
    this.setupParams = params;
    this.transcript = [];
    this.isSessionActive = false;

    // Sign the WebSocket URL with SigV4 for IAM auth
    const wsUrl = await this.getSignedWebSocketUrl();

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
          this.isConnected = true;
          // Send setup frame
          this.sendJson({
            action: 'setup',
            personaId: params.personaId,
            userId: params.userId,
            sessionId: params.sessionId,
            voiceId: params.voiceId || 'matthew',
            qaTimeLimitSec: params.qaTimeLimitSec || config.defaultSessionDuration,
            previousContext: params.previousContext || '',
            presentationTranscript: params.presentationTranscript || '',
            workbookContext: params.workbookContext || '',
            rubricWeights: params.rubricWeights,
          });
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onerror = (event) => {
          console.error('[AgentCore] WebSocket error:', event);
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onclose = (event) => {
          this.isConnected = false;
          this.isSessionActive = false;
          if (event.code !== 1000) {
            this.emit({ type: 'session_ended', reason: `connection_closed_${event.code}` });
          }
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Start capturing audio from the user's microphone and stream to AgentCore.
   */
  async startAudioCapture(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.audioContext = new AudioContext({ sampleRate: 16000 });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Use ScriptProcessor for PCM capture (AudioWorklet preferred but simpler here)
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (e) => {
        if (!this.isConnected || !this.isSessionActive) return;

        const inputData = e.inputBuffer.getChannelData(0);
        // Convert Float32 to Int16 PCM
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Base64 encode and send
        const base64 = this.arrayBufferToBase64(pcm16.buffer);
        this.sendJson({ action: 'audio', data: base64 });
      };

      source.connect(processor);
      processor.connect(this.audioContext.destination);
    } catch (err) {
      console.error('[AgentCore] Failed to start audio capture:', err);
      throw new Error('Microphone access denied or unavailable');
    }
  }

  /**
   * Play received audio from the AI persona.
   * Uses queue-based playback to prevent overlapping/muffled audio.
   */
  playAudio(base64Audio: string): void {
    // Skip playback if muted (Anam avatar handles TTS)
    if (this.muteAudioPlayback) {
      return;
    }

    // Decode base64 -> Int16 -> Float32
    const pcmBytes = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0));
    const int16 = new Int16Array(pcmBytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    // Queue and play
    this.playbackQueue.push(float32);
    this.drainPlaybackQueue();
  }

  /**
   * Drain the audio playback queue sequentially.
   */
  private drainPlaybackQueue(): void {
    if (this.isPlaying || this.playbackQueue.length === 0) return;
    this.isPlaying = true;

    // Initialize playback context if needed
    if (!this.playbackContext || this.playbackContext.state === 'closed') {
      this.playbackContext = new AudioContext({ sampleRate: 16000 });
      this.playbackGain = null;
    }

    const ctx = this.playbackContext;

    // Create gain node if needed
    if (!this.playbackGain) {
      const gain = ctx.createGain();
      gain.gain.value = 1;
      gain.connect(ctx.destination);
      this.playbackGain = gain;
    }

    const gainNode = this.playbackGain;

    const playNext = () => {
      const chunk = this.playbackQueue.shift();
      if (!chunk) {
        this.isPlaying = false;
        return;
      }

      const buffer = ctx.createBuffer(1, chunk.length, 16000);
      buffer.getChannelData(0).set(chunk);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(gainNode);
      source.onended = playNext;
      source.start();
    };

    playNext();
  }

  /**
   * Clear playback queue (e.g., on interruption).
   */
  clearPlaybackQueue(): void {
    this.playbackQueue = [];
    this.isPlaying = false;
  }

  /**
   * Request assessment analytics from the server.
   */
  requestAnalytics(): void {
    this.sendJson({ action: 'get_analytics' });
  }

  /**
   * Send a text message/command to the AI (e.g., "skip this question").
   * This bypasses audio input and sends text directly.
   */
  sendTextCommand(text: string): void {
    this.sendJson({ action: 'text_input', text });

    // Also add to transcript as user message
    this.transcript.push({
      role: 'user',
      text: text,
      isFinal: true,
      timestamp: Date.now(),
    });

    // Emit transcript event so UI updates
    this.emit({ type: 'transcript', role: 'user', text: text, is_partial: false });
  }

  /**
   * End the Q&A session gracefully.
   */
  endSession(): void {
    this.sendJson({ action: 'end' });
    this.isSessionActive = false;
  }

  /**
   * Disconnect and clean up all resources.
   */
  disconnect(): void {
    this.isSessionActive = false;
    this.isConnected = false;

    // Clear audio playback queue
    this.clearPlaybackQueue();

    // Stop audio capture
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => { });
      this.audioContext = null;
    }

    // Close playback context
    if (this.playbackContext) {
      this.playbackContext.close().catch(() => { });
      this.playbackContext = null;
      this.playbackGain = null;
    }

    // Close WebSocket
    if (this.ws) {
      try {
        this.ws.close(1000, 'client_disconnect');
      } catch {
        // Already closed
      }
      this.ws = null;
    }
  }

  // ── Private methods ───────────────────────────────────────

  private handleMessage(event: MessageEvent) {
    try {
      const data: AgentCoreEvent = JSON.parse(event.data);

      switch (data.type) {
        case 'session_started':
          this.isSessionActive = true;
          this.personaName = data.persona_name;
          this.sessionDuration = data.duration_sec;
          break;

        case 'audio':
          this.playAudio(data.data);
          break;

        case 'audio_clear':
          // Clear playback queue and stop playing
          this.clearPlaybackQueue();
          if (this.playbackContext && this.playbackContext.state !== 'closed') {
            this.playbackContext.close().catch(() => { });
            this.playbackContext = null;
            this.playbackGain = null;
          }
          break;

        case 'interruption':
          // User interrupted AI - clear audio queue
          this.clearPlaybackQueue();
          break;

        case 'transcript':
          if (data.is_partial) {
            // Update last partial entry for this role
            const lastIdx = this.findLastPartialIndex(data.role);
            if (lastIdx >= 0) {
              this.transcript[lastIdx] = {
                role: data.role,
                text: data.text,
                isFinal: false,
                timestamp: Date.now(),
              };
            } else {
              this.transcript.push({
                role: data.role,
                text: data.text,
                isFinal: false,
                timestamp: Date.now(),
              });
            }
          } else {
            // Final transcript — mark as final
            const lastIdx = this.findLastPartialIndex(data.role);
            if (lastIdx >= 0) {
              this.transcript[lastIdx] = {
                role: data.role,
                text: data.text,
                isFinal: true,
                timestamp: Date.now(),
              };
            } else {
              this.transcript.push({
                role: data.role,
                text: data.text,
                isFinal: true,
                timestamp: Date.now(),
              });
            }
          }
          break;

        case 'assessment_report':
          // Store the AI-generated assessment report
          this.assessmentReport = data.assessment;
          console.log('[AgentCore] Received AI assessment report:', {
            overallScore: data.assessment.overallScore,
            categories: Object.keys(data.assessment.categoryScores || {}),
          });
          break;

        case 'guardrail_intervention':
          // Guardrail blocked content - log it
          console.warn('[AgentCore] Guardrail intervention:', data.sanitized_text);
          break;

        case 'session_ended':
          this.isSessionActive = false;
          break;
      }

      this.emit(data);
    } catch (err) {
      console.error('[AgentCore] Failed to parse message:', err);
    }
  }

  private findLastPartialIndex(role: string): number {
    for (let i = this.transcript.length - 1; i >= 0; i--) {
      if (this.transcript[i].role === role && !this.transcript[i].isFinal) {
        return i;
      }
    }
    return -1;
  }

  private sendJson(data: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private async getSignedWebSocketUrl(): Promise<string> {
    const wsUrl = config.agentCoreWsUrl;
    if (!wsUrl) {
      throw new Error('AgentCore WebSocket URL not configured');
    }

    // Parse the WebSocket URL
    const url = new URL(wsUrl.replace('wss://', 'https://'));

    // Get AWS credentials from Cognito Identity Pool
    const credentials = fromCognitoIdentityPool({
      identityPoolId: config.identityPoolId,
      logins: config.userPoolId
        ? {
          [`cognito-idp.${config.region}.amazonaws.com/${config.userPoolId}`]:
            localStorage.getItem('auth_id_token') || '',
        }
        : undefined,
      clientConfig: { region: config.region },
    });

    const creds = await credentials();

    // Sign the request
    const signer = new SignatureV4({
      credentials: creds,
      region: config.region,
      service: 'bedrock-agentcore',
      sha256: Sha256,
    });

    const request = new HttpRequest({
      method: 'GET',
      protocol: 'https:',
      hostname: url.hostname,
      path: url.pathname,
      headers: {
        host: url.hostname,
      },
    });

    const signed = await signer.presign(request, { expiresIn: 300 });

    // Reconstruct as WSS URL with query params
    const queryParams = new URLSearchParams(signed.query as Record<string, string>);
    return `wss://${url.hostname}${url.pathname}?${queryParams.toString()}`;
  }

  // ── Utility ───────────────────────────────────────────────

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// ──────────────────────────────────────────────────────────
// Singleton instance
// ──────────────────────────────────────────────────────────

let _client: AgentCoreClient | null = null;

export function getAgentCoreClient(): AgentCoreClient {
  if (!_client) {
    _client = new AgentCoreClient();
  }
  return _client;
}

/**
 * Create a fresh client (for new sessions).
 */
export function createAgentCoreClient(): AgentCoreClient {
  if (_client) {
    _client.disconnect();
  }
  _client = new AgentCoreClient();
  return _client;
}
