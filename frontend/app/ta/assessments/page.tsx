'use client';

import { Search, Filter, Download } from 'lucide-react';

/**
 * TA Assessments - View and manage all student assessment submissions.
 */
export default function AssessmentsPage() {
  const students = [
    { name: 'Sarah Johnson', group: 'Group 4 - Section A', status: 'completed', practiceAttempts: 3, score: 82, date: '2026-10-20' },
    { name: 'Michael Chen', group: 'Group 2 - Section A', status: 'completed', practiceAttempts: 2, score: 75, date: '2026-10-20' },
    { name: 'Emily Davis', group: 'Group 1 - Section B', status: 'completed', practiceAttempts: 5, score: 91, date: '2026-10-19' },
    { name: 'James Wilson', group: 'Group 3 - Section A', status: 'in-progress', practiceAttempts: 1, score: null, date: '2026-10-21' },
    { name: 'Ana Rodriguez', group: 'Group 5 - Section B', status: 'not-started', practiceAttempts: 0, score: null, date: '--' },
    { name: 'David Kim', group: 'Group 2 - Section A', status: 'completed', practiceAttempts: 4, score: 68, date: '2026-10-18' },
  ];

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">Student Assessments</h1>
          <p className="mt-1 text-sm text-gray-500 font-sans">
            Track and review individual student assessment submissions.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors font-sans">
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search students..."
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm font-sans focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
          />
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 font-sans">
          <Filter size={14} />
          Filter
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm font-sans">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Student</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Group</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Status</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Practice Attempts</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">AI Score</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Date</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Action</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.name} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">{student.name}</td>
                <td className="px-5 py-3 text-gray-600">{student.group}</td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      student.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : student.status === 'in-progress'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {student.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-600">{student.practiceAttempts}</td>
                <td className="px-5 py-3 text-gray-900 font-medium">
                  {student.score ? `${student.score}%` : '--'}
                </td>
                <td className="px-5 py-3 text-gray-600">{student.date}</td>
                <td className="px-5 py-3">
                  {student.status === 'completed' && (
                    <button className="text-sm font-medium text-maroon-600 hover:underline">
                      Review
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
