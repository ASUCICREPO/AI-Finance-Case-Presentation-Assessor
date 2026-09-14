'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { createPersona } from '../../../services/api';

export default function AddPersonaPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
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
      // Filter out empty questions
      const filteredQuestions = sampleQuestions.filter((q) => q.trim());

      await createPersona({
        name,
        role,
        description,
        systemPrompt,
        questionBank: filteredQuestions,
        assessmentFocus: [personality],
        active: isActive,
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
            {name} has been added as a new stakeholder persona.
          </p>
          <p className="mt-4 text-sm text-gray-500 font-sans">
            Redirecting to Persona Management...
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
          <h1 className="text-2xl font-bold text-gray-900 font-serif">Add Persona</h1>
          <p className="text-sm text-gray-500 font-sans">Create a new AI stakeholder persona</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 font-sans flex items-center gap-2">
            <User size={16} className="text-maroon-600" />
            Basic Information
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
              placeholder="e.g., John Smith"
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
                placeholder="e.g., Chief Financial Officer (CFO)"
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
              placeholder="Describe this persona's background, expertise, and typical questioning style..."
              rows={4}
              className={`w-full rounded-lg border ${errors.description ? 'border-red-300' : 'border-gray-200'} px-4 py-2.5 text-sm font-sans focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500 resize-none`}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} />
                {errors.description}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              This description will guide the AI in generating relevant questions.
            </p>
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
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-maroon-600' : 'bg-gray-300'
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>
        </div>

        {/* Personality Configuration */}
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

        {/* System Prompt / AI Instructions */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 font-sans flex items-center gap-2">
            <Brain size={16} className="text-maroon-600" />
            AI System Prompt <span className="text-red-500">*</span>
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Define how the AI stakeholder should behave during Q&A sessions. Include specific instructions about questioning style, areas of focus, and how challenging the persona should be.
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
            rows={8}
            className={`w-full rounded-lg border ${errors.systemPrompt ? 'border-red-300' : 'border-gray-200'} px-4 py-2.5 text-sm font-sans focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500 resize-none font-mono`}
          />
          {errors.systemPrompt && (
            <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle size={12} />
              {errors.systemPrompt}
            </p>
          )}
          <p className="mt-2 text-xs text-gray-400">
            This prompt directly instructs the AI avatar how to conduct the Q&A session.
          </p>
        </div>

        {/* Sample Questions */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 font-sans flex items-center gap-2">
            <MessageSquare size={16} className="text-maroon-600" />
            Sample Questions
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Add sample questions this persona might ask. The AI will use these as reference.
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
