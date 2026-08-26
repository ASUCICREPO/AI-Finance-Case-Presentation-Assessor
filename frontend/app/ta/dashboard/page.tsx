'use client';

import {
  Users,
  ClipboardCheck,
  Clock,
  TrendingUp,
  UserCircle,
  FileText,
} from 'lucide-react';

/**
 * TA Dashboard - Overview of assessments, students, and persona management.
 * Shows key stats, recent sessions, and quick actions.
 */
export default function TADashboard() {
  const stats = [
    { label: 'Total Students', value: '48', icon: Users, change: '+4 this week' },
    { label: 'Assessments Completed', value: '32', icon: ClipboardCheck, change: '67% completion' },
    { label: 'Pending Review', value: '8', icon: Clock, change: '3 urgent' },
    { label: 'Average Score', value: '78%', icon: TrendingUp, change: '+5% vs last cohort' },
  ];

  const recentSessions = [
    { student: 'Sarah Johnson', group: 'Group 4', status: 'completed', score: 82, time: '14:32' },
    { student: 'Michael Chen', group: 'Group 2', status: 'completed', score: 75, time: '12:18' },
    { student: 'Emily Davis', group: 'Group 1', status: 'in-progress', score: null, time: '06:45' },
    { student: 'James Wilson', group: 'Group 3', status: 'pending', score: null, time: '--' },
  ];

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 font-serif">TA Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 font-sans">
          FIN 502 - Real Estate Finance - Fall 2026
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <stat.icon size={20} className="text-maroon-600" />
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900 font-sans">{stat.value}</p>
            <p className="text-sm text-gray-500 font-sans">{stat.label}</p>
            <p className="mt-1 text-xs text-green-600 font-sans">{stat.change}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Recent Sessions */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 font-serif">Recent Sessions</h2>
            <button className="text-sm font-medium text-maroon-600 hover:underline font-sans">
              View all
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm font-sans">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-3 text-left text-xs font-medium text-gray-500">Student</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-500">Group</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-500">Score</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-500">Duration</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((session) => (
                  <tr key={session.student} className="border-b border-gray-100">
                    <td className="py-3 font-medium text-gray-900">{session.student}</td>
                    <td className="py-3 text-gray-600">{session.group}</td>
                    <td className="py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          session.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : session.status === 'in-progress'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {session.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-900">
                      {session.score ? `${session.score}%` : '--'}
                    </td>
                    <td className="py-3 text-gray-600">{session.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-bold text-gray-900 font-serif">Quick Actions</h2>
            <div className="mt-4 space-y-2">
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors font-sans">
                <UserCircle size={18} className="text-maroon-600" />
                Manage Personas
              </button>
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors font-sans">
                <ClipboardCheck size={18} className="text-maroon-600" />
                Review Assessments
              </button>
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors font-sans">
                <FileText size={18} className="text-maroon-600" />
                Export Reports
              </button>
            </div>
          </div>

          {/* Active Personas */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-bold text-gray-900 font-serif">Active Personas</h2>
            <div className="mt-4 space-y-3">
              {['Keith Clarkson (CEO)', 'Dr. Maria Santos (CFO)', 'James Park (Investor)'].map(
                (persona) => (
                  <div
                    key={persona}
                    className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2"
                  >
                    <div className="h-6 w-6 rounded-full bg-maroon-100" />
                    <span className="text-sm text-gray-700 font-sans">{persona}</span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
