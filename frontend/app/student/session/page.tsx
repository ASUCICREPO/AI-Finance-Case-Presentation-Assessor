'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAgentCore } from '../../hooks/useAgentCore';
import { useSessionTimer } from '../../hooks/useSessionTimer';
import { generateSessionId, config } from '../../config/config';
import { uploadFile, parseExcel, listPersonas } from '../../services/api';
import { Persona } from '../../config/config';
import { saveCompletedSession, formatSubmissionTime } from '../../utils/sessionStorage';
import PracticeOverview from './components/PracticeOverview';
import CalibrationCheck from './components/CalibrationCheck';
import DocumentUpload from './components/DocumentUpload';
import LiveSession from './components/LiveSession';
import SessionComplete from './components/SessionComplete';
import StartSessionModal from './components/StartSessionModal';

export type SessionView = 'overview' | 'calibration' | 'upload' | 'live' | 'complete';
export type SessionType = 'practice' | 'graded';

export default function SessionPage() {
  const { userId, userName, userGroup, userCourse } = useAuth();
  const agentCore = useAgentCore();
  const timer = useSessionTimer(() => {
    agentCore.endSession();
  });

  const [sessionView, setSessionView] = useState<SessionView>('overview');
  const [sessionType] = useState<SessionType>('practice');
  const [sessionId] = useState(() => generateSessionId());
  const [workbookSheets, setWorkbookSheets] = useState<string[]>([]);
  const [workbookData, setWorkbookData] = useState<Record<string, { headers: string[]; rows: (string | number | null)[][]; rowCount: number }>>({});

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Modal state
  const [showStartModal, setShowStartModal] = useState(false);

  // Hardcoded Anam persona ID
  const ANAM_PERSONA_ID = '36908df0-128e-48c6-b2f3-cbf007707d00';

  const [personaId, setPersonaId] = useState<string>(ANAM_PERSONA_ID);
  const [persona, setPersona] = useState<Persona | null>(null);

  // Load persona details on mount
  useEffect(() => {
    listPersonas()
      .then((personas) => {
        const anamPersona = personas.find((p) => p.personaID === ANAM_PERSONA_ID);
        if (anamPersona) {
          setPersonaId(anamPersona.personaID);
          setPersona(anamPersona);
        } else {
          const active = personas.find((p) => p.active);
          if (active) {
            setPersonaId(active.personaID);
            setPersona(active);
          }
        }
      })
      .catch((err) => console.error('Failed to load personas:', err));
  }, []);

  const studentInfo = {
    name: userName || 'Student',
    group: userGroup || 'Group 4 - Section A',
    course: userCourse || 'FIN 502 - Real Estate Finance',
  };

  // ── Flow handlers ────────────────────────────────────────

  // From Overview -> Calibration
  const handleStartAssessment = () => {
    setSessionView('calibration');
  };

  // From Calibration -> Upload
  const handleCalibrationComplete = () => {
    setSessionView('upload');
  };

  // From Upload -> Live (after file upload)
  const handleFileUpload = useCallback(async (file: File) => {
    setUploadError(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const { s3Key } = await uploadFile(sessionId, file, 'uploads', (percent) => {
        setUploadProgress(percent);
      });

      const parsed = await parseExcel(s3Key, sessionId);
      setWorkbookSheets(parsed.sheets);
      setWorkbookData(parsed.data);

      // Show confirmation modal
      setShowStartModal(true);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [sessionId]);

  // Confirm start -> Begin Q&A
  const handleConfirmStart = async () => {
    setShowStartModal(false);

    // Only mute Nova Sonic audio if Anam avatar is enabled
    // When Anam is disabled, Nova Sonic handles all audio
    if (config.anamEnabled) {
      agentCore.setMuteAudioPlayback(true);
      console.log('[SessionPage] Anam enabled - Nova Sonic audio MUTED');
    } else {
      agentCore.setMuteAudioPlayback(false);
      console.log('[SessionPage] Anam disabled - Nova Sonic audio ENABLED');
    }

    await agentCore.startSession({
      personaId,
      userId: userId || '',
      sessionId,
      qaTimeLimitSec: 900,
    });

    timer.start(900);
    setSessionView('live');
  };

  // Submit session
  const handleSubmitSession = () => {
    agentCore.requestAnalytics();
    agentCore.endSession();
    timer.pause();

    // Save completed session to localStorage
    // Assessment ID "3" = "Real Estate Investment" (the one we're testing)
    const questionsAsked = agentCore.transcript.filter(e => e.role === 'assistant' && e.isFinal).length;
    const responsesGiven = agentCore.transcript.filter(e => e.role === 'user' && e.isFinal).length;

    saveCompletedSession({
      assessmentId: '3', // Real Estate Investment
      sessionId,
      submissionTime: formatSubmissionTime(),
      questionsAsked,
      responsesGiven,
      aiScore: agentCore.assessmentReport?.overallScore,
    });

    setSessionView('complete');
  };

  return (
    <div className="animate-step-enter">
      {sessionView === 'overview' && (
        <PracticeOverview
          sessionType={sessionType}
          onStartAssessment={handleStartAssessment}
        />
      )}

      {sessionView === 'calibration' && (
        <CalibrationCheck
          onComplete={handleCalibrationComplete}
          onBack={() => setSessionView('overview')}
        />
      )}

      {sessionView === 'upload' && (
        <DocumentUpload
          onComplete={handleFileUpload}
          onBack={() => setSessionView('calibration')}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          error={uploadError}
        />
      )}

      {sessionView === 'live' && (
        <LiveSession
          studentInfo={studentInfo}
          sessionType={sessionType}
          agentCore={agentCore}
          timer={timer}
          workbookSheets={workbookSheets}
          workbookData={workbookData}
          anamPersonaId={persona?.anamPersonaId || ANAM_PERSONA_ID}
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
