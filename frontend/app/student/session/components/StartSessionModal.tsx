'use client';

import { AlertCircle, X } from 'lucide-react';

interface StartSessionModalProps {
  isOpen: boolean;
  sessionType: 'practice' | 'graded';
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Start Session Confirmation Modal
 * Based on Figma: "Start Practice Session?" modal with checklist items.
 */
export default function StartSessionModal({
  isOpen,
  sessionType,
  onConfirm,
  onCancel,
}: StartSessionModalProps) {
  if (!isOpen) return null;

  const isPractice = sessionType === 'practice';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
              <AlertCircle size={20} className="text-yellow-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 font-serif">
              {isPractice ? 'Start Practice Session?' : 'Start Assessment Session?'}
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
            Before you begin, please review the following important information:
          </p>

          <ul className="mt-4 space-y-3">
            <li className="flex items-start gap-2 text-sm text-gray-700 font-sans">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-900" />
              Before starting, ensure your audio, camera, and internet connection are active to
              avoid any interruptions.
            </li>
            {isPractice && (
              <>
                <li className="flex items-start gap-2 text-sm text-gray-700 font-sans">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-900" />
                  This is a practice test. You can attempt it unlimited times to prepare.
                </li>
                <li className="flex items-start gap-2 text-sm font-bold text-gray-900 font-sans">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-900" />
                  Your score will not count toward your final grading.
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700 font-sans">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-900" />
                  Use this opportunity to identify areas for improvement before the real assessment.
                </li>
              </>
            )}
            {!isPractice && (
              <>
                <li className="flex items-start gap-2 text-sm font-bold text-gray-900 font-sans">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-900" />
                  This session will be graded and counts toward your final score.
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700 font-sans">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-900" />
                  You cannot pause or restart once the session begins.
                </li>
              </>
            )}
          </ul>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors font-sans"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-maroon-600 px-4 py-2 text-sm font-medium text-white hover:bg-maroon-700 transition-colors font-sans"
          >
            Begin Q&A session
          </button>
        </div>
      </div>
    </div>
  );
}
