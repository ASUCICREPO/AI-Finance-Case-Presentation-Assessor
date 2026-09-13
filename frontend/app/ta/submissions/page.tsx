'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ClipboardCheck,
  Search,
  Filter,
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  AlertCircle,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import { listSubmissions, Submission } from '../../services/api';

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, [statusFilter]);

  async function fetchSubmissions() {
    try {
      setLoading(true);
      setError(null);
      const filters: { status?: string } = {};
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      const response = await listSubmissions(filters);
      setSubmissions(response.submissions);
    } catch (err) {
      setError('Failed to load submissions. Please try again.');
      console.error('Error fetching submissions:', err);
    } finally {
      setLoading(false);
    }
  }

  // Filter submissions by search
  const filteredSubmissions = submissions.filter(sub => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    const studentName = sub.student
      ? `${sub.student.firstName} ${sub.student.lastName}`.toLowerCase()
      : '';
    return (
      studentName.includes(search) ||
      sub.student?.email?.toLowerCase().includes(search) ||
      sub.submissionId.toLowerCase().includes(search)
    );
  });

  // Stats
  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'Pending').length,
    reviewed: submissions.filter(s => s.status === 'Reviewed').length,
    overridden: submissions.filter(s => s.status === 'Overridden').length,
  };

  function getStatusIcon(status: string) {
    switch (status) {
      case 'Reviewed':
        return <CheckCircle size={14} className="text-green-600" />;
      case 'Overridden':
        return <AlertTriangle size={14} className="text-orange-600" />;
      default:
        return <Clock size={14} className="text-yellow-600" />;
    }
  }

  function getStatusStyle(status: string) {
    switch (status) {
      case 'Reviewed':
        return 'bg-green-100 text-green-700';
      case 'Overridden':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  }

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 font-serif">Submissions</h1>
        <p className="mt-1 text-sm text-gray-500 font-sans">
          Review and grade student assessment submissions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-sm text-gray-500">Total Submissions</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          <p className="text-sm text-gray-500">Pending Review</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-2xl font-bold text-green-600">{stats.reviewed}</p>
          <p className="text-sm text-gray-500">Reviewed</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-2xl font-bold text-orange-600">{stats.overridden}</p>
          <p className="text-sm text-gray-500">Score Overridden</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by student name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Filter size={16} />
            Filter
            <ChevronDown size={14} />
          </button>
          {showFilters && (
            <div className="absolute right-0 mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg z-10 p-2">
              <p className="text-xs font-medium text-gray-500 px-2 py-1">Status</p>
              {['all', 'Pending', 'Reviewed', 'Overridden'].map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setStatusFilter(status);
                    setShowFilters(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-sm rounded ${
                    statusFilter === status
                      ? 'bg-maroon-50 text-maroon-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {status === 'all' ? 'All Statuses' : status}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} />
          {error}
          <button onClick={fetchSubmissions} className="ml-auto underline">Retry</button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin text-maroon-600" />
        </div>
      ) : (
        /* Submissions Table */
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI Score</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reviewer Score</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    {searchQuery || statusFilter !== 'all'
                      ? 'No submissions match your filters'
                      : 'No submissions yet'}
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((submission) => (
                  <tr key={submission.submissionId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-maroon-100 flex items-center justify-center">
                          <span className="text-xs font-medium text-maroon-600">
                            {submission.student?.firstName?.[0] || '?'}
                            {submission.student?.lastName?.[0] || '?'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {submission.student
                              ? `${submission.student.firstName} ${submission.student.lastName}`
                              : 'Unknown Student'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {submission.student?.section || 'No section'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <div>
                        <p>{new Date(submission.submittedAt).toLocaleDateString()}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(submission.submittedAt).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {submission.aiScore !== undefined && submission.aiScore !== null ? (
                        <span className="font-medium text-gray-900">{submission.aiScore}%</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {submission.reviewerScore !== undefined && submission.reviewerScore !== null ? (
                        <span className="font-medium text-gray-900">{submission.reviewerScore}%</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${getStatusStyle(submission.status)}`}>
                        {getStatusIcon(submission.status)}
                        {submission.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/ta/submissions/${submission.submissionId}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-maroon-50 px-3 py-1.5 text-xs font-medium text-maroon-700 hover:bg-maroon-100 transition-colors"
                      >
                        <Eye size={14} />
                        Review
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      <div className="mt-4 text-sm text-gray-500">
        Showing {filteredSubmissions.length} of {submissions.length} submissions
      </div>
    </div>
  );
}
