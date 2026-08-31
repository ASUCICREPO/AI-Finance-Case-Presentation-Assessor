'use client';

import React, { useRef, useEffect, useState } from 'react';
import { createClient, AnamEvent } from '@anam-ai/js-sdk';
import { Loader2, Volume2 } from 'lucide-react';

interface AnamAvatarPanelProps {
  anamPersonaId: string;
  sessionToken: string | null;
  isActive: boolean;
  personaName: string;
  /** Ref to register a callback for assistant transcript text (Anam TTS + lip sync) */
  onAssistantTextRef: React.MutableRefObject<((text: string, isFinal: boolean) => void) | null>;
}

/**
 * Anam AI Avatar Panel — renders a live video avatar that speaks
 * the AI stakeholder's responses with lip-synced TTS.
 * 
 * IMPORTANT: Anam is ONLY used for visual avatar + TTS.
 * - Anam's built-in LLM is DISABLED
 * - Anam's microphone input is DISABLED
 * - Nova Sonic handles all AI logic and speech recognition
 * - Nova Sonic text output is piped to Anam for TTS + lip sync
 */
export default function AnamAvatarPanel({
  anamPersonaId,
  sessionToken,
  isActive,
  personaName,
  onAssistantTextRef,
}: AnamAvatarPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const talkStreamRef = useRef<any>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Initialize Anam client when session token is available
  useEffect(() => {
    if (!sessionToken || !isActive || clientRef.current) return;

    const initAnam = async () => {
      setConnecting(true);
      try {
        // Create Anam client with input audio DISABLED
        // Anam is ONLY used for avatar rendering + TTS (speaking Nova Sonic output)
        // LLM must be disabled on the Anam persona configuration (server-side)
        const client = createClient(sessionToken, {
          disableInputAudio: true,   // Don't let Anam listen to mic (Nova Sonic handles speech recognition)
        });

        client.addListener(AnamEvent.CONNECTION_ESTABLISHED, () => {
          console.log('[Anam] Connected — avatar ready (LLM disabled, TTS only mode)');
          setConnected(true);
          setConnecting(false);
        });

        client.addListener(AnamEvent.CONNECTION_CLOSED, () => {
          console.log('[Anam] Connection closed');
          setConnected(false);
        });

        // Suppress any Anam-generated messages (in case LLM still triggers)
        client.addListener(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, (event: unknown) => {
          // Log but ignore - we only want Anam to speak what we tell it via talkMessageStream
          console.log('[Anam] Received message event (ignoring - LLM should be disabled):', event);
        });

        clientRef.current = client;

        if (videoRef.current) {
          await client.streamToVideoElement(videoRef.current.id);
        }
      } catch (error) {
        console.error('[Anam] Failed to connect:', error);
        setConnecting(false);
      }
    };

    initAnam();

    return () => {
      if (clientRef.current) {
        try {
          clientRef.current.stopStreaming();
        } catch (e) {
          // Ignore cleanup errors
        }
        clientRef.current = null;
        talkStreamRef.current = null;
        setConnected(false);
      }
    };
  }, [sessionToken, isActive]);

  // Register text callback — pipes Nova Sonic transcript to Anam for TTS + lip sync
  useEffect(() => {
    onAssistantTextRef.current = (text: string, isFinal: boolean) => {
      if (!clientRef.current || !connected) {
        console.log('[Anam] Cannot speak - not connected');
        return;
      }

      try {
        // Create a new talk stream for each message segment
        if (!talkStreamRef.current) {
          talkStreamRef.current = clientRef.current.createTalkMessageStream();
          console.log('[Anam] Created new talk stream for TTS');
        }

        // Stream the text chunk to Anam for TTS
        if (talkStreamRef.current && talkStreamRef.current.isActive && talkStreamRef.current.isActive()) {
          talkStreamRef.current.streamMessageChunk(text, isFinal);
          console.log('[Anam] Streaming text to TTS:', text.substring(0, 50) + '...', 'isFinal:', isFinal);
        }

        // Close the stream when the message is complete
        if (isFinal && talkStreamRef.current) {
          talkStreamRef.current = null;
          console.log('[Anam] Closed talk stream (message complete)');
        }
      } catch (e) {
        console.warn('[Anam] Talk stream error:', e);
        talkStreamRef.current = null;
      }
    };

    return () => {
      onAssistantTextRef.current = null;
    };
  }, [onAssistantTextRef, connected]);

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl border border-gray-200 bg-gray-900">
      <video
        id={`anam-avatar-${anamPersonaId}`}
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />

      {/* Persona name badge */}
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <span className="text-xs font-medium text-white font-sans bg-black/40 px-2 py-1 rounded">
          {personaName}
        </span>
      </div>

      {/* Volume indicator */}
      <button className="absolute top-3 right-3 rounded-full bg-white/20 p-1.5 hover:bg-white/30 transition-colors">
        <Volume2 size={14} className="text-white" />
      </button>

      {/* Loading overlay */}
      {!connected && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
          <div className="relative mb-4">
            {connecting ? (
              <Loader2 size={32} className="text-maroon-400 animate-spin" />
            ) : (
              <div className="h-16 w-16 rounded-full border-4 border-gray-700 border-t-maroon animate-spin" />
            )}
          </div>
          <p className="text-sm font-medium text-gray-300 font-sans">
            {!sessionToken ? 'Preparing avatar...' : connecting ? 'Connecting avatar...' : 'Initializing...'}
          </p>
          <p className="mt-1 text-xs text-gray-500 font-sans">This may take a few seconds</p>
        </div>
      )}
    </div>
  );
}
