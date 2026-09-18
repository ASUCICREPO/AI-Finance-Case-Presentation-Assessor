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

  // ──────────────────────────────────────────────────────────
  // Voice Agent Configuration
  // ──────────────────────────────────────────────────────────

  // Anam AI Avatar (primary - requires API key)
  anamEnabled: process.env.NEXT_PUBLIC_ANAM_ENABLED === 'true',

  // Nova Sonic Voice Agent (fallback - AWS native)
  novaSonicEnabled: process.env.NEXT_PUBLIC_NOVA_SONIC_ENABLED !== 'false', // Default true
  novaSonicModelId: process.env.NEXT_PUBLIC_NOVA_SONIC_MODEL_ID || 'amazon.nova-sonic-v1:0',
  kvsChannelName: process.env.NEXT_PUBLIC_KVS_CHANNEL_NAME || 'fin-assessor-voice',

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
 * Voice Agent Mode - determines which voice system to use.
 * Priority: Anam (avatar) > Nova Sonic (voice-only) > Text Chat (fallback)
 */
export type VoiceAgentMode = 'anam' | 'nova-sonic' | 'text-chat';

export function getVoiceAgentMode(): VoiceAgentMode {
  if (config.anamEnabled) {
    return 'anam';
  }
  if (config.novaSonicEnabled) {
    return 'nova-sonic';
  }
  return 'text-chat';
}

/**
 * Check if any voice agent is available.
 */
export function isVoiceAgentAvailable(): boolean {
  return config.anamEnabled || config.novaSonicEnabled;
}

/**
 * Standardized 6-dimension assessment rubric with default weights.
 * Based on Clarkson Lumber AI Avatar Development Specification.
 */
export const DEFAULT_RUBRIC = {
  problem_diagnosis: {
    weight: 20,
    name: 'Problem Diagnosis and Financial Reasoning',
    description: 'Identifies the underlying problem; distinguishes causes from symptoms; connects evidence to business and financing consequences; explains concepts in practical terms.'
  },
  calculations_mechanics: {
    weight: 20,
    name: 'Understanding of Calculations and Model Mechanics',
    description: 'Explains material formulas, methods, statement linkages, and outputs; traces numbers to assumptions; interprets calculations rather than reciting them.'
  },
  assumption_validation: {
    weight: 20,
    name: 'Assumption Validation and Analytical Judgment',
    description: 'Identifies material assumptions; explains why they are reasonable; distinguishes facts from choices; considers alternatives, sensitivity, and uncertainty.'
  },
  integration_ownership: {
    weight: 15,
    name: 'Analytical Integration and Ownership',
    description: 'Understands the entire submission; reconciles workbook, summary, and presentation; explains work beyond emphasized area; identifies inconsistencies.'
  },
  recommendation_defense: {
    weight: 20,
    name: 'Recommendation Defense and Decision Quality',
    description: 'Provides feasible, evidence-based recommendations; quantifies impact; considers risks, trade-offs, implementation, and conditions that would change the decision.'
  },
  executive_communication: {
    weight: 5,
    name: 'Executive Communication',
    description: 'Answers directly, organizes reasoning, explains technical concepts clearly, acknowledges uncertainty, and remains professional.'
  }
} as const;

export type RubricCategory = keyof typeof DEFAULT_RUBRIC;

/**
 * Performance level definitions for rubric scoring.
 */
export const PERFORMANCE_LEVELS = {
  4: {
    label: 'Strong Command',
    description: 'Accurate, integrated, specific, and well supported. Can explain assumptions, respond to challenges, and identify trade-offs.',
    scoreRange: [90, 100] as const
  },
  3: {
    label: 'Competent Command',
    description: 'Generally correct and adequately supported. Understands major elements but may omit secondary issues.',
    scoreRange: [75, 89] as const
  },
  2: {
    label: 'Partial Command',
    description: 'Some relevant understanding, but explanations are incomplete, formulaic, weakly supported, or internally inconsistent.',
    scoreRange: [50, 74] as const
  },
  1: {
    label: 'Insufficient Evidence',
    description: 'Cannot explain material elements, repeatedly contradicts the submission, relies on unsupported claims.',
    scoreRange: [0, 49] as const
  }
} as const;

export type PerformanceLevel = 1 | 2 | 3 | 4;

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
  /** Whether to use Anam visual avatar for this persona */
  useAnamAvatar?: boolean;
  /** Anam persona ID for avatar selection */
  anamPersonaId?: string;
  avatarId?: string;
  qaTimeLimitSec?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Category score structure for each rubric dimension.
 */
export interface CategoryScore {
  performanceLevel: PerformanceLevel;
  score: number;
  justification: string;
  evidence?: string[];
  confidence: 'high' | 'moderate' | 'low';
}

/**
 * Assessment report structure returned by AgentCore.
 * Uses the standardized 6-dimension rubric with performance levels.
 */
export interface AssessmentReport {
  overallScore: number;
  overallSummary: string;
  categoryScores: {
    problem_diagnosis: CategoryScore;
    calculations_mechanics: CategoryScore;
    assumption_validation: CategoryScore;
    integration_ownership: CategoryScore;
    recommendation_defense: CategoryScore;
    executive_communication: CategoryScore;
  };
  strengths: string[];
  improvements: string[];
  evidenceCitations?: string[];
  inconsistencies?: string[];
  unansweredQuestions?: string[];
  instructorReviewFlags?: string[];
  overallConfidence: 'high' | 'moderate' | 'low';
  rubricVersion?: string;
  rubricName?: string;
  rubricWeights?: Record<string, number>;
  performanceLevels?: typeof PERFORMANCE_LEVELS;
  provisionalLabel?: string;
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
