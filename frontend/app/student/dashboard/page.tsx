'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';
import {
  FileText,
  CheckCircle,
  Clock,
  Filter,
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

// Sample data matching Figma design
const sampleAssessments: Assessment[] = [
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

/**
 * Student Dashboard - Assessments Overview
 * Shows stats cards and a list of assigned assessments with status.
 */
export default function StudentDashboard() {
  const { userName } = useAuth();
  const [assessments] = useState<Assessment[]>(sampleAssessments);
  const [filterStatus, setFilterStatus] = useState<string>('All');

  const totalAssessments = assessments.length;
  const completedAssessments = assessments.filter(a => a.status === 'Submitted').length;
  const pendingAssessments = totalAssessments - completedAssessments;

  const filteredAssessments = filterStatus === 'All'
    ? assessments
    : assessments.filter(a => a.status === filterStatus);

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      {/* Welcome header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 font-serif">
          Welcome back, {userName || 'Student'}!
        </h1>
        <p className="mt-1 text-gray-600 font-sans">
          Great news! You have {pendingAssessments} assessments waiting for you to tackle!
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        {/* Total Assessments */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gray-100 p-2">
              <FileText size={20} className="text-gray-600" />
            </div>
            <span className="text-sm text-gray-600 font-sans">Total Assessments</span>
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900 font-sans">{totalAssessments}</p>
        </div>

        {/* Completed Assessments */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <span className="text-sm text-gray-600 font-sans">Completed Assessments</span>
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900 font-sans">{completedAssessments}</p>
        </div>

        {/* Pending Assessments */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2">
              <Clock size={20} className="text-amber-600" />
            </div>
            <span className="text-sm text-gray-600 font-sans">Pending Assessments</span>
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900 font-sans">{pendingAssessments}</p>
        </div>
      </div>

      {/* Assigned assessments table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900 font-serif">Assigned assessments</h2>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 font-sans focus:outline-none focus:ring-2 focus:ring-maroon-500"
            >
              <option value="All">Filter by All</option>
              <option value="Submitted">Submitted</option>
              <option value="Not started">Not started</option>
              <option value="In progress">In progress</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Assessment Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Group
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Deadline
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Submission Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAssessments.map((assessment) => (
                <tr key={assessment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 font-sans">
                    {assessment.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-sans">
                    {assessment.group}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-sans">
                    {assessment.deadline}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-sans">
                    {assessment.duration}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-sans">
                    {assessment.submissionTime || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${assessment.status === 'Submitted'
                          ? 'bg-green-100 text-green-700'
                          : assessment.status === 'In progress'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                    >
                      {assessment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {assessment.status === 'Submitted' ? (
                      <button className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors font-sans">
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
