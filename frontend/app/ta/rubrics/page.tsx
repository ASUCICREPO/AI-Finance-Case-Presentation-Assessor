'use client';

import { useState } from 'react';
import { Save, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { DEFAULT_RUBRIC, PERFORMANCE_LEVELS } from '@/app/config/config';

interface RubricCategory {
  id: string;
  key: string;
  name: string;
  weight: number;
  description: string;
}

/**
 * Rubric Configuration Page
 * Displays the standardized 6-dimension assessment rubric with performance levels.
 * Based on Clarkson Lumber AI Avatar Development Specification.
 */
export default function RubricsPage() {
  const [categories, setCategories] = useState<RubricCategory[]>(
    Object.entries(DEFAULT_RUBRIC).map(([key, config], index) => ({
      id: String(index + 1),
      key,
      name: config.name,
      weight: config.weight,
      description: config.description,
    }))
  );

  const [showPerformanceLevels, setShowPerformanceLevels] = useState(false);

  const totalWeight = categories.reduce((sum, cat) => sum + cat.weight, 0);

  const handleWeightChange = (id: string, newWeight: number) => {
    const updated = categories.map((c) =>
      c.id === id ? { ...c, weight: Math.max(0, Math.min(100, newWeight)) } : c
    );
    setCategories(updated);
  };

  const resetToDefault = () => {
    setCategories(
      Object.entries(DEFAULT_RUBRIC).map(([key, config], index) => ({
        id: String(index + 1),
        key,
        name: config.name,
        weight: config.weight,
        description: config.description,
      }))
    );
  };

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">Assessment Rubric</h1>
          <p className="mt-1 text-sm text-gray-500 font-sans">
            Standardized 6-dimension rubric for evaluating student case presentations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={resetToDefault}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors font-sans"
          >
            Reset to Default
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-maroon-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-maroon-700 transition-colors font-sans">
            <Save size={16} />
            Save Changes
          </button>
        </div>
      </div>

      {/* Weight total indicator */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 font-sans">Total Weight</span>
          <div className="flex items-center gap-2">
            {totalWeight === 100 ? (
              <CheckCircle size={16} className="text-green-600" />
            ) : (
              <AlertCircle size={16} className="text-red-600" />
            )}
            <span
              className={`text-lg font-bold font-sans ${totalWeight === 100 ? 'text-green-600' : 'text-red-600'
                }`}
            >
              {totalWeight}%
            </span>
          </div>
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
          <div
            className={`h-full rounded-full transition-all ${totalWeight === 100 ? 'bg-green-500' : totalWeight > 100 ? 'bg-red-500' : 'bg-yellow-500'
              }`}
            style={{ width: `${Math.min(totalWeight, 100)}%` }}
          />
        </div>
        {totalWeight !== 100 && (
          <p className="mt-2 text-xs text-red-600 font-sans">
            Weights must total exactly 100%. Currently {totalWeight > 100 ? 'over' : 'under'} by {Math.abs(100 - totalWeight)}%.
          </p>
        )}
      </div>

      {/* Performance Levels Toggle */}
      <div className="mb-6">
        <button
          onClick={() => setShowPerformanceLevels(!showPerformanceLevels)}
          className="inline-flex items-center gap-2 text-sm text-maroon-600 hover:text-maroon-700 font-sans"
        >
          <Info size={16} />
          {showPerformanceLevels ? 'Hide' : 'Show'} Performance Level Definitions
        </button>

        {showPerformanceLevels && (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3 font-sans">Performance Levels</h3>
            <div className="grid gap-3">
              {Object.entries(PERFORMANCE_LEVELS)
                .sort(([a], [b]) => Number(b) - Number(a))
                .map(([level, config]) => (
                  <div key={level} className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 w-20 text-center py-1 rounded text-xs font-bold ${level === '4'
                          ? 'bg-green-100 text-green-800'
                          : level === '3'
                            ? 'bg-blue-100 text-blue-800'
                            : level === '2'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                    >
                      Level {level}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 font-sans">
                        {config.label} ({config.scoreRange[0]}-{config.scoreRange[1]} pts)
                      </p>
                      <p className="text-xs text-gray-600 font-sans">{config.description}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Rubric Dimensions */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 font-serif">Assessment Dimensions</h2>

        {categories.map((category, index) => (
          <div
            key={category.id}
            className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-maroon-100 text-maroon-700 text-sm font-bold">
                    {index + 1}
                  </span>
                  <h3 className="text-sm font-bold text-gray-900 font-sans">{category.name}</h3>
                </div>
                <p className="text-xs text-gray-600 font-sans ml-10">{category.description}</p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <input
                  type="number"
                  value={category.weight}
                  onChange={(e) => handleWeightChange(category.id, Number(e.target.value))}
                  className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-center text-sm font-medium text-gray-900 font-sans focus:border-maroon-500 focus:ring-1 focus:ring-maroon-500"
                  min={0}
                  max={100}
                />
                <span className="text-sm text-gray-500 font-sans">%</span>
              </div>
            </div>

            {/* Weight bar visualization */}
            <div className="mt-3 ml-10">
              <div className="h-1.5 w-full rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-maroon-500 transition-all"
                  style={{ width: `${category.weight}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Info size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 font-sans">
            <p className="font-medium mb-1">About This Rubric</p>
            <p>
              This standardized 6-dimension rubric is used by the AI to evaluate student oral defenses.
              Each dimension is assessed on a 4-level scale (Strong Command, Competent Command, Partial Command, Insufficient Evidence).
              The AI generates evidence-based scores with justifications that the instructor can review and adjust.
            </p>
            <p className="mt-2 text-xs text-blue-600">
              <strong>Note:</strong> AI-generated assessments are provisional. The instructor retains final grading authority.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
