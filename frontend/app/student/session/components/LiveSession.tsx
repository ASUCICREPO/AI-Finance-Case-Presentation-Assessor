'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Clock, Flag, ArrowLeft, ChevronRight, Upload } from 'lucide-react';
import SpreadsheetViewer from './SpreadsheetViewer';
import SubmitModal from './SubmitModal';
import AnamAvatarPanel from './AnamAvatarPanel';
import StudentCameraView from './StudentCameraView';
import { getAnamSessionToken } from '../../../services/api';
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
  workbookData: Record<string, { headers: string[]; rows: (string | number | null)[][]; rowCount: number }>;
  anamPersonaId?: string;
  onSubmit: () => void;
  onFileUpload?: (file: File) => void;
}

/**
 * Live Q&A Session — with Anam avatar, student camera, transcript overlay, and spreadsheet view.
 * Matches Figma design.
 */
export default function LiveSession({
  studentInfo,
  sessionType,
  agentCore,
  timer,
  workbookSheets,
  workbookData,
  anamPersonaId,
  onSubmit,
  onFileUpload,
}: LiveSessionProps) {
  const [showSpreadsheet, setShowSpreadsheet] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [anamSessionToken, setAnamSessionToken] = useState<string | null>(null);
  const [anamFailed, setAnamFailed] = useState(false);

  // Ref for piping assistant text to Anam avatar
  const onAssistantTextRef = useRef<((text: string, isFinal: boolean) => void) | null>(null);

  const { transcript, isAISpeaking, currentAIText, personaName, status, setMuteAudioPlayback } = agentCore;
  const { formattedTime, isLowTime } = timer;

  // Fetch Anam session token on mount
  useEffect(() => {
    if (!anamPersonaId) {
      setAnamFailed(true);
      return;
    }

    getAnamSessionToken(anamPersonaId)
      .then((token) => {
        setAnamSessionToken(token);
        setMuteAudioPlayback(true);
      })
      .catch((err) => {
        console.error('[LiveSession] Failed to get Anam token:', err);
        setAnamFailed(true);
        setMuteAudioPlayback(false);
      });
  }, [anamPersonaId, setMuteAudioPlayback]);

  // When we get assistant transcript, pipe to Anam for TTS
  useEffect(() => {
    if (!isAISpeaking || !currentAIText || anamFailed) return;
    if (onAssistantTextRef.current) {
      onAssistantTextRef.current(currentAIText, !isAISpeaking);
    }
  }, [currentAIText, isAISpeaking, anamFailed]);

  // File upload handler
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
  }, [onFileUpload]);

  const hasWorkbookData = workbookSheets.length > 0;

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header bar */}
      <div className="mb-4 rounded-xl border border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-gray-900 font-serif">
            {sessionType === 'practice' ? 'Practice' : ''} Session: Real Estate Investment
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            {status === 'active' ? 'Live' : 'Recording'}
          </span>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors font-sans">
          <Flag size={14} />
          Report
        </button>
      </div>

      <p className="mb-4 text-xs text-gray-500 font-sans">This session is being recorded</p>

      {showSpreadsheet ? (
        /* Spreadsheet View */
        <div>
          <button
            onClick={() => setShowSpreadsheet(false)}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 font-sans"
          >
            <ArrowLeft size={16} />
            Back to Q&A
          </button>
          <SpreadsheetViewer sheets={workbookSheets} data={workbookData} />
        </div>
      ) : (
        /* Main Q&A View */
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left - Avatar with transcript overlay */}
          <div className="lg:col-span-2">
            <div className="relative aspect-video overflow-hidden rounded-xl border border-gray-200 bg-gray-900">
              {/* Anam Avatar or Fallback */}
              {!anamFailed && anamPersonaId ? (
                <AnamAvatarPanel
                  anamPersonaId={anamPersonaId}
                  sessionToken={anamSessionToken}
                  isActive={status === 'active'}
                  personaName={personaName || 'AI Stakeholder'}
                  onAssistantTextRef={onAssistantTextRef}
                  fullScreen
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className={`mx-auto h-24 w-24 rounded-full border-4 ${isAISpeaking ? 'border-maroon-400 animate-pulse' : 'border-gray-700'} flex items-center justify-center bg-gray-800`}>
                      <span className="text-3xl text-white font-bold font-serif">
                        {(personaName || 'AI').charAt(0)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-gray-300 font-sans">{personaName || 'AI Stakeholder'}</p>
                  </div>
                </div>
              )}

              {/* Persona name badge */}
              <div className="absolute bottom-20 left-4 flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center">
                  <span className="text-xs text-white font-medium">
                    {(personaName || 'K').charAt(0)}
                  </span>
                </div>
                <span className="text-sm text-white font-sans">{personaName || 'Keith Clarkson'}</span>
              </div>

              {/* Transcript overlay */}
              {(isAISpeaking || currentAIText) && (
                <div className="absolute bottom-4 left-4 right-4 rounded-lg bg-black/70 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-amber-400 font-medium">🎙 AI Speaking</span>
                  </div>
                  <p className="text-sm text-white font-sans">
                    &quot;{currentAIText}&quot;
                  </p>
                </div>
              )}
            </div>

            {/* Upload spreadsheet button if no data yet */}
            {!hasWorkbookData && (
              <div className="mt-4">
                <label className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors font-sans">
                  <Upload size={16} />
                  Upload your spreadsheet
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* View spreadsheet button if data exists */}
            {hasWorkbookData && (
              <div className="mt-4">
                <button
                  onClick={() => setShowSpreadsheet(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors font-sans"
                >
                  View Spreadsheet
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Right - Timer, Student Info, Student Camera */}
          <div className="space-y-4">
            {/* Timer */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-medium text-gray-500 font-sans">Q&A Session Timer</h3>
              <div className="mt-2 flex items-center gap-2">
                <Clock size={20} className={isLowTime ? 'text-red-600' : 'text-gray-700'} />
                <span
                  className={`text-3xl font-bold font-sans ${isLowTime ? 'text-red-600' : 'text-gray-900'}`}
                >
                  {formattedTime}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500 font-sans">15-minute maximum session</p>
            </div>

            {/* Student Info */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-bold text-gray-900 font-sans mb-3">Student Info</h3>
              <dl className="space-y-2 text-sm font-sans">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Student</dt>
                  <dd className="font-medium text-gray-900">{studentInfo.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Group</dt>
                  <dd className="font-medium text-gray-900">{studentInfo.group}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Course</dt>
                  <dd className="font-medium text-gray-900">{studentInfo.course}</dd>
                </div>
              </dl>
            </div>

            {/* Note */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs text-amber-800 font-sans">
                <strong>Note:</strong> This assessment is AI-proctored and AI-graded. Final grading
                will be reviewed and handed over to your instructor and Teaching Assistant.
              </p>
            </div>

            {/* Avatar small preview + Student Camera */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              {/* AI Avatar small */}
              <div className="relative aspect-video bg-gray-900">
                {!anamFailed && anamPersonaId ? (
                  <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
                    Mr. Clarkson
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-16 w-16 rounded-full bg-gray-700 flex items-center justify-center">
                      <span className="text-xl text-white font-bold">
                        {(personaName || 'K').charAt(0)}
                      </span>
                    </div>
                  </div>
                )}
                {/* Speaking indicator */}
                {isAISpeaking && (
                  <div className="absolute bottom-2 left-2 right-2 rounded bg-black/60 px-2 py-1">
                    <p className="text-xs text-amber-400 font-sans">🎙 AI Speaking</p>
                    <p className="text-xs text-white font-sans truncate">&quot;{currentAIText}&quot;</p>
                  </div>
                )}
              </div>

              {/* Student Camera */}
              <StudentCameraView
                studentName={studentInfo.name}
                compact
              />
            </div>
          </div>
        </div>
      )}

      {/* Bottom actions */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors font-sans"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <button
          onClick={() => setShowSubmitModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-maroon-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-maroon-700 transition-colors font-sans"
        >
          Submit
          <ChevronRight size={16} />
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
