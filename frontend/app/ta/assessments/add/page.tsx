'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Upload,
  X,
  FileText,
  CheckCircle,
  Users,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';

const API_BASE = 'https://0q9blbq2gc.execute-api.us-east-1.amazonaws.com/prod';

interface Group {
  groupId: string;
  groupName: string;
  section: string;
}

export default function AddCasePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [caseName, setCaseName] = useState('');
  const [module, setModule] = useState('');
  const [persona, setPersona] = useState('');
  const [session, setSession] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // Dropdown open states
  const [sessionOpen, setSessionOpen] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [personaOpen, setPersonaOpen] = useState(false);
  const [moduleOpen, setModuleOpen] = useState(false);

  // Available options
  const sessions = ['Spring 2026', 'Fall 2026', 'Spring 2027'];
  const modules = [
    'Module 1: Introduction to Finance',
    'Module 2: Investment Strategies',
    'Module 3: Risk Analysis',
    'Module 4: Portfolio Management',
    'Module 5: Financial Modeling',
  ];
  const personas = [
    'Financial Analyst',
    'Investment Banker',
    'Portfolio Manager',
    'Risk Analyst',
    'CFO',
  ];
  const availableGroups: Group[] = [
    { groupId: 'g1', groupName: 'Group 1', section: 'Section A' },
    { groupId: 'g2', groupName: 'Group 2', section: 'Section A' },
    { groupId: 'g3', groupName: 'Group 3', section: 'Section A' },
    { groupId: 'g4', groupName: 'Group 4', section: 'Section B' },
    { groupId: 'g5', groupName: 'Group 5', section: 'Section B' },
    { groupId: 'g6', groupName: 'Group 6', section: 'Section B' },
  ];

  const toggleGroup = (groupId: string) => {
    setSelectedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!caseName.trim()) newErrors.caseName = 'Case name is required';
    if (!module) newErrors.module = 'Module is required';
    if (!session) newErrors.session = 'Session is required';
    if (!dueDate) newErrors.dueDate = 'Due date is required';
    if (selectedGroups.length === 0) newErrors.groups = 'At least one group must be selected';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setShowSuccess(true);
      setTimeout(() => {
        router.push('/ta/assessments');
      }, 2000);
    } catch (error) {
      console.error('Error creating case:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setSessionOpen(false);
      setGroupsOpen(false);
      setPersonaOpen(false);
      setModuleOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (showSuccess) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in">
        <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
          <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 font-serif">Case Created Successfully!</h2>
          <p className="mt-2 text-sm text-gray-600 font-sans">
            Your case assessment has been created and assigned to the selected groups.
          </p>
          <p className="mt-4 text-sm text-gray-500 font-sans">
            Redirecting to Case Assessments...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">Add Case</h1>
          <p className="text-sm text-gray-500 font-sans">Create a new case assessment</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          {/* Case Name */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5 font-sans">
              Case Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={caseName}
              onChange={(e) => setCaseName(e.target.value)}
              placeholder="Enter case study name"
              className={`w-full rounded-lg border ${errors.caseName ? 'border-red-300' : 'border-gray-200'} px-4 py-2.5 text-sm font-sans focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500`}
            />
            {errors.caseName && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} />
                {errors.caseName}
              </p>
            )}
          </div>

          {/* Module Dropdown */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5 font-sans">
              Module <span className="text-red-500">*</span>
            </label>
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setModuleOpen(!moduleOpen)}
                className={`w-full flex items-center justify-between rounded-lg border ${errors.module ? 'border-red-300' : 'border-gray-200'} px-4 py-2.5 text-sm font-sans focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500`}
              >
                <span className={module ? 'text-gray-900' : 'text-gray-400'}>
                  {module || 'Select module'}
                </span>
                <ChevronDown size={16} className="text-gray-400" />
              </button>
              {moduleOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg z-20 max-h-48 overflow-y-auto">
                  {modules.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setModule(m);
                        setModuleOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 font-sans"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.module && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} />
                {errors.module}
              </p>
            )}
          </div>

          {/* Persona Dropdown */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5 font-sans">
              Persona
            </label>
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setPersonaOpen(!personaOpen)}
                className="w-full flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-sans focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
              >
                <span className={persona ? 'text-gray-900' : 'text-gray-400'}>
                  {persona || 'Select persona (optional)'}
                </span>
                <ChevronDown size={16} className="text-gray-400" />
              </button>
              {personaOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg z-20 max-h-48 overflow-y-auto">
                  {personas.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setPersona(p);
                        setPersonaOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 font-sans"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Session Dropdown */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5 font-sans">
              Session <span className="text-red-500">*</span>
            </label>
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setSessionOpen(!sessionOpen)}
                className={`w-full flex items-center justify-between rounded-lg border ${errors.session ? 'border-red-300' : 'border-gray-200'} px-4 py-2.5 text-sm font-sans focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500`}
              >
                <span className={session ? 'text-gray-900' : 'text-gray-400'}>
                  {session || 'Select session'}
                </span>
                <ChevronDown size={16} className="text-gray-400" />
              </button>
              {sessionOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg z-20">
                  {sessions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setSession(s);
                        setSessionOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 font-sans"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.session && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} />
                {errors.session}
              </p>
            )}
          </div>

          {/* Due Date */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5 font-sans">
              Due Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={`w-full rounded-lg border ${errors.dueDate ? 'border-red-300' : 'border-gray-200'} px-4 py-2.5 text-sm font-sans focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500`}
            />
            {errors.dueDate && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} />
                {errors.dueDate}
              </p>
            )}
          </div>

          {/* Groups Selection */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5 font-sans">
              Assign Groups <span className="text-red-500">*</span>
            </label>
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setGroupsOpen(!groupsOpen)}
                className={`w-full flex items-center justify-between rounded-lg border ${errors.groups ? 'border-red-300' : 'border-gray-200'} px-4 py-2.5 text-sm font-sans focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500`}
              >
                <span className={selectedGroups.length > 0 ? 'text-gray-900' : 'text-gray-400'}>
                  {selectedGroups.length > 0
                    ? `${selectedGroups.length} group(s) selected`
                    : 'Select groups'}
                </span>
                <ChevronDown size={16} className="text-gray-400" />
              </button>
              {groupsOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg z-20 max-h-48 overflow-y-auto">
                  {availableGroups.map((group) => (
                    <label
                      key={group.groupId}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedGroups.includes(group.groupId)}
                        onChange={() => toggleGroup(group.groupId)}
                        className="h-4 w-4 rounded border-gray-300 text-maroon-600 focus:ring-maroon-500"
                      />
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-gray-400" />
                        <span className="text-sm font-sans">{group.groupName}</span>
                        <span className="text-xs text-gray-400">• {group.section}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {errors.groups && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} />
                {errors.groups}
              </p>
            )}
            {/* Selected Groups Chips */}
            {selectedGroups.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedGroups.map((groupId) => {
                  const group = availableGroups.find((g) => g.groupId === groupId);
                  return (
                    <span
                      key={groupId}
                      className="inline-flex items-center gap-1 rounded-full bg-maroon-50 px-3 py-1 text-xs font-medium text-maroon-700"
                    >
                      {group?.groupName}
                      <button
                        type="button"
                        onClick={() => toggleGroup(groupId)}
                        className="ml-1 hover:text-maroon-900"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 font-sans">
              Case Materials
            </label>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-maroon-300 transition-colors">
              <Upload size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-600 font-sans mb-1">
                Drag and drop files here, or
              </p>
              <label className="cursor-pointer">
                <span className="text-sm font-medium text-maroon-600 hover:underline">
                  browse to upload
                </span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                />
              </label>
              <p className="text-xs text-gray-400 mt-2">
                PDF, DOC, XLS, PPT up to 10MB each
              </p>
            </div>
            {/* Uploaded Files */}
            {uploadedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {uploadedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-700 font-sans">{file.name}</span>
                      <span className="text-xs text-gray-400">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
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
            className="px-4 py-2.5 text-sm font-medium text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors font-sans"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 text-sm font-medium text-white bg-maroon-600 rounded-lg hover:bg-maroon-700 transition-colors font-sans disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Case'}
          </button>
        </div>
      </form>
    </div>
  );
}
