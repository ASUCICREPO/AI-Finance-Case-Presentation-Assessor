'use client';

import { useState, Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';

function ConfirmForm() {
  const { confirmSignUp } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailFromQuery);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await confirmSignUp(email, code);
      setConfirmed(true);
      setTimeout(() => router.push('/'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirmation failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (confirmed) {
    return (
      <div className="text-center">
        <CheckCircle size={48} className="mx-auto text-green-600" />
        <h2 className="mt-4 text-xl font-bold text-gray-900 font-serif">Email Confirmed!</h2>
        <p className="mt-2 text-sm text-gray-500 font-sans">Redirecting to sign in...</p>
      </div>
    );
  }

  return (
    <>
      {/* Logo */}
      <div className="flex justify-center mb-8">
        <img src="/Logo.svg" alt="ASU W. P. Carey School of Business" className="h-12" />
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900 text-center font-serif">Confirm Your Email</h1>
      <p className="mt-1 text-sm text-gray-500 text-center font-sans">
        We sent a verification code to your email. Enter it below.
      </p>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 font-sans">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 font-sans">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1.5 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-sans placeholder:text-gray-400 focus:border-maroon-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-maroon-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 font-sans">
            Verification Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter 6-digit code"
            required
            className="mt-1.5 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-sans text-center tracking-widest placeholder:text-gray-400 focus:border-maroon-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-maroon-500"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-full bg-maroon-600 py-3 text-sm font-medium text-white hover:bg-maroon-700 transition-colors disabled:opacity-50 font-sans flex items-center justify-center gap-2"
        >
          {isLoading && <Loader2 size={16} className="animate-spin" />}
          Confirm
        </button>
      </form>

      {/* Back to sign in */}
      <p className="mt-6 text-center text-sm text-gray-500 font-sans">
        <Link href="/" className="font-medium text-maroon-600 hover:underline">
          Back to Sign In
        </Link>
      </p>
    </>
  );
}

export default function ConfirmPage() {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Left — Hero Image */}
      <div className="hidden lg:block lg:w-1/2">
        <img
          src="/Women's image.png"
          alt="AI-powered presentation assessment"
          className="w-full h-full object-cover object-top"
        />
      </div>

      {/* Right — Confirm Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Suspense fallback={<Loader2 size={24} className="mx-auto animate-spin text-maroon" />}>
            <ConfirmForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
