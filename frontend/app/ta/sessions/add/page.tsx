'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Calendar,
  BookOpen,
  ChevronDown,
} from 'lucide-react';

export default function AddSessionPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [courseName, setCourseName] = useState('Real Estate Finance');
  const [courseCode, setCourseCode] = useState('FIN 502');
  const [semester, setSemester] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Dropdown states
  const [semesterOpen, setSemesterOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);

  const semesters = ['Spring', 'Summer', 'Fall', 'Winter'];
  const years = [2025, 2026, 2027, 2028];

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
      console.log('Creating session:', {
        name: `${semester} ${year}`,
        courseName,
        courseCode,
        semester,
        year,
        startDate,
        endDate,
      });
      
      setShowSuccess(true);
      setTimeout(() => {
        router.push('/ta/sessions');
      }, 2000);
    } catch (error) {
      console.error('Error creating session:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in">
        <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
          <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 font-serif">Session Created Successfully!</h2>
          <p className="mt-2 text-sm text-gray-600 font-sans">
            {semester} {year} session for {courseCode} has been created.
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
          <h1 className="text-2xl font-bold text-gray-900 font-serif">Add Session</h1>
          <p className="text-sm text-gray-500 font-sans">Create a new course session</p>
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
                {semester} {year}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                This name will be displayed throughout the dashboard.
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
            {isSubmitting ? 'Creating...' : 'Create Session'}
          </button>
        </div>
      </form>
    </div>
  );
}
