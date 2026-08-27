'use client';

import { BarChart3 } from 'lucide-react';

export default function ResultsPage() {
  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 font-serif">Results & History</h1>
      <p className="mt-2 text-sm text-gray-500 font-sans">
        View your past assessment sessions and scores.
      </p>

      <div className="mt-12 flex flex-col items-center justify-center text-center">
        <div className="rounded-full bg-gray-100 p-4">
          <BarChart3 size={32} className="text-gray-400" />
        </div>
        <p className="mt-4 text-sm text-gray-500 font-sans">
          No assessment results yet. Complete a Q&A session to see your scores here.
        </p>
      </div>
    </div>
  );
}
