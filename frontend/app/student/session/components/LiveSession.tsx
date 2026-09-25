'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Clock, Flag, ChevronRight, ArrowLeft, CheckCircle, Table2, Volume2 } from 'lucide-react';
import SpreadsheetViewer from './SpreadsheetViewer';
import SubmitModal from './SubmitModal';
import AnamAvatarPanel from './AnamAvatarPanel';
import StudentCameraView from './StudentCameraView';
import { getAnamSessionToken } from '../../../services/api';
import { config, getVoiceAgentMode } from '../../../config/config';
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
  assessmentTitle?: string;
  agentCore: UseAgentCoreReturn;
  timer: TimerState;
  workbookSheets: string[];
  workbookData: Record<string, { headers: string[]; rows: (string | number | null)[][]; rowCount: number }>;
  anamPersonaId?: string;
  useAnamAvatar?: boolean;
  onSubmit: () => void;
  onFileUpload?: (file: File) => void;
}

type LeftPanelView = 'qa' | 'spreadsheet';

/**
 * Live Q&A Session — Toggleable left panel (Q&A or Spreadsheet), Avatar panel on right.
 */
export default function LiveSession({
  studentInfo,
  sessionType,
  assessmentTitle,
  agentCore,
  timer,
  workbookSheets,
  workbookData,
  anamPersonaId,
  useAnamAvatar = false,
  onSubmit,
}: LiveSessionProps) {
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [anamSessionToken, setAnamSessionToken] = useState<string | null>(null);
  const [anamFailed, setAnamFailed] = useState(false);
  const [voiceMode, setVoiceMode] = useState<'anam' | 'nova-sonic' | 'text-chat'>(() => getVoiceAgentMode());
  const [leftPanelView, setLeftPanelView] = useState<LeftPanelView>('qa');

  const onAssistantTextRef = useRef<((text: string, isFinal: boolean) => void) | null>(null);

  const { transcript, isAISpeaking, currentAIText, personaName, status, setMuteAudioPlayback, onAssistantText } = agentCore;
  const { formattedTime, isLowTime, timeRemaining } = timer;

  // Determine if we should use Anam avatar
  // Use Anam when: persona has avatar enabled AND has a valid anamPersonaId
  // Note: config.anamEnabled is a global kill switch, but if persona specifically has avatar configured, respect that
  const shouldUseAnam = useAnamAvatar && anamPersonaId;
  const hasWorkbookData = workbookSheets.length > 0;

  // Fetch Anam session token on mount
  useEffect(() => {
    if (!shouldUseAnam) {
      console.log('[LiveSession] Anam avatar not enabled for this persona, using Nova Sonic voice-only mode');
      setVoiceMode('nova-sonic');
      setAnamFailed(true);
      setMuteAudioPlayback(false);
      return;
    }

    console.log('[LiveSession] Fetching Anam session token for persona:', anamPersonaId);
    getAnamSessionToken(anamPersonaId!, false)
      .then((token) => {
        console.log('[LiveSession] ✅ Anam session token received, enabling avatar mode');
        setAnamSessionToken(token);
        setVoiceMode('anam');
        // CRITICAL: Mute Nova Sonic audio - Anam will handle TTS from text
        setMuteAudioPlayback(true);
      })
      .catch((err) => {
        console.error('[LiveSession] ❌ Failed to get Anam token, falling back to Nova Sonic:', err);
        setVoiceMode('nova-sonic');
        setAnamFailed(true);
        // Nova Sonic plays audio directly in fallback mode
        setMuteAudioPlayback(false);
      });

    return () => {
      setMuteAudioPlayback(false);
    };
  }, [shouldUseAnam, anamPersonaId, setMuteAudioPlayback]);

  // Register text callback for Anam TTS
  useEffect(() => {
    if (shouldUseAnam && anamSessionToken) {
      console.log('[LiveSession] Registering onAssistantText callback for Anam TTS');
      onAssistantText((text: string, isFinal: boolean) => {
        console.log('[LiveSession] Forwarding text to Anam:', { textLength: text.length, isFinal });
        if (onAssistantTextRef.current) {
          onAssistantTextRef.current(text, isFinal);
        }
      });
    } else {
      onAssistantText(() => { });
    }
  }, [shouldUseAnam, anamSessionToken, onAssistantText]);

  const anamIsActive = voiceMode === 'anam' && !anamFailed && anamPersonaId && anamSessionToken;
  const displayPersonaName = personaName || 'AI Stakeholder';
  const displayStudentName = studentInfo.name || 'Student';

  // Group transcript into Q&A pairs for display
  const finalTranscript = transcript.filter(e => e.isFinal);

  // Calculate remaining minutes for display
  const remainingMinutes = Math.ceil(timeRemaining / 60);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* Header bar */}
      <div className="mb-3 rounded-xl border border-gray-200 bg-white px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-gray-900 font-serif">
            {sessionType === 'practice' ? 'Practice' : 'Real'} Session: {assessmentTitle || 'Assessment'}
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1 text-xs font-medium text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            Recording
          </span>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors font-sans">
          <Flag size={14} />
          Report
        </button>
      </div>

      <p className="mb-3 text-xs text-gray-400 font-sans shrink-0">This session is being recorded</p>

      {/* Main content: Left Panel + Right Panel */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* LEFT PANEL - Toggleable Q&A or Spreadsheet */}
        <div className="flex-1 min-w-0 rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
          {leftPanelView === 'qa' ? (
            /* Q&A View */
            <>
              {/* Q&A Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 font-serif">Q&A</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Answer questions from {displayPersonaName}. Your responses are being recorded.
                  </p>
                </div>
                {hasWorkbookData && (
                  <button
                    onClick={() => setLeftPanelView('spreadsheet')}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Table2 size={16} />
                    Spreadsheet
                  </button>
                )}
              </div>

              {/* Q&A Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {finalTranscript.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-400 italic">Waiting for {displayPersonaName} to start the conversation...</p>
                  </div>
                ) : (
                  finalTranscript.map((entry, idx) => (
                    <div key={idx}>
                      {entry.role === 'assistant' ? (
                        /* AI Question */
                        <div className="flex items-start gap-3">
                          <div className="mt-1 shrink-0">
                            <CheckCircle size={20} className="text-green-500" />
                          </div>
                          <div className="flex-1 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
                            <p className="text-sm text-gray-800">{entry.text}</p>
                          </div>
                        </div>
                      ) : (
                        /* Student Response */
                        <div className="ml-8">
                          <p className="text-sm font-medium text-maroon-600 mb-2">{displayStudentName} Response</p>
                          <div className="rounded-lg border-2 border-maroon-200 bg-maroon-50/30 px-4 py-3">
                            <p className="text-sm text-gray-700">{entry.text}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            /* Spreadsheet View */
            <>
              {/* Spreadsheet Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                <button
                  onClick={() => setLeftPanelView('qa')}
                  className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft size={16} />
                  Back to Q&A
                </button>
                <span className="text-sm text-gray-500">Spreadsheet Sandbox Viewer</span>
              </div>

              {/* Spreadsheet Content */}
              <div className="flex-1 overflow-hidden">
                <SpreadsheetViewer sheets={workbookSheets} data={workbookData} />
              </div>
            </>
          )}
        </div>

        {/* RIGHT PANEL - Timer, Avatar, Camera */}
        <div className="w-[320px] shrink-0 flex flex-col gap-3">
          {/* AI Avatar Card */}
          <div className="rounded-2xl border border-maroon-200 overflow-hidden bg-gray-900 relative flex flex-col" style={{ minHeight: 280 }}>
            {/* Name + Volume row */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-maroon-600 flex items-center justify-center shrink-0">
                  <span className="text-xs text-white font-bold">
                    {displayPersonaName.charAt(0)}
                  </span>
                </div>
                <span className="text-sm font-semibold text-white drop-shadow font-sans">
                  {displayPersonaName}
                </span>
              </div>
              <button className="rounded-full bg-white/20 p-1.5 hover:bg-white/30 transition-colors">
                <Volume2 size={15} className="text-white" />
              </button>
            </div>

            {/* Avatar video/orb area */}
            <div className="flex-1 relative min-h-[220px]">
              {anamIsActive ? (
                <AnamAvatarPanel
                  anamPersonaId={anamPersonaId!}
                  sessionToken={anamSessionToken}
                  isActive={status === 'active'}
                  personaName={displayPersonaName}
                  onAssistantTextRef={onAssistantTextRef}
                />
              ) : (
                /* Voice-only orb */
                <div className="h-full bg-gradient-to-b from-gray-800 to-gray-900 flex flex-col items-center justify-center min-h-[220px]">
                  <div className={`relative w-24 h-24 rounded-full bg-maroon-800 flex items-center justify-center ${isAISpeaking ? 'animate-pulse' : ''}`}>
                    <div className={`absolute inset-0 rounded-full bg-maroon-600 ${isAISpeaking ? 'animate-ping opacity-20' : 'opacity-0'}`} />
                    <span className="text-4xl font-bold text-white font-serif">
                      {displayPersonaName.charAt(0)}
                    </span>
                  </div>
                </div>
              )}

              {/* AI Speaking overlay at bottom — always visible when speaking */}
              {isAISpeaking && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm px-4 py-3 z-10">
                  <div className="flex items-center gap-2 mb-1">
                    {/* Animated bars */}
                    <div className="flex items-end gap-0.5 h-4">
                      {[1, 2, 3, 4].map(i => (
                        <div
                          key={i}
                          className="w-1 bg-amber-400 rounded-full animate-bounce"
                          style={{ height: `${8 + (i % 3) * 4}px`, animationDelay: `${i * 0.1}s` }}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-amber-400">AI Speaking</span>
                  </div>
                  {currentAIText && (
                    <p className="text-sm text-white line-clamp-2 italic">
                      &quot;{currentAIText}&quot;
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Student Camera Card */}
          <div className="rounded-2xl border border-gray-200 overflow-hidden bg-gray-800 relative" style={{ minHeight: 200 }}>
            <StudentCameraView
              studentName={displayStudentName}
              showControls
            />
          </div>

          {/* Timer */}
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={18} className={isLowTime ? 'text-red-500' : 'text-gray-400'} />
                <span className={`text-3xl font-bold font-sans tabular-nums ${isLowTime ? 'text-red-600' : 'text-gray-900'}`}>
                  {formattedTime}
                </span>
              </div>
              <p className="text-xs text-gray-400 font-sans text-right">
                {isLowTime ? `${remainingMinutes} min left` : '15 min max'}
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={() => setShowSubmitModal(true)}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-maroon-600 px-6 py-3 text-sm font-semibold text-white hover:bg-maroon-700 transition-colors font-sans shrink-0"
          >
            Submit Assessment
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
