'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Upload,
  X,
  FileText,
  CheckCircle,
  ChevronDown,
  AlertCircle,
  Loader2,
  Save,
} from 'lucide-react';
import {
  getAssessment,
  updateAssessment,
  listPersonas,
  Persona,
  Assessment,
} from '../../../services/api';

// Session numbers and group numbers for assignment
const sessionNumbers = ['1', '2', '3', '4', '5'];
const groupNumbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

const modules = [
  'Module 1: Introduction to Finance',
  'Module 2: Investment Strategies',
  'Module 3: Risk Analysis',
  'Module 4: Portfolio Management',
  'Module 5: Financial Modeling',
];

export default function EditAssessmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assessmentId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [personas, setPersonas] = useState<Persona[]>([]);

  // Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    module: '',
    personaId: '',
    dueDate: '',
    duration: 15,
    status: 'draft' as 'draft' | 'published' | 'closed',
  });

  // Session/Group assignment
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  // Dropdown states
  const [moduleOpen, setModuleOpen] = useState(false);
  const [personaOpen, setPersonaOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);

  // File upload
  const [existingFiles, setExistingFiles] = useState<Array<{ name: string; s3Key: string; type: string }>>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!assessmentId) {
      router.push('/ta/assessments');
      return;
    }
    fetchAssessment();
    fetchPersonas();
  }, [assessmentId]);

  async function fetchAssessment() {
    try {
      setLoading(true);
      const assessment = await getAssessment(assessmentId!);
      
      setForm({
        title: assessment.title || assessment.caseName || '',
        description: assessment.description || '',
        module: assessment.module || '',
        personaId: assessment.personaId || '',
        dueDate: assessment.dueDate ? assessment.dueDate.split('T')[0] : '',
        duration: assessment.duration || 15,
        status: assessment.status || 'draft',
      });
      
      setSelectedSessions(assessment.assignedSessions || []);
      setSelectedGroups(assessment.assignedGroups || []);
      setExistingFiles(assessment.materials || []);
    } catch (err) {
      console.error('Error fetching assessment:', err);
      setErrors({ load: 'Failed to load assessment' });
    } finally {
      setLoading(false);
    }
  }

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
      setNewFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeNewFile = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingFile = (index: number) => {
    setExistingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!form.title.trim()) newErrors.title = 'Title is required';
    if (!form.module) newErrors.module = 'Module is required';
    if (!form.dueDate) newErrors.dueDate = 'Due date is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Combine existing and new materials
      const allMaterials = [
        ...existingFiles,
        ...newFiles.map(f => ({
          name: f.name,
          s3Key: '', // Would be populated after S3 upload
          type: f.type,
          uploadedAt: new Date().toISOString(),
        })),
      ];

      await updateAssessment(assessmentId!, {
        title: form.title,
        description: form.description,
        caseName: form.title,
        module: form.module,
        personaId: form.personaId || undefined,
        dueDate: form.dueDate,
        duration: form.duration,
        assignedSessions: selectedSessions,
        assignedGroups: selectedGroups,
        status: form.status,
        materials: allMaterials,
      });
      
      setShowSuccess(true);
      setTimeout(() => {
        router.push('/ta/assessments');
      }, 2000);
    } catch (error) {
      console.error('Error updating assessment:', error);
      setErrors({ submit: 'Failed to update assessment. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setModuleOpen(false);
      setPersonaOpen(false);
      setSessionsOpen(false);
      setGroupsOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={32} className="animate-spin text-maroon-600" />
      </div>
    );
  }

  if (errors.load) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 font-serif">Error Loading Assessment</h2>
          <p className="mt-2 text-sm text-gray-600">{errors.load}</p>
          <Link
            href="/ta/assessments"
            className="mt-4 inline-flex items-center gap-2 text-maroon-600 hover:underline"
          >
            <ArrowLeft size={16} />
            Back to Assessments
          </Link>
        </div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in">
        <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
          <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 font-serif">Assessment Updated!</h2>
          <p className="mt-2 text-sm text-gray-600 font-sans">
            Your changes have been saved successfully.
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
        <h1 className="text-2xl font-bold text-gray-900 font-serif">Edit Assessment</h1>
        <p className="text-sm text-gray-500 font-sans">Update assessment details</p>
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
              className={`w-full rounded-lg border ${errors.title ? 'border-red-300' : 'border-gray-200'} px-4 py-2.5 text-sm focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500`}
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
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
            />
          </div>

          {/* Module */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Module <span className="text-red-500">*</span>
            </label>
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setModuleOpen(!moduleOpen)}
                className={`w-full flex items-center justify-between rounded-lg border ${errors.module ? 'border-red-300' : 'border-gray-200'} px-4 py-2.5 text-sm`}
              >
                <span className={form.module ? 'text-gray-900' : 'text-gray-400'}>
                  {form.module || 'Select module'}
                </span>
                <ChevronDown size={16} className="text-gray-400" />
              </button>
              {moduleOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg z-20 max-h-48 overflow-y-auto">
                  {modules.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { setForm({ ...form, module: m }); setModuleOpen(false); }}
                      className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 ${form.module === m ? 'bg-maroon-50 text-maroon-700' : ''}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.module && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.module}
              </p>
            )}
          </div>

          {/* Persona */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              AI Persona (optional)
            </label>
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setPersonaOpen(!personaOpen)}
                className="w-full flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2.5 text-sm"
              >
                <span className={form.personaId ? 'text-gray-900' : 'text-gray-400'}>
                  {personas.find(p => p.personaID === form.personaId)?.name || 'Select persona'}
                </span>
                <ChevronDown size={16} className="text-gray-400" />
              </button>
              {personaOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg z-20 max-h-48 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => { setForm({ ...form, personaId: '' }); setPersonaOpen(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 text-gray-400"
                  >
                    No persona
                  </button>
                  {personas.map((p) => (
                    <button
                      key={p.personaID}
                      type="button"
                      onClick={() => { setForm({ ...form, personaId: p.personaID }); setPersonaOpen(false); }}
                      className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 ${form.personaId === p.personaID ? 'bg-maroon-50 text-maroon-700' : ''}`}
                    >
                      {p.name} - {p.role}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
                className={`w-full rounded-lg border ${errors.dueDate ? 'border-red-300' : 'border-gray-200'} px-4 py-2.5 text-sm`}
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
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm"
              />
            </div>
          </div>

          {/* Session Numbers Assignment */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Assign to Session Numbers
            </label>
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setSessionsOpen(!sessionsOpen)}
                className="w-full flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2.5 text-sm"
              >
                <span className={selectedSessions.length > 0 ? 'text-gray-900' : 'text-gray-400'}>
                  {selectedSessions.length > 0
                    ? `${selectedSessions.length} session(s) selected`
                    : 'All sessions (leave empty for all)'}
                </span>
                <ChevronDown size={16} className="text-gray-400" />
              </button>
              {sessionsOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg z-20 max-h-48 overflow-y-auto">
                  {sessionNumbers.map((num) => (
                    <label key={num} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSessions.includes(num)}
                        onChange={() => toggleSession(num)}
                        className="h-4 w-4 rounded border-gray-300 text-maroon-600"
                      />
                      <span className="text-sm">Session {num}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {selectedSessions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedSessions.map(s => (
                  <span key={s} className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    Session {s}
                    <button type="button" onClick={() => toggleSession(s)}><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Group Numbers Assignment */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Assign to Group Numbers
            </label>
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setGroupsOpen(!groupsOpen)}
                className="w-full flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2.5 text-sm"
              >
                <span className={selectedGroups.length > 0 ? 'text-gray-900' : 'text-gray-400'}>
                  {selectedGroups.length > 0
                    ? `${selectedGroups.length} group(s) selected`
                    : 'All groups (leave empty for all)'}
                </span>
                <ChevronDown size={16} className="text-gray-400" />
              </button>
              {groupsOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg z-20 max-h-48 overflow-y-auto">
                  {groupNumbers.map((num) => (
                    <label key={num} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedGroups.includes(num)}
                        onChange={() => toggleGroup(num)}
                        className="h-4 w-4 rounded border-gray-300 text-maroon-600"
                      />
                      <span className="text-sm">Group {num}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {selectedGroups.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedGroups.map(g => (
                  <span key={g} className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    Group {g}
                    <button type="button" onClick={() => toggleGroup(g)}><X size={12} /></button>
                  </span>
                ))}
              </div>
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
                <span className="text-sm">Draft</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  checked={form.status === 'published'}
                  onChange={() => setForm({ ...form, status: 'published' })}
                  className="h-4 w-4 border-gray-300 text-maroon-600"
                />
                <span className="text-sm">Published</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  checked={form.status === 'closed'}
                  onChange={() => setForm({ ...form, status: 'closed' })}
                  className="h-4 w-4 border-gray-300 text-maroon-600"
                />
                <span className="text-sm">Closed</span>
              </label>
            </div>
          </div>

          {/* Existing Files */}
          {existingFiles.length > 0 && (
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Existing Materials
              </label>
              <div className="space-y-2">
                {existingFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-700">{file.name}</span>
                    </div>
                    <button type="button" onClick={() => removeExistingFile(idx)} className="p-1 hover:bg-gray-200 rounded">
                      <X size={14} className="text-gray-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Add New Materials
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
            {newFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {newFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <span className="text-xs text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button type="button" onClick={() => removeNewFile(idx)} className="p-1 hover:bg-gray-200 rounded">
                      <X size={14} className="text-gray-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle size={16} />
            {errors.submit}
          </div>
        )}

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
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
