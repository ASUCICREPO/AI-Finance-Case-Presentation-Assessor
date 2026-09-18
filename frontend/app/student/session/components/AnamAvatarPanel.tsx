'use client';

import React, { useRef, useEffect, useState } from 'react';
import { createClient, AnamEvent } from '@anam-ai/js-sdk';
import { Loader2, Volume2 } from 'lucide-react';

interface AnamAvatarPanelProps {
  anamPersonaId: string;
  sessionToken: string | null;
  isActive: boolean;
  personaName: string;
  /** Ref to register a callback for receiving assistant TEXT (for Anam TTS + lip sync) */
  onAssistantTextRef: React.MutableRefObject<((text: string, isFinal: boolean) => void) | null>;
}

/**
 * Anam AI Avatar Panel — renders a live video avatar with TTS + lip-sync.
 * 
 * TEXT-BASED MODE (matching Real Estate Program):
 * - Nova Sonic handles: AI logic, speech recognition
 * - Nova Sonic audio is MUTED (setMuteAudioPlayback(true))
 * - Assistant transcript TEXT is sent to Anam via createTalkMessageStream()
 * - Anam does its own TTS and lip-sync from the text
 * - This ensures clean audio output from Anam only
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
        // Create Anam client - disable input audio (Nova Sonic handles mic)
        const client = createClient(sessionToken, {
          disableInputAudio: true,
        });

        client.addListener(AnamEvent.CONNECTION_ESTABLISHED, () => {
          console.log('[Anam] Connected — ready for talk commands (TEXT mode)');
          setConnected(true);
          setConnecting(false);
        });

        client.addListener(AnamEvent.CONNECTION_CLOSED, () => {
          console.log('[Anam] Connection closed');
          setConnected(false);
          talkStreamRef.current = null;
        });

        // Suppress any Anam-generated messages (we're using Nova Sonic for AI)
        client.addListener(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, (event: unknown) => {
          console.log('[Anam] Message event (ignoring - using Nova Sonic AI):', event);
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

  // Register text callback — pipes Nova Sonic transcript TEXT to Anam for TTS + lip sync
  useEffect(() => {
    onAssistantTextRef.current = (text: string, isFinal: boolean) => {
      if (!clientRef.current || !connected) return;

      try {
        // Create a new talk stream if needed
        if (!talkStreamRef.current || !talkStreamRef.current.isActive()) {
          talkStreamRef.current = clientRef.current.createTalkMessageStream();
        }

        if (talkStreamRef.current.isActive()) {
          talkStreamRef.current.streamMessageChunk(text, isFinal);
        }

        // Reset stream ref on final so next turn gets a new stream
        if (isFinal) {
          talkStreamRef.current = null;
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
