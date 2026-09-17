'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Clock, Flag, ChevronRight, Upload, Volume2, AlertCircle, Mic, Video, VolumeX } from 'lucide-react';
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
  assessmentTitle,
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
  const [voiceMode, setVoiceMode] = useState<'anam' | 'nova-sonic' | 'text-chat'>(() => getVoiceAgentMode());

  // Audio chunk callback ref for Anam lip-sync (not text for TTS)
  const onAudioChunkRef = useRef<((audioBase64: string, isFinal: boolean) => void) | null>(null);

  const { transcript, isAISpeaking, currentAIText, personaName, status, setMuteAudioPlayback, onAudioChunk } = agentCore;
  const { formattedTime, isLowTime } = timer;

  // Fetch Anam session token on mount (only if Anam is enabled)
  useEffect(() => {
    // If Anam is not enabled globally, use Nova Sonic
    if (!config.anamEnabled) {
      console.log('[LiveSession] Anam disabled globally, using Nova Sonic voice');
      setVoiceMode('nova-sonic');
      setAnamFailed(true);
      setMuteAudioPlayback(false); // Let Nova Sonic handle audio
      return;
    }

    if (!anamPersonaId) {
      console.log('[LiveSession] No Anam persona ID, falling back to Nova Sonic');
      setVoiceMode('nova-sonic');
      setAnamFailed(true);
      setMuteAudioPlayback(false);
      return;
    }

    // Try to get Anam session token with audio passthrough enabled
    getAnamSessionToken(anamPersonaId, true) // enableAudioPassthrough = true
      .then((token) => {
        setAnamSessionToken(token);
        setVoiceMode('anam');
        // IMPORTANT: Do NOT mute Nova Sonic audio - let it play!
        // Anam receives audio chunks for lip-sync only, doesn't play audio itself
        setMuteAudioPlayback(false);
        console.log('[LiveSession] Anam token received, Nova Sonic audio ENABLED for playback, Anam handles lip-sync');
      })
      .catch((err) => {
        console.error('[LiveSession] Failed to get Anam token, falling back to Nova Sonic:', err);
        setVoiceMode('nova-sonic');
        setAnamFailed(true);
        setMuteAudioPlayback(false); // Let Nova Sonic handle audio
      });
  }, [anamPersonaId, setMuteAudioPlayback]);

  // Register audio chunk callback for forwarding Nova Sonic audio to Anam
  useEffect(() => {
    if (!anamFailed && onAudioChunk) {
      // Subscribe to Nova Sonic audio chunks and forward to Anam
      onAudioChunk((audioBase64: string, isFinal: boolean) => {
        if (onAudioChunkRef.current) {
          onAudioChunkRef.current(audioBase64, isFinal);
        }
      });
    }
  }, [anamFailed, onAudioChunk]);

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
      <div className="mb-3 rounded-xl border border-gray-200 bg-white px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-gray-900 font-serif">
            {sessionType === 'practice' ? 'Practice' : 'Real'} Session: {assessmentTitle || 'Assessment'}
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1 text-xs font-medium text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            Recording
          </span>
          {/* Voice mode indicator */}
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${voiceMode === 'anam'
            ? 'bg-purple-100 text-purple-700'
            : 'bg-blue-100 text-blue-700'
            }`}>
            {voiceMode === 'anam' ? (
              <>
                <Video size={12} />
                Avatar Mode
              </>
            ) : (
              <>
                <Volume2 size={12} />
                Voice Mode
              </>
            )}
          </span>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors font-sans">
          <Flag size={14} />
          Report
        </button>
      </div>

      <p className="mb-3 text-xs text-gray-400 font-sans shrink-0">This session is being recorded</p>

      {/* Main content: Spreadsheet LEFT, Q&A Panel RIGHT - side by side */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* LEFT - Spreadsheet Viewer + Transcript */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {/* Spreadsheet - takes remaining space with max height */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {hasWorkbookData ? (
              <SpreadsheetViewer sheets={workbookSheets} data={workbookData} />
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white p-8 h-full flex flex-col items-center justify-center">
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

          {/* Transcript Viewer - Fixed height at bottom */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden h-[100px] shrink-0 flex flex-col">
            <div className="px-4 py-2 border-b border-gray-100 shrink-0 bg-gray-50">
              <span className="text-sm font-medium text-gray-700 font-sans">Live Transcript</span>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
              {transcript.filter(e => e.isFinal).length === 0 ? (
                <p className="text-gray-400 italic text-xs">Conversation will appear here...</p>
              ) : (
                transcript.filter(e => e.isFinal).slice(-10).map((entry, idx) => (
                  <div key={idx} className={`text-xs ${entry.role === 'assistant' ? 'text-maroon-700' : 'text-gray-700'}`}>
                    <span className="font-medium">{entry.role === 'assistant' ? 'AI' : 'You'}:</span>{' '}
                    <span>{entry.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT - Q&A Session Panel */}
        <div className="w-[280px] shrink-0 space-y-3 flex flex-col">
          {/* Q&A Session Timer */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shrink-0">
            <h3 className="text-sm font-semibold text-gray-900 font-sans mb-2">Q&A Session Timer</h3>
            <div className="flex items-center gap-2">
              <Clock size={20} className="text-gray-500" />
              <span className={`text-3xl font-bold font-sans ${isLowTime ? 'text-red-600' : 'text-gray-900'}`}>
                {formattedTime}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500 font-sans">
              {isLowTime ? `${Math.ceil(timer.timeRemaining / 60)} minute${timer.timeRemaining > 60 ? 's' : ''} remaining` : '15-minute maximum session'}
            </p>
          </div>

          {/* AI Avatar Card */}
          <div className="rounded-xl border-2 border-maroon-200 bg-maroon-50 overflow-hidden flex flex-col">
            {/* Avatar name header */}
            <div className="flex items-center justify-between px-3 py-2 shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-maroon-600 flex items-center justify-center">
                  <span className="text-xs text-white font-bold">
                    {(personaName || 'Real Estate Agent').charAt(0)}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900 font-sans">
                  {personaName || 'Real Estate Agent'}
                </span>
              </div>
              <button className="rounded-full p-1 hover:bg-maroon-100">
                <Volume2 size={14} className="text-gray-500" />
              </button>
            </div>

            {/* Avatar area */}
            <div className="relative h-36 bg-gray-100">
              {voiceMode === 'anam' && !anamFailed && anamPersonaId ? (
                <AnamAvatarPanel
                  anamPersonaId={anamPersonaId}
                  sessionToken={anamSessionToken}
                  isActive={status === 'active'}
                  personaName={personaName || 'Real Estate Agent'}
                  onAudioChunkRef={onAudioChunkRef}
                />
              ) : (
                /* Nova Sonic Fallback - Voice-only mode with animated indicator */
                <div className="h-full bg-gradient-to-b from-maroon-50 to-maroon-100 flex flex-col items-center justify-center">
                  {/* Animated voice indicator */}
                  <div className={`relative w-20 h-20 rounded-full bg-maroon-200 flex items-center justify-center ${isAISpeaking ? 'animate-pulse' : ''}`}>
                    <div className={`absolute inset-0 rounded-full bg-maroon-300 ${isAISpeaking ? 'animate-ping opacity-30' : 'opacity-0'}`} />
                    <Volume2 size={32} className={`text-maroon-600 ${isAISpeaking ? 'animate-bounce' : ''}`} />
                  </div>
                  <p className="mt-2 text-xs text-maroon-600 font-medium">
                    {isAISpeaking ? 'AI Speaking...' : 'Voice Mode'}
                  </p>
                  <p className="text-[10px] text-maroon-500">Nova Sonic</p>
                </div>
              )}

              {/* AI Speaking indicator overlay */}
              {isAISpeaking && currentAIText && (
                <div className="absolute bottom-0 left-0 right-0 bg-amber-500 px-3 py-2">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-xs text-white font-medium">🎙️ AI Speaking</span>
                  </div>
                  <p className="text-xs text-white line-clamp-2">
                    &quot;{currentAIText}&quot;
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Student Camera Card */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shrink-0 relative">
            <StudentCameraView
              studentName={studentInfo.name}
              compact
            />
            {/* Mic and Video icons */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
              <button className="rounded-full bg-gray-800/70 p-1.5 hover:bg-gray-800">
                <Mic size={14} className="text-white" />
              </button>
              <button className="rounded-full bg-gray-800/70 p-1.5 hover:bg-gray-800">
                <Video size={14} className="text-white" />
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={() => setShowSubmitModal(true)}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gray-500 px-6 py-3 text-sm font-medium text-white hover:bg-gray-600 transition-colors font-sans shrink-0"
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
