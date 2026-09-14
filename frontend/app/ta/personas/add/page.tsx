'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { createPersona, getAnamPersonaDetails } from '../../../services/api';

// The 9 Anam persona IDs
const ANAM_PERSONA_IDS = [
  '36908df0-128e-48c6-b2f3-cbf007707d00',
  '855745e8-056d-4848-a5a0-3752e88cdecc',
  '26981553-4601-4799-b64b-7dfa1580de8c',
  'd60a575c-705f-46b0-9a15-7955feb6fbc9',
  'f060068b-9994-4efd-964c-4f1d40e57e7a',
  '3a960932-c7d7-4463-ba71-a7507933b44a',
  'b3851e7c-8679-4daa-870d-64ccde2f1c85',
  '2bc70732-e2c1-438e-94b6-9616f699cfe5',
  '5c14742f-47d9-5024-8d92-54edc29fc502',
];

interface AnamAvatar {
  id: string;
  anamPersonaId: string;
  name: string;
  description: string;
  imageUrl?: string;
}

export default function AddPersonaPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [avatarsLoading, setAvatarsLoading] = useState(true);
  const [avatars, setAvatars] = useState<AnamAvatar[]>([]);

  // Form state
  const [selectedAvatar, setSelectedAvatar] = useState<AnamAvatar | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [sampleQuestions, setSampleQuestions] = useState<string[]>(['']);
  const [personality, setPersonality] = useState('professional');

  // Fetch avatar images on mount
  useEffect(() => {
    async function fetchAvatars() {
      setAvatarsLoading(true);
      const avatarInfos: AnamAvatar[] = [];

      for (let i = 0; i < ANAM_PERSONA_IDS.length; i++) {
        const personaId = ANAM_PERSONA_IDS[i];
        try {
          const details = await getAnamPersonaDetails(personaId);
          avatarInfos.push({
            id: `avatar-${i + 1}`,
            anamPersonaId: personaId,
            name: details.avatar?.displayName || `Avatar ${i + 1}`,
            description: details.avatar?.description || details.description || '',
            imageUrl: details.avatar?.imageUrl,
          });
        } catch (err) {
          console.warn(`Failed to fetch avatar ${i + 1}:`, err);
          avatarInfos.push({
            id: `avatar-${i + 1}`,
            anamPersonaId: personaId,
            name: `Avatar ${i + 1}`,
            description: 'Avatar image unavailable',
            imageUrl: undefined,
          });
        }
      }

      setAvatars(avatarInfos);
      setAvatarsLoading(false);
    }

    fetchAvatars();
  }, []);

  const personalityOptions = [
    { value: 'professional', label: 'Professional', description: 'Formal and business-focused' },
    { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
    { value: 'challenging', label: 'Challenging', description: 'Probing and demanding' },
    { value: 'supportive', label: 'Supportive', description: 'Encouraging and helpful' },
  ];

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

      await createPersona({
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
      console.error('Error creating persona:', error);
      setErrors({ submit: 'Failed to create persona. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in">
        <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
          <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 font-serif">Persona Created Successfully!</h2>
          <p className="mt-2 text-sm text-gray-600 font-sans">
            {name} has been added as a new AI stakeholder persona.
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
          <h1 className="text-2xl font-bold text-gray-900 font-serif">Create Persona</h1>
          <p className="text-sm text-gray-500 font-sans">Select an avatar and define the AI's behavior</p>
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
            Choose a video avatar from Anam AI. This determines the visual appearance during Q&A sessions.
          </p>

          {avatarsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-maroon-600 mr-2" />
              <span className="text-gray-500 text-sm">Loading avatars from Anam...</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {avatars.map((avatar, index) => (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => setSelectedAvatar(avatar)}
                  className={`relative rounded-xl border p-4 text-center transition-all ${selectedAvatar?.id === avatar.id
                    ? 'border-maroon-500 bg-maroon-50 ring-2 ring-maroon-500'
                    : 'border-gray-200 hover:border-maroon-200 hover:bg-gray-50'
                    }`}
                >
                  {avatar.imageUrl ? (
                    <div className={`h-14 w-14 mx-auto rounded-full overflow-hidden mb-2 ${selectedAvatar?.id === avatar.id ? 'ring-2 ring-maroon-500' : ''}`}>
                      <img
                        src={avatar.imageUrl}
                        alt={avatar.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className={`h-14 w-14 mx-auto rounded-full flex items-center justify-center text-xl font-bold mb-2 ${selectedAvatar?.id === avatar.id
                      ? 'bg-maroon-600 text-white'
                      : 'bg-gradient-to-br from-gray-200 to-gray-300 text-gray-600'
                      }`}>
                      {index + 1}
                    </div>
                  )}
                  <p className="text-xs font-medium text-gray-900">{avatar.name}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{avatar.description}</p>
                  {selectedAvatar?.id === avatar.id && (
                    <div className="absolute top-2 right-2">
                      <Check size={16} className="text-maroon-600" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
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
                className={`rounded-lg border p-3 text-left transition-all ${personality === option.value
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
            This is the most important field. It defines how the AI avatar behaves, what questions it asks, and how challenging it is.
          </p>

          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder={`Example:
You are a CFO evaluating an investment proposal. Focus on:
- Financial projections and assumptions
- Risk assessment and mitigation strategies
- ROI calculations and payback period
- Cash flow implications

Be thorough but fair. Ask follow-up questions when answers are vague. Challenge assumptions that seem overly optimistic.`}
            rows={10}
            className={`w-full rounded-lg border ${errors.systemPrompt ? 'border-red-300' : 'border-gray-200'} px-4 py-3 text-sm font-sans focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500 resize-none font-mono`}
          />
          {errors.systemPrompt && (
            <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle size={12} />
              {errors.systemPrompt}
            </p>
          )}
          <p className="mt-2 text-xs text-gray-400">
            This prompt directly controls the AI's questioning style, focus areas, and difficulty level.
          </p>
        </div>

        {/* Sample Questions */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 font-sans flex items-center gap-2">
            <MessageSquare size={16} className="text-maroon-600" />
            Sample Questions (Optional)
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Add sample questions to guide the AI's questioning style.
          </p>

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
            {isSubmitting ? 'Creating...' : 'Create Persona'}
          </button>
        </div>
      </form>
    </div>
  );
}
