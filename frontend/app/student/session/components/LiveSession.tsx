'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Clock, Flag, ArrowLeft, ChevronRight, Upload, Volume2 } from 'lucide-react';
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
 * Matches Figma design with fixed right sidebar.
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
  const [showSpreadsheet, setShowSpreadsheet] = useState(true); // Default to spreadsheet view
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
    <div className="flex gap-6 h-[calc(100vh-180px)]">
      {/* Left/Center - Spreadsheet or Q&A Transcript */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header bar */}
        <div className="mb-4 rounded-xl border border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
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

        <p className="mb-4 text-xs text-gray-500 font-sans">This session is being recorded</p>

        {/* Spreadsheet or Q&A view */}
        <div className="flex-1 overflow-hidden">
          {showSpreadsheet && hasWorkbookData ? (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setShowSpreadsheet(false)}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors font-sans"
                >
                  <ArrowLeft size={16} />
                  Back to Q&A
                </button>
                <span className="text-sm text-gray-500 font-sans">Spreadsheet Sandbox Viewer</span>
              </div>
              <div className="flex-1 overflow-auto">
                <SpreadsheetViewer sheets={workbookSheets} data={workbookData} />
              </div>
            </div>
          ) : (
            /* Q&A Transcript View */
            <div className="rounded-xl border border-gray-200 bg-white p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 font-serif">Q&A Session</h2>
                {hasWorkbookData && (
                  <button
                    onClick={() => setShowSpreadsheet(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors font-sans"
                  >
                    View Spreadsheet
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>

              {/* Transcript entries */}
              <div className="flex-1 space-y-4 overflow-y-auto">
                {transcript.filter(e => e.isFinal).length === 0 && status === 'active' && (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm font-sans">Waiting for the Q&A to begin...</p>
                  </div>
                )}

                {transcript.filter(e => e.isFinal).map((entry, idx) => (
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
              </div>

              {/* Upload button if no workbook */}
              {!hasWorkbookData && (
                <div className="mt-6">
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
          )}
        </div>
      </div>

      {/* Right Sidebar - Q&A Session Panel (Timer, Avatar, Camera, Submit) */}
      <div className="w-[320px] shrink-0 space-y-4">
        {/* Q&A Session Timer */}
        <div className="rounded-xl bg-gray-100 p-4">
          <h3 className="text-sm font-bold text-gray-900 font-sans mb-2">Q&A Session</h3>
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-gray-600" />
            <span className={`text-3xl font-bold font-sans ${isLowTime ? 'text-red-600' : 'text-gray-900'}`}>
              {formattedTime}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500 font-sans">15-minute maximum session</p>
        </div>

        {/* AI Avatar Card - Mr. Clarkson */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {/* Avatar name header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-900 font-sans">
              {personaName || 'Mr. Clarkson'}
            </span>
            <button className="rounded-full p-1 hover:bg-gray-100">
              <Volume2 size={16} className="text-gray-500" />
            </button>
          </div>

          {!anamFailed && anamPersonaId ? (
            <div className="relative">
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
            <div className="relative aspect-video bg-gray-900 flex items-center justify-center">
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
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <StudentCameraView
            studentName={studentInfo.name}
            compact
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={() => setShowSubmitModal(true)}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gray-400 px-6 py-3 text-sm font-medium text-white hover:bg-gray-500 transition-colors font-sans"
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
