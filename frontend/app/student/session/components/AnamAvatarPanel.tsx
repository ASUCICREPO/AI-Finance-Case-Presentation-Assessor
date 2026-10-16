'use client';

import React, { useRef, useEffect, useState } from 'react';
import { createClient, AnamEvent } from '@anam-ai/js-sdk';
import { Loader2 } from 'lucide-react';

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
  // Buffer text until sentence boundaries to prevent cut-off speech
  useEffect(() => {
    if (!connected) {
      console.log('[AnamAvatar] Not connected yet, skipping callback registration');
      return;
    }

    let textBuffer = ''; // Buffer to accumulate text until sentence boundary
    let lastSentIndex = 0; // Track where we last sent from

    console.log('[AnamAvatar] Registering text callback for Anam TTS (sentence-buffered mode)');
    onAssistantTextRef.current = (text: string, isFinal: boolean) => {
      if (!clientRef.current || !connected) {
        console.warn('[AnamAvatar] Received text but not ready:', { hasClient: !!clientRef.current, connected });
        return;
      }

      // Get the new text since last callback
      const newText = text.slice(lastSentIndex);
      textBuffer += newText;
      lastSentIndex = text.length;

      // Find complete sentences in the buffer (end with . ? ! or newline)
      // Keep incomplete sentence in buffer for next chunk
      const sentenceEndRegex = /[.!?]\s+|[.!?]$/g;
      let lastSentenceEnd = -1;
      let match;

      while ((match = sentenceEndRegex.exec(textBuffer)) !== null) {
        lastSentenceEnd = match.index + match[0].length;
      }

      // If we found complete sentences OR this is the final chunk, send to Anam
      const shouldSend = lastSentenceEnd > 0 || isFinal;

      if (shouldSend) {
        let textToSend: string;

        if (isFinal) {
          // On final, send everything remaining
          textToSend = textBuffer;
          textBuffer = '';
        } else if (lastSentenceEnd > 0) {
          // Send complete sentences, keep remainder in buffer
          textToSend = textBuffer.slice(0, lastSentenceEnd);
          textBuffer = textBuffer.slice(lastSentenceEnd);
        } else {
          return; // Nothing to send yet
        }

        if (textToSend.trim().length === 0 && !isFinal) {
          return;
        }

        console.log('[AnamAvatar] Sending to Anam:', {
          textLength: textToSend.length,
          remainingBuffer: textBuffer.length,
          isFinal,
          preview: textToSend.slice(0, 50) + (textToSend.length > 50 ? '...' : '')
        });

        try {
          // Create a new talk stream if needed
          if (!talkStreamRef.current || !talkStreamRef.current.isActive()) {
            console.log('[AnamAvatar] Creating new talk stream');
            talkStreamRef.current = clientRef.current.createTalkMessageStream();
          }

          if (talkStreamRef.current.isActive()) {
            // Send the buffered text
            talkStreamRef.current.streamMessageChunk(textToSend, isFinal);
          } else {
            console.warn('[AnamAvatar] Talk stream not active');
          }

          // Reset on final for next turn
          if (isFinal) {
            console.log('[AnamAvatar] Final chunk received, resetting for next turn');
            talkStreamRef.current = null;
            textBuffer = '';
            lastSentIndex = 0;
          }
        } catch (e) {
          console.error('[AnamAvatar] Talk stream error:', e);
          talkStreamRef.current = null;
          textBuffer = '';
          lastSentIndex = 0;
        }
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
