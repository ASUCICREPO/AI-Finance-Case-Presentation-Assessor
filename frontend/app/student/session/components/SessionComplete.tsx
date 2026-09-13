'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { AssessmentReport } from '../../../config/config';
import { TranscriptEntry } from '../../../services/agentcore-ws';

interface SessionCompleteProps {
  sessionType: 'practice' | 'graded';
  assessmentReport: AssessmentReport | null;
  transcript: TranscriptEntry[];
  onDone: () => void;
}

/**
 * Session Complete — Shows success modal + assessment report (if available).
 */
export default function SessionComplete({
  sessionType,
  assessmentReport,
  transcript,
  onDone,
}: SessionCompleteProps) {
  const [showSuccessModal, setShowSuccessModal] = useState(true);
  const isPractice = sessionType === 'practice';
  const totalQuestions = transcript.filter((e) => e.role === 'assistant' && e.isFinal).length;
  const totalAnswers = transcript.filter((e) => e.role === 'user' && e.isFinal).length;

  // Auto-hide success modal after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSuccessModal(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl animate-fade-in text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
              <CheckCircle size={40} className="text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 font-serif mb-2">
              Submission Successfully Submitted!
            </h2>
            <p className="text-sm text-gray-500 font-sans mb-6">
              Your presentation and responses have been submitted for review. Your official grade will be communicated through Canvas after instructor/TA review.
            </p>
            <Link
              href="/student/dashboard"
              onClick={onDone}
              className="inline-flex w-full items-center justify-center rounded-lg bg-maroon-600 px-6 py-3 text-white font-sans font-medium hover:bg-maroon-700 transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      )}

      {/* Success header */}
      <div className="text-center mb-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle size={36} className="text-green-600" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-gray-900 font-serif">
          {isPractice ? 'Practice Session' : 'Assessment'} Complete!
        </h1>
        <p className="mt-2 text-sm text-gray-500 font-sans">
          {isPractice
            ? 'This was a practice session and will not count toward your final grade.'
            : 'Your assessment has been submitted. Your instructor will review the results.'}
        </p>
      </div>

      {/* Session stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 font-sans">{totalQuestions}</p>
          <p className="text-xs text-gray-500 font-sans">Questions Asked</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 font-sans">{totalAnswers}</p>
          <p className="text-xs text-gray-500 font-sans">Responses Given</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 font-sans">
            {assessmentReport ? `${Math.round(assessmentReport.overallScore)}%` : '--'}
          </p>
          <p className="text-xs text-gray-500 font-sans">AI Score</p>
        </div>
      </div>

      {/* Assessment Report */}
      {assessmentReport ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 font-serif mb-4">Assessment Feedback</h2>

          {/* Overall summary */}
          <p className="text-sm text-gray-700 font-sans leading-relaxed mb-6">
            {assessmentReport.overallSummary}
          </p>

          {/* Category scores */}
          <div className="space-y-3 mb-6">
            {Object.entries(assessmentReport.categoryScores).map(([category, data]) => (
              <div key={category} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700 font-sans capitalize">
                      {category.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs font-bold text-gray-900 font-sans">
                      {data.score}/100
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-200">
                    <div
                      className={`h-full rounded-full transition-all ${data.score >= 80
                        ? 'bg-green-500'
                        : data.score >= 60
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                        }`}
                      style={{ width: `${data.score}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Strengths & Improvements */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-bold text-green-700 font-sans mb-2">Strengths</h3>
              <ul className="space-y-1">
                {assessmentReport.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-700 font-sans">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold text-orange-700 font-sans mb-2">Areas to Improve</h3>
              <ul className="space-y-1">
                {assessmentReport.improvements.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-700 font-sans">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6 text-center">
          <Loader2 size={24} className="mx-auto animate-spin text-maroon-600" />
          <p className="mt-3 text-sm text-gray-500 font-sans">
            Generating assessment report...
          </p>
        </div>
      )}

      {/* Done button */}
      <div className="flex justify-center">
        <Link
          href="/student/dashboard"
          onClick={onDone}
          className="inline-flex items-center justify-center rounded-lg bg-maroon-600 px-8 py-3 text-white font-sans font-medium hover:bg-maroon-700 transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
