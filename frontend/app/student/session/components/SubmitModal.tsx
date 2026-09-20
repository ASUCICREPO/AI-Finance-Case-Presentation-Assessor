'use client';

import { AlertTriangle, X } from 'lucide-react';

interface SubmitModalProps {
  isOpen: boolean;
  sessionType: 'practice' | 'graded';
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Submit Session Confirmation Modal
 * Based on Figma: "Submit Assessment?" modal
 */
export default function SubmitModal({
  isOpen,
  sessionType,
  onConfirm,
  onCancel,
}: SubmitModalProps) {
  if (!isOpen) return null;

  const isPractice = sessionType === 'practice';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-fade-in">
        {/* Close button */}
        <div className="flex justify-end">
          <button
            onClick={onCancel}
            className="rounded-full p-1 hover:bg-gray-100 transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Header with icon */}
        <div className="flex flex-col items-center text-center mt-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 mb-4">
            <AlertTriangle size={24} className="text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 font-serif">
            Submit Assessment?
          </h2>
        </div>

        {/* Body */}
        <div className="mt-4">
          <p className="text-sm text-gray-500 font-sans text-center">
            Are you sure you want to end this session? Please review the following:
          </p>

          <ul className="mt-5 space-y-3">
            {isPractice ? (
              <>
                <li className="flex items-start gap-3 text-sm text-gray-900 font-sans">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-maroon-600" />
                  <span>
                    <strong>This is a practice test.</strong> You can attempt it unlimited times to prepare.
                  </span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-900 font-sans">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-maroon-600" />
                  <span>
                    <strong>Your score will not count</strong> toward your final grading.
                  </span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-900 font-sans">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-maroon-600" />
                  <span>
                    Use this opportunity to identify areas of improvement before the real assessment.
                  </span>
                </li>
              </>
            ) : (
              <>
                <li className="flex items-start gap-3 text-sm text-gray-900 font-sans">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-maroon-600" />
                  <span>
                    <strong>The attempt will be submitted and graded.</strong>
                  </span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-900 font-sans">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-maroon-600" />
                  <span>
                    Unanswered or unassessed competency areas may reduce the provisional score.
                  </span>
                </li>
              </>
            )}
          </ul>
        </div>

        {/* Actions */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors font-sans"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-maroon-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-maroon-700 transition-colors font-sans"
          >
            {isPractice ? 'End Session' : 'Submit for Grading'}
          </button>
        </div>
      </div>
    </div>
  );
}
