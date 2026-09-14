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
} from 'lucide-react';

const API_BASE = 'https://0q9blbq2gc.execute-api.us-east-1.amazonaws.com/prod';

interface Assessment {
  assessmentId: string;
  caseName: string;
  module: string;
  session: string;
  dueDate: string;
  groups: {
    groupId: string;
    groupName: string;
    section: string;
    studentCount: number;
    status: 'not-started' | 'in-progress' | 'completed';
  }[];
  materials: {
    name: string;
    type: string;
    uploadedAt: string;
  }[];
}

// Mock data for demonstration - will be replaced with API data
const mockAssessments: Assessment[] = [
  {
    assessmentId: 'assess-1',
    caseName: 'Case Study: Financial Analysis',
    module: 'Module 1: Introduction to Finance',
    session: 'Spring 2026',
    dueDate: '2026-09-15',
    groups: [
      { groupId: 'g1', groupName: 'Group 1', section: 'Section A', studentCount: 4, status: 'completed' },
      { groupId: 'g2', groupName: 'Group 2', section: 'Section A', studentCount: 3, status: 'in-progress' },
      { groupId: 'g3', groupName: 'Group 3', section: 'Section B', studentCount: 4, status: 'not-started' },
    ],
    materials: [
      { name: 'Case Study Brief.pdf', type: 'pdf', uploadedAt: '2026-08-01' },
      { name: 'Financial Data.xlsx', type: 'xlsx', uploadedAt: '2026-08-01' },
    ],
  },
  {
    assessmentId: 'assess-2',
    caseName: 'Case Study: Investment Portfolio',
    module: 'Module 2: Investment Strategies',
    session: 'Spring 2026',
    dueDate: '2026-10-01',
    groups: [
      { groupId: 'g4', groupName: 'Group 4', section: 'Section A', studentCount: 5, status: 'not-started' },
      { groupId: 'g5', groupName: 'Group 5', section: 'Section B', studentCount: 4, status: 'not-started' },
    ],
    materials: [
      { name: 'Investment Case.pdf', type: 'pdf', uploadedAt: '2026-08-15' },
    ],
  },
  {
    assessmentId: 'assess-3',
    caseName: 'Case Study: Risk Management',
    module: 'Module 3: Risk Analysis',
    session: 'Spring 2026',
    dueDate: '2026-10-15',
    groups: [
      { groupId: 'g6', groupName: 'Group 6', section: 'Section A', studentCount: 4, status: 'not-started' },
    ],
    materials: [],
  },
];

export default function CaseAssessmentPage() {
  const router = useRouter();
  const [assessments, setAssessments] = useState<Assessment[]>(mockAssessments);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(['Module 1: Introduction to Finance']));
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Group assessments by module
  const assessmentsByModule = assessments.reduce((acc, assessment) => {
    if (!acc[assessment.module]) {
      acc[assessment.module] = [];
    }
    acc[assessment.module].push(assessment);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Completed
          </span>
        );
      case 'in-progress':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
            Not Started
          </span>
        );
    }
  };

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">Case Assessment</h1>
          <p className="mt-1 text-sm text-gray-500 font-sans">
            Manage case studies, assignments, and group progress
          </p>
        </div>
        <button
          onClick={() => router.push('/ta/assessments/add')}
          className="inline-flex items-center gap-2 rounded-lg bg-maroon-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-maroon-700 transition-colors font-sans shadow-sm"
        >
          <Plus size={16} />
          Add Case
        </button>
      </div>

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
              <div className="border-t border-gray-200">
                {moduleAssessments.map((assessment) => (
                  <div key={assessment.assessmentId} className="border-b border-gray-100 last:border-0">
                    {/* Case Header */}
                    <div className="px-5 py-4 bg-gray-50/50">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900 font-sans">{assessment.caseName}</h3>
                          <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar size={14} />
                              Due: {new Date(assessment.dueDate).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users size={14} />
                              {assessment.groups.length} Groups
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText size={14} />
                              {assessment.materials.length} Files
                            </span>
                          </div>
                        </div>
                        <div className="relative">
                          <button
                            onClick={() => setActiveMenu(activeMenu === assessment.assessmentId ? null : assessment.assessmentId)}
                            className="p-1 rounded hover:bg-gray-200 transition-colors"
                          >
                            <MoreVertical size={18} className="text-gray-500" />
                          </button>
                          {activeMenu === assessment.assessmentId && (
                            <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-gray-200 bg-white shadow-lg z-10">
                              <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                <Eye size={14} />
                                View Details
                              </button>
                              <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                <Edit size={14} />
                                Edit Case
                              </button>
                              <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                                <Trash2 size={14} />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Groups Table */}
                    <div className="px-5 py-3">
                      <table className="w-full text-sm font-sans">
                        <thead>
                          <tr className="text-xs text-gray-500 uppercase tracking-wider">
                            <th className="py-2 text-left font-medium">Group</th>
                            <th className="py-2 text-left font-medium">Section</th>
                            <th className="py-2 text-left font-medium">Students</th>
                            <th className="py-2 text-left font-medium">Status</th>
                            <th className="py-2 text-right font-medium">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assessment.groups.map((group) => (
                            <tr key={group.groupId} className="border-t border-gray-100">
                              <td className="py-3 font-medium text-gray-900">{group.groupName}</td>
                              <td className="py-3 text-gray-600">{group.section}</td>
                              <td className="py-3 text-gray-600">{group.studentCount} members</td>
                              <td className="py-3">{getStatusBadge(group.status)}</td>
                              <td className="py-3 text-right">
                                <button className="text-sm font-medium text-maroon-600 hover:underline">
                                  View Submissions
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Materials Section */}
                    {assessment.materials.length > 0 && (
                      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/30">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Case Materials</span>
                          <button className="flex items-center gap-1 text-xs font-medium text-maroon-600 hover:underline">
                            <Upload size={12} />
                            Upload File
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {assessment.materials.map((material, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm"
                            >
                              <FileText size={14} className="text-gray-400" />
                              <span className="text-gray-700">{material.name}</span>
                            </div>
                          ))}
                        </div>
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
      {assessments.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 font-sans">No Case Assessments</h3>
          <p className="mt-1 text-sm text-gray-500 font-sans">Get started by creating your first case assessment.</p>
          <button
            onClick={() => router.push('/ta/assessments/add')}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-maroon-600 px-4 py-2 text-sm font-medium text-white hover:bg-maroon-700 transition-colors"
          >
            <Plus size={16} />
            Add Case
          </button>
        </div>
      )}
    </div>
  );
}
