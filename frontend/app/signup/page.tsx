'use client';

import { useState } from 'react';
import { useAuth, UserRole } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SignUpPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [group, setGroup] = useState('');
  const [course, setCourse] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    try {
      const result = await signUp(email, password, name, role, group, course);
      if (!result.userConfirmed) {
        router.push(`/confirm/?email=${encodeURIComponent(email)}`);
      } else {
        router.push('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-3xl font-bold text-maroon-600 font-serif">ASU</span>
            <div className="text-left">
              <p className="text-sm font-bold text-gray-900 leading-tight">W. P. Carey</p>
              <p className="text-xs text-gray-600 leading-tight">School of Business</p>
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 text-center font-serif">Create Account</h1>
        <p className="mt-1 text-sm text-gray-500 text-center font-sans">
          Sign up to access the assessment platform.
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 font-sans">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 font-sans">Full Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-sans placeholder:text-gray-400 focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 font-sans">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="username@asu.edu"
              required
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-sans placeholder:text-gray-400 focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 font-sans">Role *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-sans focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
            >
              <option value="student">Student</option>
              <option value="ta">Teaching Assistant</option>
              <option value="instructor">Instructor</option>
            </select>
          </div>

          {/* Group & Course (for students) */}
          {role === 'student' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 font-sans">Group</label>
                <input
                  type="text"
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  placeholder="Group 4"
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-sans placeholder:text-gray-400 focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 font-sans">Course</label>
                <input
                  type="text"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="FIN 502"
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-sans placeholder:text-gray-400 focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 font-sans">Password *</label>
            <div className="relative mt-1.5">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
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

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 font-sans">Confirm Password *</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              required
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-sans placeholder:text-gray-400 focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-maroon-600 py-3 text-sm font-medium text-white hover:bg-maroon-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-sans flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            Create Account
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500 font-sans">
          Already have an account?{' '}
          <Link href="/" className="font-medium text-maroon-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
