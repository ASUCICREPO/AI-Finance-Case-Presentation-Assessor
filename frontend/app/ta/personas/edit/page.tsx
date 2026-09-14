'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  User,
  Briefcase,
  MessageSquare,
  Plus,
  X,
  Sparkles,
  Brain,
  Bot,
  Check,
  Loader2,
} from 'lucide-react';
import { getPersona, updatePersona, Persona } from '../../../services/api';

// The 9 Anam avatars available
interface AnamAvatar {
  id: string;
  anamPersonaId: string;
  name: string;
  description: string;
}

const ANAM_AVATARS: AnamAvatar[] = [
  { id: 'avatar-1', anamPersonaId: '36908df0-128e-48c6-b2f3-cbf007707d00', name: 'Avatar 1', description: 'Professional, neutral' },
  { id: 'avatar-2', anamPersonaId: '855745e8-056d-4848-a5a0-3752e88cdecc', name: 'Avatar 2', description: 'Friendly, approachable' },
  { id: 'avatar-3', anamPersonaId: '26981553-4601-4799-b64b-7dfa1580de8c', name: 'Avatar 3', description: 'Authoritative, executive' },
  { id: 'avatar-4', anamPersonaId: 'd60a575c-705f-46b0-9a15-7955feb6fbc9', name: 'Avatar 4', description: 'Warm, conversational' },
  { id: 'avatar-5', anamPersonaId: 'f060068b-9994-4efd-964c-4f1d40e57e7a', name: 'Avatar 5', description: 'Technical, analytical' },
  { id: 'avatar-6', anamPersonaId: '3a960932-c7d7-4463-ba71-a7507933b44a', name: 'Avatar 6', description: 'Formal, precise' },
  { id: 'avatar-7', anamPersonaId: 'b3851e7c-8679-4daa-870d-64ccde2f1c85', name: 'Avatar 7', description: 'Supportive, encouraging' },
  { id: 'avatar-8', anamPersonaId: '2bc70732-e2c1-438e-94b6-9616f699cfe5', name: 'Avatar 8', description: 'Strategic, big-picture' },
  { id: 'avatar-9', anamPersonaId: '5c14742f-47d9-5024-8d92-54edc29fc502', name: 'Avatar 9', description: 'Pragmatic, action-oriented' },
];

export default function EditPersonaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const personaId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [selectedAvatar, setSelectedAvatar] = useState<AnamAvatar | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [sampleQuestions, setSampleQuestions] = useState<string[]>(['']);
  const [personality, setPersonality] = useState('professional');

  const personalityOptions = [
    { value: 'professional', label: 'Professional', description: 'Formal and business-focused' },
    { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
    { value: 'challenging', label: 'Challenging', description: 'Probing and demanding' },
    { value: 'supportive', label: 'Supportive', description: 'Encouraging and helpful' },
  ];

  useEffect(() => {
    if (personaId) {
      fetchPersona();
    }
  }, [personaId]);

  async function fetchPersona() {
    try {
      setLoading(true);
      const persona = await getPersona(personaId!);
      
      // Populate form
      setName(persona.name || '');
      setRole(persona.role || '');
      setDescription(persona.description || '');
      setSystemPrompt(persona.systemPrompt || '');
      setIsActive(persona.active !== false);
      setSampleQuestions(persona.questionBank?.length ? persona.questionBank : ['']);
      setPersonality(persona.assessmentFocus?.[0] || 'professional');
      
      // Find matching avatar
      if (persona.avatarId) {
        const avatar = ANAM_AVATARS.find(a => a.id === persona.avatarId);
        if (avatar) setSelectedAvatar(avatar);
      } else if (persona.anamPersonaId) {
        const avatar = ANAM_AVATARS.find(a => a.anamPersonaId === persona.anamPersonaId);
        if (avatar) setSelectedAvatar(avatar);
      }
    } catch (err) {
      console.error('Error fetching persona:', err);
      setErrors({ load: 'Failed to load persona' });
    } finally {
      setLoading(false);
    }
  }

  const addQuestion = () => {
    setSampleQuestions([...sampleQuestions, '']);
  };

  const updateQuestion = (index: number, value: string) => {
    const updated = [...sampleQuestions];
    updated[index] = value;
    setSampleQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setSampleQuestions(sampleQuestions.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedAvatar) newErrors.avatar = 'Please select an avatar';
    if (!name.trim()) newErrors.name = 'Persona name is required';
    if (!role.trim()) newErrors.role = 'Role/Title is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!systemPrompt.trim()) newErrors.systemPrompt = 'System prompt is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const filteredQuestions = sampleQuestions.filter((q) => q.trim());

      await updatePersona(personaId!, {
        name,
        role,
        description,
        systemPrompt,
        questionBank: filteredQuestions,
        assessmentFocus: [personality],
        active: isActive,
        anamPersonaId: selectedAvatar?.anamPersonaId,
        avatarId: selectedAvatar?.id,
      });

      setShowSuccess(true);
      setTimeout(() => {
        router.push('/ta/personas');
      }, 2000);
    } catch (error) {
      console.error('Error updating persona:', error);
      setErrors({ submit: 'Failed to update persona. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-maroon-600" />
      </div>
    );
  }

  if (errors.load) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 font-serif">Error Loading Persona</h2>
          <p className="mt-2 text-sm text-gray-600">{errors.load}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-maroon-600 text-white rounded-lg hover:bg-maroon-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in">
        <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
          <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 font-serif">Persona Updated Successfully!</h2>
          <p className="mt-2 text-sm text-gray-600 font-sans">
            {name} has been updated.
          </p>
          <p className="mt-4 text-sm text-gray-500 font-sans">
            Redirecting to Avatar Configuration...
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
          <h1 className="text-2xl font-bold text-gray-900 font-serif">Edit Persona</h1>
          <p className="text-sm text-gray-500 font-sans">Update avatar and AI behavior settings</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar Selection */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 font-sans flex items-center gap-2">
            <Bot size={16} className="text-maroon-600" />
            Select Anam Avatar <span className="text-red-500">*</span>
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Choose a video avatar from Anam AI.
          </p>

          <div className="grid grid-cols-3 gap-3">
            {ANAM_AVATARS.map((avatar, index) => (
              <button
                key={avatar.id}
                type="button"
                onClick={() => setSelectedAvatar(avatar)}
                className={`relative rounded-xl border p-4 text-center transition-all ${
                  selectedAvatar?.id === avatar.id
                    ? 'border-maroon-500 bg-maroon-50 ring-2 ring-maroon-500'
                    : 'border-gray-200 hover:border-maroon-200 hover:bg-gray-50'
                }`}
              >
                <div className={`h-14 w-14 mx-auto rounded-full flex items-center justify-center text-xl font-bold mb-2 ${
                  selectedAvatar?.id === avatar.id
                    ? 'bg-maroon-600 text-white'
                    : 'bg-gradient-to-br from-gray-200 to-gray-300 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                <p className="text-xs font-medium text-gray-900">{avatar.name}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{avatar.description}</p>
                {selectedAvatar?.id === avatar.id && (
                  <div className="absolute top-2 right-2">
                    <Check size={16} className="text-maroon-600" />
                  </div>
                )}
              </button>
            ))}
          </div>
          {errors.avatar && (
            <p className="mt-3 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle size={12} />
              {errors.avatar}
            </p>
          )}
        </div>

        {/* Basic Information */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 font-sans flex items-center gap-2">
            <User size={16} className="text-maroon-600" />
            Persona Information
          </h2>

          {/* Name */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5 font-sans">
              Persona Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., John Smith - CFO"
              className={`w-full rounded-lg border ${errors.name ? 'border-red-300' : 'border-gray-200'} px-4 py-2.5 text-sm font-sans focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500`}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} />
                {errors.name}
              </p>
            )}
          </div>

          {/* Role */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5 font-sans">
              Role / Title <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g., Chief Financial Officer"
                className={`w-full rounded-lg border ${errors.role ? 'border-red-300' : 'border-gray-200'} pl-10 pr-4 py-2.5 text-sm font-sans focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500`}
              />
            </div>
            {errors.role && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} />
                {errors.role}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5 font-sans">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this persona's background and expertise..."
              rows={3}
              className={`w-full rounded-lg border ${errors.description ? 'border-red-300' : 'border-gray-200'} px-4 py-2.5 text-sm font-sans focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500 resize-none`}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} />
                {errors.description}
              </p>
            )}
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 font-sans">Active Status</p>
              <p className="text-xs text-gray-500">Inactive personas won't appear in assessments</p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-maroon-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* Personality Type */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 font-sans flex items-center gap-2">
            <Sparkles size={16} className="text-maroon-600" />
            Personality Type
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {personalityOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPersonality(option.value)}
                className={`rounded-lg border p-3 text-left transition-all ${
                  personality === option.value
                    ? 'border-maroon-500 bg-maroon-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className={`text-sm font-medium ${personality === option.value ? 'text-maroon-700' : 'text-gray-900'}`}>
                  {option.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* System Prompt */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 font-sans flex items-center gap-2">
            <Brain size={16} className="text-maroon-600" />
            Custom System Prompt <span className="text-red-500">*</span>
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            This defines how the AI avatar behaves, what questions it asks, and how challenging it is.
          </p>

          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Enter the system prompt..."
            rows={10}
            className={`w-full rounded-lg border ${errors.systemPrompt ? 'border-red-300' : 'border-gray-200'} px-4 py-3 text-sm font-sans focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500 resize-none font-mono`}
          />
          {errors.systemPrompt && (
            <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle size={12} />
              {errors.systemPrompt}
            </p>
          )}
        </div>

        {/* Sample Questions */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 font-sans flex items-center gap-2">
            <MessageSquare size={16} className="text-maroon-600" />
            Sample Questions (Optional)
          </h2>

          <div className="space-y-3">
            {sampleQuestions.map((question, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 text-xs font-medium text-gray-600 shrink-0">
                  {index + 1}
                </span>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => updateQuestion(index, e.target.value)}
                  placeholder="Enter a sample question..."
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-sans focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
                />
                {sampleQuestions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQuestion(index)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={16} className="text-gray-400" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addQuestion}
            className="mt-3 flex items-center gap-2 text-sm font-medium text-maroon-600 hover:text-maroon-700"
          >
            <Plus size={16} />
            Add Question
          </button>
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
            className="px-4 py-2.5 text-sm font-medium text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors font-sans"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 text-sm font-medium text-white bg-maroon-600 rounded-lg hover:bg-maroon-700 transition-colors font-sans disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
