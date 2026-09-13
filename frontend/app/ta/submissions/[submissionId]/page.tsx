'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Calendar,
  Clock,
  Play,
  FileSpreadsheet,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Loader2,
  AlertCircle,
  Save,
  Bot,
  UserCheck,
} from 'lucide-react';
import {
  getSubmission,
  gradeSubmission,
  getSubmissionTranscript,
  Submission,
} from '../../../services/api';

export default function SubmissionReviewPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params.submissionId as string;

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'video' | 'transcript' | 'rubric'>('transcript');

  // Grading form
  const [reviewerScore, setReviewerScore] = useState<number | ''>('');
  const [feedback, setFeedback] = useState('');
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({
    'Financial Analysis': 0,
    'Communication': 0,
    'Technical Accuracy': 0,
    'Professionalism': 0,
  });

  useEffect(() => {
    fetchSubmission();
  }, [submissionId]);

  async function fetchSubmission() {
    try {
      setLoading(true);
      setError(null);
      const [subData, transcriptData] = await Promise.all([
        getSubmission(submissionId),
        getSubmissionTranscript(submissionId).catch(() => ({ transcript: null })),
      ]);
      setSubmission(subData);
      setTranscript(transcriptData.transcript);

      // Pre-fill form if already graded
      if (subData.reviewerScore !== undefined && subData.reviewerScore !== null) {
        setReviewerScore(subData.reviewerScore);
      }
      if (subData.reviewerFeedback) {
        setFeedback(subData.reviewerFeedback);
      }
      if (subData.reviewerScoreBreakdown) {
        setRubricScores(subData.reviewerScoreBreakdown);
      }
    } catch (err) {
      setError('Failed to load submission. Please try again.');
      console.error('Error fetching submission:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveGrade() {
    if (reviewerScore === '' || reviewerScore < 0 || reviewerScore > 100) {
      alert('Please enter a valid score between 0 and 100');
      return;
    }

    try {
      setSaving(true);
      await gradeSubmission(submissionId, {
        reviewerScore: Number(reviewerScore),
        reviewerScoreBreakdown: rubricScores,
        reviewerFeedback: feedback,
      });
      // Refresh submission data
      await fetchSubmission();
      alert('Grade saved successfully!');
    } catch (err) {
      alert('Failed to save grade. Please try again.');
      console.error('Error saving grade:', err);
    } finally {
      setSaving(false);
    }
  }

  function calculateTotalFromRubric() {
    const scores = Object.values(rubricScores);
    if (scores.length === 0) return 0;
    const total = scores.reduce((sum, score) => sum + score, 0);
    return Math.round(total / scores.length);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={32} className="animate-spin text-maroon-600" />
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle size={32} className="mx-auto text-red-500 mb-2" />
          <p className="text-red-700">{error || 'Submission not found'}</p>
          <Link href="/ta/submissions" className="mt-4 inline-block text-sm text-maroon-600 hover:underline">
            ← Back to Submissions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl animate-fade-in">
      {/* Back Button */}
      <Link
        href="/ta/submissions"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft size={16} />
        Back to Submissions
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">
            Review Submission
          </h1>
          <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <User size={14} />
              {submission.student
                ? `${submission.student.firstName} ${submission.student.lastName}`
                : 'Unknown Student'}
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {new Date(submission.submittedAt).toLocaleDateString()}
            </span>
            {submission.duration && (
              <span className="flex items-center gap-1">
                <Clock size={14} />
                {Math.floor(submission.duration / 60)}:{(submission.duration % 60).toString().padStart(2, '0')}
              </span>
            )}
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${
          submission.status === 'Reviewed'
            ? 'bg-green-100 text-green-700'
            : submission.status === 'Overridden'
            ? 'bg-orange-100 text-orange-700'
            : 'bg-yellow-100 text-yellow-700'
        }`}>
          {submission.status === 'Reviewed' && <CheckCircle size={14} />}
          {submission.status === 'Overridden' && <AlertTriangle size={14} />}
          {submission.status}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('video')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                activeTab === 'video'
                  ? 'border-maroon-600 text-maroon-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Play size={14} className="inline mr-1" />
              Recording
            </button>
            <button
              onClick={() => setActiveTab('transcript')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                activeTab === 'transcript'
                  ? 'border-maroon-600 text-maroon-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <MessageSquare size={14} className="inline mr-1" />
              Transcript
            </button>
            <button
              onClick={() => setActiveTab('rubric')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                activeTab === 'rubric'
                  ? 'border-maroon-600 text-maroon-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileSpreadsheet size={14} className="inline mr-1" />
              Rubric Grading
            </button>
          </div>

          {/* Tab Content */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            {activeTab === 'video' && (
              <div>
                {submission.videoUrl ? (
                  <video
                    src={submission.videoUrl}
                    controls
                    className="w-full rounded-lg bg-black"
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <Play size={48} />
                    <p className="mt-2">No recording available</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'transcript' && (
              <div className="max-h-[500px] overflow-y-auto">
                {transcript ? (
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">
                      {transcript}
                    </pre>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <MessageSquare size={48} />
                    <p className="mt-2">No transcript available</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'rubric' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  Score each category from 0-100. The average will be calculated automatically.
                </p>
                {Object.entries(rubricScores).map(([category, score]) => (
                  <div key={category} className="flex items-center gap-4">
                    <label className="w-40 text-sm font-medium text-gray-700">{category}</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={score}
                      onChange={(e) => setRubricScores({
                        ...rubricScores,
                        [category]: parseInt(e.target.value)
                      })}
                      className="flex-1 accent-maroon-600"
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={score}
                      onChange={(e) => setRubricScores({
                        ...rubricScores,
                        [category]: Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                      })}
                      className="w-16 rounded border border-gray-300 px-2 py-1 text-sm text-center"
                    />
                  </div>
                ))}
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setReviewerScore(calculateTotalFromRubric())}
                    className="text-sm text-maroon-600 hover:underline"
                  >
                    Apply rubric average ({calculateTotalFromRubric()}%) as final score
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Scoring Panel */}
        <div className="space-y-4">
          {/* Score Comparison */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Score Comparison</h3>
            <div className="space-y-4">
              {/* AI Score */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50">
                <div className="flex items-center gap-2">
                  <Bot size={18} className="text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">AI Score</span>
                </div>
                <span className="text-xl font-bold text-blue-600">
                  {submission.aiScore !== undefined && submission.aiScore !== null
                    ? `${submission.aiScore}%`
                    : '—'}
                </span>
              </div>

              {/* Reviewer Score */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                <div className="flex items-center gap-2">
                  <UserCheck size={18} className="text-green-600" />
                  <span className="text-sm font-medium text-gray-700">Reviewer Score</span>
                </div>
                <span className="text-xl font-bold text-green-600">
                  {submission.reviewerScore !== undefined && submission.reviewerScore !== null
                    ? `${submission.reviewerScore}%`
                    : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Grading Form */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Grade Submission</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Final Score (0-100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={reviewerScore}
                  onChange={(e) => setReviewerScore(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Enter score"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-lg font-bold text-center focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Feedback for Student
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Enter feedback comments..."
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
                />
              </div>

              <button
                onClick={handleSaveGrade}
                disabled={saving || reviewerScore === ''}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-maroon-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-maroon-700 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {submission.reviewerScore !== undefined && submission.reviewerScore !== null
                  ? 'Update Grade'
                  : 'Save Grade'}
              </button>
            </div>
          </div>

          {/* Student Info */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Student Details</h3>
            {submission.student ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Name</span>
                  <span className="font-medium">{submission.student.firstName} {submission.student.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="font-medium">{submission.student.email}</span>
                </div>
                {submission.student.section && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Section</span>
                    <span className="font-medium">{submission.student.section}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Student information unavailable</p>
            )}
          </div>

          {/* Reviewed Info */}
          {submission.reviewedAt && (
            <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
              Last reviewed: {new Date(submission.reviewedAt).toLocaleString()}
              {submission.reviewedBy && ` by ${submission.reviewedBy}`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
