'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Video, VideoOff, MicOff, CheckCircle, AlertCircle, ChevronRight, ArrowLeft } from 'lucide-react';

interface CalibrationCheckProps {
  onComplete: () => void;
  onBack: () => void;
}

/**
 * Calibration Check - Audio and Video setup before starting assessment.
 * Tests microphone and camera access.
 */
export default function CalibrationCheck({ onComplete, onBack }: CalibrationCheckProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStatus, setCameraStatus] = useState<'checking' | 'granted' | 'denied'>('checking');
  const [micStatus, setMicStatus] = useState<'checking' | 'granted' | 'denied'>('checking');
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  const checkPermissions = useCallback(async () => {
    // Check camera
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = videoStream;
      }
      mediaStreamRef.current = videoStream;
      setCameraStatus('granted');
    } catch {
      setCameraStatus('denied');
    }

    // Check microphone
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStatus('granted');

      // Set up audio level monitoring
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(audioStream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      const updateLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioLevel(Math.min(100, average * 2));
        }
        animationRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      // Add audio tracks to existing stream
      if (mediaStreamRef.current) {
        audioStream.getAudioTracks().forEach(track => {
          mediaStreamRef.current?.addTrack(track);
        });
      } else {
        mediaStreamRef.current = audioStream;
      }
    } catch {
      setMicStatus('denied');
    }
  }, []);

  useEffect(() => {
    checkPermissions();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [checkPermissions]);

  const canProceed = cameraStatus === 'granted' && micStatus === 'granted';

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 font-serif mb-2">
        Audio & Video Calibration
      </h1>
      <p className="text-gray-600 font-sans mb-8">
        Please allow access to your camera and microphone to continue with the assessment.
      </p>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* Camera Check */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 font-sans">Camera</h3>
            {cameraStatus === 'granted' ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                <CheckCircle size={14} />
                Connected
              </span>
            ) : cameraStatus === 'denied' ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                <AlertCircle size={14} />
                Denied
              </span>
            ) : (
              <span className="text-xs text-gray-500">Checking...</span>
            )}
          </div>

          <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-900">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            {cameraStatus === 'denied' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
                <VideoOff size={32} className="text-gray-500 mb-2" />
                <p className="text-xs text-gray-400 font-sans">Camera access denied</p>
                <button
                  onClick={checkPermissions}
                  className="mt-2 text-xs text-maroon-400 hover:underline"
                >
                  Retry
                </button>
              </div>
            )}
            {cameraStatus === 'checking' && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <Video size={32} className="text-gray-500 animate-pulse" />
              </div>
            )}
          </div>
        </div>

        {/* Microphone Check */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 font-sans">Microphone</h3>
            {micStatus === 'granted' ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                <CheckCircle size={14} />
                Connected
              </span>
            ) : micStatus === 'denied' ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                <AlertCircle size={14} />
                Denied
              </span>
            ) : (
              <span className="text-xs text-gray-500">Checking...</span>
            )}
          </div>

          <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 flex flex-col items-center justify-center">
            {micStatus === 'granted' ? (
              <>
                <Mic size={48} className="text-maroon-600 mb-4" />
                <p className="text-sm text-gray-600 font-sans mb-4">Speak to test your microphone</p>
                <div className="w-full max-w-xs px-4">
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-75"
                      style={{ width: `${audioLevel}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-center mt-2">Audio Level</p>
                </div>
              </>
            ) : micStatus === 'denied' ? (
              <>
                <MicOff size={48} className="text-gray-400 mb-2" />
                <p className="text-xs text-gray-500 font-sans">Microphone access denied</p>
                <button
                  onClick={checkPermissions}
                  className="mt-2 text-xs text-maroon-400 hover:underline"
                >
                  Retry
                </button>
              </>
            ) : (
              <Mic size={48} className="text-gray-400 animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-8">
        <p className="text-sm text-amber-800 font-sans">
          <strong>Tips:</strong> Ensure you&apos;re in a quiet environment with good lighting. 
          Position your face clearly in the camera frame.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors font-sans"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <button
          onClick={onComplete}
          disabled={!canProceed}
          className={`inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-colors font-sans ${
            canProceed
              ? 'bg-maroon-600 text-white hover:bg-maroon-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
