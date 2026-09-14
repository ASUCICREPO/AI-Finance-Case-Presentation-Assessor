'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, X, ChevronDown, Check, Plus } from 'lucide-react';

// Pre-configured persona presets (will be populated with Anam persona IDs)
interface PersonaPreset {
  id: string;
  anamPersonaId: string; // Anam API persona ID (to be filled after creating in Anam Lab)
  name: string;
  role: string;
  avatarUrl: string;
  expertiseLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  defaultKeyPriorities: string[];
  defaultCommunicationStyle: string[];
}

// Avatar options for selection
interface AvatarOption {
  id: string;
  url: string;
  name: string;
}

const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'avatar-1', url: '/avatars/avatar-1.png', name: 'Professional Male 1' },
  { id: 'avatar-2', url: '/avatars/avatar-2.png', name: 'Professional Female 1' },
  { id: 'avatar-3', url: '/avatars/avatar-3.png', name: 'Professional Male 2' },
  { id: 'avatar-4', url: '/avatars/avatar-4.png', name: 'Professional Female 2' },
  { id: 'avatar-5', url: '/avatars/avatar-5.png', name: 'Professional Male 3' },
  { id: 'avatar-6', url: '/avatars/avatar-6.png', name: 'Professional Female 3' },
];

// Pre-built persona presets with Anam persona IDs
const PERSONA_PRESETS: PersonaPreset[] = [
  {
    id: 'persona-1',
    anamPersonaId: '36908df0-128e-48c6-b2f3-cbf007707d00',
    name: 'Persona 1',
    role: 'Stakeholder',
    avatarUrl: '/avatars/avatar-1.png',
    expertiseLevel: 'INTERMEDIATE',
    defaultKeyPriorities: ['Calculations', 'Assumptions', 'Financial reasoning', 'Recommendation'],
    defaultCommunicationStyle: ['Moderately formal', 'Evidence-based'],
  },
  {
    id: 'persona-2',
    anamPersonaId: '855745e8-056d-4848-a5a0-3752e88cdecc',
    name: 'Persona 2',
    role: 'Stakeholder',
    avatarUrl: '/avatars/avatar-2.png',
    expertiseLevel: 'INTERMEDIATE',
    defaultKeyPriorities: ['Financial models', 'Risk assessment', 'Cash flow', 'Assumptions'],
    defaultCommunicationStyle: ['Highly formal', 'Detail-oriented'],
  },
  {
    id: 'persona-3',
    anamPersonaId: '26981553-4601-4799-b64b-7dfa1580de8c',
    name: 'Persona 3',
    role: 'Stakeholder',
    avatarUrl: '/avatars/avatar-3.png',
    expertiseLevel: 'ADVANCED',
    defaultKeyPriorities: ['ROI', 'Exit strategy', 'Deal structure', 'Market positioning'],
    defaultCommunicationStyle: ['Direct', 'Strategic', 'Results-focused'],
  },
  {
    id: 'persona-4',
    anamPersonaId: 'd60a575c-705f-46b0-9a15-7955feb6fbc9',
    name: 'Persona 4',
    role: 'Stakeholder',
    avatarUrl: '/avatars/avatar-4.png',
    expertiseLevel: 'INTERMEDIATE',
    defaultKeyPriorities: ['Market demand', 'Competitive landscape', 'Analysis'],
    defaultCommunicationStyle: ['Friendly', 'Curious'],
  },
  {
    id: 'persona-5',
    anamPersonaId: 'f060068b-9994-4efd-964c-4f1d40e57e7a',
    name: 'Persona 5',
    role: 'Stakeholder',
    avatarUrl: '/avatars/avatar-5.png',
    expertiseLevel: 'ADVANCED',
    defaultKeyPriorities: ['Risk factors', 'Scenario analysis', 'Stress testing'],
    defaultCommunicationStyle: ['Technical', 'Measured', 'Analytical'],
  },
  {
    id: 'persona-6',
    anamPersonaId: '3a960932-c7d7-4463-ba71-a7507933b44a',
    name: 'Persona 6',
    role: 'Stakeholder',
    avatarUrl: '/avatars/avatar-6.png',
    expertiseLevel: 'INTERMEDIATE',
    defaultKeyPriorities: ['Compliance', 'Due diligence', 'Regulatory'],
    defaultCommunicationStyle: ['Formal', 'Precise', 'Thorough'],
  },
  {
    id: 'persona-7',
    anamPersonaId: 'b3851e7c-8679-4daa-870d-64ccde2f1c85',
    name: 'Persona 7',
    role: 'Stakeholder',
    avatarUrl: '/avatars/avatar-1.png',
    expertiseLevel: 'BEGINNER',
    defaultKeyPriorities: ['Fundamentals', 'Basic analysis', 'Key metrics'],
    defaultCommunicationStyle: ['Supportive', 'Educational'],
  },
  {
    id: 'persona-8',
    anamPersonaId: '2bc70732-e2c1-438e-94b6-9616f699cfe5',
    name: 'Persona 8',
    role: 'Stakeholder',
    avatarUrl: '/avatars/avatar-2.png',
    expertiseLevel: 'ADVANCED',
    defaultKeyPriorities: ['Strategic vision', 'Long-term planning', 'Growth'],
    defaultCommunicationStyle: ['Strategic', 'Big-picture'],
  },
  {
    id: 'persona-9',
    anamPersonaId: '5c14742f-47d9-5024-8d92-54edc29fc502',
    name: 'Persona 9',
    role: 'Stakeholder',
    avatarUrl: '/avatars/avatar-3.png',
    expertiseLevel: 'INTERMEDIATE',
    defaultKeyPriorities: ['Operations', 'Implementation', 'Timeline'],
    defaultCommunicationStyle: ['Pragmatic', 'Action-oriented'],
  },
];

// Session options
const SESSION_OPTIONS = [
  { id: 'spring-2026', name: 'Spring 2026' },
  { id: 'fall-2026', name: 'Fall 2026' },
  { id: 'spring-2027', name: 'Spring 2027' },
];

// Key priority options
const KEY_PRIORITY_OPTIONS = [
  'Calculations', 'Assumptions', 'Financial reasoning', 'Missing analysis',
  'Recommendation', 'Risks', 'ROI', 'Cash flow', 'Market analysis',
  'Sensitivity analysis', 'Exit strategy', 'Deal structure', 'Competitive analysis',
];

// Communication style options
const COMMUNICATION_STYLE_OPTIONS = [
  'Moderately formal', 'Evidence-based', 'Highly formal', 'Detail-oriented',
  'Analytical', 'Direct', 'Strategic', 'Friendly', 'Technical', 'Cautious',
];

export default function PersonaConfigurationPage() {
  const router = useRouter();

  // State
  const [selectedSession, setSelectedSession] = useState('');
  const [sessionDropdownOpen, setSessionDropdownOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PersonaPreset | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<string>('');
  const [keyPriorities, setKeyPriorities] = useState<string[]>([]);
  const [communicationStyle, setCommunicationStyle] = useState<string[]>([]);
  const [keyPriorityDropdownOpen, setKeyPriorityDropdownOpen] = useState(false);
  const [commStyleDropdownOpen, setCommStyleDropdownOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // When a preset is selected, populate the fields
  useEffect(() => {
    if (selectedPreset) {
      setSelectedAvatar(selectedPreset.avatarUrl);
      setKeyPriorities(selectedPreset.defaultKeyPriorities);
      setCommunicationStyle(selectedPreset.defaultCommunicationStyle);
    }
  }, [selectedPreset]);

  const removeKeyPriority = (priority: string) => {
    setKeyPriorities(keyPriorities.filter(p => p !== priority));
  };

  const addKeyPriority = (priority: string) => {
    if (!keyPriorities.includes(priority)) {
      setKeyPriorities([...keyPriorities, priority]);
    }
    setKeyPriorityDropdownOpen(false);
  };

  const removeCommStyle = (style: string) => {
    setCommunicationStyle(communicationStyle.filter(s => s !== style));
  };

  const addCommStyle = (style: string) => {
    if (!communicationStyle.includes(style)) {
      setCommunicationStyle([...communicationStyle, style]);
    }
    setCommStyleDropdownOpen(false);
  };

  const handleSelectPersona = async () => {
    if (!selectedSession || !selectedPreset) return;

    setIsSaving(true);
    try {
      // TODO: Save persona configuration to backend
      console.log('Saving persona config:', {
        sessionId: selectedSession,
        presetId: selectedPreset.id,
        anamPersonaId: selectedPreset.anamPersonaId,
        avatarUrl: selectedAvatar,
        keyPriorities,
        communicationStyle,
      });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Navigate back or show success
      router.push('/ta/dashboard');
    } catch (error) {
      console.error('Error saving persona:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getExpertiseBadgeColor = (level: string) => {
    switch (level) {
      case 'BEGINNER': return 'bg-green-100 text-green-700';
      case 'INTERMEDIATE': return 'bg-pink-100 text-pink-700';
      case 'ADVANCED': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      {/* Back link */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm font-medium text-maroon-600 hover:text-maroon-700 mb-6"
      >
        <ArrowLeft size={16} />
        Persona configuration
      </button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 font-serif">Persona Configuration</h1>
        <p className="mt-1 text-sm text-gray-500 font-sans">
          Configure and manage AI personas for student interactions
        </p>
      </div>

      {/* Session Dropdown */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Assign Persona</label>
        <div className="relative">
          <button
            onClick={() => setSessionDropdownOpen(!sessionDropdownOpen)}
            className="w-full flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-left hover:border-gray-300 transition-colors"
          >
            <span className={selectedSession ? 'text-gray-900' : 'text-gray-400'}>
              {selectedSession
                ? SESSION_OPTIONS.find(s => s.id === selectedSession)?.name
                : 'Select session'}
            </span>
            <ChevronDown size={18} className={`text-gray-400 transition-transform ${sessionDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {sessionDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg z-20">
              {SESSION_OPTIONS.map(session => (
                <button
                  key={session.id}
                  onClick={() => {
                    setSelectedSession(session.id);
                    setSessionDropdownOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                >
                  {session.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Persona Presets Accordion */}
      {selectedSession && (
        <div className="space-y-4">
          {PERSONA_PRESETS.map(preset => (
            <div
              key={preset.id}
              className={`rounded-xl border bg-white overflow-hidden transition-all ${selectedPreset?.id === preset.id ? 'border-maroon-300 shadow-sm' : 'border-gray-200'
                }`}
            >
              {/* Preset Header - Always visible */}
              <button
                onClick={() => setSelectedPreset(selectedPreset?.id === preset.id ? null : preset)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar thumbnail */}
                  <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                    <div className="h-full w-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-lg font-bold">
                      {preset.name.charAt(0)}
                    </div>
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">{preset.name}</h3>
                    <p className="text-sm text-gray-500">{preset.role}</p>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded ${getExpertiseBadgeColor(preset.expertiseLevel)}`}>
                  EXPERTISE: {preset.expertiseLevel}
                </span>
              </button>

              {/* Expanded Content */}
              {selectedPreset?.id === preset.id && (
                <div className="px-5 pb-5 border-t border-gray-100">
                  {/* Key Priorities */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Key Priorities</label>
                    <div className="relative">
                      <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-gray-200 min-h-[48px]">
                        {keyPriorities.map(priority => (
                          <span
                            key={priority}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-700"
                          >
                            {priority}
                            <button
                              onClick={() => removeKeyPriority(priority)}
                              className="ml-1 text-gray-400 hover:text-gray-600"
                            >
                              <X size={14} />
                            </button>
                          </span>
                        ))}
                        <button
                          onClick={() => setKeyPriorityDropdownOpen(!keyPriorityDropdownOpen)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <ChevronDown size={18} />
                        </button>
                      </div>

                      {keyPriorityDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg z-20 max-h-48 overflow-y-auto">
                          {KEY_PRIORITY_OPTIONS.filter(p => !keyPriorities.includes(p)).map(priority => (
                            <button
                              key={priority}
                              onClick={() => addKeyPriority(priority)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                            >
                              {priority}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Communication Style */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Communication Style</label>
                    <div className="relative">
                      <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-gray-200 min-h-[48px]">
                        {communicationStyle.map(style => (
                          <span
                            key={style}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-700"
                          >
                            {style}
                            <button
                              onClick={() => removeCommStyle(style)}
                              className="ml-1 text-gray-400 hover:text-gray-600"
                            >
                              <X size={14} />
                            </button>
                          </span>
                        ))}
                        <button
                          onClick={() => setCommStyleDropdownOpen(!commStyleDropdownOpen)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <ChevronDown size={18} />
                        </button>
                      </div>

                      {commStyleDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg z-20 max-h-48 overflow-y-auto">
                          {COMMUNICATION_STYLE_OPTIONS.filter(s => !communicationStyle.includes(s)).map(style => (
                            <button
                              key={style}
                              onClick={() => addCommStyle(style)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                            >
                              {style}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Avatar Selection */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Avatar</label>
                    <div className="flex items-center gap-4">
                      {AVATAR_OPTIONS.map(avatar => (
                        <button
                          key={avatar.id}
                          onClick={() => setSelectedAvatar(avatar.url)}
                          className={`relative h-16 w-16 rounded-full overflow-hidden transition-all ${selectedAvatar === avatar.url
                            ? 'ring-2 ring-maroon-500 ring-offset-2'
                            : 'hover:ring-2 hover:ring-gray-300 hover:ring-offset-2'
                            }`}
                        >
                          <div className="h-full w-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-lg font-bold">
                            {avatar.name.charAt(0)}
                          </div>
                          {selectedAvatar === avatar.url && (
                            <div className="absolute inset-0 bg-maroon-500/20 flex items-center justify-center">
                              <Check size={20} className="text-maroon-600" />
                            </div>
                          )}
                        </button>
                      ))}
                      {/* Add new avatar button */}
                      <button className="h-16 w-16 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors">
                        <Plus size={24} />
                      </button>
                    </div>
                  </div>

                  {/* Select This Persona Button */}
                  <button
                    onClick={handleSelectPersona}
                    disabled={isSaving}
                    className="mt-6 w-full flex items-center justify-center gap-2 rounded-lg bg-green-500 px-6 py-3 text-white font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check size={18} />
                    {isSaving ? 'Saving...' : 'Select This Persona'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state when no session selected */}
      {!selectedSession && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <p className="text-gray-500">Select a session to configure personas</p>
        </div>
      )}
    </div>
  );
}
