'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Upload,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Mail,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import {
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  bulkImportStudents,
  Student,
} from '../../services/api';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  // Fetch students
  useEffect(() => {
    fetchStudents();
  }, [selectedSection]);

  async function fetchStudents() {
    try {
      setLoading(true);
      setError(null);
      const section = selectedSection === 'all' ? undefined : selectedSection;
      const response = await listStudents(section);
      setStudents(response.students);
    } catch (err) {
      setError('Failed to load students. Please try again.');
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  }

  // Get unique sections for filter
  const sections = [...new Set(students.map(s => s.section).filter((s): s is string => Boolean(s)))];

  // Filter students by search
  const filteredStudents = students.filter(student => {
    const search = searchQuery.toLowerCase();
    return (
      student.firstName.toLowerCase().includes(search) ||
      student.lastName.toLowerCase().includes(search) ||
      student.email.toLowerCase().includes(search) ||
      student.loginId?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">Students</h1>
          <p className="mt-1 text-sm text-gray-500 font-sans">
            Manage your class roster and student information
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Upload size={16} />
            Import CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-lg bg-maroon-600 px-4 py-2 text-sm font-medium text-white hover:bg-maroon-700 transition-colors"
          >
            <Plus size={16} />
            Add Student
          </button>
        </div>
      </div>

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
          value={selectedSection}
          onChange={(e) => setSelectedSection(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
        >
          <option value="all">All Sections</option>
          {sections.map(section => (
            <option key={section} value={section}>{section}</option>
          ))}
        </select>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} />
          {error}
          <button onClick={fetchStudents} className="ml-auto underline">Retry</button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin text-maroon-600" />
        </div>
      ) : (
        /* Students Table */
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Login ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                        <div className="h-8 w-8 rounded-full bg-maroon-100 flex items-center justify-center">
                          <span className="text-xs font-medium text-maroon-600">
                            {student.firstName[0]}{student.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{student.firstName} {student.lastName}</p>
                          <p className="text-xs text-gray-500">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{student.loginId || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{student.section || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${student.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                        {student.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {student.lastActivity
                        ? new Date(student.lastActivity).toLocaleDateString()
                        : 'Never'}
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
                            <button
                              onClick={() => {
                                setEditingStudent(student);
                                setShowAddModal(true);
                                setActionMenuOpen(null);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Edit2 size={14} /> Edit
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm('Are you sure you want to delete this student?')) {
                                  await deleteStudent(student.studentId);
                                  fetchStudents();
                                }
                                setActionMenuOpen(null);
                              }}
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

      {/* Summary */}
      <div className="mt-4 text-sm text-gray-500">
        Showing {filteredStudents.length} of {students.length} students
      </div>

      {/* Add/Edit Student Modal */}
      {showAddModal && (
        <StudentModal
          student={editingStudent}
          sections={sections}
          onClose={() => {
            setShowAddModal(false);
            setEditingStudent(null);
          }}
          onSave={async (data) => {
            if (editingStudent) {
              await updateStudent(editingStudent.studentId, data);
            } else {
              await createStudent(data);
            }
            fetchStudents();
            setShowAddModal(false);
            setEditingStudent(null);
          }}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImport={async (students) => {
            const result = await bulkImportStudents(students);
            fetchStudents();
            return result;
          }}
        />
      )}
    </div>
  );
}

// Student Add/Edit Modal
function StudentModal({
  student,
  sections,
  onClose,
  onSave,
}: {
  student: Student | null;
  sections: string[];
  onClose: () => void;
  onSave: (data: Partial<Student>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    firstName: student?.firstName || '',
    lastName: student?.lastName || '',
    email: student?.email || '',
    loginId: student?.loginId || '',
    section: student?.section || '',
    status: student?.status || 'Active',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email) {
      setError('Please fill in all required fields');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await onSave(form);
    } catch (err: any) {
      setError(err.message || 'Failed to save student');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 font-serif">
            {student ? 'Edit Student' : 'Add Student'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Login ID (ASURite)</label>
            <input
              type="text"
              value={form.loginId}
              onChange={(e) => setForm({ ...form, loginId: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
              placeholder="e.g., jsmith42"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
              <input
                type="text"
                value={form.section}
                onChange={(e) => setForm({ ...form, section: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
                placeholder="e.g., Section A"
                list="sections"
              />
              <datalist id="sections">
                {sections.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-maroon-600 px-4 py-2 text-sm font-medium text-white hover:bg-maroon-700 disabled:opacity-50"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {student ? 'Save Changes' : 'Add Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Import CSV Modal
function ImportModal({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (students: Partial<Student>[]) => Promise<{
    created: number;
    errors: number;
    errorDetails: Array<{ index: number; error: string }>;
  }>;
}) {
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    errors: number;
    errorDetails: Array<{ index: number; error: string }>;
  } | null>(null);

  function parseCSV(text: string): Partial<Student>[] {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const students: Partial<Student>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const student: Partial<Student> = {};

      headers.forEach((header, idx) => {
        const value = values[idx];
        if (header.includes('first')) student.firstName = value;
        else if (header.includes('last')) student.lastName = value;
        else if (header.includes('email')) student.email = value;
        else if (header.includes('login') || header.includes('asurite')) student.loginId = value;
        else if (header.includes('section')) student.section = value;
      });

      if (student.firstName && student.lastName && student.email) {
        students.push(student);
      }
    }

    return students;
  }

  async function handleImport() {
    const students = parseCSV(csvText);
    if (students.length === 0) {
      alert('No valid student data found. Please check your CSV format.');
      return;
    }

    setImporting(true);
    try {
      const res = await onImport(students);
      setResult(res);
    } catch (err) {
      alert('Import failed. Please try again.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 font-serif">Import Students</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {!result ? (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Paste CSV data with columns: <code className="bg-gray-100 px-1 rounded">firstName, lastName, email, loginId, section</code>
            </p>

            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="firstName,lastName,email,loginId,section
John,Doe,jdoe@asu.edu,jdoe42,Section A
Jane,Smith,jsmith@asu.edu,jsmith1,Section B"
              className="w-full h-48 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
            />

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={importing || !csvText.trim()}
                className="flex items-center gap-2 rounded-lg bg-maroon-600 px-4 py-2 text-sm font-medium text-white hover:bg-maroon-700 disabled:opacity-50"
              >
                {importing && <Loader2 size={16} className="animate-spin" />}
                Import Students
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle size={20} />
                <span className="font-medium">{result.created} students imported successfully</span>
              </div>
              {result.errors > 0 && (
                <div className="text-red-600">
                  <p className="font-medium mb-2">{result.errors} errors:</p>
                  <ul className="text-sm space-y-1">
                    {result.errorDetails.slice(0, 5).map((err, idx) => (
                      <li key={idx}>Row {err.index + 2}: {err.error}</li>
                    ))}
                    {result.errorDetails.length > 5 && (
                      <li>...and {result.errorDetails.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-4">
              <button
                onClick={onClose}
                className="rounded-lg bg-maroon-600 px-4 py-2 text-sm font-medium text-white hover:bg-maroon-700"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
