'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X, ChevronLeft, ChevronRight, CheckCircle2, FileText, Upload,
  Clock, Video, Mic, Speaker, Lightbulb, Camera,
} from 'lucide-react';

interface StudentTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

const TOTAL_STEPS = 6;

export default function StudentTutorialModal({ isOpen, onClose, userName }: StudentTutorialModalProps) {
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (isOpen) setStep(1);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    localStorage.setItem('student_tutorial_completed', 'true');
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowRight' && step < TOTAL_STEPS) setStep(s => s + 1);
      if (e.key === 'ArrowLeft' && step > 1) setStep(s => s - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, step, handleClose]);

  if (!isOpen) return null;

  const displayName = userName ? userName.split('@')[0] : '';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative mx-4 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Progress bar */}
        <div className="flex gap-1 bg-maroon-800 px-4 pt-3">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div key={i} className="h-1 flex-1 rounded-full overflow-hidden bg-maroon-900/50">
              <div
                className={`h-full rounded-full transition-all duration-300 ${i + 1 <= step ? 'bg-white' : 'bg-transparent'}`}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="relative bg-gradient-to-br from-maroon-800 to-maroon-900 px-6 pb-5 pt-2">
          <button
            onClick={handleClose}
            className="absolute right-4 top-3 text-white/60 hover:text-white transition underline text-sm"
            aria-label="Skip tutorial"
          >
            Skip
          </button>
          <p className="mb-1 text-xs text-maroon-200">Step {step} of {TOTAL_STEPS}</p>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white font-serif">
              {step === 1 && `Welcome to AI-powered assessment${displayName ? `, ${displayName}` : ''}!`}
              {step === 2 && 'Step 1: Read the Assignment'}
              {step === 3 && 'Step 2: Device Check'}
              {step === 4 && 'Step 3: Upload Materials'}
              {step === 5 && 'Step 4: Session Structure'}
              {step === 6 && "You're All Set!"}
            </h2>
          </div>
          <p className="text-sm text-maroon-200 mt-1">
            {step === 1 && "Let's take a quick tour of how to use the platform"}
            {step === 2 && 'Review the case materials and prepare concise, data-backed responses.'}
            {step === 3 && 'Ensure your devices are properly connected and working.'}
            {step === 4 && 'Prepare your spreadsheet files for the AI session.'}
            {step === 5 && 'Understand the flow of your assessment session.'}
            {step === 6 && 'Ready to start practicing?'}
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {step === 1 && (
            <div className="space-y-5">
              <div className="rounded-xl border border-maroon-100 bg-maroon-50/50 p-5">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">What you'll learn in this tutorial:</h3>
                <ul className="space-y-2.5">
                  {[
                    'How to prepare for practice and real sessions',
                    'How to check your device connections',
                    'How to upload your material spreadsheet',
                    'How to follow the session structure timeline',
                    'How to submit for grading and review',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-maroon-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-xs text-gray-400">
                This tutorial will take about 2-3 minutes. You can skip anytime and restart from the Tutorial button in the header.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Key preparation tips:</h3>
                <ul className="space-y-2.5">
                  {[
                    'Know your analysis inside out assumptions, metrics, and outputs.',
                    'Support your analysis with evidence and comparable examples.',
                    'Clearly articulate risks and how they\'re mitigated.',
                    'Defend your final recommendation with a logical, well-structured argument.',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Requires check:</h3>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-sm text-gray-700">
                    <div className="rounded-full bg-blue-100 p-2">
                      <Camera size={16} className="text-blue-600" />
                    </div>
                    Video Camera Connection
                  </li>
                  <li className="flex items-center gap-3 text-sm text-gray-700">
                    <div className="rounded-full bg-green-100 p-2">
                      <Mic size={16} className="text-green-600" />
                    </div>
                    Microphone Signal Input
                  </li>
                  <li className="flex items-center gap-3 text-sm text-gray-700">
                    <div className="rounded-full bg-purple-100 p-2">
                      <Speaker size={16} className="text-purple-600" />
                    </div>
                    Audio Speaker Diagnostics
                  </li>
                </ul>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-amber-100 bg-amber-50 p-3">
                <Lightbulb size={16} className="mt-0.5 flex-shrink-0 text-amber-500" />
                <p className="text-xs text-amber-700">Tip: Make sure to allow browser permissions for camera and microphone when prompted.</p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Upload Your Spreadsheet</h3>
                <p className="text-xs text-gray-500 mb-4">Upload your financial analysis workbook. The AI will reference this during the Q&A session.</p>
              </div>

              {/* Upload zone mock */}
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 py-10">
                <div className="rounded-full bg-gray-100 p-3 mb-3">
                  <Upload size={24} className="text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-700">Drag and drop your file here</p>
                <p className="text-xs text-gray-400 mb-3">or click to browse</p>
                <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700">
                  <Upload size={14} />
                  Choose File
                </button>
              </div>

              <p className="text-xs text-gray-400">
                Maximum file size: 50MB. These files are allowed.
              </p>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Session Timeline:</h3>
                <p className="text-xs text-gray-500 mb-4">Review the expected pace before the AI session begins.</p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-blue-100 p-3">
                    <Clock size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Up to 5 minutes for the student's opening presentation</p>
                    <p className="text-sm font-semibold text-maroon-600">5 min</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-blue-100 p-3">
                    <Clock size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Approximately 8 minutes for AI questioning</p>
                    <p className="text-sm font-semibold text-maroon-600">8 min</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-5">
              {/* Success banner */}
              <div className="flex flex-col items-center rounded-xl bg-green-50 py-8">
                <CheckCircle2 size={48} className="mb-3 text-green-500" />
                <p className="text-lg font-bold text-gray-900">Ready to Begin!</p>
                <p className="text-sm text-gray-500">Let's get started with your AI-powered assessment.</p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-2">
                  <Lightbulb size={16} className="mt-0.5 flex-shrink-0 text-amber-500" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Pro Tip</p>
                    <p className="text-xs leading-relaxed text-amber-700">You can access this tutorial anytime by clicking the "Tutorial" button in the header.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-4">
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1}
            className={`flex items-center gap-1 text-sm font-medium transition ${step === 1 ? 'text-gray-300 cursor-default' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <ChevronLeft size={16} /> Previous
          </button>

          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <button
                key={i}
                onClick={() => setStep(i + 1)}
                className={`transition-all duration-200 rounded-full ${i + 1 === step
                  ? 'h-2.5 w-6 bg-maroon-600'
                  : 'h-2.5 w-2.5 bg-gray-300 hover:bg-gray-400'
                  }`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          {step < TOTAL_STEPS ? (
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex items-center gap-1 rounded-lg bg-maroon-800 px-5 py-2 text-sm font-medium text-white transition hover:bg-maroon-900"
            >
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleClose}
              className="flex items-center gap-1 rounded-lg bg-maroon-800 px-5 py-2 text-sm font-medium text-white transition hover:bg-maroon-900"
            >
              Get Started <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
