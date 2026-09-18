'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Calendar,
  BookOpen,
  ChevronDown,
  Sun,
  Moon,
  Hash,
  Loader2,
} from 'lucide-react';
import { getCourseSession, updateCourseSession, CourseSession } from '../../../services/api';

export default function EditSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('id');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  // Form state
  const [sessionNumber, setSessionNumber] = useState('');
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [semester, setSemester] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<'active' | 'upcoming' | 'archived'>('active');
  const [customSessionNumber, setCustomSessionNumber] = useState('');

  // Dropdown states
  const [semesterOpen, setSemesterOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const semesters = ['Spring', 'Summer', 'Fall', 'Winter'];
  const years = [2025, 2026, 2027, 2028];
  const statuses = [
    { value: 'active', label: 'Active' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'archived', label: 'Archived' },
  ];

  // Quick select session numbers
  const sessionNumberOptions = [
    { value: 'morning', label: 'Morning', icon: Sun },
    { value: 'evening', label: 'Evening', icon: Moon },
    { value: '1', label: 'Session 1', icon: Hash },
    { value: '2', label: 'Session 2', icon: Hash },
  ];

  // Load session data
  useEffect(() => {
    if (!sessionId) {
      router.push('/ta/sessions');
      return;
    }

    loadSession();
  }, [sessionId, router]);

  async function loadSession() {
    setLoading(true);
    setApiError(null);
    try {
      const session = await getCourseSession(sessionId!);
      setSessionNumber(session.sessionNumber || session.sessionType || '');
      setCourseName(session.courseName);
      setCourseCode(session.courseCode);
      setSemester(session.semester);
      setYear(session.year);
      setStartDate(session.startDate);
      setEndDate(session.endDate);
      setStatus(session.status);

      // If session number is not a quick select option, set it as custom
      const quickSelectValues = sessionNumberOptions.map(o => o.value);
      if (!quickSelectValues.includes(session.sessionNumber || session.sessionType || '')) {
        setCustomSessionNumber(session.sessionNumber || session.sessionType || '');
      }
    } catch (err: any) {
      console.error('Error loading session:', err);
      setApiError(err.message || 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }

  const getSessionNumberDisplay = () => {
    if (!sessionNumber) return '';
    switch (sessionNumber.toLowerCase()) {
      case 'morning': return 'Morning';
      case 'evening': return 'Evening';
      default: return `Session ${sessionNumber}`;
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!sessionNumber.trim()) newErrors.sessionNumber = 'Session number is required';
    if (!courseName.trim()) newErrors.courseName = 'Course name is required';
    if (!courseCode.trim()) newErrors.courseCode = 'Course code is required';
    if (!semester) newErrors.semester = 'Semester is required';
    if (!startDate) newErrors.startDate = 'Start date is required';
    if (!endDate) newErrors.endDate = 'End date is required';
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      newErrors.endDate = 'End date must be after start date';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setApiError(null);

    try {
      const sessionName = `${semester} ${year} - ${getSessionNumberDisplay()}`;

      await updateCourseSession(sessionId!, {
        name: sessionName,
        sessionNumber: sessionNumber.toLowerCase(),
        courseName,
        courseCode,
        semester: semester as 'Spring' | 'Summer' | 'Fall' | 'Winter',
        year,
        startDate,
        endDate,
        status,
      });

      setShowSuccess(true);
      setTimeout(() => {
        router.push('/ta/sessions');
      }, 2000);
    } catch (error: any) {
      console.error('Error updating session:', error);
      setApiError(error.message || 'Failed to update session. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle custom session number input
  const handleCustomSessionNumber = (value: string) => {
    setCustomSessionNumber(value);
    if (value.trim()) {
      setSessionNumber(value.trim());
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-maroon-600" size={32} />
          <span className="ml-3 text-gray-600">Loading session...</span>
        </div>
      </div>
    );
  }

  if (apiError && !courseName) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 font-serif">Failed to Load Session</h2>
          <p className="mt-2 text-sm text-gray-600 font-sans">{apiError}</p>
          <button
            onClick={() => router.push('/ta/sessions')}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-maroon-600 rounded-lg hover:bg-maroon-700"
          >
            Back to Sessions
          </button>
        </div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in">
        <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
          <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 font-serif">Session Updated Successfully!</h2>
          <p className="mt-2 text-sm text-gray-600 font-sans">
            {semester} {year} - {getSessionNumberDisplay()} session has been updated.
          </p>
          <p className="mt-4 text-sm text-gray-500 font-sans">
            Redirecting to Sessions...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">Edit Session</h1>
          <p className="text-sm text-gray-500 font-sans">Update class section details</p>
        </div>
      </div>

      {/* API Error */}
      {apiError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 flex items-center gap-3">
          <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
          <div>
            <p className="text-sm font-medium text-red-800">{apiError}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SESSION NUMBER - MOST IMPORTANT SECTION */}
        <div className="rounded-xl border-2 border-maroon-200 bg-maroon-50/30 p-6">
          <h2 className="text-sm font-semibold text-maroon-900 mb-2 font-sans flex items-center gap-2">
            <Hash size={16} className="text-maroon-600" />
            Session Number <span className="text-red-500">*</span>
          </h2>
          <p className="text-xs text-maroon-700 mb-4">
            This is the primary identifier for your class section
          </p>

          {/* Quick Select Options */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {sessionNumberOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = sessionNumber.toLowerCase() === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setSessionNumber(option.value);
                    setCustomSessionNumber('');
                  }}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${isSelected
                      ? 'border-maroon-500 bg-maroon-100 text-maroon-800 shadow-sm'
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                >
                  <Icon size={18} className={isSelected ? 'text-maroon-600' : 'text-gray-400'} />
                  <span className="text-sm font-semibold">{option.label}</span>
                </button>
              );
            })}
          </div>

          {/* Custom Session Number */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5 font-sans">
              Or enter a custom session number
            </label>
            <input
              type="text"
              value={customSessionNumber}
              onChange={(e) => handleCustomSessionNumber(e.target.value)}
              placeholder="e.g., 3, 4, A, B, afternoon"
              className={`w-full rounded-lg border ${errors.sessionNumber ? 'border-red-300' : 'border-gray-200'} px-4 py-2.5 text-sm font-sans focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500 bg-white`}
            />
          </div>

          {errors.sessionNumber && (
            <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle size={12} />
              {errors.sessionNumber}
            </p>
          )}

          {sessionNumber && (
            <div className="mt-3 p-2 rounded-lg bg-maroon-100 border border-maroon-200">
              <p className="text-sm font-medium text-maroon-800">
                Selected: <span className="font-bold">{getSessionNumberDisplay()}</span>
              </p>
            </div>
          )}
        </div>

        {/* Course Information */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 font-sans flex items-center gap-2">
            <BookOpen size={16} className="text-maroon-600" />
            Course Information
          </h2>

          {/* Course Name */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5 font-sans">
              Course Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="e.g., Real Estate Finance"
              className={`w-full rounded-lg border ${errors.courseName ? 'border-red-300' : 'border-gray-200'} px-4 py-2.5 text-sm font-sans focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500`}
            />
            {errors.courseName && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} />
                {errors.courseName}
              </p>
            )}
          </div>

          {/* Course Code */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5 font-sans">
              Course Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              placeholder="e.g., FIN 502"
              className={`w-full rounded-lg border ${errors.courseCode ? 'border-red-300' : 'border-gray-200'} px-4 py-2.5 text-sm font-sans focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500`}
            />
            {errors.courseCode && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} />
                {errors.courseCode}
              </p>
            )}
          </div>

          {/* Semester and Year */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 font-sans">
                Semester <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSemesterOpen(!semesterOpen)}
                  className={`w-full flex items-center justify-between rounded-lg border ${errors.semester ? 'border-red-300' : 'border-gray-200'} px-4 py-2.5 text-sm font-sans focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500`}
                >
                  <span className={semester ? 'text-gray-900' : 'text-gray-400'}>
                    {semester || 'Select semester'}
                  </span>
                  <ChevronDown size={16} className="text-gray-400" />
                </button>
                {semesterOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg z-20">
                    {semesters.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setSemester(s);
                          setSemesterOpen(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 font-sans"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {errors.semester && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {errors.semester}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 font-sans">
                Year <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setYearOpen(!yearOpen)}
                  className="w-full flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-sans focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
                >
                  <span className="text-gray-900">{year}</span>
                  <ChevronDown size={16} className="text-gray-400" />
                </button>
                {yearOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg z-20">
                    {years.map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => {
                          setYear(y);
                          setYearOpen(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 font-sans"
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 font-sans">
              Status
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setStatusOpen(!statusOpen)}
                className="w-full flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-sans focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
              >
                <span className="text-gray-900 capitalize">{status}</span>
                <ChevronDown size={16} className="text-gray-400" />
              </button>
              {statusOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg z-20">
                  {statuses.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => {
                        setStatus(s.value as typeof status);
                        setStatusOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 font-sans"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Session Dates */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 font-sans flex items-center gap-2">
            <Calendar size={16} className="text-maroon-600" />
            Session Dates
          </h2>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 font-sans">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`w-full rounded-lg border ${errors.startDate ? 'border-red-300' : 'border-gray-200'} px-4 py-2.5 text-sm font-sans focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500`}
              />
              {errors.startDate && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {errors.startDate}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 font-sans">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`w-full rounded-lg border ${errors.endDate ? 'border-red-300' : 'border-gray-200'} px-4 py-2.5 text-sm font-sans focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500`}
              />
              {errors.endDate && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {errors.endDate}
                </p>
              )}
            </div>
          </div>

          {/* Preview */}
          {semester && sessionNumber && (
            <div className="mt-4 p-3 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-sm text-gray-600">
                <span className="font-medium text-gray-900">Session Name: </span>
                {semester} {year} - {getSessionNumberDisplay()}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors font-sans"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 text-sm font-medium text-white bg-maroon-600 rounded-lg hover:bg-maroon-700 transition-colors font-sans disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
