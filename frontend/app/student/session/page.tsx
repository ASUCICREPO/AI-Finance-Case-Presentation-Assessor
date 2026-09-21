'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useAgentCore } from '../../hooks/useAgentCore';
import { useSessionTimer } from '../../hooks/useSessionTimer';
import { generateSessionId, config } from '../../config/config';
import { uploadFile, parseExcel, listPersonas, createSubmission, getAssessment, Assessment } from '../../services/api';
import { Persona } from '../../config/config';
import PracticeOverview from './components/PracticeOverview';
import CalibrationCheck from './components/CalibrationCheck';
import DocumentUpload from './components/DocumentUpload';
import PresentationSession from './components/PresentationSession';
import LiveSession from './components/LiveSession';
import SessionComplete from './components/SessionComplete';
import StartSessionModal from './components/StartSessionModal';

export type SessionView = 'overview' | 'calibration' | 'upload' | 'presentation' | 'live' | 'complete';
export type SessionType = 'practice' | 'graded';

// Default Anam persona ID (fallback for practice sessions)
const DEFAULT_ANAM_PERSONA_ID = '26981553-4601-4799-b64b-7dfa1580de8c';

export default function SessionPage() {
  const searchParams = useSearchParams();
  const { userId, userEmail, userName, userGroup, userCourse, userSessionNumber, userGroupNumber } = useAuth();
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

  // Presentation transcript state (captured during presentation)
  const [presentationTranscript, setPresentationTranscript] = useState<string>('');

  // Assessment and persona state
  const [assessment, setAssessment] = useState<Assessment | null>(null);
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
            const loadedAssessment = await getAssessment(assessmentId);
            setAssessment(loadedAssessment);
            setAssessmentTitle(loadedAssessment.title || loadedAssessment.caseName || 'Assessment');

            // If assessment has a persona assigned, use it
            if (loadedAssessment.personaId) {
              const assessmentPersona = personas.find((p) => p.personaID === loadedAssessment.personaId);
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

  // Confirm start -> Begin Presentation phase
  const handleConfirmStart = async () => {
    setShowStartModal(false);
    // Start presentation phase (no AI yet)
    setSessionView('presentation');
  };

  // Video blob state for recording
  const [presentationVideoBlob, setPresentationVideoBlob] = useState<Blob | null>(null);
  const [presentationDuration, setPresentationDuration] = useState(0);
  const [videoS3Key, setVideoS3Key] = useState<string | null>(null);

  // From Presentation -> Q&A (start AI session)
  const handleProceedToQA = async (transcript: string, videoBlob: Blob | null, duration: number) => {
    // Save the presentation transcript and video
    setPresentationTranscript(transcript);
    setPresentationVideoBlob(videoBlob);
    setPresentationDuration(duration);

    // Upload video to S3 in background if available
    if (videoBlob && sessionType === 'graded') {
      uploadVideoToS3(videoBlob).catch(err => {
        console.error('[SessionPage] Failed to upload video:', err);
      });
    }

    // Nova Sonic audio should always play - Anam only does lip-sync
    agentCore.setMuteAudioPlayback(false);
    console.log('[SessionPage] Starting Q&A - Nova Sonic audio ENABLED');
    console.log('[SessionPage] Presentation transcript length:', transcript.length);
    console.log('[SessionPage] Video blob size:', videoBlob?.size);

    // Build workbook context summary for the AI
    const workbookContext = buildWorkbookContext(workbookData);

    await agentCore.startSession({
      personaId,
      userId: userId || '',
      sessionId,
      qaTimeLimitSec: 900,
      presentationTranscript: transcript,
      workbookContext: workbookContext,
    });

    timer.start(900);
    setSessionView('live');
  };

  // Upload video to S3
  const uploadVideoToS3 = async (videoBlob: Blob) => {
    try {
      const videoFile = new File([videoBlob], `presentation-${sessionId}.webm`, { type: 'video/webm' });
      const { s3Key } = await uploadFile(sessionId, videoFile, 'videos', (percent) => {
        console.log('[SessionPage] Video upload progress:', percent);
      });
      setVideoS3Key(s3Key);
      console.log('[SessionPage] Video uploaded to S3:', s3Key);
      return s3Key;
    } catch (err) {
      console.error('[SessionPage] Video upload failed:', err);
      throw err;
    }
  };

  // Build a context summary from workbook data for the AI
  const buildWorkbookContext = (data: Record<string, { headers: string[]; rows: (string | number | null)[][]; rowCount: number }>) => {
    if (!data || Object.keys(data).length === 0) return '';

    const summaryParts: string[] = [];
    for (const [sheetName, sheetData] of Object.entries(data)) {
      summaryParts.push(`\n--- Sheet: ${sheetName} (${sheetData.rowCount} rows) ---`);
      if (sheetData.headers.length > 0) {
        summaryParts.push(`Columns: ${sheetData.headers.join(', ')}`);
      }
      // Include first 5 rows as sample
      for (const row of sheetData.rows.slice(0, 5)) {
        const rowStr = row.map(cell => cell ?? '').join(' | ');
        if (rowStr.trim()) summaryParts.push(rowStr);
      }
      if (sheetData.rowCount > 5) {
        summaryParts.push(`... (${sheetData.rowCount - 5} more rows)`);
      }
    }
    return summaryParts.join('\n');
  };

  // Helper to wait for assessment report with timeout
  const waitForAssessmentReport = async (timeoutMs: number = 30000): Promise<typeof agentCore.assessmentReport> => {
    const startTime = Date.now();
    const pollInterval = 500; // Check every 500ms

    while (Date.now() - startTime < timeoutMs) {
      if (agentCore.assessmentReport) {
        console.log('[SessionPage] Assessment report received');
        return agentCore.assessmentReport;
      }
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    console.warn('[SessionPage] Timed out waiting for assessment report');
    return null;
  };

  // Submit session - saves to DynamoDB (only for graded sessions)
  const handleSubmitSession = async () => {
    if (submitting) return;

    setSubmitting(true);

    try {
      // Request analytics BEFORE ending session - gives AgentCore time to generate report
      agentCore.requestAnalytics();
      timer.pause();

      // Wait for the assessment report to arrive (up to 30 seconds)
      // This is critical for AI scoring - the assessment is generated asynchronously
      console.log('[SessionPage] Waiting for AI assessment report...');
      const assessmentReport = await waitForAssessmentReport(30000);

      // Now end the session after we have the report
      agentCore.endSession();

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
          studentEmail: userEmail || undefined,
          studentName: userName || undefined,
          assessmentId: assessmentId,
          sessionId: sessionId,
          sessionNumber: userSessionNumber || '1',
          groupNumber: userGroupNumber || '1',

          // AI Analytics from AgentCore - use the waited-for report
          aiScore: assessmentReport?.overallScore,
          aiScoreBreakdown: assessmentReport?.categoryScores
            ? Object.fromEntries(
              Object.entries(assessmentReport.categoryScores).map(([k, v]) => [k, v.score])
            )
            : {},
          aiAnalytics: {
            overallScore: assessmentReport?.overallScore,
            categoryScores: assessmentReport?.categoryScores
              ? Object.fromEntries(
                Object.entries(assessmentReport.categoryScores).map(([k, v]) => [k, v.score])
              )
              : {},
            feedback: {
              strengths: assessmentReport?.strengths || [],
              improvements: assessmentReport?.improvements || [],
              evidence: assessmentReport?.evidenceCitations || [],
            },
          },

          // Dual transcripts
          presentationTranscript: presentationTranscript,
          qaTranscript: transcriptData,
          transcript: transcriptData, // Legacy field
          questionsAsked,
          responsesGiven,
          sessionDuration,
          presentationDuration: presentationDuration,
          spreadsheetS3Key: spreadsheetS3Key || undefined,
          videoS3Key: videoS3Key || undefined,
        });

        console.log('[SessionPage] Graded submission saved to DynamoDB with AI score:', assessmentReport?.overallScore);
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
          assessmentDescription={assessment?.description}
          dueDate={assessment?.dueDate}
          duration={assessment?.duration}
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

      {sessionView === 'presentation' && (
        <PresentationSession
          sessionType={sessionType}
          assessmentTitle={assessmentTitle}
          studentName={userName || 'Student'}
          timer={timer}
          workbookSheets={workbookSheets}
          workbookData={workbookData}
          onProceedToQA={handleProceedToQA}
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
          useAnamAvatar={persona?.useAnamAvatar ?? false}
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
