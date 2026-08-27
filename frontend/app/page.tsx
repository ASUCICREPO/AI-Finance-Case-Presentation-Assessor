'use client';

import { useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useRouter } from 'next/navigation';
import LoginPage from './components/LoginPage';
import { Loader2 } from 'lucide-react';

/**
 * Root page — shows login if not authenticated, redirects to dashboard if authenticated.
 */
export default function Home() {
  const { isAuthenticated, isLoading, userRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (userRole === 'ta' || userRole === 'instructor') {
        router.replace('/ta/dashboard/');
      } else {
        router.replace('/student/dashboard/');
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
    return <LoginPage />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Loader2 size={32} className="animate-spin text-maroon" />
    </div>
  );
}
