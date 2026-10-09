'use client';

import { AlertTriangle, X } from 'lucide-react';

interface LeaveSessionModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Warning modal shown when user tries to navigate away during an active session.
 * Prevents accidental loss of progress.
 */
export default function LeaveSessionModal({ isOpen, onConfirm, onCancel }: LeaveSessionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 animate-scale-in">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X size={20} className="text-gray-400" />
        </button>

        <div className="p-6">
          {/* Warning Icon */}
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle size={32} className="text-amber-600" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 text-center font-serif mb-2">
            Leave Session?
          </h2>

          {/* Description */}
          <p className="text-gray-600 text-center text-sm mb-6">
            You have an active presentation session in progress. If you leave now, <strong className="text-red-600">all your progress will be lost</strong> and you will need to start over.
          </p>

          {/* Warning box */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-700 text-center">
              ⚠️ Your presentation recording and Q&A responses will not be saved.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Continue Session
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              Leave Anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
