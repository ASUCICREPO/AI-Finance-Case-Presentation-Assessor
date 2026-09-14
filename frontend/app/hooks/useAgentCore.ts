/**
 * React hook for managing AgentCore Q&A sessions.
 * Provides state management, audio capture, and event handling
 * for the live voice Q&A with AI stakeholder personas.
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  createAgentCoreClient,
  AgentCoreClient,
  AgentCoreSetupParams,
  AgentCoreEvent,
  TranscriptEntry,
} from '../services/agentcore-ws';
import { AssessmentReport } from '../config/config';

export type SessionStatus = 'idle' | 'connecting' | 'active' | 'ending' | 'completed' | 'error';

export interface UseAgentCoreReturn {
  // State
  status: SessionStatus;
  personaName: string | null;
  transcript: TranscriptEntry[];
  assessmentReport: AssessmentReport | null;
  error: string | null;
  isAISpeaking: boolean;
  currentAIText: string;
  sessionDuration: number;

  // Actions
  startSession: (params: AgentCoreSetupParams) => Promise<void>;
  endSession: () => void;
  requestAnalytics: () => void;
  disconnect: () => void;
  setMuteAudioPlayback: (mute: boolean) => void;
  /** Register callback to receive audio chunks for Anam lip-sync */
  onAudioChunk: (callback: (audioBase64: string, isFinal: boolean) => void) => void;
}

export function useAgentCore(): UseAgentCoreReturn {
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [personaName, setPersonaName] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [assessmentReport, setAssessmentReport] = useState<AssessmentReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [currentAIText, setCurrentAIText] = useState('');
  const [sessionDuration, setSessionDuration] = useState(0);

  const clientRef = useRef<AgentCoreClient | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  // Store mute flag - applies to client when created
  const muteAudioRef = useRef<boolean>(false);

  // Audio chunk callback for Anam lip-sync
  const audioChunkCallbackRef = useRef<((audioBase64: string, isFinal: boolean) => void) | null>(null);

  // Event handler
  const handleEvent = useCallback((event: AgentCoreEvent) => {
    switch (event.type) {
      case 'session_started':
        setStatus('active');
        setPersonaName(event.persona_name);
        setSessionDuration(event.duration_sec);
        break;

      case 'audio':
        // Forward audio chunks to registered callback (for Anam lip-sync)
        if (audioChunkCallbackRef.current && event.data) {
          // isFinal is true when this is the last chunk of the current AI turn
          audioChunkCallbackRef.current(event.data, false);
        }
        break;

      case 'transcript':
        if (event.role === 'assistant') {
          setIsAISpeaking(event.is_partial); // Speaking while partial, done when final
          setCurrentAIText(event.text);

          // When assistant transcript becomes final, signal end of audio sequence
          if (!event.is_partial && audioChunkCallbackRef.current) {
            // Send empty chunk with isFinal=true to signal end of sequence
            audioChunkCallbackRef.current('', true);
          }
        }
        // Update transcript from client's internal state
        if (clientRef.current) {
          setTranscript([...clientRef.current.transcript]);
        }
        break;

      case 'interruption':
        setIsAISpeaking(false);
        setCurrentAIText('');
        // Signal interruption to Anam
        if (audioChunkCallbackRef.current) {
          audioChunkCallbackRef.current('', true);
        }
        break;

      case 'assessment_report':
        setAssessmentReport(event.assessment);
        break;

      case 'guardrail_intervention':
        // AI response was blocked — show sanitized text
        setCurrentAIText(event.sanitized_text);
        setIsAISpeaking(false);
        break;

      case 'session_ended':
        setStatus('completed');
        setIsAISpeaking(false);
        break;

      case 'error':
        setStatus('error');
        setError(event.message);
        break;
    }
  }, []);

  // Start a new Q&A session
  const startSession = useCallback(async (params: AgentCoreSetupParams) => {
    setStatus('connecting');
    setError(null);
    setTranscript([]);
    setAssessmentReport(null);
    setCurrentAIText('');

    try {
      const client = createAgentCoreClient();
      clientRef.current = client;

      // CRITICAL: Apply mute setting immediately after client creation
      client.muteAudioPlayback = muteAudioRef.current;
      console.log('[useAgentCore] Client created, muteAudioPlayback =', client.muteAudioPlayback);

      // Subscribe to events
      unsubRef.current = client.on(handleEvent);

      // Connect WebSocket
      await client.connect(params);

      // Start audio capture from microphone
      await client.startAudioCapture();
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to start session');
    }
  }, [handleEvent]);

  // End session gracefully
  const endSession = useCallback(() => {
    setStatus('ending');
    if (clientRef.current) {
      clientRef.current.endSession();
    }
  }, []);

  // Request assessment analytics
  const requestAnalytics = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.requestAnalytics();
    }
  }, []);

  // Full disconnect and cleanup
  const disconnect = useCallback(() => {
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    setStatus('idle');
    setIsAISpeaking(false);
    setCurrentAIText('');
  }, []);

  // Mute/unmute Nova Sonic audio playback (when Anam handles TTS)
  const setMuteAudioPlayback = useCallback((mute: boolean) => {
    // Store the mute setting
    muteAudioRef.current = mute;
    console.log('[useAgentCore] setMuteAudioPlayback =', mute);

    // Apply to existing client if available
    if (clientRef.current) {
      clientRef.current.muteAudioPlayback = mute;
    }
  }, []);

  // Register callback for audio chunks (for Anam lip-sync)
  const onAudioChunk = useCallback((callback: (audioBase64: string, isFinal: boolean) => void) => {
    audioChunkCallbackRef.current = callback;
    console.log('[useAgentCore] Audio chunk callback registered for Anam lip-sync');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubRef.current) unsubRef.current();
      if (clientRef.current) clientRef.current.disconnect();
    };
  }, []);

  return {
    status,
    personaName,
    transcript,
    assessmentReport,
    error,
    isAISpeaking,
    currentAIText,
    sessionDuration,
    startSession,
    endSession,
    requestAnalytics,
    disconnect,
    setMuteAudioPlayback,
    onAudioChunk,
  };
}
