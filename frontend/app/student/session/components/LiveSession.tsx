'use client';

import { useState } from 'react';
import { Clock, Mic, Video, Volume2, FileSpreadsheet, Flag } from 'lucide-react';
import SpreadsheetViewer from './SpreadsheetViewer';
import SubmitModal from './SubmitModal';
import type { UseAgentCoreReturn } from '../../../hooks/useAgentCore';

interface TimerState {
  timeRemaining: number;
  formattedTime: string;
  isLowTime: boolean;
  isExpired: boolean;
}

interface StudentInfo {
  name: string;
  group: string;
  course: string;
}

interface LiveSessionProps {
  studentInfo: StudentInfo;
  sessionType: 'practice' | 'graded';
  agentCore: UseAgentCoreReturn;
  timer: TimerState;
  workbookSheets: string[];
  onSubmit: () => void;
}

/**
 * Live Q&A Session — wired to AgentCore WebSocket and session timer.
 * Shows questions + transcripts on left, AI persona + student video on right.
 */
export default function LiveSession({
  studentInfo,
  sessionType,
  agentCore,
  timer,
  workbookSheets,
  onSubmit,
}: LiveSessionProps) {
  const [showSpreadsheet, setShowSpreadsheet] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const { transcript, isAISpeaking, currentAIText, personaName } = agentCore;
  const { formattedTime, isLowTime } = timer;

  // Get final transcript entries (questions from assistant, answers from user)
  const finalEntries = transcript.filter((e) => e.isFinal);
  const questions = finalEntries.filter((e) => e.role === 'assistant');

  return (
    <div className="mx-auto max-w-6xl">
      {/* Session header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-gray-900 font-serif">
            {sessionType === 'practice' ? 'Practice' : ''} Session: Real Estate Investment Case Study
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            Recording
          </span>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors font-sans">
          <Flag size={14} />
          Report
        </button>
      </div>
      <p className="mb-6 text-xs text-gray-500 font-sans">This session is being recorded</p>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left — Q&A Transcript or Spreadsheet */}
        <div className="lg:col-span-2">
          {showSpreadsheet ? (
            <div>
              <button
                onClick={() => setShowSpreadsheet(false)}
                className="mb-4 text-sm font-medium text-maroon-600 hover:underline font-sans"
              >
                &larr; Back to Q&A
              </button>
              <SpreadsheetViewer />
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 font-serif">Q&A</h2>
                  <p className="mt-1 text-sm text-gray-500 font-sans">
                    Respond to AI-generated questions. Your responses are being recorded and transcribed.
                  </p>
                </div>
                <button
                  onClick={() => setShowSpreadsheet(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors font-sans"
                >
                  <FileSpreadsheet size={16} />
                  Spreadsheet
                </button>
              </div>

              {/* Live transcript */}
              <div className="space-y-4 max-h-[50vh] overflow-y-auto scrollbar-hide">
                {questions.length === 0 && (
                  <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
                      ...
                    </span>
                    <p className="text-sm text-gray-500 font-sans italic">
                      Waiting for {personaName || 'AI'} to begin questioning...
                    </p>
                  </div>
                )}

                {finalEntries.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 rounded-lg border p-4 ${entry.role === 'assistant'
                      ? 'border-maroon-200 bg-maroon-50/50'
                      : 'border-green-200 bg-green-50/50'
                      }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${entry.role === 'assistant'
                        ? 'bg-maroon-200 text-maroon-700'
                        : 'bg-green-200 text-green-700'
                        }`}
                    >
                      {entry.role === 'assistant' ? 'Q' : 'A'}
                    </span>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-500 font-sans mb-1">
                        {entry.role === 'assistant' ? personaName || 'AI Stakeholder' : studentInfo.name}
                      </p>
                      <p className="text-sm text-gray-900 font-sans">{entry.text}</p>
                    </div>
                  </div>
                ))}

                {/* Partial (currently speaking) indicator */}
                {isAISpeaking && currentAIText && (
                  <div className="flex items-start gap-3 rounded-lg border border-maroon-100 bg-maroon-50/30 p-4 opacity-70">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-maroon-200 text-xs font-medium text-maroon-700 animate-pulse">
                      Q
                    </span>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-500 font-sans mb-1">
                        {personaName || 'AI'} (speaking...)
                      </p>
                      <p className="text-sm text-gray-700 font-sans italic">{currentAIText}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right — Timer + Video Feeds */}
        <div className="space-y-4">
          {/* Timer */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-medium text-gray-500 font-sans">Q&A Session Timer</h3>
            <div className="mt-2 flex items-center gap-2">
              <Clock size={18} className={isLowTime ? 'text-red-600' : 'text-gray-700'} />
              <span
                className={`text-3xl font-bold font-sans ${isLowTime ? 'text-red-600' : 'text-gray-900'
                  }`}
              >
                {formattedTime}
              </span>
            </div>
            <p className={`mt-1 text-xs font-sans ${isLowTime ? 'text-red-500' : 'text-gray-500'}`}>
              {isLowTime ? '1 minute remaining' : '15-minute maximum session'}
            </p>
          </div>

          {/* AI Persona Video */}
          <div className="relative aspect-video overflow-hidden rounded-xl border border-gray-200 bg-gray-900">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-20 w-20 rounded-full bg-gray-700" />
            </div>
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="text-xs font-medium text-white font-sans">
                {personaName || 'Mr. Clarkson'}
              </span>
            </div>
            <button className="absolute top-3 right-3 rounded-full bg-white/20 p-1.5">
              <Volume2 size={14} className="text-white" />
            </button>

            {/* AI speaking indicator */}
            {isAISpeaking && currentAIText && (
              <div className="absolute bottom-3 left-3 right-3 rounded-lg bg-black/60 p-2">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-[10px] font-medium text-gold-500">AI Speaking</span>
                </div>
                <p className="text-xs text-white font-sans line-clamp-2">
                  &quot;{currentAIText}&quot;
                </p>
              </div>
            )}
          </div>

          {/* Student Webcam */}
          <div className="relative aspect-video overflow-hidden rounded-xl border border-gray-200 bg-gray-800">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-16 w-16 rounded-full bg-gray-600" />
            </div>
            <div className="absolute top-3 left-3">
              <span className="text-xs font-medium text-white font-sans">{studentInfo.name}</span>
            </div>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3">
              <button className="rounded-full bg-white/20 p-2 hover:bg-white/30 transition-colors">
                <Mic size={16} className="text-white" />
              </button>
              <button className="rounded-full bg-white/20 p-2 hover:bg-white/30 transition-colors">
                <Video size={16} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Submit button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={() => setShowSubmitModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-maroon-600 px-6 py-3 text-white font-sans font-medium hover:bg-maroon-700 transition-colors"
        >
          Submit
          <span>&rarr;</span>
        </button>
      </div>

      {/* Submit confirmation modal */}
      <SubmitModal
        isOpen={showSubmitModal}
        sessionType={sessionType}
        onConfirm={() => {
          setShowSubmitModal(false);
          onSubmit();
        }}
        onCancel={() => setShowSubmitModal(false)}
      />
    </div>
  );
}
