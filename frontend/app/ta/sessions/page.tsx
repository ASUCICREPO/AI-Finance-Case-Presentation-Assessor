'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Calendar,
  Users,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Copy,
  CheckCircle,
  Clock,
  Archive,
  Sun,
  Moon,
} from 'lucide-react';

interface Session {
  sessionId: string;
  name: string;
  sessionType: 'morning' | 'evening' | '1' | '2';
  courseName: string;
  courseCode: string;
  semester: string;
  year: number;
  startDate: string;
  endDate: string;
  studentCount: number;
  groupCount: number;
  status: 'active' | 'upcoming' | 'archived';
  createdAt: string;
}

// Mock data - will be replaced with API
const initialSessions: Session[] = [
  {
    sessionId: 'sess-1',
    name: 'Spring 2026 - Morning',
    sessionType: 'morning',
    courseName: 'Real Estate Finance',
    courseCode: 'FIN 502',
    semester: 'Spring',
    year: 2026,
    startDate: '2026-01-15',
    endDate: '2026-05-15',
    studentCount: 45,
    groupCount: 12,
    status: 'active',
    createdAt: '2025-12-01',
  },
  {
    sessionId: 'sess-2',
    name: 'Spring 2026 - Evening',
    sessionType: 'evening',
    courseName: 'Real Estate Finance',
    courseCode: 'FIN 502',
    semester: 'Spring',
    year: 2026,
    startDate: '2026-01-15',
    endDate: '2026-05-15',
    studentCount: 38,
    groupCount: 10,
    status: 'active',
    createdAt: '2025-12-01',
  },
  {
    sessionId: 'sess-3',
    name: 'Fall 2026 - Session 1',
    sessionType: '1',
    courseName: 'Real Estate Finance',
    courseCode: 'FIN 502',
    semester: 'Fall',
    year: 2026,
    startDate: '2026-08-20',
    endDate: '2026-12-15',
    studentCount: 0,
    groupCount: 0,
    status: 'upcoming',
    createdAt: '2026-06-01',
  },
  {
    sessionId: 'sess-4',
    name: 'Fall 2025 - Morning',
    sessionType: 'morning',
    courseName: 'Real Estate Finance',
    courseCode: 'FIN 502',
    semester: 'Fall',
    year: 2025,
    startDate: '2025-08-19',
    endDate: '2025-12-14',
    studentCount: 38,
    groupCount: 10,
    status: 'archived',
    createdAt: '2025-06-01',
  },
];

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'upcoming' | 'archived'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredSessions = sessions.filter((session) => {
    if (filter === 'all') return true;
    return session.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Active
          </span>
        );
      case 'upcoming':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
            <Clock size={12} />
            Upcoming
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
            <Archive size={12} />
            Archived
          </span>
        );
      default:
        return null;
    }
  };

  const getSessionTypeBadge = (type: string) => {
    switch (type) {
      case 'morning':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            <Sun size={12} />
            Morning
          </span>
        );
      case 'evening':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
            <Moon size={12} />
            Evening
          </span>
        );
      case '1':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
            Session 1
          </span>
        );
      case '2':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
            Session 2
          </span>
        );
      default:
        return null;
    }
  };

  // Handle View Details
  const handleViewDetails = (session: Session) => {
    setActiveMenu(null);
    // Navigate to a details view or show modal
    router.push(`/ta/sessions/view?id=${session.sessionId}`);
  };

  // Handle Edit
  const handleEdit = (session: Session) => {
    setActiveMenu(null);
    router.push(`/ta/sessions/edit?id=${session.sessionId}`);
  };

  // Handle Duplicate
  const handleDuplicate = (session: Session) => {
    setActiveMenu(null);
    const newSession: Session = {
      ...session,
      sessionId: `sess-${Date.now()}`,
      name: `${session.name} (Copy)`,
      status: 'upcoming',
      studentCount: 0,
      groupCount: 0,
      createdAt: new Date().toISOString(),
    };
    setSessions([...sessions, newSession]);
  };

  // Handle Archive
  const handleArchive = (session: Session) => {
    setActiveMenu(null);
    setSessions(sessions.map(s =>
      s.sessionId === session.sessionId
        ? { ...s, status: 'archived' as const }
        : s
    ));
  };

  // Handle Delete
  const handleDelete = (sessionId: string) => {
    setActiveMenu(null);
    setDeleteConfirm(sessionId);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      setSessions(sessions.filter(s => s.sessionId !== deleteConfirm));
      setDeleteConfirm(null);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    if (activeMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [activeMenu]);

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">Sessions</h1>
          <p className="mt-1 text-sm text-gray-500 font-sans">
            Manage class sections (morning/evening, session 1/2)
          </p>
        </div>
        <button
          onClick={() => router.push('/ta/sessions/add')}
          className="inline-flex items-center gap-2 rounded-lg bg-maroon-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-maroon-700 transition-colors font-sans shadow-sm"
        >
          <Plus size={16} />
          Add Session
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {[
          { value: 'all', label: 'All Sessions' },
          { value: 'active', label: 'Active' },
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'archived', label: 'Archived' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value as typeof filter)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${filter === tab.value
                ? 'text-maroon-600 border-maroon-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sessions Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSessions.map((session) => (
          <div
            key={session.sessionId}
            className={`rounded-xl border bg-white p-5 transition-shadow hover:shadow-md ${session.status === 'active' ? 'border-maroon-200' : 'border-gray-200'
              }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 font-sans">{session.name}</h3>
                <p className="text-sm text-gray-600 font-sans">{session.courseCode} - {session.courseName}</p>
              </div>
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenu(activeMenu === session.sessionId ? null : session.sessionId);
                  }}
                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                >
                  <MoreVertical size={18} className="text-gray-500" />
                </button>
                {activeMenu === session.sessionId && (
                  <div
                    className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-gray-200 bg-white shadow-lg z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleViewDetails(session)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Eye size={14} />
                      View Details
                    </button>
                    <button
                      onClick={() => handleEdit(session)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Edit size={14} />
                      Edit Session
                    </button>
                    <button
                      onClick={() => handleDuplicate(session)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Copy size={14} />
                      Duplicate
                    </button>
                    {session.status !== 'archived' && (
                      <button
                        onClick={() => handleArchive(session)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Archive size={14} />
                        Archive
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(session.sessionId)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              {getStatusBadge(session.status)}
              {getSessionTypeBadge(session.sessionType)}
            </div>

            <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {new Date(session.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(session.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            <div className="mt-4 flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-900">{session.studentCount}</span>
                <span className="text-xs text-gray-500">students</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{session.groupCount}</span>
                <span className="text-xs text-gray-500">groups</span>
              </div>
            </div>

            {session.status === 'active' && (
              <button
                onClick={() => router.push(`/ta/dashboard?session=${session.sessionId}`)}
                className="mt-4 w-full rounded-lg border border-maroon-200 bg-maroon-50 py-2 text-sm font-medium text-maroon-700 hover:bg-maroon-100 transition-colors"
              >
                Go to Dashboard
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredSessions.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 font-sans">No Sessions Found</h3>
          <p className="mt-1 text-sm text-gray-500 font-sans">
            {filter === 'all'
              ? 'Get started by creating your first class session.'
              : `No ${filter} sessions found.`}
          </p>
          {filter === 'all' && (
            <button
              onClick={() => router.push('/ta/sessions/add')}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-maroon-600 px-4 py-2 text-sm font-medium text-white hover:bg-maroon-700 transition-colors"
            >
              <Plus size={16} />
              Add Session
            </button>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Session?</h3>
            <p className="text-sm text-gray-600 mb-6">
              This will permanently delete this session and all associated data. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
