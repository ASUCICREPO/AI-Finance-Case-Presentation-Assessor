'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, Flag, ChevronRight, Mic, MicOff, Circle } from 'lucide-react';
import SpreadsheetViewer from './SpreadsheetViewer';
import StudentCameraView, { StudentCameraViewRef } from './StudentCameraView';
import { useVideoRecorder } from '../../../hooks/useVideoRecorder';

// Web Speech API type declarations
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}

interface TimerState {
  timeRemaining: number;
  formattedTime: string;
  isLowTime: boolean;
  isExpired: boolean;
}

interface PresentationSessionProps {
  sessionType: 'practice' | 'graded';
  assessmentTitle?: string;
  studentName?: string;
  personaName?: string;
  timer: TimerState;
  workbookSheets: string[];
  workbookData: Record<string, { headers: string[]; rows: (string | number | null)[][]; rowCount: number }>;
  onProceedToQA: (presentationTranscript: string, videoBlob: Blob | null, presentationDuration: number) => void;
  presentationDuration?: number;
}

/**
 * Presentation Session — Student presents their analysis before Q&A.
 * Captures speech transcript using Web Speech API for context in Q&A.
 * Layout: Spreadsheet on left, Student camera on right.
 */
export default function PresentationSession({
  sessionType,
  assessmentTitle,
  studentName,
  personaName = 'Mr. Clarkson',
  timer,
  workbookSheets,
  workbookData,
  onProceedToQA,
  presentationDuration,
}: PresentationSessionProps) {
  const [showIntro, setShowIntro] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [currentSpeech, setCurrentSpeech] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isListeningRef = useRef(false); // Ref to avoid stale closure in callbacks
  const cameraRef = useRef<StudentCameraViewRef>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Video recording
  const videoRecorder = useVideoRecorder();

  const hasWorkbookData = workbookSheets.length > 0;

  // Keep ref in sync with state
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // Initialize Speech Recognition (only once on mount)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[PresentationSession] Speech recognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(prev => [...prev, finalTranscript.trim()]);
      }
      setCurrentSpeech(interimTranscript);
    };

    recognition.onerror = (event) => {
      console.error('[PresentationSession] Speech recognition error:', event.error);
      // On recoverable errors, restart if we should be listening
      if (event.error === 'no-speech' || event.error === 'audio-capture' || event.error === 'network') {
        setTimeout(() => {
          if (isListeningRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
              console.log('[PresentationSession] Restarted speech recognition after error');
            } catch (e) {
              // Ignore - might already be running
            }
          }
        }, 300);
      }
    };

    recognition.onend = () => {
      // Auto-restart if we should still be listening (use ref to avoid stale closure)
      if (isListeningRef.current) {
        try {
          recognition.start();
          console.log('[PresentationSession] Auto-restarted speech recognition');
        } catch (e) {
          // Ignore - might already be running
        }
      }
    };

    recognitionRef.current = recognition;

    // Auto-start listening immediately after setup
    const startTimer = setTimeout(() => {
      try {
        recognition.start();
        setIsListening(true);
        isListeningRef.current = true;
        console.log('[PresentationSession] ✅ Speech recognition auto-started');
      } catch (e) {
        console.error('[PresentationSession] Failed to auto-start speech recognition:', e);
      }
    }, 300);

    return () => {
      clearTimeout(startTimer);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore
        }
      }
    };
  }, []); // Only run once on mount

  // Track presentation time
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Format elapsed time as MM:SS
  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle proceed to Q&A - pass the collected transcript and video
  const handleProceedToQA = async () => {
    // Stop recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore
      }
    }
    setIsListening(false);
    isListeningRef.current = false;

    // Stop video recording and get blob
    let videoBlob: Blob | null = null;
    if (videoRecorder.isRecording) {
      videoBlob = await videoRecorder.stopRecording();
      console.log('[PresentationSession] Video recording stopped, blob size:', videoBlob?.size);
    }

    // Combine all transcript segments
    const fullTranscript = transcript.join(' ').trim();
    console.log('[PresentationSession] Presentation transcript:', fullTranscript.substring(0, 200) + '...');
    onProceedToQA(fullTranscript, videoBlob, elapsedTime);
  };

  // Track if we've already started recording to prevent re-triggering
  const recordingStartedRef = useRef(false);

  // Handle camera stream ready - start video recording
  const handleStreamReady = useCallback((stream: MediaStream) => {
    setCameraStream(stream);
    // Auto-start recording when stream is ready (only once)
    if (!recordingStartedRef.current) {
      recordingStartedRef.current = true;
      videoRecorder.startRecording(stream).catch(err => {
        console.error('[PresentationSession] Failed to start video recording:', err);
        recordingStartedRef.current = false; // Allow retry on error
      });
    }
  }, []); // Empty deps - we use ref to track state instead

  // Check if minimum presentation time reached (1 minute)
  const minPresentationTime = 60;
  const canProceed = elapsedTime >= minPresentationTime;

  // Handle intro completion - start the actual presentation
  const handleStartPresentation = useCallback(() => {
    setShowIntro(false);
  }, []);

  // Intro screen with persona welcome message
  if (showIntro) {
    return (
      <div className="flex flex-col h-[calc(100vh-140px)] items-center justify-center">
        <div className="max-w-2xl w-full mx-auto p-8">
          {/* Persona Avatar */}
          <div className="flex flex-col items-center mb-8">
            <div className="h-24 w-24 rounded-full bg-maroon-600 flex items-center justify-center mb-4 shadow-lg">
              <span className="text-4xl text-white font-bold font-serif">
                {personaName.charAt(0)}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 font-serif">{personaName}</h2>
            <p className="text-gray-500 text-sm">Evaluator</p>
          </div>

          {/* Welcome Message Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="flex items-start gap-4 mb-6">
              <div className="h-10 w-10 rounded-full bg-maroon-100 flex items-center justify-center shrink-0">
                <span className="text-lg text-maroon-600 font-bold">{personaName.charAt(0)}</span>
              </div>
              <div className="flex-1">
                <p className="text-lg text-gray-800 leading-relaxed">
                  &ldquo;Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {studentName || 'student'}. I&apos;m {personaName}, and I&apos;ll be evaluating your presentation today on <strong>{assessmentTitle || 'this case analysis'}</strong>.
                </p>
                <p className="text-lg text-gray-800 leading-relaxed mt-4">
                  Please walk me through your financial analysis. Take your time, and when you&apos;re ready, click the button below to begin. I&apos;ll have some questions for you after your presentation.&rdquo;
                </p>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">What to expect:</h3>
              <ul className="text-sm text-gray-600 space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-maroon-600">•</span>
                  <span>Present your analysis while viewing your spreadsheet</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-maroon-600">•</span>
                  <span>Your presentation will be recorded for context</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-maroon-600">•</span>
                  <span>After presenting, I&apos;ll ask follow-up questions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-maroon-600">•</span>
                  <span>Minimum presentation time: 1 minute</span>
                </li>
              </ul>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartPresentation}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-maroon-600 px-6 py-4 text-base font-semibold text-white hover:bg-maroon-700 transition-colors"
            >
              Begin Presentation
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header bar */}
      <div className="mb-3 rounded-xl border border-gray-200 bg-white px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-gray-900 font-serif">
            Presentation: {assessmentTitle || 'Assessment'}
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500 px-3 py-1 text-xs font-medium text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            Presenting
          </span>
          {/* Recording indicator */}
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${videoRecorder.isRecording ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
            }`}>
            {videoRecorder.isRecording ? <Circle size={12} className="fill-red-500 text-red-500" /> : <MicOff size={12} />}
            {videoRecorder.isRecording ? 'Recording Video' : 'Not Recording'}
          </span>
          {/* Speech indicator */}
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${isListening ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
            {isListening ? <Mic size={12} /> : <MicOff size={12} />}
            {isListening ? 'Transcribing' : 'Paused'}
          </span>
          {/* Presentation time */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
            <Clock size={12} />
            {formatElapsedTime(elapsedTime)}
          </span>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors font-sans">
          <Flag size={14} />
          Report
        </button>
      </div>

      <p className="mb-3 text-xs text-gray-400 font-sans shrink-0">
        Present your analysis. Your presentation is being recorded for Q&A context.
      </p>

      {/* Main content: Spreadsheet LEFT, Camera RIGHT */}
      <div className="flex gap-4" style={{ minHeight: '75vh' }}>
        {/* LEFT - Spreadsheet Viewer (takes most of the space) */}
        <div className="flex-1 min-w-0">
          <div className="h-full overflow-hidden">
            {hasWorkbookData ? (
              <SpreadsheetViewer sheets={workbookSheets} data={workbookData} />
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white p-8 h-full flex flex-col items-center justify-center">
                <p className="text-gray-500 font-sans text-sm">No spreadsheet uploaded</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT - Student Camera & Controls */}
        <div className="w-80 shrink-0 flex flex-col gap-3">
          {/* Student Camera - Large view during presentation */}
          <div className="flex-1 min-h-0">
            <div className="h-full rounded-xl border border-gray-200 bg-gray-900 overflow-hidden">
              <StudentCameraView
                ref={cameraRef}
                studentName={studentName || 'Student'}
                onStreamReady={handleStreamReady}
              />
            </div>
          </div>

          {/* Timer Display */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Presentation Time</p>
            <p className="text-3xl font-bold text-gray-900 font-mono">
              {formatElapsedTime(elapsedTime)}
            </p>
            {!canProceed && (
              <p className="text-xs text-amber-600 mt-2">
                Minimum 1 minute before proceeding
              </p>
            )}
          </div>

          {/* Proceed to Q&A Button */}
          <button
            onClick={handleProceedToQA}
            disabled={!canProceed}
            className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-medium transition-colors font-sans ${canProceed
              ? 'bg-maroon-600 text-white hover:bg-maroon-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
          >
            Proceed to Q&A
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Live transcript preview - pushed below, scroll to see */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-xs text-gray-500 mb-2">Live Transcript Preview:</p>
        <p className="text-sm text-gray-700 font-sans">
          {transcript.slice(-3).join(' ')}
          {currentSpeech && <span className="text-gray-400 italic"> {currentSpeech}</span>}
          {!transcript.length && !currentSpeech && (
            <span className="text-gray-400 italic">Start speaking to see your transcript...</span>
          )}
        </p>
      </div>
    </div>
  );
}
