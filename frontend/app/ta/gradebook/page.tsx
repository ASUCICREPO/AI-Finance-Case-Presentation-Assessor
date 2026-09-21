'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Download,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Clock,
  Edit3,
} from 'lucide-react';
import {
  listSubmissions,
  listAssessments,
  exportGradebook,
  Submission,
  Assessment,
} from '../../services/api';

type SortField = 'student' | 'section' | 'group' | 'assignment' | 'aiScore' | 'reviewerScore' | 'status' | 'submittedAt';
type SortDirection = 'asc' | 'desc';

export default function GradebookPage() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');

  // Sort
  const [sortField, setSortField] = useState<SortField>('submittedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const [submissionsData, assessmentsData] = await Promise.all([
        listSubmissions(),
        listAssessments(),
      ]);
      setSubmissions(submissionsData.submissions);
      setAssessments(assessmentsData.assessments);
    } catch (err) {
      setError('Failed to load gradebook. Please try again.');
      console.error('Error fetching gradebook:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    try {
      setExporting(true);
      const result = await exportGradebook({ includeBreakdown: true });
      window.open(result.downloadUrl, '_blank');
    } catch (err) {
      alert('Failed to export gradebook. Please try again.');
      console.error('Error exporting:', err);
    } finally {
      setExporting(false);
    }
  }

  // Build assessment lookup
  const assessmentMap = useMemo(() => {
    const map: Record<string, Assessment> = {};
    assessments.forEach(a => {
      map[a.assessmentId] = a;
      if (a.assessmentID) map[a.assessmentID] = a;
    });
    return map;
  }, [assessments]);

  // Get unique values for filters
  const uniqueSections = useMemo(() => {
    const sections = new Set<string>();
    submissions.forEach(s => {
      const section = s.student?.section;
      if (section) sections.add(section);
    });
    return Array.from(sections).sort();
  }, [submissions]);

  const uniqueAssignments = useMemo(() => {
    const assignments = new Set<string>();
    submissions.forEach(s => {
      if (s.assessmentId) assignments.add(s.assessmentId);
    });
    return Array.from(assignments);
  }, [submissions]);

  // Filter and sort submissions
  const filteredSubmissions = useMemo(() => {
    let result = [...submissions];

    // Search filter
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      result = result.filter(s => {
        const studentName = s.student
          ? `${s.student.firstName} ${s.student.lastName}`.toLowerCase()
          : '';
        const studentEmail = s.student?.email?.toLowerCase() || '';
        const assessmentTitle = assessmentMap[s.assessmentId]?.title?.toLowerCase() || '';
        return (
          studentName.includes(search) ||
          studentEmail.includes(search) ||
          assessmentTitle.includes(search)
        );
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(s => s.status === statusFilter);
    }

    // Assignment filter
    if (assignmentFilter !== 'all') {
      result = result.filter(s => s.assessmentId === assignmentFilter);
    }

    // Section filter
    if (sectionFilter !== 'all') {
      result = result.filter(s => s.student?.section === sectionFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'student':
          const nameA = a.student ? `${a.student.lastName} ${a.student.firstName}` : '';
          const nameB = b.student ? `${b.student.lastName} ${b.student.firstName}` : '';
          comparison = nameA.localeCompare(nameB);
          break;
        case 'section':
          comparison = (a.student?.section || '').localeCompare(b.student?.section || '');
          break;
        case 'group':
          comparison = (a.groupNumber || a.student?.groupNumber || '').localeCompare(
            b.groupNumber || b.student?.groupNumber || ''
          );
          break;
        case 'assignment':
          const titleA = assessmentMap[a.assessmentId]?.title || '';
          const titleB = assessmentMap[b.assessmentId]?.title || '';
          comparison = titleA.localeCompare(titleB);
          break;
        case 'aiScore':
          comparison = (a.aiScore ?? -1) - (b.aiScore ?? -1);
          break;
        case 'reviewerScore':
          comparison = (a.reviewerScore ?? -1) - (b.reviewerScore ?? -1);
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
        case 'submittedAt':
          comparison = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [submissions, searchQuery, statusFilter, assignmentFilter, sectionFilter, sortField, sortDirection, assessmentMap]);

  // Pagination
  const totalPages = Math.ceil(filteredSubmissions.length / pageSize);
  const paginatedSubmissions = filteredSubmissions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, assignmentFilter, sectionFilter]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'Reviewed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
            <Check size={12} />
            Reviewed
          </span>
        );
      case 'Overridden':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
            <Edit3 size={12} />
            Overridden
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
            <Clock size={12} />
            Pending
          </span>
        );
    }
  }

  function getScoreDisplay(score: number | undefined, isReviewerScore = false) {
    if (score === undefined || score === null) {
      return <span className="text-gray-400">—</span>;
    }
    const colorClass = score >= 90 ? 'text-green-600' :
      score >= 80 ? 'text-blue-600' :
        score >= 70 ? 'text-yellow-600' :
          score >= 60 ? 'text-orange-600' : 'text-red-600';
    return <span className={`font-semibold ${colorClass}`}>{Math.round(score)}%</span>;
  }

  function SortHeader({ field, label }: { field: SortField; label: string }) {
    const isActive = sortField === field;
    return (
      <button
        onClick={() => handleSort(field)}
        className={`flex items-center gap-1 text-xs font-medium uppercase tracking-wider ${isActive ? 'text-maroon-600' : 'text-gray-500 hover:text-gray-700'
          }`}
      >
        {label}
        {isActive && (
          <ChevronDown
            size={14}
            className={`transition-transform ${sortDirection === 'asc' ? 'rotate-180' : ''}`}
          />
        )}
      </button>
    );
  }

  return (
    <div className="mx-auto max-w-7xl animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">Grade Book</h1>
          <p className="mt-1 text-sm text-gray-500 font-sans">
            View and manage all student submissions
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 rounded-lg bg-maroon-600 px-4 py-2 text-sm font-medium text-white hover:bg-maroon-700 disabled:opacity-50 transition-colors"
        >
          {exporting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Download size={16} />
          )}
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[250px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by student name, email, or assignment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
        >
          <option value="all">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Reviewed">Reviewed</option>
          <option value="Overridden">Overridden</option>
        </select>

        {/* Assignment Filter */}
        <select
          value={assignmentFilter}
          onChange={(e) => setAssignmentFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
        >
          <option value="all">All Assignments</option>
          {uniqueAssignments.map(id => (
            <option key={id} value={id}>
              {assessmentMap[id]?.title || id}
            </option>
          ))}
        </select>

        {/* Section Filter */}
        {uniqueSections.length > 0 && (
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
          >
            <option value="all">All Sections</option>
            {uniqueSections.map(section => (
              <option key={section} value={section}>{section}</option>
            ))}
          </select>
        )}
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
        <>
          {/* Submissions Table */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <SortHeader field="student" label="Student" />
                    </th>
                    <th className="px-4 py-3 text-left">
                      <SortHeader field="section" label="Section" />
                    </th>
                    <th className="px-4 py-3 text-left">
                      <SortHeader field="group" label="Group" />
                    </th>
                    <th className="px-4 py-3 text-left">
                      <SortHeader field="assignment" label="Assignment" />
                    </th>
                    <th className="px-4 py-3 text-center">
                      <SortHeader field="aiScore" label="AI Score" />
                    </th>
                    <th className="px-4 py-3 text-center">
                      <SortHeader field="reviewerScore" label="Reviewer Score" />
                    </th>
                    <th className="px-4 py-3 text-center">
                      <SortHeader field="status" label="Status" />
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        {searchQuery || statusFilter !== 'all' || assignmentFilter !== 'all' || sectionFilter !== 'all'
                          ? 'No submissions match your filters'
                          : 'No submissions yet'}
                      </td>
                    </tr>
                  ) : (
                    paginatedSubmissions.map((submission) => {
                      const assessment = assessmentMap[submission.assessmentId];
                      return (
                        <tr key={submission.submissionId} className="hover:bg-gray-50">
                          {/* Student */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-maroon-100 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-medium text-maroon-600">
                                  {submission.student?.firstName?.[0] || '?'}
                                  {submission.student?.lastName?.[0] || '?'}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                  {submission.student
                                    ? `${submission.student.lastName}, ${submission.student.firstName}`
                                    : 'Unknown Student'}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {submission.student?.email || '—'}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Section */}
                          <td className="px-4 py-3 text-gray-600">
                            {submission.student?.section || submission.sessionNumber || '—'}
                          </td>

                          {/* Group */}
                          <td className="px-4 py-3 text-gray-600">
                            {submission.groupNumber || submission.student?.groupNumber || '—'}
                          </td>

                          {/* Assignment */}
                          <td className="px-4 py-3">
                            <span className="text-gray-900 truncate block max-w-[200px]" title={assessment?.title}>
                              {assessment?.title || submission.assessmentId || '—'}
                            </span>
                          </td>

                          {/* AI Score */}
                          <td className="px-4 py-3 text-center">
                            {getScoreDisplay(submission.aiScore)}
                          </td>

                          {/* Reviewer Score */}
                          <td className="px-4 py-3 text-center">
                            {getScoreDisplay(submission.reviewerScore, true)}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3 text-center">
                            {getStatusBadge(submission.status)}
                          </td>

                          {/* Action */}
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => router.push(`/ta/submissions/review?id=${submission.submissionId}`)}
                              className="inline-flex items-center gap-1 rounded-lg bg-maroon-50 px-3 py-1.5 text-sm font-medium text-maroon-600 hover:bg-maroon-100 transition-colors"
                            >
                              <Eye size={14} />
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredSubmissions.length)} of {filteredSubmissions.length} submissions
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`h-8 w-8 rounded-lg text-sm font-medium ${currentPage === pageNum
                          ? 'bg-maroon-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Summary */}
          {totalPages <= 1 && (
            <div className="mt-4 text-sm text-gray-500">
              Showing {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? 's' : ''}
            </div>
          )}
        </>
      )}
    </div>
  );
}
