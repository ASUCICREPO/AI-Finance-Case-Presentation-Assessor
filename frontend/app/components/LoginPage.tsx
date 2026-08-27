'use client';

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      router.replace('/student/dashboard/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left — Hero Image */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gray-50 items-center justify-center overflow-hidden">
        <img
          src="/login-hero.png"
          alt="AI-powered presentation assessment"
          className="w-full h-full object-cover object-center"
        />
      </div>

      {/* Right — Login Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-3xl font-bold text-maroon-600 font-serif">ASU</span>
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900 leading-tight">W. P. Carey</p>
                <p className="text-xs text-gray-600 leading-tight">School of Business</p>
              </div>
            </div>
            <p className="text-xs text-maroon-600 font-sans">Arizona State University</p>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 text-center font-serif">Sign In</h1>
          <p className="mt-1 text-sm text-gray-500 text-center font-sans">
            Enter your details to get started.
          </p>

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 font-sans">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Email */}
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
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-sans placeholder:text-gray-400 focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 font-sans">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-10 text-sm font-sans placeholder:text-gray-400 focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember me + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-sans text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-maroon-600 focus:ring-maroon-500"
                />
                Remember me
              </label>
              <Link
                href="/forgot-password/"
                className="text-sm font-medium text-maroon-600 hover:underline font-sans"
              >
                Forgot Password
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-maroon-600 py-3 text-sm font-medium text-white hover:bg-maroon-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-sans flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 size={16} className="animate-spin" />}
              Sign In
            </button>
          </form>

          {/* Sign up link */}
          <p className="mt-6 text-center text-sm text-gray-500 font-sans">
            Don&apos;t have an account?{' '}
            <Link href="/signup/" className="font-medium text-gray-900 hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
