'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  Check,
  ChevronDown,
} from 'lucide-react';
import {
  listStudents,
  listGroups,
  deleteStudent,
  Student,
  Group,
} from '../../services/api';

// Avatar colors for students
const avatarColors = [
  'bg-red-100 text-red-700',
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-yellow-100 text-yellow-700',
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
  'bg-indigo-100 text-indigo-700',
  'bg-orange-100 text-orange-700',
];

function getAvatarColor(name: string) {
  const index = name.charCodeAt(0) % avatarColors.length;
  return avatarColors[index];
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState({
    sections: [] as string[],
    groups: [] as string[],
    lastActivity: 'all' as 'all' | 'active' | 'inactive',
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const [studentsRes, groupsRes] = await Promise.all([
        listStudents(),
        listGroups(undefined, true),
      ]);
      setStudents(studentsRes.students);
      setGroups(groupsRes.groups);
    } catch (err) {
      setError('Failed to load students. Please try again.');
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  }

  // Get unique sections
  const sections = [...new Set(students.map(s => s.section).filter((s): s is string => Boolean(s)))];

  // Filter students
  const filteredStudents = students.filter(student => {
    // Search filter
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      const matchesSearch =
        student.firstName.toLowerCase().includes(search) ||
        student.lastName.toLowerCase().includes(search) ||
        student.email.toLowerCase().includes(search) ||
        student.loginId?.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }

    // Section filter
    if (filters.sections.length > 0 && student.section) {
      if (!filters.sections.includes(student.section)) return false;
    }

    // Group filter
    if (filters.groups.length > 0 && student.groupId) {
      if (!filters.groups.includes(student.groupId)) return false;
    }

    // Last activity filter
    if (filters.lastActivity !== 'all') {
      const hasRecentActivity = student.lastActivity &&
        new Date(student.lastActivity) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      if (filters.lastActivity === 'active' && !hasRecentActivity) return false;
      if (filters.lastActivity === 'inactive' && hasRecentActivity) return false;
    }

    return true;
  });

  function clearFilters() {
    setFilters({ sections: [], groups: [], lastActivity: 'all' });
  }

  function toggleSection(section: string) {
    setFilters(prev => ({
      ...prev,
      sections: prev.sections.includes(section)
        ? prev.sections.filter(s => s !== section)
        : [...prev.sections, section]
    }));
  }

  function toggleGroup(groupId: string) {
    setFilters(prev => ({
      ...prev,
      groups: prev.groups.includes(groupId)
        ? prev.groups.filter(g => g !== groupId)
        : [...prev.groups, groupId]
    }));
  }

  async function handleDelete(studentId: string) {
    if (confirm('Are you sure you want to delete this student?')) {
      await deleteStudent(studentId);
      fetchData();
    }
    setActionMenuOpen(null);
  }

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 font-serif">Students</h1>
        <p className="mt-1 text-sm text-gray-500 font-sans">Student details</p>
      </div>

      {/* Search and Actions */}
      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
          />
        </div>

        {/* Filter Button */}
        <div className="relative">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Filter size={16} />
            Filter
          </button>

          {/* Filter Dropdown */}
          {showFilter && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-gray-200 bg-white shadow-lg z-20 p-4">
              <h4 className="text-sm font-semibold text-maroon-600 mb-3">Filter By</h4>

              {/* Section Filter */}
              <div className="mb-4">
                <p className="text-xs font-medium text-maroon-600 mb-2">Section</p>
                <label className="flex items-center gap-2 mb-1.5 cursor-pointer">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${filters.sections.length === 0 ? 'bg-green-500 border-green-500' : 'border-gray-300'
                    }`}>
                    {filters.sections.length === 0 && <Check size={12} className="text-white" />}
                  </div>
                  <span className="text-sm text-gray-700">All Sections</span>
                </label>
                {sections.map(section => (
                  <label key={section} className="flex items-center gap-2 mb-1.5 cursor-pointer">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${filters.sections.includes(section) ? 'bg-green-500 border-green-500' : 'border-gray-300'
                      }`}>
                      {filters.sections.includes(section) && <Check size={12} className="text-white" />}
                    </div>
                    <span className="text-sm text-gray-700">{section}</span>
                  </label>
                ))}
              </div>

              {/* Group Filter */}
              <div className="mb-4">
                <p className="text-xs font-medium text-maroon-600 mb-2">Group</p>
                <label className="flex items-center gap-2 mb-1.5 cursor-pointer">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${filters.groups.length === 0 ? 'bg-green-500 border-green-500' : 'border-gray-300'
                    }`}>
                    {filters.groups.length === 0 && <Check size={12} className="text-white" />}
                  </div>
                  <span className="text-sm text-gray-700">All groups</span>
                </label>
                {groups.slice(0, 4).map(group => (
                  <label key={group.groupId} className="flex items-center gap-2 mb-1.5 cursor-pointer">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${filters.groups.includes(group.groupId) ? 'bg-green-500 border-green-500' : 'border-gray-300'
                      }`}>
                      {filters.groups.includes(group.groupId) && <Check size={12} className="text-white" />}
                    </div>
                    <span className="text-sm text-gray-700">{group.groupName}</span>
                  </label>
                ))}
              </div>

              {/* Last Activity Filter */}
              <div className="mb-4">
                <p className="text-xs font-medium text-maroon-600 mb-2">Last Activity</p>
                {[
                  { value: 'all', label: 'All' },
                  { value: 'active', label: 'Active recently' },
                  { value: 'inactive', label: 'No recent activity' },
                ].map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 mb-1.5 cursor-pointer">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${filters.lastActivity === opt.value ? 'bg-green-500 border-green-500' : 'border-gray-300'
                      }`}>
                      {filters.lastActivity === opt.value && <Check size={12} className="text-white" />}
                    </div>
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>

              {/* Filter Actions */}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={clearFilters}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowFilter(false)}
                  className="flex-1 rounded-lg bg-maroon-600 px-3 py-1.5 text-sm text-white hover:bg-maroon-700"
                >
                  Apply Filter
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Add Buttons */}
        <Link
          href="/ta/students/add"
          className="flex items-center gap-2 rounded-lg bg-maroon-600 px-4 py-2 text-sm font-medium text-white hover:bg-maroon-700"
        >
          <Plus size={16} />
          Add student
        </Link>
        <Link
          href="/ta/groups/add"
          className="flex items-center gap-2 rounded-lg bg-maroon-600 px-4 py-2 text-sm font-medium text-white hover:bg-maroon-700"
        >
          <Plus size={16} />
          Add Group
        </Link>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} />
          {error}
          <button onClick={fetchData} className="ml-auto underline">Retry</button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin text-maroon-600" />
        </div>
      ) : (
        /* Students Table */
        <div className="rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Login ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session / Group</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    {searchQuery ? 'No students match your search' : 'No students found. Add students to get started.'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.studentId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center ${getAvatarColor(student.firstName)}`}>
                          <span className="text-sm font-medium">
                            {student.firstName[0]}{student.lastName[0]}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900">
                          {student.firstName} {student.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{student.loginId || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{student.section || '—'}</td>
                    <td className="px-4 py-3">
                      {student.sessionNumber && student.groupNumber ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                          S{student.sessionNumber} / G{student.groupNumber}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Not assigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {student.lastActivity
                        ? new Date(student.lastActivity).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative">
                        <button
                          onClick={() => setActionMenuOpen(actionMenuOpen === student.studentId ? null : student.studentId)}
                          className="p-1 rounded hover:bg-gray-100"
                        >
                          <MoreVertical size={16} className="text-gray-400" />
                        </button>
                        {actionMenuOpen === student.studentId && (
                          <div className="absolute right-0 mt-1 w-36 rounded-lg border border-gray-200 bg-white shadow-lg z-10">
                            <Link
                              href={`/ta/students/edit?id=${student.studentId}`}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Edit2 size={14} /> Edit
                            </Link>
                            <button
                              onClick={() => handleDelete(student.studentId)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
