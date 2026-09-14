'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  X,
  ChevronDown,
  Loader2,
  Upload,
  Cloud,
  FileSpreadsheet,
  Trash2,
  Check,
} from 'lucide-react';
import { createGroup, listStudents, Student } from '../../../services/api';

// Sample data
const caseNames = [
  'Case 1 - Financial Analysis of Tesla',
  'Case 2 - Risk Assessment in Banking',
  'Case 3 - Investment Portfolio Strategy',
];

const sections = [
  'Morning Section - FIN 421',
  'Afternoon FIN 425',
  'Evening FIN 426',
];

interface GroupForm {
  caseName: string;
  section: string;
  members: Student[];
}

export default function AddGroupPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'individual' | 'upload'>('individual');
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<GroupForm[]>([
    { caseName: '', section: '', members: [] }
  ]);
  const [studentDropdownOpen, setStudentDropdownOpen] = useState<number | null>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  async function fetchStudents() {
    try {
      const res = await listStudents();
      setStudents(res.students);
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  }

  function addGroup() {
    setGroups([...groups, { caseName: '', section: '', members: [] }]);
  }

  function updateGroup(index: number, field: keyof GroupForm, value: any) {
    const newGroups = [...groups];
    newGroups[index] = { ...newGroups[index], [field]: value };
    setGroups(newGroups);
  }

  function addMember(groupIndex: number, student: Student) {
    const newGroups = [...groups];
    if (!newGroups[groupIndex].members.find(m => m.studentId === student.studentId)) {
      newGroups[groupIndex].members.push(student);
      setGroups(newGroups);
    }
    setStudentDropdownOpen(null);
  }

  function removeMember(groupIndex: number, studentId: string) {
    const newGroups = [...groups];
    newGroups[groupIndex].members = newGroups[groupIndex].members.filter(
      m => m.studentId !== studentId
    );
    setGroups(newGroups);
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      for (const group of groups) {
        if (group.members.length > 0) {
          await createGroup({
            groupName: `Group - ${group.caseName || 'Untitled'}`,
            assessmentId: 'default-assessment',
            description: group.section,
            studentIds: group.members.map(m => m.studentId),
          });
        }
      }
      router.push('/ta/groups');
    } catch (err) {
      alert('Failed to create groups. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const lastUpdated = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  }) + ' at ' + new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
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
        <span className="text-sm text-maroon-600 font-medium">Upload student information</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">Add Group</h1>
          <p className="mt-1 text-sm text-gray-500">Organize students by class, section, or assessment.</p>
        </div>
        <p className="text-sm text-gray-400">Last updated: {lastUpdated}</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setActiveTab('individual')}
          className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'individual'
              ? 'bg-maroon-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Add Individually
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'upload'
              ? 'bg-maroon-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Upload File
        </button>
      </div>

      {/* Content */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        {activeTab === 'individual' ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Add individually</h2>
              <p className="text-sm text-gray-500">Enter one group at a time</p>
            </div>

            <div className="space-y-6">
              {groups.map((group, groupIndex) => (
                <div key={groupIndex} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900">Group {groupIndex + 1}</h3>
                    <ChevronDown size={16} className="text-gray-400" />
                  </div>

                  <div className="space-y-4">
                    {/* Case Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Case name</label>
                      <div className="relative">
                        <select
                          value={group.caseName}
                          onChange={(e) => updateGroup(groupIndex, 'caseName', e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500 appearance-none"
                        >
                          <option value="">Enter case name</option>
                          {caseNames.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Section */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                      <div className="relative">
                        <select
                          value={group.section}
                          onChange={(e) => updateGroup(groupIndex, 'section', e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500 appearance-none"
                        >
                          <option value="">Select section or class</option>
                          {sections.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Group Members */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Group Members</label>
                      <div className="relative">
                        <div
                          className="min-h-[44px] w-full rounded-lg border border-gray-300 px-3 py-2 flex flex-wrap gap-2 cursor-pointer"
                          onClick={() => setStudentDropdownOpen(studentDropdownOpen === groupIndex ? null : groupIndex)}
                        >
                          {group.members.map((member) => (
                            <span
                              key={member.studentId}
                              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm"
                            >
                              {member.firstName} {member.lastName}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeMember(groupIndex, member.studentId);
                                }}
                                className="hover:text-red-600"
                              >
                                <X size={14} />
                              </button>
                            </span>
                          ))}
                          {group.members.length === 0 && (
                            <span className="text-gray-400 text-sm">Select students...</span>
                          )}
                          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>

                        {/* Student Dropdown */}
                        {studentDropdownOpen === groupIndex && (
                          <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                            {students.filter(s => !group.members.find(m => m.studentId === s.studentId)).map((student) => (
                              <button
                                key={student.studentId}
                                onClick={() => addMember(groupIndex, student)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                              >
                                {student.firstName} {student.lastName}
                              </button>
                            ))}
                            {students.filter(s => !group.members.find(m => m.studentId === s.studentId)).length === 0 && (
                              <p className="px-4 py-2 text-sm text-gray-500">No more students available</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Another Group */}
              <button
                onClick={addGroup}
                className="flex items-center gap-2 text-sm text-maroon-600 hover:text-maroon-700"
              >
                <Plus size={16} />
                Add Another Group
              </button>
            </div>

            <div className="flex justify-end pt-6">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Create Groups
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Upload a file</h2>
              <p className="text-sm text-gray-500">Supported formats: XLS, XLSX, CSV</p>
            </div>

            {/* Drop Zone */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-maroon-400 transition-colors">
              <Cloud size={40} className="mx-auto text-gray-400 mb-3" />
              <p className="text-sm text-gray-700 mb-1">
                Choose a file or drag & drop it here.
              </p>
              <p className="text-xs text-gray-500 mb-4">Up to 50 MB.</p>
              <button className="rounded-lg bg-maroon-600 px-6 py-2 text-sm font-medium text-white hover:bg-maroon-700">
                Browse File
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
