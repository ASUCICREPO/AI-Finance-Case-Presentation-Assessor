'use client';

import { useAuth } from '../../context/AuthContext';
import { Bell, LogOut } from 'lucide-react';

export default function StudentHeader() {
  const { userName, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Left - Logo */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-maroon-600 font-serif">ASU</span>
          <span className="text-sm text-gray-600 font-sans">W. P. Carey</span>
        </div>
      </div>

      {/* Right - Notifications & User */}
      <div className="flex items-center gap-4">
        <button className="relative rounded-full p-2 hover:bg-gray-100 transition-colors">
          <Bell size={20} className="text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-maroon-100 flex items-center justify-center">
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
        <button
          onClick={logout}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
          title="Logout"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
