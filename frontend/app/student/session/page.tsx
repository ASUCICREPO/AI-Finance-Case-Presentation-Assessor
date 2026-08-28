'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAgentCore } from '../../hooks/useAgentCore';
import { useSessionTimer } from '../../hooks/useSessionTimer';
import { generateSessionId } from '../../config/config';
import { uploadFile, parseExcel, validateSubmission, listPersonas } from '../../services/api';
import { Persona } from '../../config/config';
import SessionLobby from './components/SessionLobby';
import LiveSession from './components/LiveSession';
import SessionComplete from './components/SessionComplete';
import StartSessionModal from './components/StartSessionModal';
import UploadStep from './components/UploadStep';

export type SessionView = 'upload' | 'lobby' | 'active' | 'complete';
export type SessionType = 'practice' | 'graded';

export default function SessionPage() {
  const { userId, userName, userGroup, userCourse } = useAuth();
  const agentCore = useAgentCore();
  const timer = useSessionTimer(() => {
    // Timer expired — end session
    agentCore.endSession();
  });

  const [sessionView, setSessionView] = useState<SessionView>('upload');
  const [sessionType] = useState<SessionType>('practice');
  const [showStartModal, setShowStartModal] = useState(false);
  const [sessionId] = useState(() => generateSessionId());
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [workbookSheets, setWorkbookSheets] = useState<string[]>([]);
  const [workbookData, setWorkbookData] = useState<Record<string, { headers: string[]; rows: (string | number | null)[][]; rowCount: number }>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Selected persona (loaded from API)
  const [personaId, setPersonaId] = useState<string>('');
  const [persona, setPersona] = useState<Persona | null>(null);

  // Load first active persona on mount
  useEffect(() => {
    listPersonas()
      .then((personas) => {
        const active = personas.find((p) => p.active);
        if (active) {
          setPersonaId(active.personaID);
          setPersona(active);
        }
      })
      .catch((err) => console.error('Failed to load personas:', err));
  }, []);

  const studentInfo = {
    name: userName || 'Student',
    group: userGroup || 'Group 4 - Section A',
    course: userCourse || 'FIN 502 - Real Estate Finance',
  };

  // ── File Upload Handler ─────────────────────────────────
  const handleFileUpload = useCallback(async (file: File) => {
    setUploadError(null);
    setIsUploading(true);
    setUploadedFile(file);

    try {
      // Upload to S3
      const { s3Key } = await uploadFile(sessionId, file, 'uploads', (percent) => {
        setUploadProgress(percent);
      });

      // Parse the Excel workbook
      const parsed = await parseExcel(s3Key, sessionId);
      setWorkbookSheets(parsed.sheets);
      setWorkbookData(parsed.data);

      // Validate submission
      const validation = await validateSubmission(
        sessionId,
        userId || '',
        undefined,
        [file.name]
      );

      if (!validation.isValid) {
        setUploadError(validation.errors.join('. '));
        return;
      }

      // Move to lobby
      setSessionView('lobby');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [sessionId, userId]);

  // ── Begin Q&A Session ───────────────────────────────────
  const handleBeginSession = () => {
    setShowStartModal(true);
  };

  const handleConfirmStart = async () => {
    setShowStartModal(false);

    await agentCore.startSession({
      personaId,
      userId: userId || '',
      sessionId,
      qaTimeLimitSec: 900, // 15 minutes
    });

    // Start the timer when session becomes active
    timer.start(900);
    setSessionView('active');
  };

  // ── Submit / End Session ────────────────────────────────
  const handleSubmitSession = () => {
    agentCore.requestAnalytics();
    agentCore.endSession();
    timer.pause();
    setSessionView('complete');
  };

  return (
    <div className="animate-step-enter">
      {sessionView === 'upload' && (
        <UploadStep
          onFileUpload={handleFileUpload}
          uploadedFile={uploadedFile}
          uploadProgress={uploadProgress}
          isUploading={isUploading}
          error={uploadError}
        />
      )}

      {sessionView === 'lobby' && (
        <SessionLobby
          studentInfo={studentInfo}
          sessionType={sessionType}
          onBeginSession={handleBeginSession}
        />
      )}

      {sessionView === 'active' && (
        <LiveSession
          studentInfo={studentInfo}
          sessionType={sessionType}
          agentCore={agentCore}
          timer={timer}
          workbookSheets={workbookSheets}
          workbookData={workbookData}
          anamPersonaId={persona?.anamPersonaId}
          onSubmit={handleSubmitSession}
        />
      )}

      {sessionView === 'complete' && (
        <SessionComplete
          sessionType={sessionType}
          assessmentReport={agentCore.assessmentReport}
          transcript={agentCore.transcript}
          onDone={() => agentCore.disconnect()}
        />
      )}

      {/* Start Session Confirmation Modal */}
      <StartSessionModal
        isOpen={showStartModal}
        sessionType={sessionType}
        onConfirm={handleConfirmStart}
        onCancel={() => setShowStartModal(false)}
      />
    </div>
  );
}
