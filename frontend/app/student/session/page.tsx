'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAgentCore } from '../../hooks/useAgentCore';
import { useSessionTimer } from '../../hooks/useSessionTimer';
import { generateSessionId } from '../../config/config';
import { uploadFile, parseExcel, validateSubmission, listPersonas } from '../../services/api';
import { Persona } from '../../config/config';
import PracticeOverview from './components/PracticeOverview';
import LiveSession from './components/LiveSession';
import SessionComplete from './components/SessionComplete';

export type SessionView = 'overview' | 'active' | 'complete';
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

  // ── Start Assessment (from overview) ────────────────────
  const handleStartAssessment = async () => {
    await agentCore.startSession({
      personaId,
      userId: userId || '',
      sessionId,
      qaTimeLimitSec: 900,
    });
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

  // ── Handle file upload during live session ──────────────
  const handleFileUpload = useCallback(async (file: File) => {
    try {
      const { s3Key } = await uploadFile(sessionId, file, 'uploads');
      const parsed = await parseExcel(s3Key, sessionId);
      setWorkbookSheets(parsed.sheets);
      setWorkbookData(parsed.data);
    } catch (err) {
      console.error('File upload failed:', err);
    }
  }, [sessionId]);

  return (
    <div className="animate-step-enter">
      {sessionView === 'overview' && (
        <PracticeOverview
          sessionType={sessionType}
          onStartAssessment={handleStartAssessment}
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
          onFileUpload={handleFileUpload}
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
    </div>
  );
}
