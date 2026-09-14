'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Loader2, AlertCircle, Trash2, Edit, Bot } from 'lucide-react';
import { listPersonas, deletePersona, Persona } from '../../services/api';

// Pre-configured Anam Avatars (these are the video avatars from Anam AI)
interface AnamAvatar {
  id: string;
  anamPersonaId: string;
  name: string;
  description: string;
  thumbnailUrl?: string;
}

// The 9 Anam avatars available for instructors to use
const ANAM_AVATARS: AnamAvatar[] = [
  {
    id: 'avatar-1',
    anamPersonaId: '36908df0-128e-48c6-b2f3-cbf007707d00',
    name: 'Avatar 1',
    description: 'Professional appearance, neutral demeanor',
  },
  {
    id: 'avatar-2',
    anamPersonaId: '855745e8-056d-4848-a5a0-3752e88cdecc',
    name: 'Avatar 2',
    description: 'Friendly and approachable style',
  },
  {
    id: 'avatar-3',
    anamPersonaId: '26981553-4601-4799-b64b-7dfa1580de8c',
    name: 'Avatar 3',
    description: 'Authoritative and executive presence',
  },
  {
    id: 'avatar-4',
    anamPersonaId: 'd60a575c-705f-46b0-9a15-7955feb6fbc9',
    name: 'Avatar 4',
    description: 'Warm and conversational',
  },
  {
    id: 'avatar-5',
    anamPersonaId: 'f060068b-9994-4efd-964c-4f1d40e57e7a',
    name: 'Avatar 5',
    description: 'Technical and analytical',
  },
  {
    id: 'avatar-6',
    anamPersonaId: '3a960932-c7d7-4463-ba71-a7507933b44a',
    name: 'Avatar 6',
    description: 'Formal and precise',
  },
  {
    id: 'avatar-7',
    anamPersonaId: 'b3851e7c-8679-4daa-870d-64ccde2f1c85',
    name: 'Avatar 7',
    description: 'Supportive and encouraging',
  },
  {
    id: 'avatar-8',
    anamPersonaId: '2bc70732-e2c1-438e-94b6-9616f699cfe5',
    name: 'Avatar 8',
    description: 'Strategic and big-picture focused',
  },
  {
    id: 'avatar-9',
    anamPersonaId: '5c14742f-47d9-5024-8d92-54edc29fc502',
    name: 'Avatar 9',
    description: 'Pragmatic and action-oriented',
  },
];

export default function AvatarConfigurationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createdPersonas, setCreatedPersonas] = useState<Persona[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPersonas();
  }, []);

  async function fetchPersonas() {
    try {
      setLoading(true);
      setError(null);
      const personas = await listPersonas();
      setCreatedPersonas(personas);
    } catch (err) {
      console.error('Error fetching personas:', err);
      setError('Failed to load created personas');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(personaId: string) {
    if (!confirm('Are you sure you want to delete this persona?')) return;

    try {
      setDeletingId(personaId);
      await deletePersona(personaId);
      setCreatedPersonas(prev => prev.filter(p => p.personaID !== personaId));
    } catch (err) {
      console.error('Error deleting persona:', err);
      alert('Failed to delete persona');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      {/* Back link */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm font-medium text-maroon-600 hover:text-maroon-700 mb-6"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">Avatar Configuration</h1>
          <p className="mt-1 text-sm text-gray-500 font-sans">
            Create personas by selecting an Anam avatar and configuring a custom prompt
          </p>
        </div>
        <Link
          href="/ta/personas/add"
          className="flex items-center gap-2 rounded-lg bg-maroon-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-maroon-700 transition-colors"
        >
          <Plus size={18} />
          Create Persona
        </Link>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} />
          {error}
          <button onClick={fetchPersonas} className="ml-auto underline">Retry</button>
        </div>
      )}

      {/* Available Anam Avatars Section */}
      <div className="mb-10">
        <h2 className="text-lg font-bold text-gray-900 font-serif mb-4">Available Anam Avatars</h2>
        <p className="text-sm text-gray-500 mb-4">
          These are the pre-configured video avatars from Anam AI. Select one when creating a persona.
        </p>
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-4">
          {ANAM_AVATARS.map((avatar, index) => (
            <div
              key={avatar.id}
              className="rounded-xl border border-gray-200 bg-white p-3 text-center hover:border-maroon-200 hover:shadow-sm transition-all"
            >
              <div className="h-16 w-16 mx-auto rounded-full bg-gradient-to-br from-maroon-100 to-maroon-200 flex items-center justify-center text-maroon-600 text-xl font-bold mb-2">
                {index + 1}
              </div>
              <p className="text-xs font-medium text-gray-900">{avatar.name}</p>
              <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{avatar.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Created Personas Section */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 font-serif mb-4">Created Personas</h2>
        <p className="text-sm text-gray-500 mb-4">
          Personas you've created by combining an avatar with a custom prompt. These can be assigned to assessments.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-maroon-600" />
          </div>
        ) : createdPersonas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
            <Bot size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">No personas created yet</p>
            <p className="text-sm text-gray-400 mb-6">
              Create a persona by selecting an avatar and writing a custom system prompt that defines its behavior.
            </p>
            <Link
              href="/ta/personas/add"
              className="inline-flex items-center gap-2 rounded-lg bg-maroon-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-maroon-700 transition-colors"
            >
              <Plus size={18} />
              Create Your First Persona
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {createdPersonas.map((persona) => (
              <div
                key={persona.personaID}
                className="rounded-xl border border-gray-200 bg-white p-5 hover:border-maroon-200 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-maroon-100 to-maroon-200 flex items-center justify-center text-maroon-600 text-lg font-bold">
                      {persona.name?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{persona.name}</h3>
                      <p className="text-sm text-gray-500">{persona.role || 'Stakeholder'}</p>
                      {persona.description && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-1">{persona.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${persona.active !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {persona.active !== false ? 'Active' : 'Inactive'}
                    </span>
                    <Link
                      href={`/ta/personas/edit?id=${persona.personaID}`}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
                    >
                      <Edit size={16} />
                    </Link>
                    <button
                      onClick={() => handleDelete(persona.personaID)}
                      disabled={deletingId === persona.personaID}
                      className="p-2 rounded-lg hover:bg-red-50 transition-colors text-gray-500 hover:text-red-600 disabled:opacity-50"
                    >
                      {deletingId === persona.personaID ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
