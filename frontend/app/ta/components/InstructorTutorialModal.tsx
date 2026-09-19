'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X, ChevronLeft, ChevronRight, CheckCircle2, Users, FileText, ClipboardList,
  BookOpen, BarChart3, Settings, Lightbulb, GraduationCap, UserPlus, FolderOpen,
  Play, Eye, PenLine, Upload,
} from 'lucide-react';

interface InstructorTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

const TOTAL_STEPS = 7;

export default function InstructorTutorialModal({ isOpen, onClose, userName }: InstructorTutorialModalProps) {
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (isOpen) setStep(1);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    localStorage.setItem('instructor_tutorial_completed', 'true');
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
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
              {step === 1 && <GraduationCap size={22} className="text-maroon-200" />}
              {step === 2 && <Users size={22} className="text-purple-300" />}
              {step === 3 && <FolderOpen size={22} className="text-blue-300" />}
              {step === 4 && <ClipboardList size={22} className="text-green-300" />}
              {step === 5 && <Settings size={22} className="text-amber-300" />}
              {step === 6 && <Eye size={22} className="text-cyan-300" />}
              {step === 7 && <CheckCircle2 size={22} className="text-green-300" />}
            </span>
            <div>
              <h2 className="text-xl font-bold text-white font-serif">
                {step === 1 && `Welcome to AI Oral Assessment${displayName ? `, ${displayName}` : ''}!`}
                {step === 2 && 'Step 1: Manage Students'}
                {step === 3 && 'Step 2: Organize Sessions & Groups'}
                {step === 4 && 'Step 3: Create Assessments'}
                {step === 5 && 'Step 4: Configure AI Personas'}
                {step === 6 && 'Step 5: Review Submissions'}
                {step === 7 && "You're All Set!"}
              </h2>
              <p className="text-sm text-maroon-200">
                {step === 1 && "Let's take a quick tour of the instructor dashboard"}
                {step === 2 && 'Import and manage your class roster'}
                {step === 3 && 'Set up course sessions and student groups'}
                {step === 4 && 'Build case assessments with rubrics'}
                {step === 5 && 'Customize AI interviewer personas'}
                {step === 6 && 'Grade and provide feedback on student work'}
                {step === 7 && 'Ready to manage your course?'}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {step === 1 && (
            <div className="space-y-5">
              <p className="text-sm leading-relaxed text-gray-600">
                This platform enables AI-powered oral assessments where students present financial case analyses and answer questions from an AI interviewer. As an instructor, you can manage the entire workflow.
              </p>
              <div className="rounded-xl border border-maroon-100 bg-maroon-50/50 p-5">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">What you'll learn in this tutorial:</h3>
                <ul className="space-y-2.5">
                  {[
                    'How to import and manage students',
                    'Setting up course sessions and groups',
                    'Creating assessments with custom rubrics',
                    'Configuring AI personas for different scenarios',
                    'Reviewing submissions and providing grades',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-maroon-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-xs text-gray-400">
                This tutorial takes about 2-3 minutes. You can skip anytime and restart from the Tutorial button in the header.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              {/* Student card mock */}
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-900">Students</h4>
                  <span className="text-xs text-gray-500">48 enrolled</span>
                </div>
                <div className="space-y-2">
                  {[
                    { name: 'John Smith', email: 'jsmith@asu.edu', section: 'Section A' },
                    { name: 'Jane Doe', email: 'jdoe@asu.edu', section: 'Section B' },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg bg-gray-50 p-2">
                      <div className="h-8 w-8 rounded-full bg-maroon-100 flex items-center justify-center">
                        <span className="text-xs font-medium text-maroon-600">{s.name.split(' ').map(n => n[0]).join('')}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.email}</p>
                      </div>
                      <span className="text-xs text-gray-400">{s.section}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <NumberedItem n={1} title="Navigate to Students" desc="Click 'Students' in the left sidebar to view and manage your class roster." />
                <NumberedItem n={2} title="Bulk Import from CSV" desc="Use 'Import Students' to upload a CSV file with columns: firstName, lastName, email, section, groupNumber." />
                <NumberedItem n={3} title="Add Individual Students" desc="Click 'Add Student' to manually add students one at a time with their details." />
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
                <Lightbulb size={16} className="mt-0.5 flex-shrink-0 text-blue-500" />
                <p className="text-xs text-blue-700">Tip: Section and group assignments determine which assessments students can access.</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              {/* Sessions and Groups mock */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FolderOpen size={18} className="text-blue-600" />
                    <h4 className="text-sm font-semibold text-gray-900">Sessions</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="rounded-lg bg-blue-50 p-2 text-xs">
                      <p className="font-medium text-blue-900">Fall 2026 - Morning</p>
                      <p className="text-blue-600">24 students</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-2 text-xs">
                      <p className="font-medium text-gray-700">Fall 2026 - Evening</p>
                      <p className="text-gray-500">24 students</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Users size={18} className="text-purple-600" />
                    <h4 className="text-sm font-semibold text-gray-900">Groups</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="rounded-lg bg-purple-50 p-2 text-xs">
                      <p className="font-medium text-purple-900">Group 1</p>
                      <p className="text-purple-600">4 members</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-2 text-xs">
                      <p className="font-medium text-gray-700">Group 2</p>
                      <p className="text-gray-500">4 members</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <NumberedItem n={1} title="Create Course Sessions" desc="Go to 'Sessions' to create class sections (e.g., Morning, Evening, Section A/B). Sessions help organize when students meet." />
                <NumberedItem n={2} title="Set Up Student Groups" desc="Navigate to 'Groups' to create project teams. Students in the same group can work on group assessments together." />
                <NumberedItem n={3} title="Assign Students" desc="When importing students, specify their section and group number to auto-assign them." />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              {/* Assessment card mock */}
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ClipboardList size={18} className="text-green-600" />
                    <h4 className="text-sm font-semibold text-gray-900">Finance Case #1</h4>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Published</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">Due: Sept 15, 2026 • 15 min session</p>
                <div className="flex gap-2">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Section A</span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Groups 1-4</span>
                </div>
              </div>
              <div className="space-y-4">
                <NumberedItem n={1} title="Create Assessment" desc="Click 'Assessments' → 'Add Assessment'. Enter title, description, case materials, and due date." />
                <NumberedItem n={2} title="Configure Rubric" desc="Set up grading criteria with category weights. The AI uses this rubric to provide consistent scoring." />
                <NumberedItem n={3} title="Upload Case Materials" desc="Add Excel spreadsheets, PDFs, or other files students will analyze during their presentation." />
                <NumberedItem n={4} title="Assign to Sessions/Groups" desc="Select which sections and groups should have access to this assessment." />
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-amber-100 bg-amber-50 p-3">
                <Lightbulb size={16} className="mt-0.5 flex-shrink-0 text-amber-500" />
                <p className="text-xs text-amber-700">The AI interviewer uses the rubric and case materials to ask relevant follow-up questions during the Q&A.</p>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5">
              {/* Persona card mock */}
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                    <Users size={24} className="text-amber-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Investment Committee Chair</h4>
                    <p className="text-xs text-gray-500">Expertise: Expert • Style: Formal</p>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mb-2">Focuses on ROI, risk assessment, and market analysis. Asks probing questions about assumptions.</p>
                <div className="flex gap-2">
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Financial Analysis</span>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Risk Assessment</span>
                </div>
              </div>
              <div className="space-y-4">
                <NumberedItem n={1} title="Browse Personas" desc="Go to 'Personas' to see available AI interviewer profiles. Each has unique questioning styles and focus areas." />
                <NumberedItem n={2} title="Create Custom Persona" desc="Click 'Add Persona' to create a new interviewer. Define their role, expertise, communication style, and key priorities." />
                <NumberedItem n={3} title="Enable AI Avatar (Optional)" desc="Toggle 'Use Anam Avatar' to show a realistic AI avatar during the Q&A session for more engaging interactions." />
                <NumberedItem n={4} title="Assign to Assessment" desc="When creating an assessment, select which persona will conduct the AI-powered Q&A interview." />
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-5">
              {/* Submission review mock */}
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-900">Submissions Overview</h4>
                  <span className="text-xs text-gray-500">12 pending review</span>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="pb-2">Student</th>
                      <th className="pb-2">AI Score</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-50">
                      <td className="py-2 font-medium text-gray-900">Smith, John</td>
                      <td className="py-2 text-green-600 font-semibold">85%</td>
                      <td className="py-2"><span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded text-[10px]">Pending</span></td>
                      <td className="py-2 text-maroon-600">View</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium text-gray-900">Doe, Jane</td>
                      <td className="py-2 text-blue-600 font-semibold">78%</td>
                      <td className="py-2"><span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px]">Reviewed</span></td>
                      <td className="py-2 text-maroon-600">View</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="space-y-4">
                <NumberedItem n={1} title="View Gradebook" desc="Navigate to 'Gradebook' to see all submissions with AI scores, reviewer scores, and status." />
                <NumberedItem n={2} title="Review Submission" desc="Click 'View' to watch the video, read presentation and Q&A transcripts, and see the AI's rubric evaluation." />
                <NumberedItem n={3} title="Override or Confirm Score" desc="You can accept the AI score, adjust individual rubric categories, or provide your own reviewer score." />
                <NumberedItem n={4} title="Add Feedback" desc="Write personalized feedback for students. They'll see this along with their scores after you submit." />
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-green-100 bg-green-50 p-3">
                <Eye size={16} className="mt-0.5 flex-shrink-0 text-green-500" />
                <p className="text-xs text-green-700">The AI provides detailed justifications for each rubric score with evidence from the transcript.</p>
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-5">
              {/* Success banner */}
              <div className="flex flex-col items-center rounded-xl bg-green-50 py-8">
                <CheckCircle2 size={48} className="mb-3 text-green-600" />
                <p className="text-lg font-bold text-gray-900">Ready to Begin!</p>
                <p className="text-sm text-gray-500">Let's get started with your AI-powered oral assessment.</p>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Quick Start Checklist</h4>
                <div className="space-y-2">
                  {[
                    { icon: <UserPlus size={14} />, text: 'Import your student roster' },
                    { icon: <FolderOpen size={14} />, text: 'Create course sessions' },
                    { icon: <ClipboardList size={14} />, text: 'Set up your first assessment' },
                    { icon: <Settings size={14} />, text: 'Configure AI personas' },
                    { icon: <Play size={14} />, text: 'Publish and let students begin!' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-maroon-600">{item.icon}</span>
                      {item.text}
                    </div>
                  ))}
                </div>
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
              className="flex items-center gap-1 rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-green-700"
            >
              Get Started <CheckCircle2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Helper sub-components ─────────────────────────────────────────── */

function NumberedItem({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-maroon-600 text-[11px] font-bold text-white">{n}</span>
      <div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-xs leading-relaxed text-gray-500">{desc}</p>
      </div>
    </div>
  );
}
