'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getStudentSubmissions, Submission } from '../../services/api';
import {
  BarChart3,
  CheckCircle,
  Clock,
  Calendar,
  FileText,
  Loader2,
  AlertCircle,
} from 'lucide-react';

/**
 * Student Results Page
 * Shows submission history WITHOUT AI scores or detailed analytics.
 * Students only see: status (submitted/pending review/graded), submission time.
 * Final grades are released by instructor through a separate process.
 */
export default function ResultsPage() {
  const { userId } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchResults();
    } else {
      setLoading(false);
    }
  }, [userId]);

  async function fetchResults() {
    try {
      setLoading(true);
      setError(null);
      // Uses includeAiAnalytics=false - backend strips AI scores
      const response = await getStudentSubmissions(userId!);
      setSubmissions(response.submissions);
    } catch (err) {
      console.error('Error fetching results:', err);
      setError('Failed to load results');
    } finally {
      setLoading(false);
    }
  }

  function formatDate(isoString: string): string {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function getStatusDisplay(status: string) {
    switch (status) {
      case 'Reviewed':
        return {
          label: 'Graded',
          icon: <CheckCircle size={14} className="text-green-600" />,
          style: 'bg-green-100 text-green-700',
        };
      case 'Overridden':
        return {
          label: 'Graded',
          icon: <CheckCircle size={14} className="text-green-600" />,
          style: 'bg-green-100 text-green-700',
        };
      default:
        return {
          label: 'Pending Review',
          icon: <Clock size={14} className="text-yellow-600" />,
          style: 'bg-yellow-100 text-yellow-700',
        };
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={32} className="animate-spin text-maroon-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 font-serif">Results & History</h1>
      <p className="mt-2 text-sm text-gray-500 font-sans">
        View your assessment submission history and status.
      </p>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} />
          {error}
          <button onClick={fetchResults} className="ml-auto underline">Retry</button>
        </div>
      )}

      {submissions.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center text-center">
          <div className="rounded-full bg-gray-100 p-4">
            <BarChart3 size={32} className="text-gray-400" />
          </div>
          <p className="mt-4 text-sm text-gray-500 font-sans">
            No assessment results yet. Complete a Q&A session to see your submissions here.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{submissions.length}</p>
              <p className="text-sm text-gray-500">Total Submissions</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                {submissions.filter(s => s.status === 'Reviewed' || s.status === 'Overridden').length}
              </p>
              <p className="text-sm text-gray-500">Graded</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {submissions.filter(s => s.status === 'Pending').length}
              </p>
              <p className="text-sm text-gray-500">Pending Review</p>
            </div>
          </div>

          {/* Submissions List */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-700">Your Submissions</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {submissions.map((submission) => {
                const statusDisplay = getStatusDisplay(submission.status);
                return (
                  <div
                    key={submission.submissionId}
                    className="px-4 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-maroon-100 flex items-center justify-center">
                          <FileText size={18} className="text-maroon-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {submission.assessment?.title || 'Assessment'}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              {formatDate(submission.submittedAt)}
                            </span>
                            {submission.sessionNumber && submission.groupNumber && (
                              <span>
                                Session {submission.sessionNumber} / Group {submission.groupNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusDisplay.style}`}>
                          {statusDisplay.icon}
                          {statusDisplay.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Note about grades */}
          <div className="rounded-lg bg-blue-50 px-4 py-3">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> Final grades and feedback will be released by your instructor
              after the review process is complete. Check your course page for grade announcements.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
