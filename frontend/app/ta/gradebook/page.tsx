'use client';

import { useState, useEffect } from 'react';
import {
  BookOpen,
  Download,
  Search,
  Filter,
  BarChart3,
  Loader2,
  AlertCircle,
  ChevronDown,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  getGradebook,
  getGradebookStats,
  exportGradebook,
  GradebookEntry,
  GradebookStats,
} from '../../services/api';

export default function GradebookPage() {
  const [gradebook, setGradebook] = useState<GradebookEntry[]>([]);
  const [stats, setStats] = useState<GradebookStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'submissions'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const [gbData, statsData] = await Promise.all([
        getGradebook(),
        getGradebookStats(),
      ]);
      setGradebook(gbData.gradebook);
      setStats(statsData);
    } catch (err) {
      setError('Failed to load gradebook. Please try again.');
      console.error('Error fetching gradebook:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(includeBreakdown: boolean) {
    try {
      setExporting(true);
      const result = await exportGradebook({ includeBreakdown });
      // Open download URL
      window.open(result.downloadUrl, '_blank');
    } catch (err) {
      alert('Failed to export gradebook. Please try again.');
      console.error('Error exporting:', err);
    } finally {
      setExporting(false);
    }
  }

  // Filter and sort
  const filteredGradebook = gradebook
    .filter(entry => {
      if (!searchQuery) return true;
      const search = searchQuery.toLowerCase();
      return (
        `${entry.firstName} ${entry.lastName}`.toLowerCase().includes(search) ||
        entry.email.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
          break;
        case 'score':
          comparison = (a.averageScore || 0) - (b.averageScore || 0);
          break;
        case 'submissions':
          comparison = a.submissionCount - b.submissionCount;
          break;
      }
      return sortDir === 'asc' ? comparison : -comparison;
    });

  function getScoreColor(score: number | null) {
    if (score === null) return 'text-gray-400';
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  }

  function getLetterGrade(score: number | null) {
    if (score === null) return '—';
    if (score >= 93) return 'A';
    if (score >= 90) return 'A-';
    if (score >= 87) return 'B+';
    if (score >= 83) return 'B';
    if (score >= 80) return 'B-';
    if (score >= 77) return 'C+';
    if (score >= 73) return 'C';
    if (score >= 70) return 'C-';
    if (score >= 67) return 'D+';
    if (score >= 60) return 'D';
    return 'F';
  }

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">Grade Book</h1>
          <p className="mt-1 text-sm text-gray-500 font-sans">
            View and export student grades and performance metrics
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => handleExport(false)}
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
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="mb-6 grid grid-cols-4 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 size={18} className="text-maroon-600" />
              <span className="text-xs text-gray-400">Class Average</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.finalScores.avg !== null ? `${stats.finalScores.avg}%` : '—'}
            </p>
            <p className="text-sm text-gray-500">
              {stats.finalScores.median !== null ? `Median: ${stats.finalScores.median}%` : ''}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp size={18} className="text-green-600" />
              <span className="text-xs text-gray-400">Highest</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {stats.finalScores.max !== null ? `${stats.finalScores.max}%` : '—'}
            </p>
            <p className="text-sm text-gray-500">Top performer</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingDown size={18} className="text-red-600" />
              <span className="text-xs text-gray-400">Lowest</span>
            </div>
            <p className="text-2xl font-bold text-red-600">
              {stats.finalScores.min !== null ? `${stats.finalScores.min}%` : '—'}
            </p>
            <p className="text-sm text-gray-500">Needs attention</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <BookOpen size={18} className="text-blue-600" />
              <span className="text-xs text-gray-400">Grading Progress</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {stats.reviewProgress.percentComplete}%
            </p>
            <p className="text-sm text-gray-500">
              {stats.reviewProgress.reviewed} of {stats.total} graded
            </p>
          </div>
        </div>
      )}

      {/* Score Distribution */}
      {stats && stats.scoreDistribution && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Score Distribution</h3>
          <div className="flex items-end gap-1 h-20">
            {Object.entries(stats.scoreDistribution).map(([range, count]) => {
              const maxCount = Math.max(...Object.values(stats.scoreDistribution));
              const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <div key={range} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-maroon-200 rounded-t transition-all"
                    style={{ height: `${height}%`, minHeight: count > 0 ? '4px' : '0' }}
                    title={`${range}: ${count} students`}
                  />
                  <span className="text-xs text-gray-400 mt-1 truncate w-full text-center">
                    {range.split('-')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
          />
        </div>
        <select
          value={`${sortBy}-${sortDir}`}
          onChange={(e) => {
            const [by, dir] = e.target.value.split('-');
            setSortBy(by as any);
            setSortDir(dir as any);
          }}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
        >
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
          <option value="score-desc">Score (High to Low)</option>
          <option value="score-asc">Score (Low to High)</option>
          <option value="submissions-desc">Submissions (Most)</option>
          <option value="submissions-asc">Submissions (Least)</option>
        </select>
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
        /* Gradebook Table */
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Submissions</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Graded</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Average</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredGradebook.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    {searchQuery ? 'No students match your search' : 'No gradebook data available'}
                  </td>
                </tr>
              ) : (
                filteredGradebook.map((entry) => (
                  <tr key={entry.studentId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-maroon-100 flex items-center justify-center">
                          <span className="text-xs font-medium text-maroon-600">
                            {entry.firstName[0]}{entry.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{entry.lastName}, {entry.firstName}</p>
                          <p className="text-xs text-gray-500">{entry.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{entry.section || '—'}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{entry.submissionCount}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{entry.gradedCount}</td>
                    <td className={`px-4 py-3 text-center font-bold ${getScoreColor(entry.averageScore)}`}>
                      {entry.averageScore !== null ? `${entry.averageScore}%` : '—'}
                    </td>
                    <td className={`px-4 py-3 text-center font-bold ${getScoreColor(entry.averageScore)}`}>
                      {getLetterGrade(entry.averageScore)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      <div className="mt-4 text-sm text-gray-500">
        Showing {filteredGradebook.length} of {gradebook.length} students
      </div>
    </div>
  );
}
