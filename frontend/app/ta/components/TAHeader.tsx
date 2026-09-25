'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Bell, Settings, LogOut, X, Check, AlertCircle, Info, HelpCircle } from 'lucide-react';
import InstructorTutorialModal from './InstructorTutorialModal';
import Image from 'next/image';

// Mock notifications for now - in production this would come from an API
const mockNotifications = [
  { id: 1, type: 'info', message: 'New student submission received', time: '5 min ago', read: false },
  { id: 2, type: 'alert', message: 'Session #42 completed - pending review', time: '1 hour ago', read: false },
  { id: 3, type: 'success', message: 'Assessment "Midterm Case" published', time: '2 hours ago', read: true },
];

export default function TAHeader() {
  const { userName, logout } = useAuth();
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Show tutorial on first visit
  useEffect(() => {
    const hasCompletedTutorial = localStorage.getItem('instructor_tutorial_completed');
    if (!hasCompletedTutorial) {
      // Small delay to let the page render first
      const timer = setTimeout(() => setShowTutorial(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const markAsRead = (id: number) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

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

        {/* Notifications Button */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowSettings(false); }}
            className="relative rounded-full p-2 hover:bg-gray-100 transition-colors"
          >
            <Bell size={20} className="text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-lg">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="font-medium text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-maroon-600 hover:text-maroon-700"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500 text-center">No notifications</p>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 ${!n.read ? 'bg-maroon-50/50' : ''}`}
                    >
                      <div className="flex gap-3">
                        <div className={`mt-0.5 rounded-full p-1 ${n.type === 'alert' ? 'bg-amber-100 text-amber-600' :
                          n.type === 'success' ? 'bg-green-100 text-green-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                          {n.type === 'alert' ? <AlertCircle size={14} /> :
                            n.type === 'success' ? <Check size={14} /> :
                              <Info size={14} />}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm ${!n.read ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                            {n.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-2 border-t border-gray-100">
                <button className="w-full text-center text-sm text-maroon-600 hover:text-maroon-700">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Settings Button */}
        <div className="relative">
          <button
            onClick={() => { setShowSettings(!showSettings); setShowNotifications(false); }}
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
                  onClick={() => { setShowSettings(false); router.push('/ta/groups'); }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Student Groups
                </button>
                <div className="border-t border-gray-100 my-2" />
                <button
                  className="w-full px-4 py-2 text-left text-sm text-gray-400 cursor-not-allowed"
                  disabled
                >
                  Account Settings (Coming Soon)
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

        {/* Logout Button */}
        <button
          onClick={logout}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
          title="Logout"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>

      {/* Click outside to close dropdowns */}
      {(showNotifications || showSettings) && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => { setShowNotifications(false); setShowSettings(false); }}
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
