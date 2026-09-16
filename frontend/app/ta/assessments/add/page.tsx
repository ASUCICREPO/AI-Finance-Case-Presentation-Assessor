'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Upload,
  X,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { createAssessment, listPersonas, Persona } from '../../../services/api';

// Session numbers and group numbers for assignment
const sessionNumbers = ['1', '2', '3', '4', '5'];
const groupNumbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

export default function AddAssessmentPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [personas, setPersonas] = useState<Persona[]>([]);

  // Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    personaId: '',
    dueDate: '',
    duration: 15,
    status: 'draft' as 'draft' | 'published',
  });

  // Session/Group assignment
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  // File upload
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  useEffect(() => {
    fetchPersonas();
  }, []);

  async function fetchPersonas() {
    try {
      const data = await listPersonas();
      setPersonas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching personas:', err);
    }
  }

  const toggleSession = (sessionNum: string) => {
    setSelectedSessions(prev =>
      prev.includes(sessionNum)
        ? prev.filter(s => s !== sessionNum)
        : [...prev, sessionNum]
    );
  };

  const toggleGroup = (groupNum: string) => {
    setSelectedGroups(prev =>
      prev.includes(groupNum)
        ? prev.filter(g => g !== groupNum)
        : [...prev, groupNum]
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!form.title.trim()) newErrors.title = 'Title is required';
    if (!form.dueDate) newErrors.dueDate = 'Due date is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await createAssessment({
        title: form.title,
        description: form.description,
        caseName: form.title,
        personaId: form.personaId || undefined,
        dueDate: form.dueDate,
        duration: form.duration,
        assignedSessions: selectedSessions,
        assignedGroups: selectedGroups,
        status: form.status,
        materials: uploadedFiles.map(f => ({
          name: f.name,
          s3Key: '',
          type: f.type,
          uploadedAt: new Date().toISOString(),
        })),
      });
      setShowSuccess(true);
      setTimeout(() => {
        router.push('/ta/assessments');
      }, 2000);
    } catch (error) {
      console.error('Error creating assessment:', error);
      alert('Failed to create assessment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in">
        <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
          <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 font-serif">Assessment Created!</h2>
          <p className="mt-2 text-sm text-gray-600 font-sans">
            Your assessment has been created and assigned to the selected sessions/groups.
          </p>
          <p className="mt-4 text-sm text-gray-500 font-sans">
            Redirecting to Assessments...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/ta/assessments"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={16} />
          Back to Assessments
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 font-serif">Add Assessment</h1>
        <p className="text-sm text-gray-500 font-sans">Create a new case assessment</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          {/* Title */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Assessment Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., Real Estate Investment Analysis"
              className={`w-full rounded-lg border ${errors.title ? 'border-red-300' : 'border-gray-200'} px-4 py-2.5 text-sm text-gray-900 bg-white focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500`}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.title}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Brief description of the assessment..."
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 bg-white focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
            />
          </div>

          {/* Persona - Native Select */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              AI Persona (optional)
            </label>
            <select
              value={form.personaId}
              onChange={(e) => setForm({ ...form, personaId: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 bg-white focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
            >
              <option value="">Select persona (optional)</option>
              {personas.map((p) => (
                <option key={p.personaID} value={p.personaID}>
                  {p.name} - {p.role}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-5">
            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className={`w-full rounded-lg border ${errors.dueDate ? 'border-red-300' : 'border-gray-200'} px-4 py-2.5 text-sm text-gray-900 bg-white focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500`}
              />
              {errors.dueDate && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.dueDate}
                </p>
              )}
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 15 })}
                min={5}
                max={60}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 bg-white focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
              />
            </div>
          </div>

          {/* Session Numbers - Checkbox Grid */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign to Session Numbers
            </label>
            <p className="text-xs text-gray-500 mb-2">Leave all unchecked to assign to all sessions</p>
            <div className="flex flex-wrap gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              {sessionNumbers.map((num) => (
                <label
                  key={num}
                  className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-md border border-gray-200 hover:border-maroon-300 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedSessions.includes(num)}
                    onChange={() => toggleSession(num)}
                    className="h-4 w-4 rounded border-gray-300 text-maroon-600 focus:ring-maroon-500"
                  />
                  <span className="text-sm text-gray-900">Session {num}</span>
                </label>
              ))}
            </div>
            {selectedSessions.length > 0 && (
              <p className="mt-2 text-xs text-blue-600">
                Selected: {selectedSessions.map(s => `Session ${s}`).join(', ')}
              </p>
            )}
          </div>

          {/* Group Numbers - Checkbox Grid */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign to Group Numbers
            </label>
            <p className="text-xs text-gray-500 mb-2">Leave all unchecked to assign to all groups</p>
            <div className="flex flex-wrap gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              {groupNumbers.map((num) => (
                <label
                  key={num}
                  className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-md border border-gray-200 hover:border-maroon-300 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedGroups.includes(num)}
                    onChange={() => toggleGroup(num)}
                    className="h-4 w-4 rounded border-gray-300 text-maroon-600 focus:ring-maroon-500"
                  />
                  <span className="text-sm text-gray-900">Group {num}</span>
                </label>
              ))}
            </div>
            {selectedGroups.length > 0 && (
              <p className="mt-2 text-xs text-green-600">
                Selected: {selectedGroups.map(g => `Group ${g}`).join(', ')}
              </p>
            )}
          </div>

          {/* Status */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Status
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  checked={form.status === 'draft'}
                  onChange={() => setForm({ ...form, status: 'draft' })}
                  className="h-4 w-4 border-gray-300 text-maroon-600"
                />
                <span className="text-sm text-gray-900">Draft</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  checked={form.status === 'published'}
                  onChange={() => setForm({ ...form, status: 'published' })}
                  className="h-4 w-4 border-gray-300 text-maroon-600"
                />
                <span className="text-sm text-gray-900">Published (visible to students)</span>
              </label>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Case Materials
            </label>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-maroon-300 transition-colors">
              <Upload size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-600 mb-1">Drag and drop files here, or</p>
              <label className="cursor-pointer">
                <span className="text-sm font-medium text-maroon-600 hover:underline">browse to upload</span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                />
              </label>
              <p className="text-xs text-gray-400 mt-2">PDF, DOC, XLS, PPT up to 10MB each</p>
            </div>
            {uploadedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {uploadedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <span className="text-xs text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button type="button" onClick={() => removeFile(idx)} className="p-1 hover:bg-gray-200 rounded">
                      <X size={14} className="text-gray-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 text-sm font-medium text-white bg-maroon-600 rounded-lg hover:bg-maroon-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            Create Assessment
          </button>
        </div>
      </form>
    </div>
  );
}
