'use client';

import { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
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
 * Session Complete — Shows success modal after submission.
 * NOTE: Students do NOT see AI scores or detailed feedback.
 * Only the instructor/TA can view results in the Admin Dashboard.
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

  // Auto-hide success modal after 5 seconds
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
              {isPractice ? 'Practice Complete!' : 'Submission Successfully Submitted!'}
            </h2>
            <p className="text-sm text-gray-500 font-sans mb-6">
              {isPractice
                ? 'Great practice session! Feel free to try again anytime.'
                : 'Your presentation and responses have been submitted for review. Your official grade will be communicated through Canvas after instructor/TA review.'}
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
            : 'Your assessment has been submitted. Your instructor will review the results and post your grade to Canvas.'}
        </p>
      </div>

      {/* Session stats - only show counts, NOT scores */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 font-sans">{totalQuestions}</p>
          <p className="text-xs text-gray-500 font-sans">Questions Asked</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 font-sans">{totalAnswers}</p>
          <p className="text-xs text-gray-500 font-sans">Responses Given</p>
        </div>
      </div>

      {/* Info box - no scores shown to students */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 mb-6">
        <h2 className="text-lg font-bold text-blue-900 font-serif mb-2">What's Next?</h2>
        <ul className="space-y-2 text-sm text-blue-800 font-sans">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
            Your submission has been recorded and sent to your instructor for review.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
            The AI has generated an initial assessment that your instructor will review.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
            Your final grade will be posted to Canvas after instructor review.
          </li>
        </ul>
      </div>

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
