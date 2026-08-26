'use client';

import { ArrowLeft, ChevronRight, Clock } from 'lucide-react';
import Link from 'next/link';

interface StudentInfo {
  name: string;
  group: string;
  course: string;
}

interface SessionLobbyProps {
  studentInfo: StudentInfo;
  sessionType: 'practice' | 'graded';
  onBeginSession: () => void;
}

/**
 * Session Lobby - Shows the AI persona introduction, student info,
 * timer, and "Begin Q&A session" button.
 * Based on Figma: Session Q&A page with persona video and student info panel.
 */
export default function SessionLobby({
  studentInfo,
  sessionType,
  onBeginSession,
}: SessionLobbyProps) {
  return (
    <div className="mx-auto max-w-6xl">
      {/* Session header */}
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-xl font-bold text-gray-900 font-serif">
          Session Q&A: Commercial Real Estate Investment Analysis
        </h1>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          Live
        </span>
      </div>
      <p className="mb-6 text-sm text-gray-500 font-sans">
        This session is being recorded
      </p>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left - Persona Video Area */}
        <div className="lg:col-span-2">
          <div className="relative aspect-video overflow-hidden rounded-xl border border-gray-200 bg-gray-900">
            {/* Placeholder for AI persona video */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-48 w-48 rounded-full bg-gray-700" />
            </div>

            {/* Persona name badge */}
            <div className="absolute bottom-16 left-4 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gray-600" />
              <span className="text-sm font-medium text-white">Keith Clarkson</span>
            </div>

            {/* AI Speaking indicator */}
            <div className="absolute bottom-4 left-4 right-4 rounded-lg bg-black/60 p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-gold-500">AI Speaking</span>
              </div>
              <p className="text-sm text-white">
                &quot;I&apos;m Keith Clarkson. I have reviewed the analysis your group submitted.
                Treat this as a business discussion: explain what you think is happening, what you
                recommend I do, and why.&quot;
              </p>
            </div>
          </div>
        </div>

        {/* Right - Session Info Panel */}
        <div className="space-y-4">
          {/* Timer */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-medium text-gray-500 font-sans">Q&A Session</h3>
            <div className="mt-2 flex items-center gap-2">
              <Clock size={20} className="text-gray-700" />
              <span className="text-3xl font-bold text-gray-900 font-sans">15:00</span>
            </div>
            <p className="mt-1 text-xs text-gray-500 font-sans">15-minute maximum session</p>
          </div>

          {/* Student Info */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-bold text-gray-900 font-sans">Student Info</h3>
            <dl className="mt-3 space-y-2 text-sm font-sans">
              <div className="flex justify-between">
                <dt className="text-gray-500">Student</dt>
                <dd className="font-medium text-gray-900">{studentInfo.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Group</dt>
                <dd className="font-medium text-gray-900">{studentInfo.group}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Course</dt>
                <dd className="font-medium text-gray-900">{studentInfo.course}</dd>
              </div>
            </dl>
          </div>

          {/* Note */}
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-xs text-yellow-800 font-sans leading-relaxed">
              <span className="font-medium">Note:</span> This assessment is AI-proctored and
              AI-graded. Final grading will be reviewed and handed over to your instructor and
              Teaching Assistant.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="mt-8 flex items-center justify-between">
        <Link
          href="/student/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors font-sans"
        >
          <ArrowLeft size={16} />
          Back
        </Link>
        <button
          onClick={onBeginSession}
          className="inline-flex items-center gap-2 rounded-lg bg-maroon-600 px-6 py-3 text-white font-sans font-medium hover:bg-maroon-700 transition-colors"
        >
          Begin Q&A session
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
