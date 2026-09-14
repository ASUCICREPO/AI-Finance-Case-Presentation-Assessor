'use client';

import { useState } from 'react';
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
} from 'lucide-react';

interface Session {
  sessionId: string;
  name: string;
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
const mockSessions: Session[] = [
  {
    sessionId: 'sess-1',
    name: 'Spring 2026',
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
    name: 'Fall 2026',
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
    sessionId: 'sess-3',
    name: 'Fall 2025',
    courseName: 'Real Estate Finance',
    courseCode: 'FIN 502',
    semester: 'Fall',
    year: 2025,
    startDate: '2025-08-20',
    endDate: '2025-12-15',
    studentCount: 38,
    groupCount: 10,
    status: 'archived',
    createdAt: '2025-06-01',
  },
];

export default function SessionsPage() {
  const router = useRouter();
  const [sessions] = useState<Session[]>(mockSessions);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'upcoming' | 'archived'>('all');

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

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">Sessions</h1>
          <p className="mt-1 text-sm text-gray-500 font-sans">
            Manage course sessions and semesters
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
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              filter === tab.value
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
            className={`rounded-xl border bg-white p-5 transition-shadow hover:shadow-md ${
              session.status === 'active' ? 'border-maroon-200' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 font-sans">{session.name}</h3>
                <p className="text-sm text-gray-600 font-sans">{session.courseCode} - {session.courseName}</p>
              </div>
              <div className="relative">
                <button
                  onClick={() => setActiveMenu(activeMenu === session.sessionId ? null : session.sessionId)}
                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                >
                  <MoreVertical size={18} className="text-gray-500" />
                </button>
                {activeMenu === session.sessionId && (
                  <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-gray-200 bg-white shadow-lg z-10">
                    <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <Eye size={14} />
                      View Details
                    </button>
                    <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <Edit size={14} />
                      Edit Session
                    </button>
                    <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      <Copy size={14} />
                      Duplicate
                    </button>
                    {session.status !== 'archived' && (
                      <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <Archive size={14} />
                        Archive
                      </button>
                    )}
                    <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4">
              {getStatusBadge(session.status)}
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
              ? 'Get started by creating your first session.'
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
    </div>
  );
}
