'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Settings, HelpCircle } from 'lucide-react';
import InstructorTutorialModal from './InstructorTutorialModal';
import Image from 'next/image';

export default function TAHeader() {
  const { userName } = useAuth();
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // Show tutorial on first visit
  useEffect(() => {
    const hasCompletedTutorial = localStorage.getItem('instructor_tutorial_completed');
    if (!hasCompletedTutorial) {
      // Small delay to let the page render first
      const timer = setTimeout(() => setShowTutorial(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Left - Logo */}
      <div className="flex items-center gap-3">
        <Image
          src="/ASU_WP_Carey_Horiz_RGB_MaroonGold_600ppi.png"
          alt="ASU W.P. Carey School of Business"
          width={180}
          height={45}
          className="h-10 w-auto"
          priority
        />
        <span className="ml-2 rounded-full bg-maroon-100 px-2 py-0.5 text-xs font-medium text-maroon-700">
          Admin Dashboard
        </span>
      </div>

      {/* Right - Tutorial, Settings & User */}
      <div className="flex items-center gap-4">
        {/* Tutorial Button */}
        <button
          onClick={() => setShowTutorial(true)}
          className="flex items-center gap-1.5 rounded-lg border border-maroon-200 bg-maroon-50 px-3 py-1.5 text-sm font-medium text-maroon-700 hover:bg-maroon-100 transition-colors"
        >
          <HelpCircle size={16} />
          <span className="hidden sm:inline">Tutorial</span>
        </button>

        {/* Settings Button */}
        <div className="relative">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="rounded-full p-2 hover:bg-gray-100 transition-colors"
          >
            <Settings size={20} className="text-gray-600" />
          </button>

          {/* Settings Dropdown */}
          {showSettings && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 bg-white shadow-lg">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="font-medium text-gray-900">Settings</h3>
              </div>
              <div className="py-2">
                <button
                  onClick={() => { setShowSettings(false); router.push('/ta/personas'); }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Manage Personas
                </button>
                <button
                  onClick={() => { setShowSettings(false); router.push('/ta/rubrics'); }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Assessment Rubrics
                </button>
                <button
                  onClick={() => { setShowSettings(false); router.push('/ta/assessments'); }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Case Assessments
                </button>
                <button
                  onClick={() => { setShowSettings(false); router.push('/ta/students'); }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Students
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-maroon-100 flex items-center justify-center">
            <span className="text-sm font-medium text-maroon-600">
              {userName?.charAt(0)?.toUpperCase() || 'T'}
            </span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900 font-sans">
              {userName || 'Teaching Assistant'}
            </p>
            <p className="text-xs text-gray-500 font-sans">Admin / Instructor</p>
          </div>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {showSettings && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => setShowSettings(false)}
        />
      )}

      {/* Instructor Tutorial Modal */}
      <InstructorTutorialModal
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        userName={userName || undefined}
      />
    </header>
  );
}
