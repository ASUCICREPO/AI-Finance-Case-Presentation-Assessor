'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Video, Mic, Volume2, CheckCircle, AlertCircle, ChevronRight, ArrowLeft, HelpCircle } from 'lucide-react';

interface CalibrationCheckProps {
  onComplete: () => void;
  onBack: () => void;
}

type CheckStatus = 'pending' | 'passed' | 'failed';

/**
 * System Calibration - Video, Microphone, and Speaker check before starting assessment.
 * Matches Figma design with face overlay, checklist, and environment rules.
 */
export default function CalibrationCheck({ onComplete, onBack }: CalibrationCheckProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStatus, setCameraStatus] = useState<CheckStatus>('pending');
  const [micStatus, setMicStatus] = useState<CheckStatus>('pending');
  const [speakerStatus, setSpeakerStatus] = useState<CheckStatus>('pending');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isPlayingSound, setIsPlayingSound] = useState(false);
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
      setCameraStatus('passed');
    } catch {
      setCameraStatus('failed');
    }

    // Check microphone
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStatus('passed');

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
      setMicStatus('failed');
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

  // Play test sound
  const playTestSound = () => {
    setIsPlayingSound(true);
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 440; // A4 note
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;

    oscillator.start();

    setTimeout(() => {
      oscillator.stop();
      audioContext.close();
      setIsPlayingSound(false);
      setSpeakerStatus('passed');
    }, 1000);
  };

  const canProceed = cameraStatus === 'passed' && micStatus === 'passed' && speakerStatus === 'passed';

  const getStatusBadge = (status: CheckStatus) => {
    switch (status) {
      case 'passed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
            PASSED
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
            FAILED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
            PENDING
          </span>
        );
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900 font-serif mb-2">
        System Calibration
      </h1>
      <p className="text-gray-500 font-sans mb-8">
        To guarantee exam integrity, we must verify your video feed, microphone level, and speakers. Please complete the quick tests below.
      </p>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - Tests */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Video Feed */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-2 mb-4">
              <Video size={18} className="text-gray-600" />
              <h3 className="text-base font-bold text-gray-900 font-sans">1. Video Feed (Webcam)</h3>
            </div>

            <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-900">
              {/* Live camera feed badge */}
              <div className="absolute top-3 left-3 z-10">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500 px-2.5 py-1 text-xs font-medium text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  LIVE CAMERA FEED
                </span>
              </div>

              {/* Video element */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />

              {/* Face overlay - dotted circle */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-64 border-2 border-dashed border-white/50 rounded-full" />
              </div>

              {cameraStatus === 'failed' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
                  <AlertCircle size={48} className="text-red-400 mb-2" />
                  <p className="text-sm text-gray-400 font-sans">Camera access denied</p>
                  <button
                    onClick={checkPermissions}
                    className="mt-3 text-sm text-maroon-400 hover:underline"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 2. Microphone Sensitivity */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Mic size={18} className="text-gray-600" />
                <h3 className="text-base font-bold text-gray-900 font-sans">2. Microphone Sensitivity</h3>
              </div>
              <span className="text-sm text-gray-500">Speak out loud to verify levels</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500 w-12">Input</span>
              <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-75 rounded-full"
                  style={{ width: `${audioLevel}%` }}
                />
              </div>
              <span className={`text-sm font-medium ${audioLevel > 20 ? 'text-green-600' : 'text-gray-400'}`}>
                {audioLevel > 20 ? 'Good Level' : 'Speak now'}
              </span>
            </div>
          </div>

          {/* 3. Speaker Test */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Volume2 size={18} className="text-gray-600" />
                  <h3 className="text-base font-bold text-gray-900 font-sans">3. Speaker Test</h3>
                </div>
                <p className="text-sm text-gray-500">Play a test sound to ensure your speakers are working correctly.</p>
              </div>
              <button
                onClick={playTestSound}
                disabled={isPlayingSound}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${isPlayingSound
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-700 text-white hover:bg-gray-800'
                  }`}
              >
                <Volume2 size={16} />
                {isPlayingSound ? 'Playing...' : 'Play Sound'}
              </button>
            </div>
          </div>
        </div>

        {/* Right column - Checklist & Rules */}
        <div className="space-y-6">
          {/* Calibration Checklist */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-base font-bold text-gray-900 font-sans mb-4">Calibration Checklist</h3>

            <div className="space-y-4">
              {/* Video Camera */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${cameraStatus === 'passed' ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Video size={16} className={cameraStatus === 'passed' ? 'text-green-600' : 'text-gray-500'} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Video Camera Connection</p>
                    <p className="text-xs text-gray-500">{cameraStatus === 'passed' ? 'Verified & Ready' : 'Requires check'}</p>
                  </div>
                </div>
                {getStatusBadge(cameraStatus)}
              </div>

              {/* Microphone */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${micStatus === 'passed' ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Mic size={16} className={micStatus === 'passed' ? 'text-green-600' : 'text-gray-500'} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Microphone Signal Input</p>
                    <p className="text-xs text-gray-500">{micStatus === 'passed' ? 'Verified & Ready' : 'Requires check'}</p>
                  </div>
                </div>
                {getStatusBadge(micStatus)}
              </div>

              {/* Speaker */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${speakerStatus === 'passed' ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Volume2 size={16} className={speakerStatus === 'passed' ? 'text-green-600' : 'text-gray-500'} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Audio Speaker Diagnostics</p>
                    <p className="text-xs text-gray-500">{speakerStatus === 'passed' ? 'Verified & Ready' : 'Requires check'}</p>
                  </div>
                </div>
                {getStatusBadge(speakerStatus)}
              </div>
            </div>
          </div>

          {/* Environment Rules */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={18} className="text-amber-600" />
              <h3 className="text-base font-bold text-gray-900 font-sans">Environment Rules</h3>
            </div>

            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                Ensure your face is clearly visible inside the box overlay.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                Do not wear headphones, earphones, or smart accessories.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                Testing environment must be a quiet, private room.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                Stable high-speed internet connection is required.
              </li>
            </ul>
          </div>

          {/* Troubleshoot link */}
          <button className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <HelpCircle size={16} />
            Having issues? Troubleshoot
          </button>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors font-sans"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <button
          onClick={onComplete}
          disabled={!canProceed}
          className={`inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-colors font-sans ${canProceed
              ? 'bg-maroon-600 text-white hover:bg-maroon-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
        >
          Begin Q&A session
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
