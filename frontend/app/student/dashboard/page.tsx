'use client';

import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';
import {
  FileText,
  BookOpen,
  ClipboardCheck,
  Globe,
  HelpCircle,
  ChevronRight,
  Calendar,
} from 'lucide-react';

/**
 * Student Dashboard - Case Assessment Overview
 * Shows the current case assignment, assessment expectations,
 * quick links, and assessment details.
 */
export default function StudentDashboard() {
  const { userName, userCourse } = useAuth();

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-gray-500 font-sans">
        <span>My Courses</span>
        <span className="mx-2">/</span>
        <span>{userCourse || 'FIN 502'}</span>
        <span className="mx-2">/</span>
        <span className="text-gray-900">Case Assessment</span>
      </nav>

      {/* Title */}
      <h1 className="text-3xl font-bold text-gray-900 font-serif">
        Commercial Real Estate Investment Analysis
      </h1>
      <p className="mt-1 text-gray-600 font-sans">
        {userCourse || 'FIN 502'} - Real Estate Finance - Prof. Atif Ikram
      </p>

      {/* Meta badges */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-700">
          <Calendar size={14} />
          Due: Oct 24, 11:59 PM
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-700">
          <ClipboardCheck size={14} />
          Individual Assessment
        </span>
      </div>

      {/* Case Overview badge */}
      <div className="mt-6">
        <span className="inline-block rounded-full bg-maroon-600 px-4 py-1.5 text-sm font-medium text-white">
          Case Overview
        </span>
      </div>

      {/* Main content grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Left column - Assessment expectations & details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Assessment Expectations */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-bold text-gray-900 font-serif">
              Assessment expectations
            </h2>
            <p className="mt-3 text-sm text-gray-600 font-sans leading-relaxed">
              You will analyze a commercial real estate investment opportunity for a mixed-use
              development in downtown Phoenix. You will be assessed on the depth of your analysis,
              the quality of your financial modeling, and your ability to present a clear,
              well-supported investment recommendation.
            </p>

            <h3 className="mt-6 text-base font-bold text-gray-900 font-serif">
              How to complete the Q&A
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-600 font-sans">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                Review each topic and prepare concise, data-backed responses.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                Know your financial model inside out — assumptions, metrics, and outputs.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                Support your analysis with market evidence and comparable deals.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                Clearly articulate risks and how they&apos;re mitigated.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
                Defend your final recommendation with a logical, well-structured argument.
              </li>
            </ul>
          </div>

          {/* Assessment Details */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-bold text-gray-900 font-serif">
              Assessment Details
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm font-sans">
              <div>
                <dt className="text-gray-500">Format</dt>
                <dd className="mt-1 font-medium text-gray-900">Individual Presentation</dd>
              </div>
              <div>
                <dt className="text-gray-500">Requirements</dt>
                <dd className="mt-1 font-medium text-gray-900">
                  Camera/face must be visible / Stable Internet
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Scoring</dt>
                <dd className="mt-1 font-medium text-gray-900">AI as well as human grading</dd>
              </div>
              <div>
                <dt className="text-gray-500">Duration</dt>
                <dd className="mt-1 font-medium text-gray-900">15 minutes maximum</dd>
              </div>
              <div>
                <dt className="text-gray-500">Recording</dt>
                <dd className="mt-1 font-medium text-gray-900">
                  This session will be recorded for review and quality purposes
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Right column - Quick Links */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-bold text-gray-900 font-serif">Quick Links</h2>
            <p className="mt-1 text-sm text-gray-500 font-sans">
              Jump to key resources and support in one place.
            </p>

            <nav className="mt-4 space-y-1">
              {[
                { label: 'Assignment instructions', icon: FileText },
                { label: 'Presentation and Q&A guidelines', icon: BookOpen },
                { label: 'Evaluation Rubric', icon: ClipboardCheck },
                { label: 'Generic practice session', icon: Globe },
                { label: 'Accessibility', icon: Globe },
                { label: 'Help Center', icon: HelpCircle },
              ].map((link) => (
                <button
                  key={link.label}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors font-sans"
                >
                  <span className="flex items-center gap-2">
                    <link.icon size={16} className="text-maroon-600" />
                    {link.label}
                  </span>
                  <ChevronRight size={16} className="text-gray-400" />
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Start Assessment button */}
      <div className="mt-8 flex justify-end">
        <Link
          href="/student/session"
          className="inline-flex items-center gap-2 rounded-lg bg-maroon-600 px-6 py-3 text-white font-sans font-medium hover:bg-maroon-700 transition-colors"
        >
          Start assessment
          <ChevronRight size={18} />
        </Link>
      </div>
    </div>
  );
}
