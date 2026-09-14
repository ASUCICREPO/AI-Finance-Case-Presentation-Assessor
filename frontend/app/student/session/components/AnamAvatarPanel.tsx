'use client';

import React, { useRef, useEffect, useState } from 'react';
import { createClient, AnamEvent } from '@anam-ai/js-sdk';
import { Loader2, Volume2 } from 'lucide-react';

interface AnamAvatarPanelProps {
  anamPersonaId: string;
  sessionToken: string | null;
  isActive: boolean;
  personaName: string;
  /** Ref to register a callback for receiving Nova Sonic audio chunks (for lip sync) */
  onAudioChunkRef: React.MutableRefObject<((audioBase64: string, isFinal: boolean) => void) | null>;
}

/**
 * Anam AI Avatar Panel — renders a live video avatar with lip-sync.
 * 
 * AUDIO PASSTHROUGH MODE:
 * - Anam does NOT generate any audio (no TTS)
 * - Nova Sonic generates all audio
 * - Nova Sonic audio is piped to Anam via sendAudioChunk() for LIP-SYNC ONLY
 * - This prevents the muffled/echoed audio issue
 * 
 * Architecture:
 * - Nova Sonic: AI logic + speech recognition + audio generation
 * - Anam: Visual avatar rendering + lip-sync to Nova Sonic audio
 */
export default function AnamAvatarPanel({
  anamPersonaId,
  sessionToken,
  isActive,
  personaName,
  onAudioChunkRef,
}: AnamAvatarPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audioStreamRef = useRef<any>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Initialize Anam client when session token is available
  useEffect(() => {
    if (!sessionToken || !isActive || clientRef.current) return;

    const initAnam = async () => {
      setConnecting(true);
      try {
        // Create Anam client in AUDIO PASSTHROUGH mode
        // - Input audio disabled (Nova Sonic handles mic)
        // - Session token was created with enableAudioPassthrough=true on backend
        const client = createClient(sessionToken, {
          disableInputAudio: true,   // Don't let Anam listen to mic
        });

        client.addListener(AnamEvent.CONNECTION_ESTABLISHED, async () => {
          console.log('[Anam] Connected — avatar ready (AUDIO PASSTHROUGH mode)');
          setConnected(true);
          setConnecting(false);

          // Create audio input stream for lip-sync
          // Nova Sonic outputs 16-bit PCM at 16kHz mono
          try {
            audioStreamRef.current = client.createAgentAudioInputStream({
              encoding: 'pcm_s16le',  // 16-bit signed little-endian PCM
              sampleRate: 16000,      // 16kHz sample rate (Nova Sonic output)
              channels: 1,            // Mono channel
            });
            console.log('[Anam] Audio input stream created for lip-sync');
          } catch (e) {
            console.error('[Anam] Failed to create audio input stream:', e);
          }
        });

        client.addListener(AnamEvent.CONNECTION_CLOSED, () => {
          console.log('[Anam] Connection closed');
          setConnected(false);
          audioStreamRef.current = null;
        });

        // Suppress any Anam-generated messages (LLM should be disabled)
        client.addListener(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, (event: unknown) => {
          console.log('[Anam] Message event (ignoring - passthrough mode):', event);
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
        audioStreamRef.current = null;
        setConnected(false);
      }
    };
  }, [sessionToken, isActive]);

  // Register audio chunk callback — pipes Nova Sonic audio to Anam for lip-sync
  useEffect(() => {
    onAudioChunkRef.current = (audioBase64: string, isFinal: boolean) => {
      if (!clientRef.current || !connected || !audioStreamRef.current) {
        // Silently skip if not connected - don't spam console
        return;
      }

      try {
        // Send audio chunk to Anam for lip-sync rendering
        // audioBase64 is base64-encoded PCM from Nova Sonic
        audioStreamRef.current.sendAudioChunk(audioBase64);

        // If this is the final chunk of the current turn, end the sequence
        if (isFinal) {
          audioStreamRef.current.endSequence();
          console.log('[Anam] Audio sequence ended (turn complete)');
        }
      } catch (e) {
        console.warn('[Anam] Audio stream error:', e);
      }
    };

    return () => {
      onAudioChunkRef.current = null;
    };
  }, [onAudioChunkRef, connected]);

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
