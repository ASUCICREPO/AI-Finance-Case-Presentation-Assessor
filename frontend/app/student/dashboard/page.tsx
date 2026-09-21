'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getStudentSubmissions, getStudentAssessments, Submission, Assessment } from '../../services/api';
import Link from 'next/link';
import {
  CheckCircle,
  Clock,
  Filter,
  ChevronDown,
  Loader2,
  AlertCircle,
  GraduationCap,
  Info,
} from 'lucide-react';

interface AssessmentDisplay {
  assessmentId: string;
  name: string;
  description?: string;
  sessionNumber: string;
  groupNumber: string;
  deadline: string;
  duration: string;
  submissionTime: string | null;
  status: 'Submitted' | 'Not started' | 'In progress';
  submissionId?: string;
}

/**
 * Student Dashboard - Assessments Overview
 * Shows instructor-assigned assessments from DynamoDB based on student's session/group
 */
export default function StudentDashboard() {
  const { userName, userId, userEmail, userSessionNumber, userGroupNumber } = useAuth();
  const [assessments, setAssessments] = useState<AssessmentDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentInfo, setStudentInfo] = useState<{ sessionNumber?: string; groupNumber?: string }>({});

  // Filter state
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [statusFilters, setStatusFilters] = useState<string[]>(['All']);
  const filterRef = useRef<HTMLDivElement>(null);

  // Load assessments on mount and when returning from session
  useEffect(() => {
    if (userId || userEmail) {
      fetchAssessments();
    }
  }, [userId, userEmail]);

  // Re-fetch when page becomes visible (user returns from session)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && (userId || userEmail)) {
        fetchAssessments();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [userId, userEmail]);

  async function fetchAssessments() {
    try {
      setLoading(true);
      setError(null);

      // Fetch assessments assigned to this student's session/group
      let assignedAssessments: Assessment[] = [];
      let submittedAssessments: Map<string, Submission> = new Map();

      // Get student's assigned assessments based on their session/group
      try {
        const assessmentsResponse = await getStudentAssessments(userId || '', userEmail || undefined);
        assignedAssessments = assessmentsResponse.assessments || [];
        setStudentInfo({
          sessionNumber: assessmentsResponse.sessionNumber,
          groupNumber: assessmentsResponse.groupNumber,
        });
      } catch (err) {
        console.error('Error fetching assigned assessments:', err);
        // If API fails, student might not have session/group assigned
      }

      // Get student's submissions to check status
      try {
        const submissionsResponse = await getStudentSubmissions(userId!, userEmail || undefined);
        console.log('[Dashboard] Submissions fetched:', submissionsResponse.submissions.length);
        submissionsResponse.submissions.forEach((sub: Submission) => {
          // DynamoDB may return assessmentID (capital) or assessmentId (lowercase)
          // Store by both to ensure matching works
          const subAssessmentId = (sub as any).assessmentId || (sub as any).assessmentID;
          console.log('[Dashboard] Submission assessmentId:', subAssessmentId);
          if (subAssessmentId) {
            submittedAssessments.set(subAssessmentId, sub);
          }
        });
      } catch (err) {
        console.error('Error fetching submissions:', err);
      }

      // Map assessments to display format
      const displayAssessments: AssessmentDisplay[] = assignedAssessments.map(assessment => {
        // Assessments may have assessmentId or assessmentID
        const assessmentId = assessment.assessmentId || assessment.assessmentID || '';
        const submission = submittedAssessments.get(assessmentId);

        console.log('[Dashboard] Assessment:', {
          assessmentId,
          title: assessment.title,
          hasAssessmentId: !!assessment.assessmentId,
          hasAssessmentID: !!assessment.assessmentID,
          hasSubmission: !!submission,
          submissionStatus: submission?.status,
        });

        return {
          assessmentId,
          name: assessment.title || assessment.caseName || 'Assessment',
          description: assessment.description,
          sessionNumber: studentInfo.sessionNumber || userSessionNumber || '1',
          groupNumber: studentInfo.groupNumber || userGroupNumber || '1',
          deadline: assessment.dueDate ? formatDeadline(assessment.dueDate) : 'No deadline',
          duration: `${assessment.duration || 15} min`,
          submissionTime: submission?.submittedAt ? formatDate(submission.submittedAt) : null,
          status: submission ? 'Submitted' : 'Not started',
          submissionId: submission?.submissionId,
        };
      });

      setAssessments(displayAssessments);

      // Show message if no assessments assigned
      if (displayAssessments.length === 0 && !error) {
        setError('No assessments assigned to your group yet');
      }
    } catch (err) {
      console.error('Error fetching assessments:', err);
      setError('Failed to load assessments');
    } finally {
      setLoading(false);
    }
  }

  function formatDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function formatDeadline(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilterDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalAssessments = assessments.length;
  const completedAssessments = assessments.filter(a => a.status === 'Submitted').length;
  const pendingAssessments = totalAssessments - completedAssessments;

  // Apply filters
  const filteredAssessments = assessments.filter(a => {
    return statusFilters.includes('All') || statusFilters.includes(a.status);
  });

  // Handle status filter change
  const handleStatusChange = (status: string) => {
    if (status === 'All') {
      setStatusFilters(['All']);
    } else {
      const newFilters = statusFilters.includes('All')
        ? [status]
        : statusFilters.includes(status)
          ? statusFilters.filter(s => s !== status)
          : [...statusFilters, status];
      setStatusFilters(newFilters.length === 0 ? ['All'] : newFilters);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={32} className="animate-spin text-maroon-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      {/* Welcome header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 font-serif">
          Welcome, {userName?.split(' ')[0] || 'Student'}!
        </h1>
        <p className="mt-1 text-gray-500 font-sans">
          {pendingAssessments > 0
            ? `You have ${pendingAssessments} assessment${pendingAssessments > 1 ? 's' : ''} waiting for you.`
            : totalAssessments > 0
              ? 'All assessments completed. Great job!'
              : 'No assessments assigned yet.'}
        </p>
        {/* Show student's session/group info */}
        {(studentInfo.sessionNumber || studentInfo.groupNumber) && (
          <p className="mt-1 text-sm text-gray-400">
            Session {studentInfo.sessionNumber || '—'}, Group {studentInfo.groupNumber || '—'}
          </p>
        )}
      </div>

      {/* Info banner if no group assigned */}
      {!studentInfo.sessionNumber && !studentInfo.groupNumber && assessments.length === 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <Info size={18} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">No group assignment found</p>
            <p className="mt-1 text-blue-600">
              Your instructor needs to assign you to a session and group before assessments appear here.
              Please contact your TA or instructor.
            </p>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && assessments.length > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2.5">
              <GraduationCap size={18} className="text-blue-600" />
            </div>
            <span className="text-sm text-gray-500 font-sans">Total Assessments</span>
          </div>
          <p className="mt-4 text-4xl font-bold text-gray-900 font-sans">{totalAssessments}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2.5">
              <CheckCircle size={18} className="text-green-600" />
            </div>
            <span className="text-sm text-gray-500 font-sans">Completed</span>
          </div>
          <p className="mt-4 text-4xl font-bold text-gray-900 font-sans">{completedAssessments}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2.5">
              <Clock size={18} className="text-amber-600" />
            </div>
            <span className="text-sm text-gray-500 font-sans">Pending</span>
          </div>
          <p className="mt-4 text-4xl font-bold text-gray-900 font-sans">{pendingAssessments}</p>
        </div>
      </div>

      {/* Assessments Section */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 font-serif">Your Assessments</h2>

        {/* Filter dropdown */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors font-sans"
          >
            <Filter size={16} className="text-gray-500" />
            {statusFilters.includes('All') ? 'All' : statusFilters.join(', ')}
            <ChevronDown size={16} className="text-gray-400" />
          </button>

          {showFilterDropdown && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-gray-200 bg-white shadow-lg z-50">
              <div className="p-3">
                {['All', 'Not started', 'Submitted'].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      handleStatusChange(status);
                      setShowFilterDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg ${statusFilters.includes(status) ? 'bg-maroon-50 text-maroon-700' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assessments table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Assessment
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Deadline
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Duration
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAssessments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    {statusFilters.includes('All')
                      ? 'No assessments assigned yet. Check back later!'
                      : 'No assessments match your filter.'}
                  </td>
                </tr>
              ) : (
                filteredAssessments.map((assessment) => (
                  <tr key={assessment.assessmentId} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{assessment.name}</p>
                        {assessment.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                            {assessment.description}
                          </p>
                        )}
                        {assessment.submissionTime && (
                          <p className="text-xs text-green-600 mt-0.5">
                            Submitted: {assessment.submissionTime}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {assessment.deadline}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {assessment.duration}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${assessment.status === 'Submitted'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                          }`}
                      >
                        {assessment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {assessment.status === 'Submitted' ? (
                        <span className="inline-flex items-center gap-1 text-sm text-green-600">
                          <CheckCircle size={14} />
                          Completed
                        </span>
                      ) : (
                        <Link
                          href={`/student/session?type=graded&assessmentId=${assessment.assessmentId}`}
                          className="inline-flex rounded-lg bg-maroon-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-maroon-700 transition-colors"
                        >
                          Start
                        </Link>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note */}
      <p className="mt-4 text-xs text-gray-400 text-center">
        Assessment scores will be available after review by your instructor.
      </p>
    </div>
  );
}
