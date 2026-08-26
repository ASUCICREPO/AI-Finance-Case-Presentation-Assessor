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
 * Based on Figma: "Submit practice assessment?" modal
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
      <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 font-serif">
              Submit {isPractice ? 'practice' : ''} assessment?
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="rounded-full p-1 hover:bg-gray-100 transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="mt-4">
          <p className="text-sm text-gray-600 font-sans">
            {isPractice
              ? 'This is a practice assessment. Please review the following before ending:'
              : 'Please review the following before submitting your assessment:'}
          </p>

          <ul className="mt-4 space-y-3">
            {isPractice ? (
              <>
                <li className="flex items-start gap-2 text-sm font-bold text-gray-900 font-sans">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-900" />
                  This is a practice session — your score will not affect your final grade.
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700 font-sans">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-900" />
                  You can retake this practice assessment unlimited times at any point.
                </li>
              </>
            ) : (
              <>
                <li className="flex items-start gap-2 text-sm font-bold text-gray-900 font-sans">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-900" />
                  This submission is final and will be graded.
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700 font-sans">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-900" />
                  You cannot retake this assessment once submitted.
                </li>
              </>
            )}
          </ul>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-maroon-600 px-4 py-2 text-sm font-medium text-maroon-600 hover:bg-maroon-50 transition-colors font-sans"
          >
            Continue Session
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors font-sans"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
