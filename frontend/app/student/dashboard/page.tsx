'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getStudentSubmissions, listSubmissions, Submission } from '../../services/api';
import Link from 'next/link';
import {
  FileText,
  CheckCircle,
  Clock,
  Filter,
  ChevronDown,
  Loader2,
  AlertCircle,
  Play,
  Infinity,
  GraduationCap,
} from 'lucide-react';

interface AssessmentDisplay {
  assessmentId: string;
  name: string;
  sessionNumber: string;
  groupNumber: string;
  deadline: string;
  duration: string;
  submissionTime: string | null;
  status: 'Submitted' | 'Not started' | 'In progress';
  submissionId?: string;
  type: 'practice' | 'graded';
}

/**
 * Student Dashboard - Assessments Overview
 * Shows:
 * 1. Practice Session card (unlimited attempts, no grades)
 * 2. Instructor-assigned assessments from DynamoDB (graded)
 */
export default function StudentDashboard() {
  const { userName, userId } = useAuth();
  const [assessments, setAssessments] = useState<AssessmentDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [statusFilters, setStatusFilters] = useState<string[]>(['All']);
  const filterRef = useRef<HTMLDivElement>(null);

  // Load assessments on mount
  useEffect(() => {
    fetchAssessments();
  }, [userId]);

  async function fetchAssessments() {
    try {
      setLoading(true);
      setError(null);

      // TODO: In production, fetch assigned assessments from API
      // For now, using demo data for graded assessments
      // The instructor assigns these via TA Dashboard → Groups → Assign to Group

      let submittedAssessments: AssessmentDisplay[] = [];

      if (userId) {
        try {
          const response = await getStudentSubmissions(userId);
          submittedAssessments = response.submissions
            .filter((sub: Submission) => sub.assessmentId !== 'practice') // Exclude practice sessions
            .map((sub: Submission) => ({
              assessmentId: sub.assessmentId,
              name: sub.assessment?.title || 'Assessment',
              sessionNumber: sub.sessionNumber || '1',
              groupNumber: sub.groupNumber || '1',
              deadline: sub.assessment?.dueDate || '',
              duration: '15 min',
              submissionTime: sub.submittedAt ? formatDate(sub.submittedAt) : null,
              status: 'Submitted' as const,
              submissionId: sub.submissionId,
              type: 'graded' as const,
            }));
        } catch (err) {
          console.error('Error fetching submissions:', err);
        }
      }

      // Demo graded assessments (these would come from instructor assignments)
      const pendingAssessments = getDemoGradedAssessments().filter(
        a => !submittedAssessments.find(s => s.assessmentId === a.assessmentId)
      );

      setAssessments([...submittedAssessments, ...pendingAssessments]);
    } catch (err) {
      console.error('Error fetching assessments:', err);
      setError('Failed to load assessments');
      setAssessments(getDemoGradedAssessments());
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

  function getDemoGradedAssessments(): AssessmentDisplay[] {
    // These represent instructor-assigned assessments
    return [
      {
        assessmentId: 'graded-1',
        name: 'Real Estate Investment Analysis',
        sessionNumber: '1',
        groupNumber: '1',
        deadline: 'Oct 24, 11:59 PM',
        duration: '15 min',
        submissionTime: null,
        status: 'Not started',
        type: 'graded'
      },
      {
        assessmentId: 'graded-2',
        name: 'Financial Modeling Case Study',
        sessionNumber: '1',
        groupNumber: '2',
        deadline: 'Oct 28, 11:59 PM',
        duration: '15 min',
        submissionTime: null,
        status: 'Not started',
        type: 'graded'
      },
      {
        assessmentId: 'graded-3',
        name: 'Market Analysis Presentation',
        sessionNumber: '2',
        groupNumber: '1',
        deadline: 'Nov 01, 11:59 PM',
        duration: '15 min',
        submissionTime: null,
        status: 'Not started',
        type: 'graded'
      },
    ];
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
            ? `You have ${pendingAssessments} graded assessment${pendingAssessments > 1 ? 's' : ''} waiting for you.`
            : 'All graded assessments completed. Great job!'}
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
          <AlertCircle size={18} />
          {error} - Showing sample data
        </div>
      )}

      {/* Practice Session Card - Always at top */}
      <div className="mb-8">
        <div className="rounded-xl border-2 border-dashed border-maroon-200 bg-gradient-to-r from-maroon-50 to-white p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-maroon-100 p-3">
                <Play size={24} className="text-maroon-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-gray-900 font-serif">Practice Session</h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    <Infinity size={12} />
                    Unlimited
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Practice your presentation skills with AI feedback. No grades, unlimited attempts.
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    15 min per session
                  </span>
                  <span className="text-green-600 font-medium">
                    ✓ Does not affect your grade
                  </span>
                </div>
              </div>
            </div>
            <Link
              href="/student/session?type=practice"
              className="inline-flex items-center gap-2 rounded-lg bg-maroon-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-maroon-700 transition-colors"
            >
              <Play size={16} />
              Start Practice
            </Link>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2.5">
              <GraduationCap size={18} className="text-blue-600" />
            </div>
            <span className="text-sm text-gray-500 font-sans">Graded Assessments</span>
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

      {/* Graded Assessments Section */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 font-serif">Graded Assessments</h2>

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
                  Group
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
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    {statusFilters.includes('All')
                      ? 'No graded assessments assigned yet. Check back later!'
                      : 'No assessments match your filter.'}
                  </td>
                </tr>
              ) : (
                filteredAssessments.map((assessment) => (
                  <tr key={assessment.assessmentId} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{assessment.name}</p>
                        {assessment.submissionTime && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            Submitted: {assessment.submissionTime}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      Session {assessment.sessionNumber}, Group {assessment.groupNumber}
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
        Graded assessment scores will be available after review by your instructor.
      </p>
    </div>
  );
}
