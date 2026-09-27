'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  FileText,
  Users,
  Calendar,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Upload,
  BookOpen,
  Loader2,
  AlertCircle,
  Target,
  Info,
  Paperclip,
} from 'lucide-react';
import {
  listAssessments,
  deleteAssessment,
  Assessment,
} from '../../services/api';

export default function CaseAssessmentPage() {
  const router = useRouter();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => {
    fetchAssessments();
  }, []);

  async function fetchAssessments() {
    try {
      setLoading(true);
      setError(null);
      const response = await listAssessments();
      const mapped = response.assessments.map(a => ({
        ...a,
        assessmentId: a.assessmentId || a.assessmentID || '',
      }));
      setAssessments(mapped);
      // Expand first module by default
      if (mapped.length > 0) {
        const firstModule = mapped[0].module || 'General';
        setExpandedModules(new Set([firstModule]));
      }
    } catch (err) {
      console.error('Error fetching assessments:', err);
      setError('Failed to load assessments');
    } finally {
      setLoading(false);
    }
  }

  // Group assessments by module
  const assessmentsByModule = assessments.reduce((acc, assessment) => {
    const module = assessment.module || 'General';
    if (!acc[module]) {
      acc[module] = [];
    }
    acc[module].push(assessment);
    return acc;
  }, {} as Record<string, Assessment[]>);

  const toggleModule = (module: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(module)) {
      newExpanded.delete(module);
    } else {
      newExpanded.add(module);
    }
    setExpandedModules(newExpanded);
  };

  const toggleDetails = (assessmentId: string) => {
    const newExpanded = new Set(expandedDetails);
    if (newExpanded.has(assessmentId)) {
      newExpanded.delete(assessmentId);
    } else {
      newExpanded.add(assessmentId);
    }
    setExpandedDetails(newExpanded);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'published':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Published
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
            Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
            Draft
          </span>
        );
    }
  };

  async function handleDelete(assessmentId: string) {
    if (!confirm('Are you sure you want to delete this assessment?')) return;
    try {
      await deleteAssessment(assessmentId);
      fetchAssessments();
    } catch (err) {
      alert('Failed to delete assessment');
    }
    setActiveMenu(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={32} className="animate-spin text-maroon-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">Case Assessments</h1>
          <p className="mt-1 text-sm text-gray-500 font-sans">
            Manage case studies and assign to student groups
          </p>
        </div>
        <button
          onClick={() => router.push('/ta/assessments/add')}
          className="inline-flex items-center gap-2 rounded-lg bg-maroon-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-maroon-700 transition-colors font-sans shadow-sm"
        >
          <Plus size={16} />
          Add Assessment
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} />
          {error}
          <button onClick={fetchAssessments} className="ml-auto underline">Retry</button>
        </div>
      )}

      {/* Module Accordions */}
      <div className="space-y-4">
        {Object.entries(assessmentsByModule).map(([module, moduleAssessments]) => (
          <div key={module} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            {/* Module Header */}
            <button
              onClick={() => toggleModule(module)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <BookOpen size={20} className="text-maroon-600" />
                <span className="font-medium text-gray-900 font-sans">{module}</span>
                <span className="text-sm text-gray-500">({moduleAssessments.length} case{moduleAssessments.length !== 1 ? 's' : ''})</span>
              </div>
              {expandedModules.has(module) ? (
                <ChevronUp size={20} className="text-gray-400" />
              ) : (
                <ChevronDown size={20} className="text-gray-400" />
              )}
            </button>

            {/* Module Content */}
            {expandedModules.has(module) && (
              <div className="border-t border-gray-200 p-4 space-y-3">
                {moduleAssessments.map((assessment) => (
                  <div key={assessment.assessmentId} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                    {/* Compact Card Header */}
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 font-sans truncate">{assessment.title || assessment.caseName}</h3>
                          {getStatusBadge(assessment.status)}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {/* Quick info badges */}
                          {assessment.dueDate && (
                            <span className="hidden sm:flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              <Calendar size={12} />
                              {new Date(assessment.dueDate).toLocaleDateString()}
                            </span>
                          )}
                          {assessment.duration && (
                            <span className="hidden sm:flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              <Target size={12} />
                              {assessment.duration}m
                            </span>
                          )}

                          {/* Expand details button */}
                          <button
                            onClick={() => toggleDetails(assessment.assessmentId)}
                            className="flex items-center gap-1 text-xs text-maroon-600 hover:text-maroon-700 px-2 py-1 rounded hover:bg-maroon-50 transition-colors"
                            title="View details"
                          >
                            {expandedDetails.has(assessment.assessmentId) ? (
                              <>
                                <ChevronUp size={14} />
                                <span className="hidden sm:inline">Less</span>
                              </>
                            ) : (
                              <>
                                <ChevronDown size={14} />
                                <span className="hidden sm:inline">More</span>
                              </>
                            )}
                          </button>

                          {/* Actions menu */}
                          <div className="relative">
                            <button
                              onClick={() => setActiveMenu(activeMenu === assessment.assessmentId ? null : assessment.assessmentId)}
                              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                            >
                              <MoreVertical size={16} className="text-gray-500" />
                            </button>
                            {activeMenu === assessment.assessmentId && (
                              <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-gray-200 bg-white shadow-lg z-10">
                                <button
                                  onClick={() => router.push(`/ta/assessments/edit?id=${assessment.assessmentId}`)}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <Edit size={14} />
                                  Edit
                                </button>
                                <button
                                  onClick={() => router.push(`/ta/assessments/edit?id=${assessment.assessmentId}`)}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <Users size={14} />
                                  Assign to Groups
                                </button>
                                <button
                                  onClick={() => handleDelete(assessment.assessmentId)}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 size={14} />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Compact assignment badges - always visible */}
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {assessment.assignedSessions?.length ? (
                          <div className="flex items-center gap-1">
                            {assessment.assignedSessions.map(s => (
                              <span key={s} className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                S{s}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {assessment.assignedGroups?.length ? (
                          <div className="flex items-center gap-1">
                            {assessment.assignedGroups.map(g => (
                              <span key={g} className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                G{g}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {!assessment.assignedSessions?.length && !assessment.assignedGroups?.length && (
                          <span className="text-xs text-gray-400 italic">All students</span>
                        )}
                        {/* File count indicator */}
                        {assessment.materials && assessment.materials.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Paperclip size={12} />
                            {assessment.materials.length} file{assessment.materials.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expandable Details Section */}
                    {expandedDetails.has(assessment.assessmentId) && (
                      <div className="border-t border-gray-100 bg-gray-50/50">
                        {/* Description */}
                        {assessment.description && (
                          <div className="px-4 py-3 border-b border-gray-100">
                            <div className="flex items-start gap-2">
                              <Info size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                              <p className="text-sm text-gray-600">{assessment.description}</p>
                            </div>
                          </div>
                        )}

                        {/* Materials */}
                        {assessment.materials && assessment.materials.length > 0 && (
                          <div className="px-4 py-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Paperclip size={14} className="text-gray-400" />
                              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Case Materials</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {assessment.materials.map((material, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs"
                                >
                                  <FileText size={12} className="text-gray-400" />
                                  <span className="text-gray-700">{material.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {assessments.length === 0 && !loading && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 font-sans">No Assessments</h3>
          <p className="mt-1 text-sm text-gray-500 font-sans">Get started by creating your first assessment.</p>
          <button
            onClick={() => router.push('/ta/assessments/add')}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-maroon-600 px-4 py-2 text-sm font-medium text-white hover:bg-maroon-700 transition-colors"
          >
            <Plus size={16} />
            Add Assessment
          </button>
        </div>
      )}
    </div>
  );
}
