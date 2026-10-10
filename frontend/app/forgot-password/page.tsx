'use client';

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const { forgotPassword, confirmForgotPassword } = useAuth();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await forgotPassword(email);
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await confirmForgotPassword(email, code, newPassword);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (done) {
    return (
      <div className="flex min-h-screen bg-white p-4">
        {/* Left — Hero Image with rounded border */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl overflow-hidden border border-gray-200">
            <img
              src="/Women's image.png"
              alt="AI-powered presentation assessment"
              className="w-full h-auto"
            />
          </div>
        </div>

        {/* Right — Success Message */}
        <div className="flex w-full lg:w-1/2 items-center justify-center px-6">
          <div className="w-full max-w-sm text-center">
            <CheckCircle size={48} className="mx-auto text-green-600" />
            <h2 className="mt-4 text-xl font-bold text-gray-900 font-serif">Password Reset!</h2>
            <p className="mt-2 text-sm text-gray-500 font-sans">You can now sign in with your new password.</p>
            <Link href="/" className="mt-4 inline-block text-sm font-medium text-maroon-600 hover:underline font-sans">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white p-4">
      {/* Left — Hero Image with rounded border */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-3xl overflow-hidden border border-gray-200">
          <img
            src="/Women's image.png"
            alt="AI-powered presentation assessment"
            className="w-full h-auto"
          />
        </div>
      </div>

      {/* Right — Reset Password Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img src="/Logo.svg" alt="ASU W. P. Carey School of Business" className="h-16" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 text-center font-serif">Reset Password</h1>
          <p className="mt-1 text-sm text-gray-500 text-center font-sans">
            {step === 'email' ? 'Enter your email to receive a reset code.' : 'Enter the code and your new password.'}
          </p>

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 font-sans">
              {error}
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={handleSendCode} className="mt-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 font-sans">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="username@asu.edu"
                  required
                  className="mt-1.5 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-sans placeholder:text-gray-400 focus:border-maroon-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-maroon-500"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-full bg-maroon-600 py-3 text-sm font-medium text-white hover:bg-maroon-700 disabled:opacity-50 font-sans flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 size={16} className="animate-spin" />}
                Send Reset Code
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="mt-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 font-sans">
                  Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="6-digit code"
                  required
                  className="mt-1.5 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-sans placeholder:text-gray-400 focus:border-maroon-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-maroon-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 font-sans">
                  New Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  className="mt-1.5 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-sans placeholder:text-gray-400 focus:border-maroon-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-maroon-500"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-full bg-maroon-600 py-3 text-sm font-medium text-white hover:bg-maroon-700 disabled:opacity-50 font-sans flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 size={16} className="animate-spin" />}
                Reset Password
              </button>
            </form>
          )}

          {/* Back to sign in */}
          <p className="mt-6 text-center text-sm text-gray-500 font-sans">
            <Link href="/" className="font-medium text-maroon-600 hover:underline">
              Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
