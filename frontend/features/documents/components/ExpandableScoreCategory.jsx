import React, { useState, useMemo } from "react";

/**
 * ExpandableScoreCategory
 * Collapsible block showing a category score + AI-driven details.
 *
 * Props:
 * - title: string
 * - score: number (0-100)
 * - description: string
 * - aiData?: {
 *     improvements?: Array<{ suggestion: string, example_before?: string, example_after?: string, example?: string }>,
 *     strengths?: string[],
 *     weaknesses?: string[],
 *     missing_elements?: string[]
 *   }
 *
 * Notes:
 * - This component is fully defensive against missing/partial data.
 * - Parent should pass the AI slice for this category (e.g., analysis.ai_detailed_analysis?.technical_skills).
 */
export default function ExpandableScoreCategory({
  title = "Category",
  score = 0,
  description = "",
  aiData = {},
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    improvements = [],
    strengths = [],
    weaknesses = [],
    missing_elements = [],
  } = aiData || {};

  const hasAIData = useMemo(() => {
    return Boolean(
      (Array.isArray(improvements) && improvements.length) ||
        (Array.isArray(strengths) && strengths.length) ||
        (Array.isArray(weaknesses) && weaknesses.length) ||
        (Array.isArray(missing_elements) && missing_elements.length)
    );
  }, [improvements, strengths, weaknesses, missing_elements]);

  const dotColor =
    Number(score) >= 80
      ? "bg-green-500"
      : Number(score) >= 60
      ? "bg-yellow-500"
      : "bg-red-500";

  const scoreColor =
    Number(score) >= 80
      ? "text-green-400"
      : Number(score) >= 60
      ? "text-yellow-400"
      : "text-red-400";

  return (
    <div className="rounded-lg border border-white/10 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center justify-between p-3 focus:outline-none hover:bg-white/5 transition-colors"
        aria-expanded={isExpanded}
        aria-controls={`${title.replace(/\s+/g, "-").toLowerCase()}-panel`}
      >
        <div className="flex items-center min-w-0">
          <span className={`inline-block w-2 h-2 mr-3 rounded-full ${dotColor}`} />
          <span className="font-medium text-slate-200 truncate">{title}</span>
        </div>
        <div className="flex items-center">
          <span className={`mr-3 font-semibold ${scoreColor}`}>
            {Number(score).toFixed(1)}%
          </span>
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div
          id={`${title.replace(/\s+/g, "-").toLowerCase()}-panel`}
          className="p-4 bg-slate-900/50 border-t border-white/10"
        >
          {description && (
            <p className="text-sm text-slate-300 leading-relaxed break-words mb-4">
              {description}
            </p>
          )}

          {/* Missing elements */}
          {Array.isArray(missing_elements) && missing_elements.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs uppercase tracking-wider text-slate-400 mb-2">
                Missing Elements
              </h4>
              <div className="flex flex-wrap gap-2">
                {missing_elements.map((item, i) => (
                  <span
                    key={`${item}-${i}`}
                    className="px-2 py-1 text-xs rounded bg-red-500/20 text-red-300 border border-red-500/30"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Strengths */}
          {Array.isArray(strengths) && strengths.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs uppercase tracking-wider text-green-400 mb-2">
                Strengths
              </h4>
              <ul className="space-y-1">
                {strengths.map((s, i) => (
                  <li key={`strength-${i}`} className="text-sm flex items-start">
                    <span className="text-green-400 mr-2">✓</span>
                    <span className="text-slate-200">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weaknesses */}
          {Array.isArray(weaknesses) && weaknesses.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs uppercase tracking-wider text-amber-400 mb-2">
                Areas to Improve
              </h4>
              <ul className="space-y-1">
                {weaknesses.map((w, i) => (
                  <li key={`weakness-${i}`} className="text-sm flex items-start">
                    <span className="text-amber-400 mr-2">!</span>
                    <span className="text-slate-200">{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {Array.isArray(improvements) ? (
            improvements.length > 0 ? (
              <div className="mt-4">
                <h4 className="text-xs uppercase tracking-wider text-indigo-400 mb-2">
                  Personalized Suggestions
                </h4>
                <div className="space-y-3">
                  {improvements.map((imp, i) => (
                    <div
                      key={`improvement-${i}`}
                      className="bg-slate-800/60 rounded-lg p-3 border border-indigo-500/20"
                    >
                      {imp?.suggestion && (
                        <p className="text-sm text-slate-100 mb-2">{imp.suggestion}</p>
                      )}

                      {imp?.example_before && imp?.example_after && (
                        <div className="mt-2 text-xs">
                          <div className="flex gap-2 items-center mb-1">
                            <div className="bg-red-500/20 px-2 py-0.5 rounded text-red-300">
                              Before
                            </div>
                            <div className="text-slate-400">{imp.example_before}</div>
                          </div>
                          <div className="flex gap-2 items-center">
                            <div className="bg-green-500/20 px-2 py-0.5 rounded text-green-300">
                              After
                            </div>
                            <div className="text-slate-300">{imp.example_after}</div>
                          </div>
                        </div>
                      )}

                      {imp?.example && !imp?.example_before && (
                        <div className="mt-2 text-xs">
                          <div className="flex gap-2 items-center">
                            <div className="bg-blue-500/20 px-2 py-0.5 rounded text-blue-300">
                              Example
                            </div>
                            <div className="text-slate-300">{imp.example}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-3 text-slate-400 text-sm">
                No personalized suggestions available.
              </div>
            )
          ) : (
            <div className="text-center py-3 text-slate-400 text-sm">
              No personalized suggestions for this category.
            </div>
          )}

          {!hasAIData && (
            <div className="mt-3 text-center text-slate-500 text-xs">
              (No additional insights available.)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
