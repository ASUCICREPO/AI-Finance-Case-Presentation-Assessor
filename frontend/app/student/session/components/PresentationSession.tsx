'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, Flag, ChevronRight, Mic, MicOff } from 'lucide-react';
import SpreadsheetViewer from './SpreadsheetViewer';
import StudentCameraView from './StudentCameraView';

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
  timer: TimerState;
  workbookSheets: string[];
  workbookData: Record<string, { headers: string[]; rows: (string | number | null)[][]; rowCount: number }>;
  onProceedToQA: (presentationTranscript: string) => void;
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
  timer,
  workbookSheets,
  workbookData,
  onProceedToQA,
  presentationDuration,
}: PresentationSessionProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [currentSpeech, setCurrentSpeech] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const hasWorkbookData = workbookSheets.length > 0;

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
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
          if (event.error === 'no-speech' || event.error === 'audio-capture') {
            // Restart recognition
            try {
              recognition.stop();
              setTimeout(() => {
                if (isListening) recognition.start();
              }, 100);
            } catch (e) {
              // Ignore
            }
          }
        };

        recognition.onend = () => {
          // Auto-restart if still listening
          if (isListening) {
            try {
              recognition.start();
            } catch (e) {
              // Ignore - might already be running
            }
          }
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore
        }
      }
    };
  }, [isListening]);

  // Auto-start listening when component mounts
  useEffect(() => {
    const startListening = () => {
      if (recognitionRef.current && !isListening) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
          console.log('[PresentationSession] Started speech recognition');
        } catch (e) {
          console.error('[PresentationSession] Failed to start speech recognition:', e);
        }
      }
    };

    // Small delay to ensure component is mounted
    const timer = setTimeout(startListening, 500);
    return () => clearTimeout(timer);
  }, []);

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

  // Toggle speech recognition
  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error('Failed to start recognition:', e);
      }
    }
  }, [isListening]);

  // Handle proceed to Q&A - pass the collected transcript
  const handleProceedToQA = () => {
    // Stop recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore
      }
    }
    setIsListening(false);

    // Combine all transcript segments
    const fullTranscript = transcript.join(' ').trim();
    console.log('[PresentationSession] Presentation transcript:', fullTranscript.substring(0, 200) + '...');
    onProceedToQA(fullTranscript);
  };

  // Check if minimum presentation time reached (1 minute)
  const minPresentationTime = 60;
  const canProceed = elapsedTime >= minPresentationTime;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
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
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${isListening ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
            }`}>
            {isListening ? <Mic size={12} /> : <MicOff size={12} />}
            {isListening ? 'Recording' : 'Paused'}
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
      <div className="flex gap-4 flex-1 min-h-0">
        {/* LEFT - Spreadsheet Viewer */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-hidden">
            {hasWorkbookData ? (
              <SpreadsheetViewer sheets={workbookSheets} data={workbookData} />
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white p-8 h-full flex flex-col items-center justify-center">
                <p className="text-gray-500 font-sans text-sm">No spreadsheet uploaded</p>
              </div>
            )}
          </div>

          {/* Live transcript preview */}
          <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4 max-h-32 overflow-y-auto">
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

        {/* RIGHT - Student Camera & Controls */}
        <div className="w-80 shrink-0 flex flex-col gap-3">
          {/* Student Camera - Large view during presentation */}
          <div className="flex-1 min-h-0">
            <div className="h-full rounded-xl border border-gray-200 bg-gray-900 overflow-hidden">
              <StudentCameraView studentName={studentName || 'Student'} />
            </div>
          </div>

          {/* Mic toggle */}
          <button
            onClick={toggleListening}
            className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${isListening
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            {isListening ? <Mic size={16} /> : <MicOff size={16} />}
            {isListening ? 'Pause Recording' : 'Resume Recording'}
          </button>

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
            {transcript.length > 0 && (
              <p className="text-xs text-green-600 mt-1">
                {transcript.length} segments captured
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
    </div>
  );
}
