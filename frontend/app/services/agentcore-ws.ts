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

  // Public state
  public transcript: TranscriptEntry[] = [];
  public isSessionActive = false;
  public personaName: string | null = null;
  public sessionDuration: number = 0;

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
   */
  playAudio(base64Audio: string): void {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 16000 });
    }

    const pcmBuffer = this.base64ToArrayBuffer(base64Audio);
    const int16Array = new Int16Array(pcmBuffer);
    const float32Array = new Float32Array(int16Array.length);

    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 0x8000;
    }

    const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, 16000);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    source.start();
  }

  /**
   * Request assessment analytics from the server.
   */
  requestAnalytics(): void {
    this.sendJson({ action: 'get_analytics' });
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

    // Stop audio capture
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
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
          // Stop any currently playing audio
          if (this.audioContext) {
            this.audioContext.close().catch(() => {});
            this.audioContext = new AudioContext({ sampleRate: 16000 });
          }
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
