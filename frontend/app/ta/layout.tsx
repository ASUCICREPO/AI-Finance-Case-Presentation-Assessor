'use client';

import { ReactNode } from 'react';
import TAHeader from './components/TAHeader';
import TASidebar from './components/TASidebar';

export default function TALayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <TAHeader />
      <div className="flex">
        <TASidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
