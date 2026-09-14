'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Plus,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  Check,
  Loader2,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import {
  listGroups,
  listStudents,
  Group,
  Student,
} from '../../services/api';

// Mock case studies data - in production this would come from the API
interface CaseStudy {
  id: string;
  name: string;
  module: string;
  groups: Group[];
  totalStudents: number;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [expandedCases, setExpandedCases] = useState<Set<string>>(new Set(['case-1']));

  // Filter state
  const [filters, setFilters] = useState({
    sections: [] as string[],
    groups: [] as string[],
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const [groupsRes, studentsRes] = await Promise.all([
        listGroups(undefined, true),
        listStudents(),
      ]);
      setGroups(groupsRes.groups);
      setStudents(studentsRes.students);
    } catch (err) {
      setError('Failed to load groups. Please try again.');
      console.error('Error fetching groups:', err);
    } finally {
      setLoading(false);
    }
  }

  // Get unique sections
  const sections = [...new Set(students.map(s => s.section).filter((s): s is string => Boolean(s)))];

  // Organize groups into case studies (mock structure)
  const caseStudies: CaseStudy[] = [
    {
      id: 'case-1',
      name: 'Case Study 1: Financial Analysis of Tesla',
      module: 'Module 1',
      groups: groups.slice(0, 3),
      totalStudents: groups.slice(0, 3).reduce((sum, g) => sum + (g.studentIds?.length || 0), 0),
    },
    {
      id: 'case-2',
      name: 'Case Study 2: Risk Assessment in Banking',
      module: 'Module 1',
      groups: groups.slice(3, 5),
      totalStudents: groups.slice(3, 5).reduce((sum, g) => sum + (g.studentIds?.length || 0), 0),
    },
    {
      id: 'case-3',
      name: 'Case Study 3: Investment Portfolio Strategy',
      module: 'Module 2',
      groups: groups.slice(5),
      totalStudents: groups.slice(5).reduce((sum, g) => sum + (g.studentIds?.length || 0), 0),
    },
  ];

  function toggleCase(caseId: string) {
    const newExpanded = new Set(expandedCases);
    if (newExpanded.has(caseId)) {
      newExpanded.delete(caseId);
    } else {
      newExpanded.add(caseId);
    }
    setExpandedCases(newExpanded);
  }

  function clearFilters() {
    setFilters({ sections: [], groups: [] });
  }

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/ta/students"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Students
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-sm text-maroon-600 font-medium">Groups</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 font-serif">Groups</h1>
        <p className="mt-1 text-sm text-gray-500">Organize students by class, section, or assessment.</p>
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
                {['Group 1', 'Group 2', 'Group 3', 'Group 4'].map(group => (
                  <label key={group} className="flex items-center gap-2 mb-1.5 cursor-pointer">
                    <div className="w-4 h-4 rounded border border-gray-300 flex items-center justify-center">
                    </div>
                    <span className="text-sm text-gray-700">{group}</span>
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

        {/* Add Group Button */}
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
        /* Case Studies */
        <div className="space-y-4">
          {caseStudies.map((caseStudy) => (
            <div key={caseStudy.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              {/* Case Header */}
              <button
                onClick={() => toggleCase(caseStudy.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  {expandedCases.has(caseStudy.id) ? (
                    <ChevronDown size={20} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={20} className="text-gray-400" />
                  )}
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">{caseStudy.name}</h3>
                    <p className="text-sm text-gray-500">
                      {caseStudy.groups.length} groups • {caseStudy.totalStudents} students • {caseStudy.module}
                    </p>
                  </div>
                </div>
                <button className="p-1 hover:bg-gray-100 rounded">
                  <MoreVertical size={16} className="text-gray-400" />
                </button>
              </button>

              {/* Groups */}
              {expandedCases.has(caseStudy.id) && caseStudy.groups.length > 0 && (
                <div className="border-t border-gray-100 p-4 space-y-4">
                  {caseStudy.groups.map((group, idx) => (
                    <div key={group.groupId} className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Group {idx + 1}</h4>
                        <div className="flex flex-wrap gap-2">
                          {group.students?.map((student) => (
                            <span
                              key={student.studentId}
                              className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700"
                            >
                              {student.firstName} {student.lastName}
                            </span>
                          )) || (
                              <span className="text-sm text-gray-400">No students assigned</span>
                            )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          {group.students?.length || 0} students
                        </span>
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <MoreVertical size={16} className="text-gray-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {groups.length === 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
              <p className="text-gray-500">No groups created yet.</p>
              <Link
                href="/ta/groups/add"
                className="mt-4 inline-block text-sm text-maroon-600 hover:underline"
              >
                Create your first group
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
