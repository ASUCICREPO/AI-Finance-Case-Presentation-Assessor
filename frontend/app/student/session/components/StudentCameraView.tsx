'use client';

import React, { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Video, VideoOff, Mic, MicOff, Volume2 } from 'lucide-react';

interface StudentCameraViewProps {
  studentName: string;
  isMuted?: boolean;
  onToggleMute?: () => void;
  compact?: boolean;
  onStreamReady?: (stream: MediaStream) => void;
}

export interface StudentCameraViewRef {
  getStream: () => MediaStream | null;
}

/**
 * Student Camera View — captures and displays the student's webcam feed.
 * Supports compact mode for sidebar placement.
 * Exposes stream for recording via ref.
 */
const StudentCameraView = forwardRef<StudentCameraViewRef, StudentCameraViewProps>(
  function StudentCameraView({ studentName, isMuted = false, onToggleMute, compact = false, onStreamReady }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const mountedRef = useRef(true);

    // Expose stream via ref
    useImperativeHandle(ref, () => ({
      getStream: () => mediaStreamRef.current,
    }), []);

    const startCamera = useCallback(async () => {
      if (mediaStreamRef.current) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true, // Include audio for recording
        });
        if (!mountedRef.current) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadeddata = () => {
            if (mountedRef.current) {
              setCameraActive(true);
              // Notify parent that stream is ready
              if (onStreamReady) {
                onStreamReady(stream);
              }
            }
          };
        }
      } catch {
        if (mountedRef.current) setPermissionDenied(true);
      }
    }, [onStreamReady]);

    useEffect(() => {
      mountedRef.current = true;
      startCamera();
      return () => {
        mountedRef.current = false;
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(t => t.stop());
          mediaStreamRef.current = null;
        }
      };
    }, [startCamera]);

    if (compact) {
      return (
        <div className="relative aspect-video bg-gray-800">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 h-full w-full object-cover ${cameraActive ? 'opacity-100' : 'opacity-0'}`}
            style={{ transform: 'scaleX(-1)' }}
          />

          {/* Student name badge */}
          <div className="absolute bottom-2 left-2 flex items-center gap-2 z-10">
            <div className="h-6 w-6 rounded-full bg-maroon-600 flex items-center justify-center">
              <span className="text-xs text-white font-medium">
                {studentName.charAt(0)}
              </span>
            </div>
            <span className="text-xs text-white font-sans">{studentName}</span>
            <Volume2 size={12} className="text-white" />
          </div>

          {/* Controls */}
          <div className="absolute bottom-2 right-2 flex items-center gap-2 z-10">
            <button className="rounded-full bg-white/20 p-1.5 hover:bg-white/30 transition-colors">
              <Mic size={12} className="text-white" />
            </button>
            <button className="rounded-full bg-white/20 p-1.5 hover:bg-white/30 transition-colors">
              <Video size={12} className="text-white" />
            </button>
          </div>

          {/* Loading state */}
          {!cameraActive && !permissionDenied && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <Video size={24} className="text-gray-500 animate-pulse" />
            </div>
          )}

          {permissionDenied && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <VideoOff size={24} className="text-gray-500" />
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="relative aspect-video overflow-hidden rounded-xl border border-gray-200 bg-gray-800">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${cameraActive ? 'opacity-100' : 'opacity-0'
            }`}
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* Student name */}
        <div className="absolute top-3 left-3 z-10">
          <span className="text-xs font-medium text-white font-sans bg-black/40 px-2 py-1 rounded">
            {studentName}
          </span>
        </div>

        {/* Loading / Permission denied states */}
        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-800 z-20">
            {permissionDenied ? (
              <>
                <VideoOff size={32} className="mb-3 text-gray-500" />
                <p className="text-xs text-gray-400 font-sans">Camera access denied</p>
                <button
                  onClick={startCamera}
                  className="mt-2 rounded-lg bg-maroon-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-maroon-700 transition font-sans"
                >
                  Retry
                </button>
              </>
            ) : (
              <>
                <Video size={32} className="mb-3 text-gray-500 animate-pulse" />
                <p className="text-xs text-gray-400 font-sans">Starting camera...</p>
              </>
            )}
          </div>
        )}

        {/* Controls */}
        {onToggleMute && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
            <button
              onClick={onToggleMute}
              className={`rounded-full p-2 transition-colors ${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/20 hover:bg-white/30'
                }`}
            >
              {isMuted ? <MicOff size={16} className="text-white" /> : <Mic size={16} className="text-white" />}
            </button>
            <div className="rounded-full bg-white/20 p-2">
              <Video size={16} className="text-white" />
            </div>
          </div>
        )}
      </div>
    );
  });

export default StudentCameraView;
