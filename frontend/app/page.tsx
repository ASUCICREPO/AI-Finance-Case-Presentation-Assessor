'use client';

import { useAuth } from './context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Root page - redirects to appropriate dashboard based on user role.
 * Students -> /student/dashboard
 * TAs/Instructors -> /ta/dashboard
 */
export default function Home() {
  const { isAuthenticated, isLoading, userRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (userRole === 'ta' || userRole === 'instructor') {
        router.replace('/ta/dashboard');
      } else {
        router.replace('/student/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, userRole, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 size={32} className="animate-spin text-maroon" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login - will be handled by AuthProvider
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 font-serif">
            Finance Case Presentation Assessor
          </h1>
          <p className="mt-2 text-gray-600 font-sans">
            W. P. Carey School of Business
          </p>
          <div className="mt-6">
            <a
              href="/student/dashboard"
              className="inline-block rounded-lg bg-maroon-600 px-6 py-3 text-white font-sans font-medium hover:bg-maroon-700 transition-colors mr-4"
            >
              Student Login
            </a>
            <a
              href="/ta/dashboard"
              className="inline-block rounded-lg border-2 border-maroon-600 px-6 py-3 text-maroon-600 font-sans font-medium hover:bg-maroon-50 transition-colors"
            >
              TA / Instructor Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Loader2 size={32} className="animate-spin text-maroon" />
    </div>
  );
}
