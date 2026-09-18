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
  Clock,
} from 'lucide-react';

export default function EditSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('id');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [semester, setSemester] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [sessionType, setSessionType] = useState<'morning' | 'evening' | '1' | '2'>('morning');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<'active' | 'upcoming' | 'archived'>('active');

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
  const sessionTypes = [
    { value: 'morning', label: 'Morning', icon: Sun },
    { value: 'evening', label: 'Evening', icon: Moon },
    { value: '1', label: 'Session 1', icon: Clock },
    { value: '2', label: 'Session 2', icon: Clock },
  ];

  // Load session data
  useEffect(() => {
    if (!sessionId) {
      router.push('/ta/sessions');
      return;
    }

    // Simulate loading session data - in production this would be an API call
    setTimeout(() => {
      // Mock data based on sessionId
      const mockData: Record<string, {
        courseName: string;
        courseCode: string;
        semester: string;
        year: number;
        sessionType: 'morning' | 'evening' | '1' | '2';
        startDate: string;
        endDate: string;
        status: 'active' | 'upcoming' | 'archived';
      }> = {
        'sess-1': {
          courseName: 'Real Estate Finance',
          courseCode: 'FIN 502',
          semester: 'Spring',
          year: 2026,
          sessionType: 'morning',
          startDate: '2026-01-15',
          endDate: '2026-05-15',
          status: 'active',
        },
        'sess-2': {
          courseName: 'Real Estate Finance',
          courseCode: 'FIN 502',
          semester: 'Spring',
          year: 2026,
          sessionType: 'evening',
          startDate: '2026-01-15',
          endDate: '2026-05-15',
          status: 'active',
        },
        'sess-3': {
          courseName: 'Real Estate Finance',
          courseCode: 'FIN 502',
          semester: 'Fall',
          year: 2026,
          sessionType: '1',
          startDate: '2026-08-20',
          endDate: '2026-12-15',
          status: 'upcoming',
        },
        'sess-4': {
          courseName: 'Real Estate Finance',
          courseCode: 'FIN 502',
          semester: 'Fall',
          year: 2025,
          sessionType: 'morning',
          startDate: '2025-08-19',
          endDate: '2025-12-14',
          status: 'archived',
        },
      };

      const data = mockData[sessionId] || mockData['sess-1'];
      setCourseName(data.courseName);
      setCourseCode(data.courseCode);
      setSemester(data.semester);
      setYear(data.year);
      setSessionType(data.sessionType);
      setStartDate(data.startDate);
      setEndDate(data.endDate);
      setStatus(data.status);
      setLoading(false);
    }, 500);
  }, [sessionId, router]);

  const getSessionTypeName = () => {
    switch (sessionType) {
      case 'morning': return 'Morning';
      case 'evening': return 'Evening';
      case '1': return 'Session 1';
      case '2': return 'Session 2';
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
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
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log('Updating session:', {
        sessionId,
        name: `${semester} ${year} - ${getSessionTypeName()}`,
        courseName,
        courseCode,
        semester,
        year,
        sessionType,
        startDate,
        endDate,
        status,
      });
      
      setShowSuccess(true);
      setTimeout(() => {
        router.push('/ta/sessions');
      }, 2000);
    } catch (error) {
      console.error('Error updating session:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in">
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
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
            {semester} {year} - {getSessionTypeName()} session has been updated.
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

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
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

          {/* Session Type */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1.5 font-sans">
              Session Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {sessionTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setSessionType(type.value as typeof sessionType)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                      sessionType === type.value
                        ? 'border-maroon-500 bg-maroon-50 text-maroon-700'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <Icon size={18} className={sessionType === type.value ? 'text-maroon-600' : 'text-gray-400'} />
                    <span className="text-sm font-medium">{type.label}</span>
                  </button>
                );
              })}
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

          {semester && (
            <div className="mt-4 p-3 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-sm text-gray-600">
                <span className="font-medium text-gray-900">Session Name: </span>
                {semester} {year} - {getSessionTypeName()}
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
            className="px-6 py-2.5 text-sm font-medium text-white bg-maroon-600 rounded-lg hover:bg-maroon-700 transition-colors font-sans disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
