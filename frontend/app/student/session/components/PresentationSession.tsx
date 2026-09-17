'use client';

import { useState, useEffect, useRef } from 'react';
import { Clock, Flag, ChevronRight, Pause, Play, Video, VideoOff } from 'lucide-react';
import SpreadsheetViewer from './SpreadsheetViewer';
import StudentCameraView from './StudentCameraView';

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
  onProceedToQA: () => void;
  presentationDuration?: number; // in seconds, undefined means unlimited
}

/**
 * Presentation Session — Student presents their analysis before Q&A.
 * Layout: Spreadsheet on left, Student camera on right.
 * No AI avatar or voice during presentation phase.
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
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { formattedTime, isLowTime } = timer;
  const hasWorkbookData = workbookSheets.length > 0;

  // Track presentation time
  useEffect(() => {
    if (!isPaused) {
      intervalRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused]);

  // Format elapsed time as MM:SS
  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Check if minimum presentation time reached (e.g., 1 minute)
  const minPresentationTime = 60; // 1 minute minimum
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
        Present your analysis. Click &quot;Proceed to Q&A&quot; when ready for questions.
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
        </div>

        {/* RIGHT - Student Camera & Controls */}
        <div className="w-80 shrink-0 flex flex-col gap-3">
          {/* Student Camera - Large view during presentation */}
          <div className="flex-1 min-h-0">
            <div className="h-full rounded-xl border border-gray-200 bg-gray-900 overflow-hidden">
              <StudentCameraView studentName={studentName || 'Student'} />
            </div>
          </div>

          {/* Presentation Tips */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-2">Presentation Tips</h3>
            <ul className="space-y-1.5 text-xs text-gray-600">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-maroon-400" />
                Walk through your financial model clearly
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-maroon-400" />
                Highlight key assumptions and metrics
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-maroon-400" />
                State your recommendation confidently
              </li>
            </ul>
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
            onClick={onProceedToQA}
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
