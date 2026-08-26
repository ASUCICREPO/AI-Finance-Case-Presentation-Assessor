'use client';

import { ReactNode } from 'react';
import StudentHeader from './components/StudentHeader';
import StudentSidebar from './components/StudentSidebar';

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <StudentHeader />
      <div className="flex">
        <StudentSidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
