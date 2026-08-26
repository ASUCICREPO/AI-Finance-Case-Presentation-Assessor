'use client';

import { useState } from 'react';
import { Plus, Edit, Trash2, User } from 'lucide-react';

interface Persona {
  id: string;
  name: string;
  role: string;
  description: string;
  active: boolean;
  questionsCount: number;
}

/**
 * Persona Management - TA can create, edit, delete stakeholder personas.
 * Personas are used for AI-generated stakeholder questioning.
 */
export default function PersonasPage() {
  const [personas] = useState<Persona[]>([
    {
      id: '1',
      name: 'Keith Clarkson',
      role: 'Chief Executive Officer (CEO)',
      description: 'Experienced real estate executive focused on strategic growth and ROI. Asks high-level questions about market positioning and investment thesis.',
      active: true,
      questionsCount: 12,
    },
    {
      id: '2',
      name: 'Dr. Maria Santos',
      role: 'Chief Financial Officer (CFO)',
      description: 'Detail-oriented finance leader who scrutinizes financial models, assumptions, and risk management strategies.',
      active: true,
      questionsCount: 15,
    },
    {
      id: '3',
      name: 'James Park',
      role: 'Investor / Board Member',
      description: 'Private equity investor evaluating deal structure, exit strategy, and competitive positioning.',
      active: true,
      questionsCount: 10,
    },
    {
      id: '4',
      name: 'Linda Torres',
      role: 'VP of Marketing',
      description: 'Focuses on tenant acquisition, market demand, and competitive landscape analysis.',
      active: false,
      questionsCount: 8,
    },
  ]);

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">Persona Management</h1>
          <p className="mt-1 text-sm text-gray-500 font-sans">
            Configure AI stakeholder personas for student Q&A sessions.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-maroon-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-maroon-700 transition-colors font-sans">
          <Plus size={16} />
          Add Persona
        </button>
      </div>

      {/* Personas Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {personas.map((persona) => (
          <div
            key={persona.id}
            className={`rounded-xl border bg-white p-5 transition-shadow hover:shadow-md ${
              persona.active ? 'border-gray-200' : 'border-gray-100 opacity-70'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-maroon-100">
                  <User size={18} className="text-maroon-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 font-sans">{persona.name}</h3>
                  <p className="text-xs text-maroon-600 font-sans">{persona.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button className="rounded p-1 hover:bg-gray-100 transition-colors">
                  <Edit size={14} className="text-gray-500" />
                </button>
                <button className="rounded p-1 hover:bg-red-50 transition-colors">
                  <Trash2 size={14} className="text-gray-500 hover:text-red-500" />
                </button>
              </div>
            </div>

            <p className="mt-3 text-xs text-gray-600 font-sans leading-relaxed">
              {persona.description}
            </p>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-gray-500 font-sans">
                {persona.questionsCount} questions configured
              </span>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  persona.active
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {persona.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
