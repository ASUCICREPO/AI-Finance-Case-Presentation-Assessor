'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getCompletedSessions } from '../../utils/sessionStorage';
import Link from 'next/link';
import {
  FileText,
  CheckCircle,
  Clock,
  Filter,
  ChevronDown,
  X,
} from 'lucide-react';

interface Assessment {
  id: string;
  name: string;
  group: string;
  deadline: string;
  duration: string;
  submissionTime: string | null;
  status: 'Submitted' | 'Not started' | 'In progress';
}

// Base assessment data
const baseAssessments: Assessment[] = [
  { id: '1', name: 'Data Privacy Compliance', group: 'Group 1', deadline: 'Aug 20', duration: '15 min', submissionTime: 'Aug 20, 10:30 AM MST', status: 'Submitted' },
  { id: '2', name: 'SOC 2 Readiness Check', group: 'Group 2', deadline: 'Aug 22', duration: '15 min', submissionTime: 'Aug 22, 2:15 PM MST', status: 'Submitted' },
  { id: '3', name: 'Real Estate Investment', group: 'Group 1', deadline: 'Aug 25', duration: '15 min', submissionTime: null, status: 'Not started' },
  { id: '4', name: 'IT Security Assessment', group: 'Group 3', deadline: 'Aug 27', duration: '15 min', submissionTime: null, status: 'Not started' },
  { id: '5', name: 'GDPR Compliance Audit', group: 'Group 2', deadline: 'Aug 28', duration: '15 min', submissionTime: null, status: 'Not started' },
  { id: '6', name: 'Risk Management Review', group: 'Group 4', deadline: 'Sep 01', duration: '15 min', submissionTime: null, status: 'Not started' },
  { id: '7', name: 'Vendor Risk Assessment', group: 'Group 3', deadline: 'Sep 03', duration: '15 min', submissionTime: null, status: 'Not started' },
  { id: '8', name: 'Business Continuity Plan', group: 'Group 1', deadline: 'Sep 05', duration: '15 min', submissionTime: null, status: 'Not started' },
  { id: '9', name: 'Regulatory Compliance', group: 'Group 4', deadline: 'Sep 08', duration: '15 min', submissionTime: null, status: 'Not started' },
  { id: '10', name: 'Financial Case Analysis', group: 'Group 4', deadline: 'Sep 08', duration: '15 min', submissionTime: null, status: 'Not started' },
];

function mergeAssessmentsWithCompleted(base: Assessment[]): Assessment[] {
  const completed = getCompletedSessions();
  return base.map((assessment) => {
    const completedSession = completed.find((c) => c.assessmentId === assessment.id);
    if (completedSession) {
      return {
        ...assessment,
        status: 'Submitted' as const,
        submissionTime: completedSession.submissionTime,
      };
    }
    return assessment;
  });
}

/**
 * Student Dashboard - Assessments Overview
 * Shows stats cards and a list of assigned assessments with status.
 */
export default function StudentDashboard() {
  const { userName } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>(baseAssessments);

  // Filter state
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [statusFilters, setStatusFilters] = useState<string[]>(['All']);
  const [groupFilters, setGroupFilters] = useState<string[]>(['All groups']);
  const filterRef = useRef<HTMLDivElement>(null);

  // Load completed sessions from localStorage on mount
  useEffect(() => {
    setAssessments(mergeAssessmentsWithCompleted(baseAssessments));
  }, []);

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

  // Get unique groups
  const uniqueGroups = [...new Set(assessments.map(a => a.group))];

  // Apply filters
  const filteredAssessments = assessments.filter(a => {
    const statusMatch = statusFilters.includes('All') || statusFilters.includes(a.status);
    const groupMatch = groupFilters.includes('All groups') || groupFilters.includes(a.group);
    return statusMatch && groupMatch;
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

  // Handle group filter change
  const handleGroupChange = (group: string) => {
    if (group === 'All groups') {
      setGroupFilters(['All groups']);
    } else {
      const newFilters = groupFilters.includes('All groups')
        ? [group]
        : groupFilters.includes(group)
          ? groupFilters.filter(g => g !== group)
          : [...groupFilters, group];
      setGroupFilters(newFilters.length === 0 ? ['All groups'] : newFilters);
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setStatusFilters(['All']);
    setGroupFilters(['All groups']);
  };

  // Apply filters and close dropdown
  const applyFilters = () => {
    setShowFilterDropdown(false);
  };

  // Get filter label
  const getFilterLabel = () => {
    if (statusFilters.includes('All') && groupFilters.includes('All groups')) {
      return 'Filter by All';
    }
    const parts = [];
    if (!statusFilters.includes('All')) {
      parts.push(statusFilters.join(', '));
    }
    if (!groupFilters.includes('All groups')) {
      parts.push(groupFilters.join(', '));
    }
    return parts.join(' • ') || 'Filter by All';
  };

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      {/* Welcome header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 font-serif">
          Welcome, {userName?.split(' ')[0] || 'Sarah'}!
        </h1>
        <p className="mt-1 text-gray-500 font-sans">
          Great news! You have {pendingAssessments} assessments waiting for you to tackle!
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        {/* Total Assessments */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2.5">
              <FileText size={18} className="text-blue-600" />
            </div>
            <span className="text-sm text-gray-500 font-sans">Total Assessments</span>
          </div>
          <p className="mt-4 text-4xl font-bold text-gray-900 font-sans">{totalAssessments}</p>
        </div>

        {/* Completed Assessments */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2.5">
              <CheckCircle size={18} className="text-green-600" />
            </div>
            <span className="text-sm text-gray-500 font-sans">Completed Assessments</span>
          </div>
          <p className="mt-4 text-4xl font-bold text-gray-900 font-sans">{completedAssessments}</p>
        </div>

        {/* Pending Assessments */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2.5">
              <Clock size={18} className="text-amber-600" />
            </div>
            <span className="text-sm text-gray-500 font-sans">Pending Assessments</span>
          </div>
          <p className="mt-4 text-4xl font-bold text-gray-900 font-sans">{pendingAssessments}</p>
        </div>
      </div>

      {/* Assigned assessments section */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 font-serif">Assigned assessments</h2>

        {/* Filter dropdown */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors font-sans"
          >
            <Filter size={16} className="text-gray-500" />
            {getFilterLabel()}
            <ChevronDown size={16} className="text-gray-400" />
          </button>

          {showFilterDropdown && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-gray-200 bg-white shadow-lg z-50">
              <div className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Filter By</h3>

                {/* Status filters */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">Status</p>
                  <div className="space-y-2">
                    {['All', 'Not started', 'Submitted'].map((status) => (
                      <label key={status} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={status === 'All' ? statusFilters.includes('All') : statusFilters.includes(status)}
                          onChange={() => handleStatusChange(status)}
                          className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                        />
                        <span className="text-sm text-gray-700">{status}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Group filters */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">Group</p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={groupFilters.includes('All groups')}
                        onChange={() => handleGroupChange('All groups')}
                        className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                      />
                      <span className="text-sm text-gray-700">All groups</span>
                    </label>
                    {uniqueGroups.map((group) => (
                      <label key={group} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={groupFilters.includes(group)}
                          onChange={() => handleGroupChange(group)}
                          className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                        />
                        <span className="text-sm text-gray-700">{group}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={clearFilters}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors font-sans"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={applyFilters}
                    className="flex-1 rounded-lg bg-maroon-600 px-3 py-2 text-sm font-medium text-white hover:bg-maroon-700 transition-colors font-sans"
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
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Assessment Name
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
                  Submission Time
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAssessments.map((assessment) => (
                <tr key={assessment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 font-sans">
                    {assessment.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-sans">
                    {assessment.group}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-sans">
                    {assessment.deadline}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-sans">
                    {assessment.duration}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-sans">
                    {assessment.submissionTime || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${assessment.status === 'Submitted'
                          ? 'bg-green-100 text-green-700'
                          : assessment.status === 'In progress'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                    >
                      {assessment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {assessment.status === 'Submitted' ? (
                      <button className="rounded-lg border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors font-sans">
                        Start
                      </button>
                    ) : (
                      <Link
                        href="/student/session"
                        className="inline-flex rounded-lg bg-maroon-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-maroon-700 transition-colors font-sans"
                      >
                        Start
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
