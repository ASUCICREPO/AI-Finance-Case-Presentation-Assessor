'use client';

import React, { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Video, VideoOff, Mic, MicOff } from 'lucide-react';

interface StudentCameraViewProps {
  studentName: string;
  isMuted?: boolean;
  onToggleMute?: () => void;
  compact?: boolean;
  showControls?: boolean;
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
  function StudentCameraView({ studentName, isMuted = false, onToggleMute, compact = false, showControls = false, onStreamReady }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const mountedRef = useRef(true);

    // Expose stream via ref
    useImperativeHandle(ref, () => ({
      getStream: () => mediaStreamRef.current,
    }), []);

    // Store callback in ref to avoid dependency issues
    const onStreamReadyRef = useRef(onStreamReady);
    useEffect(() => {
      onStreamReadyRef.current = onStreamReady;
    }, [onStreamReady]);

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
              // Notify parent that stream is ready (use ref to get latest callback)
              if (onStreamReadyRef.current) {
                onStreamReadyRef.current(stream);
              }
            }
          };
        }
      } catch {
        if (mountedRef.current) setPermissionDenied(true);
      }
    }, []); // No dependencies - camera should only start once

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

          {/* Student name badge top-left */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
            <div className="h-6 w-6 rounded-full bg-maroon-600 flex items-center justify-center">
              <span className="text-xs text-white font-medium">
                {studentName.charAt(0)}
              </span>
            </div>
            <span className="text-xs text-white font-semibold font-sans drop-shadow">{studentName}</span>
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

    // showControls mode — matches the mockup design
    if (showControls) {
      return (
        <div className="relative w-full h-full bg-gray-800 min-h-[200px]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 h-full w-full object-cover ${cameraActive ? 'opacity-100' : 'opacity-0'}`}
            style={{ transform: 'scaleX(-1)' }}
          />

          {/* Student name badge top-left */}
          <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
            <div className="h-7 w-7 rounded-full bg-maroon-600 flex items-center justify-center shrink-0">
              <span className="text-xs text-white font-semibold">
                {studentName.charAt(0)}
              </span>
            </div>
            <span className="text-sm font-semibold text-white drop-shadow font-sans">{studentName}</span>
          </div>

          {/* Mic + Video buttons centered at bottom — matches mockup */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
            <button className="rounded-full bg-white/25 backdrop-blur-sm p-3 hover:bg-white/40 transition-colors shadow-lg">
              <Mic size={18} className="text-white" />
            </button>
            <button className="rounded-full bg-white/25 backdrop-blur-sm p-3 hover:bg-white/40 transition-colors shadow-lg">
              <Video size={18} className="text-white" />
            </button>
          </div>

          {/* Loading state */}
          {!cameraActive && !permissionDenied && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800 z-20">
              <Video size={28} className="text-gray-500 animate-pulse mb-2" />
              <p className="text-xs text-gray-400">Starting camera...</p>
            </div>
          )}
          {permissionDenied && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800 z-20">
              <VideoOff size={28} className="text-gray-500 mb-2" />
              <p className="text-xs text-gray-400">Camera access denied</p>
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
