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
    if (!sessionToken) {
      console.log('[AnamAvatar] No session token yet');
      return;
    }
    if (!isActive) {
      console.log('[AnamAvatar] Not active yet');
      return;
    }
    if (clientRef.current) {
      console.log('[AnamAvatar] Client already exists');
      return;
    }

    const initAnam = async () => {
      console.log('[AnamAvatar] Initializing Anam client...');
      setConnecting(true);
      try {
        // Create Anam client - disable input audio (Nova Sonic handles mic)
        const client = createClient(sessionToken, {
          disableInputAudio: true,
        });

        client.addListener(AnamEvent.CONNECTION_ESTABLISHED, () => {
          console.log('[AnamAvatar] ✅ Connected — ready for talk commands (TEXT mode)');
          setConnected(true);
          setConnecting(false);
        });

        client.addListener(AnamEvent.CONNECTION_CLOSED, () => {
          console.log('[AnamAvatar] ❌ Connection closed');
          setConnected(false);
          talkStreamRef.current = null;
        });

        // Suppress any Anam-generated messages (we're using Nova Sonic for AI)
        client.addListener(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, (event: unknown) => {
          console.log('[AnamAvatar] Message event (ignoring - using Nova Sonic AI):', event);
        });

        clientRef.current = client;

        if (videoRef.current) {
          console.log('[AnamAvatar] Streaming to video element:', videoRef.current.id);
          await client.streamToVideoElement(videoRef.current.id);
          console.log('[AnamAvatar] Video stream started');
        } else {
          console.warn('[AnamAvatar] Video ref not available');
        }
      } catch (error) {
        console.error('[AnamAvatar] ❌ Failed to connect:', error);
        setConnecting(false);
      }
    };

    initAnam();

    return () => {
      if (clientRef.current) {
        try {
          console.log('[AnamAvatar] Cleaning up client');
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
  // Text is streamed chunk by chunk as it arrives from Nova Sonic
  useEffect(() => {
    if (!connected) {
      console.log('[AnamAvatar] Not connected yet, skipping callback registration');
      return;
    }

    let lastTextLength = 0; // Track how much text we've already sent

    console.log('[AnamAvatar] Registering text callback for Anam TTS (streaming mode)');
    onAssistantTextRef.current = (text: string, isFinal: boolean) => {
      if (!clientRef.current || !connected) {
        console.warn('[AnamAvatar] Received text but not ready:', { hasClient: !!clientRef.current, connected });
        return;
      }

      // Only send the NEW portion of text (delta), not the full accumulated text
      const newText = text.slice(lastTextLength);

      if (newText.length === 0 && !isFinal) {
        return; // No new text to send
      }

      console.log('[AnamAvatar] Streaming text delta to Anam:', {
        deltaLength: newText.length,
        totalLength: text.length,
        isFinal
      });

      try {
        // Create a new talk stream if needed
        if (!talkStreamRef.current || !talkStreamRef.current.isActive()) {
          console.log('[AnamAvatar] Creating new talk stream');
          talkStreamRef.current = clientRef.current.createTalkMessageStream();
        }

        if (talkStreamRef.current.isActive()) {
          // Stream only the new text chunk
          if (newText.length > 0) {
            talkStreamRef.current.streamMessageChunk(newText, isFinal);
            lastTextLength = text.length; // Update tracker
          } else if (isFinal) {
            // Just signal final even if no new text
            talkStreamRef.current.streamMessageChunk('', true);
          }
        } else {
          console.warn('[AnamAvatar] Talk stream not active');
        }

        // Reset stream ref on final so next turn gets a new stream
        if (isFinal) {
          console.log('[AnamAvatar] Final chunk received, resetting for next turn');
          talkStreamRef.current = null;
          lastTextLength = 0; // Reset for next turn
        }
      } catch (e) {
        console.error('[AnamAvatar] Talk stream error:', e);
        talkStreamRef.current = null;
        lastTextLength = 0;
      }
    };

    return () => {
      console.log('[AnamAvatar] Clearing text callback');
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
