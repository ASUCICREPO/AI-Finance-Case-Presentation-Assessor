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


// ──────────────────────────────────────────────────────────
// TA Dashboard API - Students
// ──────────────────────────────────────────────────────────

export interface Student {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  loginId?: string;
  section?: string;
  groupId?: string;
  role: string;
  status: string;
  lastActivity?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentsResponse {
  students: Student[];
  count: number;
}

export async function listStudents(section?: string): Promise<StudentsResponse> {
  const params = section ? `?section=${encodeURIComponent(section)}` : '';
  return fetchApi<StudentsResponse>(`/students${params}`);
}

export async function getStudent(studentId: string): Promise<Student> {
  return fetchApi<Student>(`/students/${studentId}`);
}

export async function createStudent(data: Partial<Student>): Promise<Student> {
  return fetchApi<Student>('/students', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateStudent(studentId: string, data: Partial<Student>): Promise<Student> {
  return fetchApi<Student>(`/students/${studentId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteStudent(studentId: string): Promise<void> {
  await fetchApi(`/students/${studentId}`, { method: 'DELETE' });
}

export async function bulkImportStudents(students: Partial<Student>[]): Promise<{
  created: number;
  errors: number;
  students: Student[];
  errorDetails: Array<{ index: number; error: string; data?: Partial<Student> }>;
}> {
  return fetchApi('/students/bulk', {
    method: 'POST',
    body: JSON.stringify({ students }),
  });
}

// ──────────────────────────────────────────────────────────
// TA Dashboard API - Groups
// ──────────────────────────────────────────────────────────

export interface Group {
  groupId: string;
  groupName: string;
  assessmentId: string;
  description?: string;
  studentIds: string[];
  students?: Array<{
    studentId: string;
    firstName: string;
    lastName: string;
    email: string;
  }>;
  maxSize: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupsResponse {
  groups: Group[];
  count: number;
}

export async function listGroups(assessmentId?: string, includeStudents = false): Promise<GroupsResponse> {
  const params = new URLSearchParams();
  if (assessmentId) params.set('assessmentId', assessmentId);
  if (includeStudents) params.set('includeStudents', 'true');
  const query = params.toString() ? `?${params.toString()}` : '';
  return fetchApi<GroupsResponse>(`/groups${query}`);
}

export async function getGroup(groupId: string): Promise<Group> {
  return fetchApi<Group>(`/groups/${groupId}?includeStudents=true`);
}

export async function createGroup(data: Partial<Group>): Promise<Group> {
  return fetchApi<Group>('/groups', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateGroup(groupId: string, data: Partial<Group>): Promise<Group> {
  return fetchApi<Group>(`/groups/${groupId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteGroup(groupId: string): Promise<void> {
  await fetchApi(`/groups/${groupId}`, { method: 'DELETE' });
}

export async function addGroupMembers(groupId: string, studentIds: string[]): Promise<{
  message: string;
  addedStudentIds: string[];
  totalMembers: number;
}> {
  return fetchApi(`/groups/${groupId}/members`, {
    method: 'POST',
    body: JSON.stringify({ studentIds }),
  });
}

export async function removeGroupMembers(groupId: string, studentIds: string[]): Promise<{
  message: string;
  removedStudentIds: string[];
  totalMembers: number;
}> {
  return fetchApi(`/groups/${groupId}/members`, {
    method: 'DELETE',
    body: JSON.stringify({ studentIds }),
  });
}

// ──────────────────────────────────────────────────────────
// TA Dashboard API - Submissions
// ──────────────────────────────────────────────────────────

export interface Submission {
  submissionId: string;
  studentId: string;
  assessmentId: string;
  sessionId: string;
  status: 'Pending' | 'Reviewed' | 'Overridden';
  submittedAt: string;
  aiScore?: number;
  aiScoreBreakdown?: Record<string, number>;
  reviewerScore?: number;
  reviewerScoreBreakdown?: Record<string, number>;
  reviewerFeedback?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  videoUrl?: string;
  transcriptUrl?: string;
  spreadsheetUrl?: string;
  duration?: number;
  student?: {
    studentId: string;
    firstName: string;
    lastName: string;
    email: string;
    section?: string;
    groupId?: string;
  };
  assessment?: {
    assessmentId: string;
    title: string;
    dueDate?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionsResponse {
  submissions: Submission[];
  count: number;
}

export async function listSubmissions(filters?: {
  assessmentId?: string;
  studentId?: string;
  status?: string;
}): Promise<SubmissionsResponse> {
  const params = new URLSearchParams();
  if (filters?.assessmentId) params.set('assessmentId', filters.assessmentId);
  if (filters?.studentId) params.set('studentId', filters.studentId);
  if (filters?.status) params.set('status', filters.status);
  const query = params.toString() ? `?${params.toString()}` : '';
  return fetchApi<SubmissionsResponse>(`/submissions${query}`);
}

export async function getSubmission(submissionId: string): Promise<Submission> {
  return fetchApi<Submission>(`/submissions/${submissionId}`);
}

export async function gradeSubmission(submissionId: string, data: {
  reviewerScore: number;
  reviewerScoreBreakdown?: Record<string, number>;
  reviewerFeedback?: string;
  reviewerId?: string;
}): Promise<Submission> {
  return fetchApi<Submission>(`/submissions/${submissionId}/grade`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getSubmissionTranscript(submissionId: string): Promise<{
  submissionId: string;
  transcript: string | null;
  transcriptUrl?: string;
}> {
  return fetchApi(`/submissions/${submissionId}/transcript`);
}

// ──────────────────────────────────────────────────────────
// TA Dashboard API - Gradebook
// ──────────────────────────────────────────────────────────

export interface GradebookEntry {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  section?: string;
  groupId?: string;
  submissionCount: number;
  gradedCount: number;
  averageScore: number | null;
  submissions: Submission[];
}

export interface GradebookResponse {
  gradebook: GradebookEntry[];
  totalStudents: number;
  totalSubmissions: number;
}

export async function getGradebook(filters?: {
  assessmentId?: string;
  section?: string;
}): Promise<GradebookResponse> {
  const params = new URLSearchParams();
  if (filters?.assessmentId) params.set('assessmentId', filters.assessmentId);
  if (filters?.section) params.set('section', filters.section);
  const query = params.toString() ? `?${params.toString()}` : '';
  return fetchApi<GradebookResponse>(`/gradebook${query}`);
}

export interface GradebookStats {
  total: number;
  byStatus: {
    pending: number;
    reviewed: number;
    overridden: number;
  };
  aiScores: { min: number | null; max: number | null; avg: number | null; median: number | null };
  reviewerScores: { min: number | null; max: number | null; avg: number | null; median: number | null };
  finalScores: { min: number | null; max: number | null; avg: number | null; median: number | null };
  scoreDistribution: Record<string, number>;
  reviewProgress: {
    reviewed: number;
    pending: number;
    percentComplete: number;
  };
}

export async function getGradebookStats(assessmentId?: string): Promise<GradebookStats> {
  const params = assessmentId ? `?assessmentId=${encodeURIComponent(assessmentId)}` : '';
  return fetchApi<GradebookStats>(`/gradebook/stats${params}`);
}

export async function exportGradebook(options: {
  assessmentId?: string;
  section?: string;
  includeBreakdown?: boolean;
}): Promise<{
  message: string;
  filename: string;
  downloadUrl: string;
  recordCount: number;
}> {
  return fetchApi('/gradebook/export', {
    method: 'POST',
    body: JSON.stringify(options),
  });
}


// ──────────────────────────────────────────────────────────
// TA Dashboard API - Sessions (Course Semesters)
// ──────────────────────────────────────────────────────────

export interface CourseSession {
  sessionId: string;
  name: string;
  courseName: string;
  courseCode: string;
  semester: 'Spring' | 'Summer' | 'Fall' | 'Winter';
  year: number;
  startDate: string;
  endDate: string;
  studentCount: number;
  groupCount: number;
  status: 'active' | 'upcoming' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface CourseSessionsResponse {
  sessions: CourseSession[];
  count: number;
}

/**
 * List all course sessions with optional status filter.
 */
export async function listCourseSessions(status?: string): Promise<CourseSessionsResponse> {
  const params = status ? `?status=${encodeURIComponent(status)}` : '';
  // Note: Backend may use /sessions or a dedicated /course-sessions endpoint
  // For now, returning mock data as sessions API isn't fully implemented
  // In production, this would be: return fetchApi<CourseSessionsResponse>(`/course-sessions${params}`);

  // Mock implementation for frontend development
  const mockSessions: CourseSession[] = [
    {
      sessionId: 'sess-1',
      name: 'Spring 2026',
      courseName: 'Real Estate Finance',
      courseCode: 'FIN 502',
      semester: 'Spring',
      year: 2026,
      startDate: '2026-01-15',
      endDate: '2026-05-15',
      studentCount: 45,
      groupCount: 12,
      status: 'active',
      createdAt: '2025-12-01',
      updatedAt: '2025-12-01',
    },
    {
      sessionId: 'sess-2',
      name: 'Fall 2026',
      courseName: 'Real Estate Finance',
      courseCode: 'FIN 502',
      semester: 'Fall',
      year: 2026,
      startDate: '2026-08-20',
      endDate: '2026-12-15',
      studentCount: 0,
      groupCount: 0,
      status: 'upcoming',
      createdAt: '2026-06-01',
      updatedAt: '2026-06-01',
    },
  ];

  const filtered = status
    ? mockSessions.filter(s => s.status === status)
    : mockSessions;

  return { sessions: filtered, count: filtered.length };
}

/**
 * Create a new course session.
 */
export async function createCourseSession(data: Partial<CourseSession>): Promise<CourseSession> {
  // In production: return fetchApi<CourseSession>('/course-sessions', { method: 'POST', body: JSON.stringify(data) });

  // Mock implementation
  const newSession: CourseSession = {
    sessionId: `sess-${Date.now()}`,
    name: `${data.semester} ${data.year}`,
    courseName: data.courseName || 'Real Estate Finance',
    courseCode: data.courseCode || 'FIN 502',
    semester: data.semester || 'Spring',
    year: data.year || new Date().getFullYear(),
    startDate: data.startDate || new Date().toISOString().split('T')[0],
    endDate: data.endDate || new Date().toISOString().split('T')[0],
    studentCount: 0,
    groupCount: 0,
    status: 'upcoming',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return newSession;
}

/**
 * Update a course session.
 */
export async function updateCourseSession(sessionId: string, data: Partial<CourseSession>): Promise<CourseSession> {
  return fetchApi<CourseSession>(`/course-sessions/${sessionId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete/archive a course session.
 */
export async function archiveCourseSession(sessionId: string): Promise<void> {
  await fetchApi(`/course-sessions/${sessionId}/archive`, { method: 'POST' });
}

// ──────────────────────────────────────────────────────────
// TA Dashboard API - Assessments (Case Assessments)
// ──────────────────────────────────────────────────────────

export interface CaseAssessment {
  assessmentId: string;
  caseName: string;
  module: string;
  personaId?: string;
  sessionId: string;
  dueDate: string;
  groups: string[]; // Group IDs
  materials: Array<{
    name: string;
    s3Key: string;
    type: string;
    uploadedAt: string;
  }>;
  status: 'draft' | 'published' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface CaseAssessmentsResponse {
  assessments: CaseAssessment[];
  count: number;
}

/**
 * List all case assessments with optional session filter.
 */
export async function listCaseAssessments(sessionId?: string): Promise<CaseAssessmentsResponse> {
  const params = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : '';
  // Mock implementation for frontend development
  const mockAssessments: CaseAssessment[] = [
    {
      assessmentId: 'assess-1',
      caseName: 'Case Study: Financial Analysis',
      module: 'Module 1: Introduction to Finance',
      sessionId: 'sess-1',
      dueDate: '2026-09-15',
      groups: ['g1', 'g2', 'g3'],
      materials: [
        { name: 'Case Study Brief.pdf', s3Key: 'cases/brief.pdf', type: 'pdf', uploadedAt: '2026-08-01' },
      ],
      status: 'published',
      createdAt: '2026-08-01',
      updatedAt: '2026-08-01',
    },
  ];

  return { assessments: mockAssessments, count: mockAssessments.length };
}

/**
 * Create a new case assessment.
 */
export async function createCaseAssessment(data: Partial<CaseAssessment>): Promise<CaseAssessment> {
  // In production: return fetchApi<CaseAssessment>('/assessments', { method: 'POST', body: JSON.stringify(data) });

  const newAssessment: CaseAssessment = {
    assessmentId: `assess-${Date.now()}`,
    caseName: data.caseName || 'New Case',
    module: data.module || '',
    personaId: data.personaId,
    sessionId: data.sessionId || '',
    dueDate: data.dueDate || new Date().toISOString().split('T')[0],
    groups: data.groups || [],
    materials: data.materials || [],
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return newAssessment;
}
