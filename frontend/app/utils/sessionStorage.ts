/**
 * Session storage utilities for tracking completed assessments.
 */

const COMPLETED_SESSIONS_KEY = 'finassessor_completed_sessions';

export interface CompletedSession {
  assessmentId: string;
  sessionId: string;
  submissionTime: string;
  questionsAsked: number;
  responsesGiven: number;
  aiScore?: number;
}

/**
 * Get all completed sessions from localStorage.
 */
export function getCompletedSessions(): CompletedSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(COMPLETED_SESSIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save a completed session to localStorage.
 */
export function saveCompletedSession(session: CompletedSession): void {
  if (typeof window === 'undefined') return;
  try {
    const sessions = getCompletedSessions();
    // Check if already exists (update if so)
    const existingIndex = sessions.findIndex(
      (s) => s.assessmentId === session.assessmentId
    );
    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.push(session);
    }
    localStorage.setItem(COMPLETED_SESSIONS_KEY, JSON.stringify(sessions));
  } catch (err) {
    console.error('Failed to save completed session:', err);
  }
}

/**
 * Check if an assessment has been completed.
 */
export function isAssessmentCompleted(assessmentId: string): boolean {
  const sessions = getCompletedSessions();
  return sessions.some((s) => s.assessmentId === assessmentId);
}

/**
 * Format current date/time as submission time string.
 */
export function formatSubmissionTime(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  };
  return now.toLocaleString('en-US', options);
}
