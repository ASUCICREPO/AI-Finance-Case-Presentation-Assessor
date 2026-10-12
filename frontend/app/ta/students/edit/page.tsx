'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ChevronDown,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { getStudent, updateStudent, Student } from '../../../services/api';

// Sample sections for dropdown
const sections = [
  'Morning Section - FIN 421',
  'Afternoon FIN 425',
  'Evening FIN 426',
];

// Session numbers (class periods) - kept as dropdown for consistency
const sessionNumbers = ['1', '2', '3', '4', '5'];

export default function EditStudentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    section: '',
    sessionNumber: '',
    groupNumber: '',
  });

  // Load student data
  useEffect(() => {
    if (!studentId) {
      setError('No student ID provided');
      setLoading(false);
      return;
    }

    async function loadStudent() {
      try {
        const student = await getStudent(studentId!);
        setForm({
          firstName: student.firstName || '',
          lastName: student.lastName || '',
          email: student.email || '',
          section: student.section || '',
          sessionNumber: student.sessionNumber || '',
          groupNumber: student.groupNumber || '',
        });
      } catch (err) {
        console.error('Failed to load student:', err);
        setError('Failed to load student data');
      } finally {
        setLoading(false);
      }
    }

    loadStudent();
  }, [studentId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId) return;

    if (!form.firstName || !form.lastName || !form.email) {
      setError('Please fill in all required fields');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await updateStudent(studentId, {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        section: form.section || undefined,
        sessionNumber: form.sessionNumber || undefined,
        groupNumber: form.groupNumber || undefined,
      });
      setSuccess(true);
      setTimeout(() => {
        router.push('/ta/students');
      }, 1500);
    } catch (err) {
      console.error('Failed to update student:', err);
      setError('Failed to update student. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={32} className="animate-spin text-maroon-600" />
      </div>
    );
  }

  if (error && !form.email) {
    return (
      <div className="mx-auto max-w-3xl animate-fade-in">
        <div className="mb-6">
          <Link
            href="/ta/students"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={16} />
            Back to Students
          </Link>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle size={32} className="mx-auto text-red-500 mb-3" />
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

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
        <span className="text-sm text-maroon-600 font-medium">Edit student</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 font-serif">Edit Student</h1>
        <p className="mt-1 text-sm text-gray-500">Update student information</p>
      </div>

      {/* Form */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                placeholder="Enter first name"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                placeholder="Enter last name"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@example.com"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
              <div className="relative">
                <select
                  value={form.section}
                  onChange={(e) => setForm({ ...form, section: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500 appearance-none"
                >
                  <option value="">Select section</option>
                  {sections.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Session Number</label>
              <div className="relative">
                <select
                  value={form.sessionNumber}
                  onChange={(e) => setForm({ ...form, sessionNumber: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500 appearance-none"
                >
                  <option value="">Select session number</option>
                  {sessionNumbers.map(n => (
                    <option key={n} value={n}>Session {n}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Group Number</label>
              <input
                type="number"
                min="1"
                value={form.groupNumber}
                onChange={(e) => setForm({ ...form, groupNumber: e.target.value })}
                placeholder="Enter group number (e.g. 1, 2, 3...)"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
              <Check size={18} />
              Student updated successfully! Redirecting...
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Link
              href="/ta/students"
              className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || success}
              className="flex items-center gap-2 rounded-lg bg-maroon-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-maroon-700 disabled:opacity-50"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
