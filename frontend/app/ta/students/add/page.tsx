'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Upload,
  Cloud,
  FileSpreadsheet,
  Trash2,
  Check,
  Loader2,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { createStudent, bulkImportStudents, Student } from '../../../services/api';

// Sample sessions for dropdown
const sessions = [
  'Morning Section - FIN 421',
  'Afternoon FIN 425',
  'Evening FIN 426',
];

// Session numbers (class periods) and group numbers
const sessionNumbers = ['1', '2', '3', '4', '5'];
const groupNumbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

export default function AddStudentPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'individual' | 'upload'>('individual');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Individual form state
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    section: '',
    sessionNumber: '',
    groupNumber: '',
  });

  // Upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleIndividualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await createStudent({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        section: form.section,
        sessionNumber: form.sessionNumber || undefined,
        groupNumber: form.groupNumber || undefined,
        loginId: form.email.split('@')[0],
      });
      setSuccess(true);
      // Reset form after short delay
      setTimeout(() => {
        setForm({ firstName: '', lastName: '', email: '', section: '', sessionNumber: '', groupNumber: '' });
        setSuccess(false);
      }, 2000);
    } catch (err) {
      alert('Failed to add student. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      // Simulate upload progress
      setUploadProgress(0);
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setUploadComplete(true);
            return 100;
          }
          return prev + 20;
        });
      }, 200);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
      setUploadedFile(file);
      setUploadProgress(100);
      setUploadComplete(true);
    }
  }

  function removeFile() {
    setUploadedFile(null);
    setUploadProgress(0);
    setUploadComplete(false);
  }

  async function handleUploadSubmit() {
    if (!uploadedFile) return;

    setLoading(true);
    try {
      // In a real implementation, you'd parse the file and call bulkImportStudents
      // For now, we'll show a success message
      alert('File uploaded successfully! Students will be imported.');
      router.push('/ta/students');
    } catch (err) {
      alert('Failed to import students. Please try again.');
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
          <h1 className="text-2xl font-bold text-gray-900 font-serif">Add Student</h1>
          <p className="mt-1 text-sm text-gray-500">Student details</p>
        </div>
        <p className="text-sm text-gray-400">Last updated: {lastUpdated}</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setActiveTab('individual')}
          className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'individual'
            ? 'bg-maroon-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
        >
          Add Individually
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === 'upload'
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
              <p className="text-sm text-gray-500">Enter one student at a time</p>
            </div>

            <form onSubmit={handleIndividualSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
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
                      <option value="">e.g. Morning Section - FIN 421</option>
                      {sessions.map(s => (
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
                  <div className="relative">
                    <select
                      value={form.groupNumber}
                      onChange={(e) => setForm({ ...form, groupNumber: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500 appearance-none"
                    >
                      <option value="">Select group number</option>
                      {groupNumbers.map(n => (
                        <option key={n} value={n}>Group {n}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Success Message */}
              {success && (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                  <Check size={18} />
                  Student has been added successfully!
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Add Student
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Upload a file</h2>
              <p className="text-sm text-gray-500">Supported formats: XLS, XLSX, CSV</p>
            </div>

            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-maroon-400 transition-colors"
            >
              <Cloud size={40} className="mx-auto text-gray-400 mb-3" />
              <p className="text-sm text-gray-700 mb-1">
                Choose a file or drag & drop it here.
              </p>
              <p className="text-xs text-gray-500 mb-4">Up to 50 MB.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xls,.xlsx,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg bg-maroon-600 px-6 py-2 text-sm font-medium text-white hover:bg-maroon-700"
              >
                Browse File
              </button>
            </div>

            {/* Uploaded File */}
            {uploadedFile && (
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                <div className="flex items-center justify-center w-10 h-10 rounded bg-green-100">
                  <FileSpreadsheet size={20} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{uploadedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(uploadedFile.size / 1024).toFixed(0)} KB of {(uploadedFile.size / 1024).toFixed(0)} KB
                    {uploadComplete && (
                      <span className="text-green-600 ml-2">
                        <Check size={12} className="inline" /> Completed
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={removeFile}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <Trash2 size={16} className="text-gray-400" />
                </button>
              </div>
            )}

            {uploadedFile && uploadComplete && (
              <div className="flex justify-end pt-4">
                <button
                  onClick={handleUploadSubmit}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Import Students
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
