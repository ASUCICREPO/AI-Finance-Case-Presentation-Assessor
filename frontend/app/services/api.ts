/**
 * API Service Layer
 * Handles all REST API calls to the backend Lambda functions via API Gateway.
 */

import { config, Persona, AssessmentReport, SessionInfo } from '../config/config';

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${config.apiUrl}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Add auth token if available
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = token;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new ApiError(response.status, error.error || response.statusText);
  }

  return response.json();
}

function getAuthToken(): string | null {
  // Retrieve the current Cognito ID token from localStorage
  // This will be set by the AuthContext after login
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_id_token');
}

export class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// ──────────────────────────────────────────────────────────
// Persona API
// ──────────────────────────────────────────────────────────

export async function listPersonas(): Promise<Persona[]> {
  return fetchApi<Persona[]>('/personas');
}

export async function getPersona(personaId: string): Promise<Persona> {
  return fetchApi<Persona>(`/personas/${personaId}`);
}

export async function createPersona(data: Partial<Persona>): Promise<Persona> {
  return fetchApi<Persona>('/personas', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePersona(personaId: string, data: Partial<Persona>): Promise<Persona> {
  return fetchApi<Persona>(`/personas/${personaId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deletePersona(personaId: string): Promise<void> {
  await fetchApi(`/personas/${personaId}`, { method: 'DELETE' });
}

// ──────────────────────────────────────────────────────────
// File Upload API
// ──────────────────────────────────────────────────────────

interface PresignedUrlResponse {
  url: string;
  s3Key: string;
  expiresIn: number;
}

export async function getUploadUrl(
  sessionId: string,
  fileName: string,
  contentType: string,
  folder: 'uploads' | 'recordings' | 'reports' = 'uploads'
): Promise<PresignedUrlResponse> {
  return fetchApi<PresignedUrlResponse>('/upload-url', {
    method: 'POST',
    body: JSON.stringify({ action: 'upload', sessionId, fileName, contentType, folder }),
  });
}

export async function getDownloadUrl(
  sessionId: string,
  fileName: string,
  folder: 'uploads' | 'recordings' | 'reports' = 'reports'
): Promise<PresignedUrlResponse> {
  return fetchApi<PresignedUrlResponse>('/upload-url', {
    method: 'POST',
    body: JSON.stringify({ action: 'download', sessionId, fileName, folder }),
  });
}

/**
 * Upload a file to S3 using a pre-signed URL.
 */
export async function uploadFile(
  sessionId: string,
  file: File,
  folder: 'uploads' | 'recordings' = 'uploads',
  onProgress?: (percent: number) => void
): Promise<{ s3Key: string }> {
  // Get pre-signed URL
  const { url, s3Key } = await getUploadUrl(sessionId, file.name, file.type, folder);

  // Upload directly to S3
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type);

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Upload failed: network error'));
    xhr.send(file);
  });

  return { s3Key };
}

// ──────────────────────────────────────────────────────────
// Excel Parser API
// ──────────────────────────────────────────────────────────

export interface ParsedWorkbook {
  sessionId: string;
  sheets: string[];
  data: Record<string, {
    headers: string[];
    rows: (string | number | null)[][];
    rowCount: number;
  }>;
}

export async function parseExcel(
  s3Key: string,
  sessionId: string,
  sheets?: string[]
): Promise<ParsedWorkbook> {
  return fetchApi<ParsedWorkbook>('/parse-excel', {
    method: 'POST',
    body: JSON.stringify({ s3Key, sessionId, sheets }),
  });
}

// ──────────────────────────────────────────────────────────
// Validation API
// ──────────────────────────────────────────────────────────

export interface ValidationResult {
  sessionId: string;
  userId: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export async function validateSubmission(
  sessionId: string,
  userId: string,
  caseId?: string,
  uploadedFiles?: string[]
): Promise<ValidationResult> {
  return fetchApi<ValidationResult>('/validate', {
    method: 'POST',
    body: JSON.stringify({ sessionId, userId, caseId, uploadedFiles }),
  });
}

// ──────────────────────────────────────────────────────────
// Analytics API
// ──────────────────────────────────────────────────────────

export interface AnalyticsResponse {
  assessmentID: string;
  sessionID: string;
  userID: string;
  generatedAt: string;
  overallScore: number | null;
  categoryScores: Record<string, number | null>;
  rubricWeights: Record<string, number>;
  feedback: {
    strengths: string[];
    improvements: string[];
    evidence: string[];
  };
  status: string;
}

export async function getSessionAnalytics(sessionId: string): Promise<AnalyticsResponse | null> {
  try {
    return await fetchApi<AnalyticsResponse>(`/analytics?sessionId=${sessionId}`);
  } catch (e) {
    if (e instanceof ApiError && e.statusCode === 404) {
      return null;
    }
    throw e;
  }
}

export async function triggerAnalytics(
  sessionId: string,
  userId: string,
  transcript?: string,
  rubricWeights?: Record<string, number>
): Promise<AnalyticsResponse> {
  return fetchApi<AnalyticsResponse>('/analytics', {
    method: 'POST',
    body: JSON.stringify({ sessionId, userId, transcript, rubricWeights }),
  });
}


// ──────────────────────────────────────────────────────────
// Anam AI Avatar API
// ──────────────────────────────────────────────────────────

export async function getAnamSessionToken(anamPersonaId: string): Promise<string> {
  const data = await fetchApi<{ sessionToken: string }>('/anam-session', {
    method: 'POST',
    body: JSON.stringify({ anamPersonaId }),
  });
  return data.sessionToken;
}
