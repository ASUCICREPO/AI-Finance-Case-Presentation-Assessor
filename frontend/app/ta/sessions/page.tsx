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
  Clock,
  Archive,
  Sun,
  Moon,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  listCourseSessions,
  archiveCourseSession,
  deleteCourseSession,
  duplicateCourseSession,
  CourseSession,
} from '../../services/api';

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'upcoming' | 'archived'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Load sessions from API
  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    setLoading(true);
    setError(null);
    try {
      const response = await listCourseSessions();
      setSessions(response.sessions);
    } catch (err: any) {
      console.error('Failed to load sessions:', err);
      setError(err.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }

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

  const getSessionNumberBadge = (sessionNumber: string) => {
    const num = sessionNumber?.toLowerCase() || '';
    switch (num) {
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
      default:
        // For numbered sessions (1, 2, 3, etc.)
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
            Session {num}
          </span>
        );
    }
  };

  // Handle View Details
  const handleViewDetails = (session: CourseSession) => {
    setActiveMenu(null);
    router.push(`/ta/sessions/view?id=${session.sessionId}`);
  };

  // Handle Edit
  const handleEdit = (session: CourseSession) => {
    setActiveMenu(null);
    router.push(`/ta/sessions/edit?id=${session.sessionId}`);
  };

  // Handle Duplicate
  const handleDuplicate = async (session: CourseSession) => {
    setActiveMenu(null);
    setActionLoading(session.sessionId);
    try {
      const newSession = await duplicateCourseSession(session.sessionId);
      setSessions([newSession, ...sessions]);
    } catch (err: any) {
      console.error('Failed to duplicate session:', err);
      alert(err.message || 'Failed to duplicate session');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Archive
  const handleArchive = async (session: CourseSession) => {
    setActiveMenu(null);
    setActionLoading(session.sessionId);
    try {
      await archiveCourseSession(session.sessionId);
      setSessions(sessions.map(s =>
        s.sessionId === session.sessionId
          ? { ...s, status: 'archived' as const }
          : s
      ));
    } catch (err: any) {
      console.error('Failed to archive session:', err);
      alert(err.message || 'Failed to archive session');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Delete
  const handleDelete = (sessionId: string) => {
    setActiveMenu(null);
    setDeleteConfirm(sessionId);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    setActionLoading(deleteConfirm);
    try {
      await deleteCourseSession(deleteConfirm);
      setSessions(sessions.filter(s => s.sessionId !== deleteConfirm));
      setDeleteConfirm(null);
    } catch (err: any) {
      console.error('Failed to delete session:', err);
      alert(err.message || 'Failed to delete session. It may have students or groups assigned.');
    } finally {
      setActionLoading(null);
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
            Manage class sections by session number (Morning, Evening, Session 1, 2, etc.)
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

      {/* Error State */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 flex items-center gap-3">
          <AlertCircle className="text-red-500" size={20} />
          <div>
            <p className="text-sm font-medium text-red-800">{error}</p>
            <button
              onClick={loadSessions}
              className="text-sm text-red-600 hover:text-red-800 underline mt-1"
            >
              Try again
            </button>
          </div>
        </div>
      )}

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

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-maroon-600" size={32} />
          <span className="ml-3 text-gray-600">Loading sessions...</span>
        </div>
      )}

      {/* Sessions Grid */}
      {!loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSessions.map((session) => (
            <div
              key={session.sessionId}
              className={`rounded-xl border bg-white p-5 transition-shadow hover:shadow-md ${session.status === 'active' ? 'border-maroon-200' : 'border-gray-200'
                } ${actionLoading === session.sessionId ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Session Number - Most Prominent */}
                  <div className="mb-2">
                    {getSessionNumberBadge(session.sessionNumber || session.sessionType || '')}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 font-sans truncate">{session.name}</h3>
                  <p className="text-sm text-gray-600 font-sans">{session.courseCode} - {session.courseName}</p>
                </div>
                <div className="relative ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(activeMenu === session.sessionId ? null : session.sessionId);
                    }}
                    className="p-1 rounded hover:bg-gray-100 transition-colors"
                    disabled={actionLoading === session.sessionId}
                  >
                    {actionLoading === session.sessionId ? (
                      <Loader2 size={18} className="animate-spin text-gray-400" />
                    ) : (
                      <MoreVertical size={18} className="text-gray-500" />
                    )}
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

              <div className="mt-3 flex items-center gap-2">
                {getStatusBadge(session.status)}
              </div>

              <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {session.startDate && session.endDate ? (
                    <>
                      {new Date(session.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(session.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </>
                  ) : (
                    <span className="text-gray-400">No dates set</span>
                  )}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">{session.studentCount || 0}</span>
                  <span className="text-xs text-gray-500">students</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{session.groupCount || 0}</span>
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
      )}

      {/* Empty State */}
      {!loading && filteredSessions.length === 0 && (
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
              This will permanently delete this session. Sessions with students or groups assigned cannot be deleted - archive them instead.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={!!actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={!!actionLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors inline-flex items-center gap-2"
              >
                {actionLoading === deleteConfirm && <Loader2 size={14} className="animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
