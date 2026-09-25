'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
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
  FileText,
  Info,
  Check,
} from 'lucide-react';

interface AssessmentDisplay {
  assessmentId: string;
  name: string;
  description?: string;
  group: string;
  deadline: string;
  duration: string;
  submissionTime: string | null;
  status: 'Submitted' | 'Not started' | 'In progress';
  submissionId?: string;
}

interface FilterState {
  status: string;
  groups: string[];
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
  const [filters, setFilters] = useState<FilterState>({ status: 'All', groups: [] });
  const [pendingFilters, setPendingFilters] = useState<FilterState>({ status: 'All', groups: [] });
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
      }

      // Get student's submissions to check status
      try {
        const submissionsResponse = await getStudentSubmissions(userId!, userEmail || undefined);
        console.log('[Dashboard] Submissions fetched:', submissionsResponse.submissions.length);
        submissionsResponse.submissions.forEach((sub: Submission) => {
          const subAssessmentId = sub.assessmentId || (sub as any).assessmentID;
          console.log('[Dashboard] Submission assessmentId:', subAssessmentId, 'status:', sub.status);
          if (subAssessmentId) {
            submittedAssessments.set(subAssessmentId, sub);
          }
        });
      } catch (err) {
        console.error('Error fetching submissions:', err);
      }

      // Map assessments to display format
      const displayAssessments: AssessmentDisplay[] = assignedAssessments.map(assessment => {
        const assessmentId = assessment.assessmentId || assessment.assessmentID || '';
        const submission = submittedAssessments.get(assessmentId);

        // Determine status based on submission existence
        let status: 'Submitted' | 'Not started' | 'In progress' = 'Not started';
        if (submission) {
          status = 'Submitted';
        }

        return {
          assessmentId,
          name: assessment.title || assessment.caseName || 'Assessment',
          description: assessment.description,
          group: `Group ${studentInfo.groupNumber || userGroupNumber || '1'}`,
          deadline: assessment.dueDate ? formatDeadline(assessment.dueDate) : '-',
          duration: `${assessment.duration || 15} min`,
          submissionTime: submission?.submittedAt ? formatDate(submission.submittedAt) : '-',
          status,
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
    });
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilterDropdown(false);
        // Reset pending filters to current applied filters when closing
        setPendingFilters(filters);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [filters]);

  // Extract unique groups from assessments
  const availableGroups = useMemo(() => {
    const groups = new Set<string>();
    assessments.forEach(a => {
      if (a.group) groups.add(a.group);
    });
    return Array.from(groups).sort((a, b) => {
      // Extract group numbers for proper sorting
      const numA = parseInt(a.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.replace(/\D/g, '')) || 0;
      return numA - numB;
    });
  }, [assessments]);

  const totalAssessments = assessments.length;
  const completedAssessments = assessments.filter(a => a.status === 'Submitted').length;
  const pendingAssessments = totalAssessments - completedAssessments;

  // Check if "All groups" is selected
  const isAllGroupsSelected = pendingFilters.groups.length === 0;

  // Handle status filter change
  const handleStatusChange = (status: string) => {
    setPendingFilters(prev => ({ ...prev, status }));
  };

  // Handle group filter toggle
  const handleGroupToggle = (group: string) => {
    setPendingFilters(prev => {
      if (group === 'all') {
        // Clear all group filters (select all)
        return { ...prev, groups: [] };
      }
      const newGroups = prev.groups.includes(group)
        ? prev.groups.filter(g => g !== group)
        : [...prev.groups, group];
      return { ...prev, groups: newGroups };
    });
  };

  // Apply filters
  const handleApplyFilters = () => {
    setFilters(pendingFilters);
    setShowFilterDropdown(false);
  };

  // Clear all filters
  const handleClearFilters = () => {
    const clearedFilters = { status: 'All', groups: [] };
    setPendingFilters(clearedFilters);
  };

  // Filter assessments based on applied filters
  const filteredAssessments = assessments.filter(a => {
    const statusMatch = filters.status === 'All' || a.status === filters.status;
    const groupMatch = filters.groups.length === 0 || filters.groups.includes(a.group);
    return statusMatch && groupMatch;
  });

  // Check if any filters are active
  const hasActiveFilters = filters.status !== 'All' || filters.groups.length > 0;

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 font-serif">
          Welcome, {userName?.split(' ')[0] || 'Student'}!
        </h1>
        <p className="mt-2 text-gray-500 font-sans">
          {pendingAssessments > 0
            ? `Great news! You have ${pendingAssessments} assessment${pendingAssessments > 1 ? 's' : ''} waiting for you to tackle!`
            : totalAssessments > 0
              ? 'All assessments completed. Great job!'
              : 'No assessments assigned yet.'}
        </p>
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

      {/* Stats cards */}
      <div className="grid gap-6 sm:grid-cols-3 mb-10">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-xl bg-blue-50 p-3">
              <FileText size={20} className="text-blue-600" />
            </div>
            <span className="text-sm text-gray-500 font-sans">Total Assessments</span>
          </div>
          <p className="text-5xl font-bold text-gray-900 font-sans">{totalAssessments}</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-xl bg-green-50 p-3">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <span className="text-sm text-gray-500 font-sans">Completed Assessments</span>
          </div>
          <p className="text-5xl font-bold text-gray-900 font-sans">{completedAssessments}</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-xl bg-amber-50 p-3">
              <Clock size={20} className="text-amber-600" />
            </div>
            <span className="text-sm text-gray-500 font-sans">Pending Assessments</span>
          </div>
          <p className="text-5xl font-bold text-gray-900 font-sans">{pendingAssessments}</p>
        </div>
      </div>

      {/* Assessments Section */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 font-serif">Assigned assessments</h2>

        {/* Filter dropdown */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => {
              setShowFilterDropdown(!showFilterDropdown);
              setPendingFilters(filters); // Reset pending to current on open
            }}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors font-sans ${hasActiveFilters
              ? 'border-maroon-300 bg-maroon-50 text-maroon-700'
              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
          >
            <Filter size={16} className={hasActiveFilters ? 'text-maroon-600' : 'text-gray-500'} />
            Filter by
            <ChevronDown size={16} className={hasActiveFilters ? 'text-maroon-600' : 'text-gray-400'} />
          </button>

          {showFilterDropdown && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-gray-200 bg-white shadow-lg z-50">
              <div className="p-4">
                {/* Status Section */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-maroon-700 mb-3">Status</h4>
                  <div className="space-y-2">
                    {['All', 'Not started', 'Submitted'].map((status) => (
                      <label
                        key={status}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${pendingFilters.status === status
                            ? 'border-maroon-600 bg-maroon-600'
                            : 'border-gray-300 group-hover:border-gray-400'
                            }`}
                          onClick={() => handleStatusChange(status)}
                        >
                          {pendingFilters.status === status && (
                            <Check size={14} className="text-white" strokeWidth={3} />
                          )}
                        </div>
                        <span className="text-sm text-gray-700">{status}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Group Section */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-maroon-700 mb-3">Group</h4>
                  <div className="space-y-2">
                    {/* All groups option */}
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isAllGroupsSelected
                          ? 'border-maroon-600 bg-maroon-600'
                          : 'border-gray-300 group-hover:border-gray-400'
                          }`}
                        onClick={() => handleGroupToggle('all')}
                      >
                        {isAllGroupsSelected && (
                          <Check size={14} className="text-white" strokeWidth={3} />
                        )}
                      </div>
                      <span className="text-sm text-gray-700">All groups</span>
                    </label>

                    {/* Individual group options */}
                    {availableGroups.map((group) => (
                      <label
                        key={group}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${pendingFilters.groups.includes(group)
                            ? 'border-maroon-600 bg-maroon-600'
                            : 'border-gray-300 group-hover:border-gray-400'
                            }`}
                          onClick={() => handleGroupToggle(group)}
                        >
                          {pendingFilters.groups.includes(group) && (
                            <Check size={14} className="text-white" strokeWidth={3} />
                          )}
                        </div>
                        <span className="text-sm text-gray-700">{group}</span>
                      </label>
                    ))}

                    {/* Show default groups if none exist yet */}
                    {availableGroups.length === 0 && (
                      <>
                        {['Group 1', 'Group 2', 'Group 3', 'Group 4'].map((group) => (
                          <label
                            key={group}
                            className="flex items-center gap-3 cursor-pointer group opacity-50"
                          >
                            <div className="w-5 h-5 rounded border-2 border-gray-300 flex items-center justify-center" />
                            <span className="text-sm text-gray-500">{group}</span>
                          </label>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={handleClearFilters}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={handleApplyFilters}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-maroon-600 rounded-lg hover:bg-maroon-700 transition-colors"
                  >
                    Apply Filter
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assessments table */}
      <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Assessment Name
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Group
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Deadline
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Duration
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Submission Time
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredAssessments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {!hasActiveFilters
                      ? 'No assessments assigned yet. Check back later!'
                      : 'No assessments match your filters.'}
                  </td>
                </tr>
              ) : (
                filteredAssessments.map((assessment) => (
                  <tr key={assessment.assessmentId} className="hover:bg-gray-50/50">
                    <td className="px-6 py-5">
                      <p className="text-sm font-medium text-gray-900">{assessment.name}</p>
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-500">
                      {assessment.group}
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-500">
                      {assessment.deadline}
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-500">
                      {assessment.duration}
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-500">
                      {assessment.submissionTime}
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${assessment.status === 'Submitted'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                          }`}
                      >
                        {assessment.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      {assessment.status === 'Submitted' ? (
                        <span className="inline-flex items-center gap-1 text-sm text-green-600">
                          <CheckCircle size={14} />
                          Completed
                        </span>
                      ) : (
                        <Link
                          href={`/student/session?type=graded&assessmentId=${assessment.assessmentId}`}
                          className="inline-flex rounded-lg bg-maroon-600 px-5 py-2 text-sm font-medium text-white hover:bg-maroon-700 transition-colors"
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
    </div>
  );
}
