'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  ClipboardCheck,
  Clock,
  TrendingUp,
  UserCircle,
  FileText,
  Loader2,
  AlertCircle,
  Eye,
  Calendar,
  BookOpen,
} from 'lucide-react';
import {
  listStudents,
  listSubmissions,
  getGradebookStats,
  listGroups,
  Submission,
  GradebookStats,
} from '../../services/api';

/**
 * TA Dashboard - Overview of assessments, students, and persona management.
 * Shows key stats, recent sessions, and quick actions.
 */
export default function TADashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentCount, setStudentCount] = useState(0);
  const [groupCount, setGroupCount] = useState(0);
  const [recentSubmissions, setRecentSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<GradebookStats | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      setError(null);
      const [studentsRes, submissionsRes, statsRes, groupsRes] = await Promise.all([
        listStudents(),
        listSubmissions(),
        getGradebookStats(),
        listGroups(),
      ]);
      setStudentCount(studentsRes.count);
      setGroupCount(groupsRes.count);
      // Sort submissions by date and take most recent 5
      const sorted = submissionsRes.submissions.sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
      setRecentSubmissions(sorted.slice(0, 5));
      setStats(statsRes);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  const dashboardStats = [
    {
      label: 'Total Students',
      value: studentCount.toString(),
      icon: Users,
      change: `${groupCount} groups`,
      href: '/ta/students',
    },
    {
      label: 'Submissions',
      value: stats?.total.toString() || '0',
      icon: ClipboardCheck,
      change: `${stats?.reviewProgress.percentComplete || 0}% graded`,
      href: '/ta/submissions',
    },
    {
      label: 'Pending Review',
      value: stats?.byStatus.pending.toString() || '0',
      icon: Clock,
      change: stats?.byStatus.pending ? 'Needs attention' : 'All caught up!',
      href: '/ta/submissions?status=Pending',
    },
    {
      label: 'Average Score',
      value: stats?.finalScores?.avg !== null && stats?.finalScores?.avg !== undefined ? `${stats.finalScores.avg}%` : '—',
      icon: TrendingUp,
      change: stats?.finalScores?.median !== null && stats?.finalScores?.median !== undefined ? `Median: ${stats.finalScores.median}%` : '',
      href: '/ta/gradebook',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={32} className="animate-spin text-maroon-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 font-serif">TA Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 font-sans">
          FIN 502 - Real Estate Finance - Fall 2026
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} />
          {error}
          <button onClick={fetchDashboardData} className="ml-auto underline">Retry</button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {dashboardStats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-xl border border-gray-200 bg-white p-5 hover:border-maroon-200 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between">
              <stat.icon size={20} className="text-maroon-600" />
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900 font-sans">{stat.value}</p>
            <p className="text-sm text-gray-500 font-sans">{stat.label}</p>
            <p className="mt-1 text-xs text-green-600 font-sans">{stat.change}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Recent Submissions */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 font-serif">Recent Submissions</h2>
            <Link
              href="/ta/submissions"
              className="text-sm font-medium text-maroon-600 hover:underline font-sans"
            >
              View all
            </Link>
          </div>

          {recentSubmissions.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <ClipboardCheck size={32} className="mx-auto mb-2 text-gray-300" />
              <p>No submissions yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-sans">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-3 text-left text-xs font-medium text-gray-500">Student</th>
                    <th className="pb-3 text-left text-xs font-medium text-gray-500">Status</th>
                    <th className="pb-3 text-left text-xs font-medium text-gray-500">AI Score</th>
                    <th className="pb-3 text-left text-xs font-medium text-gray-500">Submitted</th>
                    <th className="pb-3 text-right text-xs font-medium text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSubmissions.map((sub) => (
                    <tr key={sub.submissionId} className="border-b border-gray-100">
                      <td className="py-3 font-medium text-gray-900">
                        {sub.student
                          ? `${sub.student.firstName} ${sub.student.lastName}`
                          : 'Unknown'}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${sub.status === 'Reviewed'
                            ? 'bg-green-100 text-green-700'
                            : sub.status === 'Overridden'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-yellow-100 text-yellow-700'
                            }`}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3 text-gray-900">
                        {sub.aiScore !== undefined && sub.aiScore !== null
                          ? `${sub.aiScore}%`
                          : '—'}
                      </td>
                      <td className="py-3 text-gray-600">
                        {new Date(sub.submittedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href={`/ta/submissions/review?id=${sub.submissionId}`}
                          className="inline-flex items-center gap-1 text-xs text-maroon-600 hover:underline"
                        >
                          <Eye size={12} />
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-bold text-gray-900 font-serif">Quick Actions</h2>
            <div className="mt-4 space-y-2">
              <Link
                href="/ta/sessions"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors font-sans"
              >
                <Calendar size={18} className="text-maroon-600" />
                Manage Sessions
              </Link>
              <Link
                href="/ta/students"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors font-sans"
              >
                <Users size={18} className="text-maroon-600" />
                Manage Students
              </Link>
              <Link
                href="/ta/assessments"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors font-sans"
              >
                <FileText size={18} className="text-maroon-600" />
                Case Assessments
              </Link>
              <Link
                href="/ta/personas"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors font-sans"
              >
                <UserCircle size={18} className="text-maroon-600" />
                Persona Config
              </Link>
              <Link
                href="/ta/gradebook"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors font-sans"
              >
                <BookOpen size={18} className="text-maroon-600" />
                Grade Book
              </Link>
            </div>
          </div>

          {/* Review Progress */}
          {stats && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-bold text-gray-900 font-serif">Review Progress</h2>
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Graded</span>
                  <span className="font-medium">{stats.reviewProgress.reviewed} / {stats.total}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-maroon-600 transition-all"
                    style={{ width: `${stats.reviewProgress.percentComplete}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {stats.byStatus.pending} pending • {stats.byStatus.overridden} overridden
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
