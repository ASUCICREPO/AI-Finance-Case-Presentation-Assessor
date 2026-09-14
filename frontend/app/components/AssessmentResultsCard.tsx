'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  Info,
  Star,
  TrendingUp,
  MessageSquare,
  Flag,
} from 'lucide-react';
import { AssessmentReport, PERFORMANCE_LEVELS, DEFAULT_RUBRIC, PerformanceLevel } from '@/app/config/config';

interface AssessmentResultsCardProps {
  assessment: AssessmentReport;
  showTranscript?: boolean;
  transcript?: Array<{ role: string; text: string }>;
  onAdjustScore?: (category: string, newScore: number) => void;
  isEditable?: boolean;
}

/**
 * AssessmentResultsCard - Displays detailed assessment results using the 6-dimension rubric.
 * Shows performance levels, scores, evidence, and justifications for each dimension.
 * Used in the Admin Dashboard to review student Q&A session results.
 */
export default function AssessmentResultsCard({
  assessment,
  showTranscript = false,
  transcript = [],
  onAdjustScore,
  isEditable = false,
}: AssessmentResultsCardProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showAllEvidence, setShowAllEvidence] = useState(false);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getPerformanceLevelColor = (level: PerformanceLevel) => {
    switch (level) {
      case 4:
        return 'bg-green-100 text-green-800 border-green-200';
      case 3:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 2:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 1:
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBadge = (confidence: 'high' | 'moderate' | 'low') => {
    switch (confidence) {
      case 'high':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">High Confidence</span>;
      case 'moderate':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Moderate Confidence</span>;
      case 'low':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Low Confidence</span>;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header with Overall Score */}
      <div className="bg-gradient-to-r from-maroon-600 to-maroon-700 p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold font-serif">Assessment Results</h2>
            <p className="text-maroon-100 text-sm mt-1">
              {assessment.rubricName || 'Standardized Cross-Case Assessment Rubric'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{Math.round(assessment.overallScore)}</div>
            <div className="text-maroon-200 text-sm">Overall Score</div>
          </div>
        </div>
        
        {/* Overall Confidence */}
        <div className="mt-4 flex items-center gap-3">
          {getConfidenceBadge(assessment.overallConfidence)}
          {assessment.provisionalLabel && (
            <span className="text-xs text-maroon-200 flex items-center gap-1">
              <Info size={12} />
              Provisional Assessment
            </span>
          )}
        </div>
      </div>

      {/* Overall Summary */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <p className="text-sm text-gray-700">{assessment.overallSummary}</p>
      </div>

      {/* Category Scores */}
      <div className="p-4">
        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Star size={16} className="text-maroon-600" />
          Dimension Scores
        </h3>

        <div className="space-y-3">
          {Object.entries(assessment.categoryScores).map(([key, score]) => {
            const rubricConfig = DEFAULT_RUBRIC[key as keyof typeof DEFAULT_RUBRIC];
            const isExpanded = expandedCategories.has(key);
            const levelConfig = PERFORMANCE_LEVELS[score.performanceLevel as PerformanceLevel];

            return (
              <div
                key={key}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(key)}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg ${getPerformanceLevelColor(
                        score.performanceLevel as PerformanceLevel
                      )}`}
                    >
                      {score.score}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">{rubricConfig?.name || key}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`text-xs px-2 py-0.5 rounded border ${getPerformanceLevelColor(
                            score.performanceLevel as PerformanceLevel
                          )}`}
                        >
                          Level {score.performanceLevel}: {levelConfig?.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          Weight: {rubricConfig?.weight || 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getConfidenceBadge(score.confidence)}
                    {isExpanded ? (
                      <ChevronUp size={18} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={18} className="text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    {/* Justification */}
                    <div className="mb-4">
                      <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">Justification</h4>
                      <p className="text-sm text-gray-600">{score.justification}</p>
                    </div>

                    {/* Evidence */}
                    {score.evidence && score.evidence.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">Evidence</h4>
                        <ul className="space-y-2">
                          {score.evidence.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                              <MessageSquare size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                              <span className="italic">"{item}"</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Dimension Description */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500">{rubricConfig?.description}</p>
                    </div>

                    {/* Score Adjustment (if editable) */}
                    {isEditable && onAdjustScore && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <label className="text-xs font-bold text-gray-700">Adjust Score</label>
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={score.score}
                            onChange={(e) => onAdjustScore(key, Number(e.target.value))}
                            className="flex-1"
                          />
                          <span className="w-12 text-center text-sm font-medium">{score.score}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Strengths & Improvements */}
      <div className="p-4 border-t border-gray-200 grid md:grid-cols-2 gap-4">
        {/* Strengths */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-green-600" />
            Key Strengths
          </h3>
          <ul className="space-y-2">
            {assessment.strengths.map((strength, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                {strength}
              </li>
            ))}
          </ul>
        </div>

        {/* Improvements */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-yellow-600" />
            Areas for Improvement
          </h3>
          <ul className="space-y-2">
            {assessment.improvements.map((improvement, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-2 flex-shrink-0" />
                {improvement}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Inconsistencies & Flags */}
      {(assessment.inconsistencies?.length || assessment.instructorReviewFlags?.length) && (
        <div className="p-4 border-t border-gray-200 bg-red-50">
          {assessment.inconsistencies && assessment.inconsistencies.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-bold text-red-800 mb-2 flex items-center gap-2">
                <AlertTriangle size={16} />
                Inconsistencies Detected
              </h3>
              <ul className="space-y-1">
                {assessment.inconsistencies.map((item, idx) => (
                  <li key={idx} className="text-sm text-red-700">• {item}</li>
                ))}
              </ul>
            </div>
          )}

          {assessment.instructorReviewFlags && assessment.instructorReviewFlags.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-red-800 mb-2 flex items-center gap-2">
                <Flag size={16} />
                Items for Instructor Review
              </h3>
              <ul className="space-y-1">
                {assessment.instructorReviewFlags.map((item, idx) => (
                  <li key={idx} className="text-sm text-red-700">• {item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Evidence Citations */}
      {assessment.evidenceCitations && assessment.evidenceCitations.length > 0 && (
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => setShowAllEvidence(!showAllEvidence)}
            className="flex items-center gap-2 text-sm font-medium text-maroon-600 hover:text-maroon-700"
          >
            <MessageSquare size={16} />
            {showAllEvidence ? 'Hide' : 'Show'} All Evidence Citations ({assessment.evidenceCitations.length})
            {showAllEvidence ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showAllEvidence && (
            <div className="mt-3 space-y-2">
              {assessment.evidenceCitations.map((citation, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600 italic">
                  "{citation}"
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Unanswered Questions */}
      {assessment.unansweredQuestions && assessment.unansweredQuestions.length > 0 && (
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-sm font-bold text-gray-900 mb-2">Questions Not Adequately Answered</h3>
          <ul className="space-y-1">
            {assessment.unansweredQuestions.map((question, idx) => (
              <li key={idx} className="text-sm text-gray-600">• {question}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Provisional Notice */}
      <div className="p-4 border-t border-gray-200 bg-blue-50">
        <div className="flex items-start gap-2">
          <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            {assessment.provisionalLabel || 
              'AI-generated provisional assessment. The instructor retains final authority over the student\'s grade and may adjust or disregard this assessment after reviewing the recording, transcript, submission, and report.'}
          </p>
        </div>
      </div>
    </div>
  );
}
