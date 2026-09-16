'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useAgentCore } from '../../hooks/useAgentCore';
import { useSessionTimer } from '../../hooks/useSessionTimer';
import { generateSessionId, config } from '../../config/config';
import { uploadFile, parseExcel, listPersonas, createSubmission, getAssessment } from '../../services/api';
import { Persona } from '../../config/config';
import PracticeOverview from './components/PracticeOverview';
import CalibrationCheck from './components/CalibrationCheck';
import DocumentUpload from './components/DocumentUpload';
import LiveSession from './components/LiveSession';
import SessionComplete from './components/SessionComplete';
import StartSessionModal from './components/StartSessionModal';

export type SessionView = 'overview' | 'calibration' | 'upload' | 'live' | 'complete';
export type SessionType = 'practice' | 'graded';

// Default Anam persona ID (fallback for practice sessions)
const DEFAULT_ANAM_PERSONA_ID = '26981553-4601-4799-b64b-7dfa1580de8c';

export default function SessionPage() {
  const searchParams = useSearchParams();
  const { userId, userName, userGroup, userCourse, userSessionNumber, userGroupNumber } = useAuth();
  const agentCore = useAgentCore();
  const timer = useSessionTimer(() => {
    agentCore.endSession();
  });

  const [sessionView, setSessionView] = useState<SessionView>('overview');
  const [sessionId] = useState(() => generateSessionId());
  const [workbookSheets, setWorkbookSheets] = useState<string[]>([]);
  const [workbookData, setWorkbookData] = useState<Record<string, { headers: string[]; rows: (string | number | null)[][]; rowCount: number }>>({});
  const [spreadsheetS3Key, setSpreadsheetS3Key] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Get session type and assessmentId from URL params
  const sessionType: SessionType = (searchParams.get('type') as SessionType) || 'practice';
  const assessmentId = searchParams.get('assessmentId') || (sessionType === 'practice' ? 'practice' : '1');

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Modal state
  const [showStartModal, setShowStartModal] = useState(false);

  // Assessment and persona state
  const [assessmentTitle, setAssessmentTitle] = useState<string>('');
  const [personaId, setPersonaId] = useState<string>(DEFAULT_ANAM_PERSONA_ID);
  const [persona, setPersona] = useState<Persona | null>(null);

  // Load assessment details and its persona
  useEffect(() => {
    async function loadAssessmentAndPersona() {
      try {
        // First load personas
        const personas = await listPersonas();

        // For graded sessions, get the assessment's persona
        if (sessionType === 'graded' && assessmentId && assessmentId !== 'practice') {
          try {
            const assessment = await getAssessment(assessmentId);
            setAssessmentTitle(assessment.title || assessment.caseName || 'Assessment');

            // If assessment has a persona assigned, use it
            if (assessment.personaId) {
              const assessmentPersona = personas.find((p) => p.personaID === assessment.personaId);
              if (assessmentPersona) {
                setPersonaId(assessmentPersona.personaID);
                setPersona(assessmentPersona);
                console.log('[SessionPage] Using assessment persona:', assessmentPersona.name);
                return;
              }
            }
          } catch (err) {
            console.error('Failed to load assessment:', err);
          }
        }

        // Fallback: use default Anam persona or first active persona
        const defaultPersona = personas.find((p) => p.personaID === DEFAULT_ANAM_PERSONA_ID);
        if (defaultPersona) {
          setPersonaId(defaultPersona.personaID);
          setPersona(defaultPersona);
        } else {
          const active = personas.find((p) => p.active);
          if (active) {
            setPersonaId(active.personaID);
            setPersona(active);
          }
        }
      } catch (err) {
        console.error('Failed to load personas:', err);
      }
    }

    loadAssessmentAndPersona();
  }, [sessionType, assessmentId]);

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

      // Save S3 key for submission
      setSpreadsheetS3Key(s3Key);

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

  // Submit session - saves to DynamoDB (only for graded sessions)
  const handleSubmitSession = async () => {
    if (submitting) return;

    setSubmitting(true);

    try {
      // Request analytics before ending session
      agentCore.requestAnalytics();
      agentCore.endSession();
      timer.pause();

      // Only save to DynamoDB for graded sessions
      if (sessionType === 'graded') {
        // Calculate session stats
        const questionsAsked = agentCore.transcript.filter(e => e.role === 'assistant' && e.isFinal).length;
        const responsesGiven = agentCore.transcript.filter(e => e.role === 'user' && e.isFinal).length;
        const sessionDuration = 900 - timer.timeRemaining; // Time used

        // Prepare transcript for storage
        const transcriptData = agentCore.transcript
          .filter(e => e.isFinal)
          .map(e => ({
            role: e.role,
            text: e.text,
            timestamp: new Date().toISOString(),
          }));

        // Create submission in DynamoDB with AI analytics
        await createSubmission({
          studentId: userId || 'anonymous',
          assessmentId: assessmentId,
          sessionId: sessionId,
          sessionNumber: userSessionNumber || '1',
          groupNumber: userGroupNumber || '1',

          // AI Analytics from AgentCore - convert categoryScores to simple number map
          aiScore: agentCore.assessmentReport?.overallScore,
          aiScoreBreakdown: agentCore.assessmentReport?.categoryScores
            ? Object.fromEntries(
              Object.entries(agentCore.assessmentReport.categoryScores).map(([k, v]) => [k, v.score])
            )
            : {},
          aiAnalytics: {
            overallScore: agentCore.assessmentReport?.overallScore,
            categoryScores: agentCore.assessmentReport?.categoryScores
              ? Object.fromEntries(
                Object.entries(agentCore.assessmentReport.categoryScores).map(([k, v]) => [k, v.score])
              )
              : {},
            feedback: {
              strengths: agentCore.assessmentReport?.strengths || [],
              improvements: agentCore.assessmentReport?.improvements || [],
              evidence: agentCore.assessmentReport?.evidenceCitations || [],
            },
          },

          // Session data
          transcript: transcriptData,
          questionsAsked,
          responsesGiven,
          sessionDuration,
          spreadsheetS3Key: spreadsheetS3Key || undefined,
        });

        console.log('[SessionPage] Graded submission saved to DynamoDB');
      } else {
        console.log('[SessionPage] Practice session completed (not saved to gradebook)');
      }
    } catch (err) {
      console.error('[SessionPage] Failed to save submission:', err);
      // Continue to complete view even if save fails
    } finally {
      setSubmitting(false);
      setSessionView('complete');
    }
  };

  return (
    <div className="animate-step-enter">
      {sessionView === 'overview' && (
        <PracticeOverview
          sessionType={sessionType}
          assessmentTitle={assessmentTitle}
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
          assessmentTitle={assessmentTitle}
          agentCore={agentCore}
          timer={timer}
          workbookSheets={workbookSheets}
          workbookData={workbookData}
          anamPersonaId={persona?.anamPersonaId || DEFAULT_ANAM_PERSONA_ID}
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
