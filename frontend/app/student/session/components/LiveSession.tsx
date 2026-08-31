'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Clock, Flag, ChevronRight, Upload, Volume2 } from 'lucide-react';
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
 * Live Q&A Session — Spreadsheet on left, Q&A Panel (timer, avatar, camera) on right.
 * Both always visible side by side.
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
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [anamSessionToken, setAnamSessionToken] = useState<string | null>(null);
  const [anamFailed, setAnamFailed] = useState(false);

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
        console.log('[LiveSession] Anam token received, Nova Sonic audio MUTED');
      })
      .catch((err) => {
        console.error('[LiveSession] Failed to get Anam token:', err);
        setAnamFailed(true);
        setMuteAudioPlayback(false);
      });
  }, [anamPersonaId, setMuteAudioPlayback]);

  // Pipe assistant transcript to Anam for TTS
  const lastFinalTextRef = useRef<string>('');

  useEffect(() => {
    const finalAssistantEntries = transcript.filter(e => e.role === 'assistant' && e.isFinal);
    const latestFinal = finalAssistantEntries[finalAssistantEntries.length - 1];

    if (latestFinal && latestFinal.text !== lastFinalTextRef.current && !anamFailed) {
      lastFinalTextRef.current = latestFinal.text;
      if (onAssistantTextRef.current) {
        console.log('[LiveSession] Sending to Anam TTS:', latestFinal.text.substring(0, 50) + '...');
        onAssistantTextRef.current(latestFinal.text, true);
      }
    }
  }, [transcript, anamFailed]);

  // File upload handler
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
  }, [onFileUpload]);

  const hasWorkbookData = workbookSheets.length > 0;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* Header bar */}
      <div className="mb-4 rounded-xl border border-gray-200 bg-white px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-gray-900 font-serif">
            {sessionType === 'practice' ? 'Practice' : 'Real'} Session: Real Estate Investment
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

      <p className="mb-4 text-xs text-gray-500 font-sans shrink-0">This session is being recorded</p>

      {/* Main content: Spreadsheet LEFT, Q&A Panel RIGHT - side by side */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* LEFT - Spreadsheet Viewer (takes remaining space) */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {hasWorkbookData ? (
            <SpreadsheetViewer sheets={workbookSheets} data={workbookData} />
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-8 flex-1 flex flex-col items-center justify-center">
              <p className="text-gray-500 mb-4 font-sans">No spreadsheet uploaded yet</p>
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
        </div>

        {/* RIGHT - Q&A Session Panel (Timer, Avatar, Camera, Submit) - fixed width */}
        <div className="w-[300px] shrink-0 space-y-3 flex flex-col">
          {/* Q&A Session Timer */}
          <div className="rounded-xl bg-gray-100 p-4 shrink-0">
            <h3 className="text-sm font-bold text-gray-900 font-sans mb-2">Q&A Session</h3>
            <div className="flex items-center gap-2">
              <Clock size={20} className="text-gray-600" />
              <span className={`text-3xl font-bold font-sans ${isLowTime ? 'text-red-600' : 'text-gray-900'}`}>
                {formattedTime}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500 font-sans">15-minute maximum session</p>
          </div>

          {/* AI Avatar Card */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden flex-1 flex flex-col">
            {/* Avatar name header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 shrink-0">
              <span className="text-sm font-medium text-gray-900 font-sans">
                {personaName || 'Mr. Clarkson'}
              </span>
              <button className="rounded-full p-1 hover:bg-gray-100">
                <Volume2 size={16} className="text-gray-500" />
              </button>
            </div>

            {!anamFailed && anamPersonaId ? (
              <div className="relative flex-1">
                <AnamAvatarPanel
                  anamPersonaId={anamPersonaId}
                  sessionToken={anamSessionToken}
                  isActive={status === 'active'}
                  personaName={personaName || 'Mr. Clarkson'}
                  onAssistantTextRef={onAssistantTextRef}
                />
                {/* AI Speaking indicator */}
                {isAISpeaking && currentAIText && (
                  <div className="absolute bottom-0 left-0 right-0 bg-maroon-600/90 px-3 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-white font-medium font-sans">🔊 AI Speaking</span>
                    </div>
                    <p className="text-xs text-white font-sans line-clamp-2">
                      &quot;{currentAIText}&quot;
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative flex-1 bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                  <div className={`mx-auto h-16 w-16 rounded-full border-4 ${isAISpeaking ? 'border-maroon-400 animate-pulse' : 'border-gray-700'} flex items-center justify-center bg-gray-800`}>
                    <span className="text-2xl text-white font-bold font-serif">
                      {(personaName || 'AI').charAt(0)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-300 font-sans">{personaName || 'AI Stakeholder'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Student Camera Card */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shrink-0">
            <StudentCameraView
              studentName={studentInfo.name}
              compact
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={() => setShowSubmitModal(true)}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gray-400 px-6 py-3 text-sm font-medium text-white hover:bg-gray-500 transition-colors font-sans shrink-0"
          >
            Submit
            <ChevronRight size={16} />
          </button>
        </div>
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
