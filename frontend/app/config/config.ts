/**
 * Application configuration loaded from environment variables.
 * All NEXT_PUBLIC_ prefixed values are available at build time in the browser.
 */

export const config = {
  // AWS Region
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',

  // API Gateway
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',

  // Cognito
  userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID || '',
  userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || '',
  identityPoolId: process.env.NEXT_PUBLIC_IDENTITY_POOL_ID || '',

  // AgentCore WebSocket
  agentCoreWsUrl: process.env.NEXT_PUBLIC_AGENTCORE_WS_URL || '',

  // Session defaults
  defaultSessionDuration: 900, // 15 minutes in seconds
  maxFileSize: 50 * 1024 * 1024, // 50MB

  // Allowed upload types
  allowedUploadTypes: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv', // .csv
  ],
} as const;

/**
 * Assessment rubric categories with default weights.
 */
export const DEFAULT_RUBRIC_WEIGHTS = {
  financial_reasoning: 20,
  understanding_calculations: 20,
  assumption_validation: 15,
  recommendation_defense: 15,
  analytical_depth: 15,
  decision_making_quality: 10,
  communication_effectiveness: 5,
} as const;

export type RubricCategory = keyof typeof DEFAULT_RUBRIC_WEIGHTS;

/**
 * Persona interface matching DynamoDB schema.
 */
export interface Persona {
  personaID: string;
  name: string;
  role: string;
  description: string;
  systemPrompt: string;
  questionBank: string[];
  assessmentFocus: string[];
  voiceId?: string;
  anamPersonaId?: string;
  qaTimeLimitSec?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Assessment report structure returned by AgentCore.
 */
export interface AssessmentReport {
  overallScore: number;
  overallSummary: string;
  categoryScores: Record<RubricCategory, {
    score: number;
    justification: string;
  }>;
  strengths: string[];
  improvements: string[];
  evidenceCitations?: string[];
}

/**
 * Session metadata.
 */
export interface SessionInfo {
  sessionId: string;
  userId: string;
  caseId?: string;
  personaId: string;
  status: 'pending' | 'validated' | 'active' | 'completed' | 'validation_failed';
  uploadedFiles: string[];
  startedAt?: string;
  completedAt?: string;
}

/**
 * Generate a unique session ID.
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
