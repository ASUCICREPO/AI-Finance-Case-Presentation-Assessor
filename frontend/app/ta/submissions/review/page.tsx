'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Calendar,
  Clock,
  Play,
  FileSpreadsheet,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Loader2,
  AlertCircle,
  Save,
  Bot,
  UserCheck,
  Mic,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Flag,
  FileText,
} from 'lucide-react';
import {
  getSubmission,
  gradeSubmission,
  getVideoDownloadUrl,
  generateAiScore,
  Submission,
  RubricCategoryScore,
} from '../../../services/api';

// 6-dimension rubric labels for display
const RUBRIC_LABELS: Record<string, string> = {
  problem_diagnosis: 'Problem Diagnosis & Financial Reasoning',
  calculations_mechanics: 'Understanding of Calculations & Model Mechanics',
  assumption_validation: 'Assumption Validation & Analytical Judgment',
  integration_ownership: 'Analytical Integration & Ownership',
  recommendation_defense: 'Recommendation Defense & Decision Quality',
  executive_communication: 'Executive Communication',
};

const RUBRIC_WEIGHTS: Record<string, number> = {
  problem_diagnosis: 20,
  calculations_mechanics: 20,
  assumption_validation: 20,
  integration_ownership: 15,
  recommendation_defense: 20,
  executive_communication: 5,
};

const PERFORMANCE_LEVELS: Record<number, { label: string; color: string }> = {
  4: { label: 'Strong Command', color: 'text-green-700 bg-green-100' },
  3: { label: 'Competent Command', color: 'text-blue-700 bg-blue-100' },
  2: { label: 'Partial Command', color: 'text-yellow-700 bg-yellow-100' },
  1: { label: 'Insufficient Evidence', color: 'text-red-700 bg-red-100' },
};

export default function SubmissionReviewPage({ submissionIdProp }: { submissionIdProp?: string } = {}) {
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();
  // Support both path param and query param
  const submissionId = submissionIdProp || (params?.submissionId as string) || searchParams.get('id');

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatingAiScore, setGeneratingAiScore] = useState(false);
  const [activeTab, setActiveTab] = useState<'video' | 'presentation' | 'qa' | 'rubric'>('presentation');

  // Video state
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Expanded rubric categories
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Grading form
  const [reviewerScore, setReviewerScore] = useState<number | ''>('');
  const [feedback, setFeedback] = useState('');
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({
    problem_diagnosis: 0,
    calculations_mechanics: 0,
    assumption_validation: 0,
    integration_ownership: 0,
    recommendation_defense: 0,
    executive_communication: 0,
  });

  useEffect(() => {
    if (submissionId) {
      fetchSubmission();
    } else {
      setLoading(false);
      setError('No submission ID provided');
    }
  }, [submissionId]);

  async function fetchSubmission() {
    if (!submissionId) return;
    try {
      setLoading(true);
      setError(null);
      const subData = await getSubmission(submissionId);
      setSubmission(subData);

      // Pre-fill form if already graded
      if (subData.reviewerScore !== undefined && subData.reviewerScore !== null) {
        setReviewerScore(subData.reviewerScore);
      }
      if (subData.reviewerFeedback) {
        setFeedback(subData.reviewerFeedback);
      }
      if (subData.reviewerScoreBreakdown) {
        setRubricScores(prev => ({ ...prev, ...subData.reviewerScoreBreakdown }));
      }

      // Load video if available
      if (subData.videoS3Key) {
        loadVideo(subData.videoS3Key);
      }
    } catch (err) {
      setError('Failed to load submission. Please try again.');
      console.error('Error fetching submission:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadVideo(videoS3Key: string) {
    try {
      setVideoLoading(true);
      setVideoError(null);
      const url = await getVideoDownloadUrl(videoS3Key);
      setVideoUrl(url);
    } catch (err) {
      console.error('Error loading video:', err);
      setVideoError('Failed to load video');
    } finally {
      setVideoLoading(false);
    }
  }

  async function handleGenerateAiScore() {
    if (!submissionId) return;
    try {
      setGeneratingAiScore(true);
      const result = await generateAiScore(submissionId, true); // force=true to regenerate
      if (!result.skipped) {
        // Refresh submission to get new AI scores
        await fetchSubmission();
        alert(`AI Score generated: ${result.aiScore}%`);
      } else {
        alert('Submission already has an AI score. Set force=true to regenerate.');
      }
    } catch (err: any) {
      console.error('Error generating AI score:', err);
      // Always refresh to see if scoring completed despite error
      await fetchSubmission();
      if (err.message?.includes('timed out')) {
        alert('AI scoring is taking longer than expected. The page will refresh - check if the score appears.');
      } else {
        alert('Failed to generate AI score. Please try again.');
      }
    } finally {
      setGeneratingAiScore(false);
    }
  }

  async function handleSaveGrade() {
    if (!submissionId) return;
    if (reviewerScore === '' || reviewerScore < 0 || reviewerScore > 100) {
      alert('Please enter a valid score between 0 and 100');
      return;
    }

    try {
      setSaving(true);
      await gradeSubmission(submissionId, {
        reviewerScore: Number(reviewerScore),
        reviewerScoreBreakdown: rubricScores,
        reviewerFeedback: feedback,
      });
      // Refresh submission data
      await fetchSubmission();
      alert('Grade saved successfully!');
    } catch (err) {
      alert('Failed to save grade. Please try again.');
      console.error('Error saving grade:', err);
    } finally {
      setSaving(false);
    }
  }

  function calculateWeightedScore() {
    let totalWeight = 0;
    let weightedSum = 0;
    for (const [category, score] of Object.entries(rubricScores)) {
      const weight = RUBRIC_WEIGHTS[category] || 0;
      totalWeight += weight;
      weightedSum += score * weight;
    }
    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }

  function toggleCategory(category: string) {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Helper to check if categoryScores contains detailed RubricCategoryScore objects
  function isDetailedCategoryScore(value: number | RubricCategoryScore | undefined): value is RubricCategoryScore {
    return typeof value === 'object' && value !== null && 'score' in value;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={32} className="animate-spin text-maroon-600" />
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle size={32} className="mx-auto text-red-500 mb-2" />
          <p className="text-red-700">{error || 'Submission not found'}</p>
          <Link href="/ta/submissions" className="mt-4 inline-block text-sm text-maroon-600 hover:underline">
            ← Back to Submissions
          </Link>
        </div>
      </div>
    );
  }

  const aiAnalytics = submission.aiAnalytics;
  const categoryScores = aiAnalytics?.categoryScores;

  return (
    <div className="mx-auto max-w-7xl animate-fade-in">
      {/* Back Button */}
      <Link
        href="/ta/submissions"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft size={16} />
        Back to Submissions
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">
            Review Submission
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <User size={14} />
              {submission.student
                ? `${submission.student.firstName} ${submission.student.lastName}`
                : 'Unknown Student'}
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {new Date(submission.submittedAt).toLocaleDateString()}
            </span>
            {submission.presentationDuration && submission.presentationDuration > 0 && (
              <span className="flex items-center gap-1">
                <Mic size={14} />
                Presentation: {formatDuration(submission.presentationDuration)}
              </span>
            )}
            {submission.sessionDuration && submission.sessionDuration > 0 && (
              <span className="flex items-center gap-1">
                <Clock size={14} />
                Q&A: {formatDuration(submission.sessionDuration)}
              </span>
            )}
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${submission.status === 'Reviewed'
          ? 'bg-green-100 text-green-700'
          : submission.status === 'Overridden'
            ? 'bg-orange-100 text-orange-700'
            : 'bg-yellow-100 text-yellow-700'
          }`}>
          {submission.status === 'Reviewed' && <CheckCircle size={14} />}
          {submission.status === 'Overridden' && <AlertTriangle size={14} />}
          {submission.status}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('video')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${activeTab === 'video'
                ? 'border-maroon-600 text-maroon-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              <Play size={14} className="inline mr-1" />
              Recording
            </button>
            <button
              onClick={() => setActiveTab('presentation')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${activeTab === 'presentation'
                ? 'border-maroon-600 text-maroon-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              <Mic size={14} className="inline mr-1" />
              Presentation
            </button>
            <button
              onClick={() => setActiveTab('qa')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${activeTab === 'qa'
                ? 'border-maroon-600 text-maroon-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              <MessageSquare size={14} className="inline mr-1" />
              Q&A Transcript
            </button>
            <button
              onClick={() => setActiveTab('rubric')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${activeTab === 'rubric'
                ? 'border-maroon-600 text-maroon-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              <FileSpreadsheet size={14} className="inline mr-1" />
              Rubric Grading
            </button>
          </div>

          {/* Tab Content */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            {/* Video Tab */}
            {activeTab === 'video' && (
              <div>
                {videoLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <Loader2 size={32} className="animate-spin mb-2" />
                    <p>Loading video...</p>
                  </div>
                ) : videoUrl ? (
                  <video
                    src={videoUrl}
                    controls
                    className="w-full rounded-lg bg-black"
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : videoError ? (
                  <div className="flex flex-col items-center justify-center py-12 text-red-400">
                    <AlertCircle size={48} />
                    <p className="mt-2">{videoError}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <Play size={48} />
                    <p className="mt-2">No recording available</p>
                    <p className="text-xs mt-1">Video recording was not captured for this session</p>
                  </div>
                )}
              </div>
            )}

            {/* Presentation Transcript Tab */}
            {activeTab === 'presentation' && (
              <div className="max-h-[500px] overflow-y-auto">
                {submission.presentationTranscript && submission.presentationTranscript.trim() ? (
                  <div className="prose prose-sm max-w-none">
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-sm text-blue-700 flex items-center gap-2">
                        <Mic size={16} />
                        <strong>Student Presentation</strong>
                        {submission.presentationDuration && (
                          <span className="ml-auto text-blue-500">
                            Duration: {formatDuration(submission.presentationDuration)}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg">
                      {submission.presentationTranscript}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <Mic size={48} />
                    <p className="mt-2">No presentation transcript available</p>
                    <p className="text-xs mt-1">The student&apos;s presentation was not transcribed</p>
                  </div>
                )}
              </div>
            )}

            {/* Q&A Transcript Tab */}
            {activeTab === 'qa' && (
              <div className="max-h-[500px] overflow-y-auto">
                {(submission.qaTranscript && submission.qaTranscript.length > 0) ||
                  (submission.transcript && submission.transcript.length > 0) ? (
                  <div className="space-y-3">
                    <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-100">
                      <p className="text-sm text-purple-700 flex items-center gap-2">
                        <MessageSquare size={16} />
                        <strong>Q&A Session with AI Stakeholder</strong>
                        {submission.sessionDuration && (
                          <span className="ml-auto text-purple-500">
                            Duration: {formatDuration(submission.sessionDuration)}
                          </span>
                        )}
                      </p>
                    </div>
                    {(submission.qaTranscript || submission.transcript || []).map((entry, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg ${entry.role === 'assistant'
                          ? 'bg-blue-50 border-l-4 border-blue-400'
                          : 'bg-gray-50 border-l-4 border-gray-400'
                          }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {entry.role === 'assistant' ? (
                            <Bot size={14} className="text-blue-600" />
                          ) : (
                            <User size={14} className="text-gray-600" />
                          )}
                          <span className="text-xs font-medium text-gray-500">
                            {entry.role === 'assistant' ? 'AI Stakeholder' : 'Student'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{entry.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <MessageSquare size={48} />
                    <p className="mt-2">No Q&A transcript available</p>
                  </div>
                )}
              </div>
            )}

            {/* Rubric Grading Tab */}
            {activeTab === 'rubric' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  Score each category from 0-100. Weights are shown for each dimension.
                </p>

                {Object.entries(rubricScores).map(([category, score]) => {
                  const aiCategoryScore = categoryScores?.[category];
                  const aiScore = isDetailedCategoryScore(aiCategoryScore)
                    ? aiCategoryScore.score
                    : (typeof aiCategoryScore === 'number' ? aiCategoryScore : null);
                  const aiLevel = isDetailedCategoryScore(aiCategoryScore)
                    ? aiCategoryScore.performanceLevel
                    : null;
                  const aiJustification = isDetailedCategoryScore(aiCategoryScore)
                    ? aiCategoryScore.justification
                    : null;
                  const aiEvidence = isDetailedCategoryScore(aiCategoryScore)
                    ? aiCategoryScore.evidence
                    : null;
                  const weight = RUBRIC_WEIGHTS[category] || 0;
                  const isExpanded = expandedCategories.has(category);

                  return (
                    <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Category Header */}
                      <div className="p-3 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <label className="text-sm font-medium text-gray-700">
                                {RUBRIC_LABELS[category] || category}
                              </label>
                              <span className="text-xs text-gray-400">({weight}%)</span>
                            </div>
                            {aiScore !== null && aiLevel && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs px-2 py-0.5 rounded ${PERFORMANCE_LEVELS[aiLevel]?.color || 'bg-gray-100 text-gray-600'}`}>
                                  AI: Level {aiLevel} - {PERFORMANCE_LEVELS[aiLevel]?.label}
                                </span>
                                <span className="text-xs text-blue-600 font-medium">
                                  {aiScore}%
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={score}
                              onChange={(e) => setRubricScores({
                                ...rubricScores,
                                [category]: Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                              })}
                              className="w-16 rounded border border-gray-300 px-2 py-1 text-sm text-center"
                            />
                            {(aiJustification || aiEvidence) && (
                              <button
                                onClick={() => toggleCategory(category)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                              </button>
                            )}
                          </div>
                        </div>
                        {/* Slider */}
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={score}
                          onChange={(e) => setRubricScores({
                            ...rubricScores,
                            [category]: parseInt(e.target.value)
                          })}
                          className="w-full mt-2 accent-maroon-600"
                        />
                      </div>

                      {/* Expanded AI Details */}
                      {isExpanded && (aiJustification || aiEvidence) && (
                        <div className="p-3 bg-blue-50 border-t border-blue-100 text-sm">
                          {aiJustification && (
                            <div className="mb-2">
                              <p className="font-medium text-blue-700 mb-1">AI Justification:</p>
                              <p className="text-gray-700">{aiJustification}</p>
                            </div>
                          )}
                          {aiEvidence && aiEvidence.length > 0 && (
                            <div>
                              <p className="font-medium text-blue-700 mb-1">Evidence from Transcript:</p>
                              <ul className="list-disc list-inside text-gray-600 space-y-1">
                                {aiEvidence.map((e, i) => (
                                  <li key={i} className="text-xs">&quot;{e}&quot;</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
                  <button
                    onClick={() => setReviewerScore(calculateWeightedScore())}
                    className="text-sm text-maroon-600 hover:underline"
                  >
                    Apply weighted rubric score ({calculateWeightedScore()}%) as final score
                  </button>
                  {submission.aiScore !== null && submission.aiScore !== undefined && (
                    <button
                      onClick={() => {
                        // Copy AI scores to reviewer scores
                        const newScores: Record<string, number> = {};
                        Object.keys(rubricScores).forEach(cat => {
                          const aiCat = categoryScores?.[cat];
                          if (isDetailedCategoryScore(aiCat) && aiCat.score !== null && aiCat.score !== undefined) {
                            newScores[cat] = aiCat.score;
                          } else if (typeof aiCat === 'number') {
                            newScores[cat] = aiCat;
                          } else {
                            newScores[cat] = rubricScores[cat];
                          }
                        });
                        setRubricScores(newScores);
                        setReviewerScore(submission.aiScore || 0);
                      }}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Copy AI scores
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* AI Analysis Summary */}
          {aiAnalytics?.overallSummary && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
                <Bot size={16} />
                AI Assessment Summary
              </h3>
              <p className="text-sm text-blue-800">{aiAnalytics.overallSummary}</p>
              {aiAnalytics.provisionalLabel && (
                <p className="text-xs text-blue-600 mt-2 italic">{aiAnalytics.provisionalLabel}</p>
              )}
            </div>
          )}

          {/* Instructor Review Flags */}
          {aiAnalytics?.instructorReviewFlags && aiAnalytics.instructorReviewFlags.length > 0 && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
              <h3 className="text-sm font-medium text-orange-900 mb-2 flex items-center gap-2">
                <Flag size={16} />
                Items Flagged for Instructor Review
              </h3>
              <ul className="list-disc list-inside text-sm text-orange-800 space-y-1">
                {aiAnalytics.instructorReviewFlags.map((flag, i) => (
                  <li key={i}>{flag}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column - Scoring Panel */}
        <div className="space-y-4">
          {/* Score Comparison */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Score Comparison</h3>
            <div className="space-y-4">
              {/* AI Score */}
              <div className="p-3 rounded-lg bg-blue-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Bot size={18} className="text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">AI Score</span>
                  </div>
                  <span className="text-xl font-bold text-blue-600">
                    {submission.aiScore !== undefined && submission.aiScore !== null
                      ? `${Math.round(submission.aiScore)}%`
                      : '—'}
                  </span>
                </div>

                {/* Generate AI Score Button - shown when no AI score exists */}
                {(submission.aiScore === undefined || submission.aiScore === null) && (
                  <button
                    onClick={handleGenerateAiScore}
                    disabled={generatingAiScore}
                    className="w-full mt-2 mb-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {generatingAiScore ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span className="flex flex-col items-center">
                          <span>Analyzing with Claude AI...</span>
                          <span className="text-xs opacity-75">This may take 30-60 seconds</span>
                        </span>
                      </>
                    ) : (
                      <>
                        <Bot size={16} />
                        Generate AI Score
                      </>
                    )}
                  </button>
                )}

                {/* AI Score Breakdown - 6 dimensions */}
                {categoryScores && Object.keys(categoryScores).length > 0 && (
                  <div className="mt-2 pt-2 border-t border-blue-100 space-y-1.5">
                    {Object.entries(categoryScores).map(([category, scoreData]) => {
                      const score = isDetailedCategoryScore(scoreData) ? scoreData.score : scoreData;
                      const level = isDetailedCategoryScore(scoreData) ? scoreData.performanceLevel : null;
                      return (
                        <div key={category} className="flex justify-between text-xs items-center">
                          <span className="text-blue-700 truncate flex-1" title={RUBRIC_LABELS[category] || category}>
                            {RUBRIC_LABELS[category]?.split('&')[0].trim() || category}
                          </span>
                          <div className="flex items-center gap-2">
                            {level && (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] ${PERFORMANCE_LEVELS[level]?.color || ''}`}>
                                L{level}
                              </span>
                            )}
                            <span className="font-medium text-blue-800 w-8 text-right">
                              {score !== null && score !== undefined ? `${score}%` : '—'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Confidence indicator */}
                {aiAnalytics?.overallConfidence && (
                  <div className="mt-2 pt-2 border-t border-blue-100">
                    <span className="text-xs text-blue-600">
                      Confidence: <span className="capitalize">{aiAnalytics.overallConfidence}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Reviewer Score */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                <div className="flex items-center gap-2">
                  <UserCheck size={18} className="text-green-600" />
                  <span className="text-sm font-medium text-gray-700">Reviewer Score</span>
                </div>
                <span className="text-xl font-bold text-green-600">
                  {submission.reviewerScore !== undefined && submission.reviewerScore !== null
                    ? `${submission.reviewerScore}%`
                    : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* AI Analytics Feedback */}
          {aiAnalytics?.feedback && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">AI Feedback</h3>
              <div className="space-y-3 text-sm">
                {aiAnalytics.feedback.strengths && aiAnalytics.feedback.strengths.length > 0 && (
                  <div>
                    <p className="font-medium text-green-700 mb-1">✓ Strengths</p>
                    <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                      {aiAnalytics.feedback.strengths.map((s, i) => (
                        <li key={i} className="text-xs">{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiAnalytics.feedback.improvements && aiAnalytics.feedback.improvements.length > 0 && (
                  <div>
                    <p className="font-medium text-orange-700 mb-1">⚠ Areas for Improvement</p>
                    <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                      {aiAnalytics.feedback.improvements.map((s, i) => (
                        <li key={i} className="text-xs">{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Inconsistencies / Unanswered Questions */}
          {((aiAnalytics?.inconsistencies && aiAnalytics.inconsistencies.length > 0) ||
            (aiAnalytics?.unansweredQuestions && aiAnalytics.unansweredQuestions.length > 0)) && (
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                <h3 className="text-sm font-medium text-yellow-900 mb-3 flex items-center gap-2">
                  <HelpCircle size={16} />
                  Notes
                </h3>
                <div className="space-y-2 text-xs">
                  {aiAnalytics.inconsistencies && aiAnalytics.inconsistencies.length > 0 && (
                    <div>
                      <p className="font-medium text-yellow-800">Inconsistencies Found:</p>
                      <ul className="list-disc list-inside text-yellow-700">
                        {aiAnalytics.inconsistencies.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {aiAnalytics.unansweredQuestions && aiAnalytics.unansweredQuestions.length > 0 && (
                    <div>
                      <p className="font-medium text-yellow-800">Unanswered Questions:</p>
                      <ul className="list-disc list-inside text-yellow-700">
                        {aiAnalytics.unansweredQuestions.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* Session Stats */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Session Stats</h3>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2 bg-gray-50 rounded">
                <p className="text-lg font-bold text-gray-900">{submission.questionsAsked || 0}</p>
                <p className="text-xs text-gray-500">Questions Asked</p>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <p className="text-lg font-bold text-gray-900">{submission.responsesGiven || 0}</p>
                <p className="text-xs text-gray-500">Responses Given</p>
              </div>
              {submission.presentationDuration && submission.presentationDuration > 0 && (
                <div className="p-2 bg-blue-50 rounded">
                  <p className="text-lg font-bold text-blue-900">
                    {formatDuration(submission.presentationDuration)}
                  </p>
                  <p className="text-xs text-blue-600">Presentation</p>
                </div>
              )}
              {submission.sessionDuration && submission.sessionDuration > 0 && (
                <div className="p-2 bg-purple-50 rounded">
                  <p className="text-lg font-bold text-purple-900">
                    {formatDuration(submission.sessionDuration)}
                  </p>
                  <p className="text-xs text-purple-600">Q&A Duration</p>
                </div>
              )}
            </div>
          </div>

          {/* Grading Form */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Grade Submission</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Final Score (0-100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={reviewerScore}
                  onChange={(e) => setReviewerScore(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Enter score"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-lg font-bold text-center focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Feedback for Student
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Enter feedback comments..."
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-maroon-500 focus:outline-none focus:ring-1 focus:ring-maroon-500"
                />
              </div>

              <button
                onClick={handleSaveGrade}
                disabled={saving || reviewerScore === ''}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-maroon-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-maroon-700 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {submission.reviewerScore !== undefined && submission.reviewerScore !== null
                  ? 'Update Grade'
                  : 'Save Grade'}
              </button>
            </div>
          </div>

          {/* Student Info */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Student Details</h3>
            {submission.student ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Name</span>
                  <span className="font-medium">{submission.student.firstName} {submission.student.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="font-medium text-xs">{submission.student.email}</span>
                </div>
                {submission.student.section && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Section</span>
                    <span className="font-medium">{submission.student.section}</span>
                  </div>
                )}
                {submission.sessionNumber && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Session</span>
                    <span className="font-medium">{submission.sessionNumber}</span>
                  </div>
                )}
                {submission.groupNumber && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Group</span>
                    <span className="font-medium">{submission.groupNumber}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Student information unavailable</p>
            )}
          </div>

          {/* Reviewed Info */}
          {submission.reviewedAt && (
            <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
              Last reviewed: {new Date(submission.reviewedAt).toLocaleString()}
              {submission.reviewedBy && ` by ${submission.reviewedBy}`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
