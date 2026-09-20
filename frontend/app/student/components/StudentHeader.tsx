'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bell, HelpCircle } from 'lucide-react';
import StudentTutorialModal from './StudentTutorialModal';

export default function StudentHeader() {
  const { userName } = useAuth();
  const [showTutorial, setShowTutorial] = useState(false);

  // Show tutorial on first visit
  useEffect(() => {
    const hasCompletedTutorial = localStorage.getItem('student_tutorial_completed');
    if (!hasCompletedTutorial) {
      // Small delay to let the page render first
      const timer = setTimeout(() => setShowTutorial(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Left - Logo */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="text-xl font-bold text-maroon-600 font-serif">ASU</span>
          <div className="h-6 w-px bg-gray-300 mx-2" />
          <div>
            <span className="text-sm font-semibold text-gray-800 font-sans">W.P. Carey</span>
            <p className="text-xs text-gray-500 font-sans">Arizona State University</p>
          </div>
        </div>
      </div>

      {/* Right - Tutorial, Notifications & User */}
      <div className="flex items-center gap-4">
        {/* Tutorial Button */}
        <button
          onClick={() => setShowTutorial(true)}
          className="flex items-center gap-1.5 rounded-lg border border-maroon-200 bg-maroon-50 px-3 py-1.5 text-sm font-medium text-maroon-700 hover:bg-maroon-100 transition-colors"
        >
          <HelpCircle size={16} />
          <span className="hidden sm:inline">Tutorial</span>
        </button>

        <button className="relative rounded-full p-2 hover:bg-gray-100 transition-colors">
          <Bell size={20} className="text-gray-600" />
        </button>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-maroon-100 flex items-center justify-center overflow-hidden">
            <span className="text-sm font-medium text-maroon-600">
              {userName?.charAt(0)?.toUpperCase() || 'S'}
            </span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900 font-sans">
              {userName || 'Student'}
            </p>
            <p className="text-xs text-gray-500 font-sans">Student</p>
          </div>
        </div>
      </div>

      {/* Student Tutorial Modal */}
      <StudentTutorialModal
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        userName={userName || undefined}
      />
    </header>
  );
}
