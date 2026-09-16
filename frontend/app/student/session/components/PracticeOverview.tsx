'use client';

import Link from 'next/link';
import {
  Calendar,
  FileText,
  ClipboardCheck,
  Sparkles,
  HelpCircle,
  ChevronRight,
  ArrowLeft,
  Lock,
} from 'lucide-react';

interface PracticeOverviewProps {
  sessionType: 'practice' | 'graded';
  assessmentTitle?: string;
  onStartAssessment: () => void;
}

/**
 * Practice Session Overview
 * Shows assessment expectations, how to complete Q&A, details, and quick links.
 * Matches Figma design.
 */
export default function PracticeOverview({ sessionType, assessmentTitle, onStartAssessment }: PracticeOverviewProps) {
  const isPractice = sessionType === 'practice';
  const title = assessmentTitle || 'Assessment';

  return (
    <div className="mx-auto max-w-5xl">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm font-sans">
        <Link href="/student/dashboard" className="text-gray-500 hover:text-gray-700">
          Assessment
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-maroon-600">{isPractice ? 'Practice session' : 'Real session'}</span>
      </nav>

      {/* Header with title and session type indicator */}
      <div className="flex items-start justify-between">
        <div>
          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 font-serif">
            {isPractice ? 'Practice' : 'Real'} Session: {title}
          </h1>

          {/* Meta badges */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-maroon-600 px-3 py-1.5 text-sm font-medium text-white">
              <Calendar size={14} />
              Due: Oct 24, 11:59 PM
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
              <FileText size={14} />
              Individual Assessment
            </span>
          </div>
        </div>

        {/* Right side - Session type indicator */}
        <div className="text-right">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-maroon-600" />
            <span className="text-sm font-medium text-gray-900">Practice Session</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-gray-500">
            <Lock size={14} />
            <span className="text-sm">Next Real Session</span>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Left column - Assessment info */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            {/* Practice assessment expectations */}
            <h2 className="text-lg font-bold text-gray-900 font-serif">
              {isPractice ? 'Practice assessment' : 'Assessment'} expectations
            </h2>
            <p className="mt-3 text-sm text-gray-600 font-sans leading-relaxed">
              You will analyze a commercial real estate investment opportunity for a mixed-use
              development in downtown Phoenix. You will be assessed on the depth of your analysis,
              the quality of your financial modeling, and your ability to present a clear,
              well-supported investment recommendation.
            </p>

            {/* How to complete */}
            <h3 className="mt-6 text-base font-bold text-gray-900 font-serif">
              How to complete {isPractice ? 'practice' : ''} Q&A session
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-600 font-sans">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                Review each topic and prepare concise, data-backed responses.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                Know your financial model inside out — assumptions, metrics, and outputs.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                Support your analysis with market evidence and comparable deals.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                Clearly articulate risks and how they&apos;re mitigated.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                Defend your final recommendation with a logical, well-structured argument.
              </li>
            </ul>

            {/* Practice assessment Details */}
            <h3 className="mt-6 text-base font-bold text-gray-900 font-serif">
              {isPractice ? 'Practice assessment' : 'Assessment'} Details
            </h3>
            <dl className="mt-4 space-y-3 text-sm font-sans">
              <div className="flex">
                <dt className="w-32 text-gray-500">Format</dt>
                <dd className="font-medium text-gray-900">Individual Presentation</dd>
              </div>
              <div className="flex">
                <dt className="w-32 text-gray-500">Requirements</dt>
                <dd className="font-medium text-gray-900">
                  Your camera/face must be visible / Stable Internet
                </dd>
              </div>
              <div className="flex">
                <dt className="w-32 text-gray-500">Scoring</dt>
                <dd className={`font-medium ${isPractice ? 'text-maroon-600' : 'text-gray-900'}`}>
                  {isPractice
                    ? 'This is a practice session — your score will not affect your final grade.'
                    : 'AI as well as human grading'}
                </dd>
              </div>
              <div className="flex">
                <dt className="w-32 text-gray-500">Duration</dt>
                <dd className="font-medium text-gray-900">15 minutes timer</dd>
              </div>
              <div className="flex">
                <dt className="w-32 text-gray-500">Recording</dt>
                <dd className="font-medium text-maroon-600">
                  This session will be recorded for review and quality purposes
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Right column - Quick Links */}
        <div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-bold text-gray-900 font-serif">Quick Links</h2>
            <p className="mt-1 text-sm text-gray-500 font-sans">
              Jump to key resources and support in one place.
            </p>

            <nav className="mt-4 space-y-1">
              {[
                { label: 'Evaluation Rubric', icon: ClipboardCheck },
                { label: 'Accessibility', icon: Sparkles },
                { label: 'Help Center', icon: HelpCircle },
              ].map((link) => (
                <button
                  key={link.label}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors font-sans border-b border-gray-100 last:border-0"
                >
                  <span className="flex items-center gap-3">
                    <link.icon size={18} className="text-maroon-600" />
                    {link.label}
                  </span>
                  <ChevronRight size={16} className="text-gray-400" />
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
        <Link
          href="/student/dashboard"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors font-sans"
        >
          <ArrowLeft size={16} />
          Back
        </Link>
        <button
          onClick={onStartAssessment}
          className="inline-flex items-center gap-2 rounded-lg bg-maroon-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-maroon-700 transition-colors font-sans"
        >
          Start Assessment
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
