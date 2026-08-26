'use client';

import { useState } from 'react';
import { Save, Plus, GripVertical } from 'lucide-react';

interface RubricCategory {
  id: string;
  name: string;
  weight: number;
  description: string;
}

/**
 * Rubric Management - TA can configure assessment categories and weights.
 * Based on scope: Financial reasoning, Understanding of calculations,
 * Assumption validation, Recommendation defense, Analytical depth,
 * Decision-making quality, Communication effectiveness.
 */
export default function RubricsPage() {
  const [categories, setCategories] = useState<RubricCategory[]>([
    { id: '1', name: 'Financial Reasoning', weight: 20, description: 'Ability to explain financial concepts, metrics, and their implications for the investment thesis.' },
    { id: '2', name: 'Understanding of Calculations', weight: 20, description: 'Demonstrates clear understanding of how key financial metrics were derived and what they indicate.' },
    { id: '3', name: 'Assumption Validation', weight: 15, description: 'Can identify, justify, and defend the assumptions used in the financial model.' },
    { id: '4', name: 'Recommendation Defense', weight: 15, description: 'Presents a clear, logical argument for the investment recommendation with supporting evidence.' },
    { id: '5', name: 'Analytical Depth', weight: 15, description: 'Goes beyond surface-level analysis to explore nuances, scenarios, and sensitivity considerations.' },
    { id: '6', name: 'Decision-Making Quality', weight: 10, description: 'Demonstrates sound judgment in weighing trade-offs and making strategic decisions.' },
    { id: '7', name: 'Communication Effectiveness', weight: 5, description: 'Communicates ideas clearly, concisely, and professionally under questioning.' },
  ]);

  const totalWeight = categories.reduce((sum, cat) => sum + cat.weight, 0);

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">Rubric Configuration</h1>
          <p className="mt-1 text-sm text-gray-500 font-sans">
            Configure assessment categories and their weights for student evaluation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors font-sans">
            <Plus size={16} />
            Add Category
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-maroon-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-maroon-700 transition-colors font-sans">
            <Save size={16} />
            Save Rubric
          </button>
        </div>
      </div>

      {/* Weight total indicator */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 font-sans">Total Weight</span>
          <span
            className={`text-lg font-bold font-sans ${
              totalWeight === 100 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {totalWeight}%
          </span>
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
          <div
            className={`h-full rounded-full transition-all ${
              totalWeight === 100 ? 'bg-green-500' : totalWeight > 100 ? 'bg-red-500' : 'bg-yellow-500'
            }`}
            style={{ width: `${Math.min(totalWeight, 100)}%` }}
          />
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        {categories.map((category) => (
          <div
            key={category.id}
            className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start gap-3">
              <button className="mt-1 cursor-grab text-gray-400 hover:text-gray-600">
                <GripVertical size={16} />
              </button>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 font-sans">{category.name}</h3>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={category.weight}
                      onChange={(e) => {
                        const updated = categories.map((c) =>
                          c.id === category.id ? { ...c, weight: Number(e.target.value) } : c
                        );
                        setCategories(updated);
                      }}
                      className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-center text-sm font-medium text-gray-900 font-sans"
                      min={0}
                      max={100}
                    />
                    <span className="text-sm text-gray-500 font-sans">%</span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-600 font-sans">{category.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
