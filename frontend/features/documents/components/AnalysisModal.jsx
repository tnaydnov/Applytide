import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "../../../components/ui";
import ExpandableScoreCategory from "./ExpandableScoreCategory";
import { getScoreColor } from "../utils/helpers";
import ModalSurface from "./ModalSurface";

export default function AnalysisModal({
  open,
  onClose,
  analysis = {},
  documentName = "Document",
  onExportMarkdown,
  onExportPDF,
}) {
  // scroll lock + esc to close
    useEffect(() => {
    if (!open) return;

    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);


  if (!open) return null;

  // Work directly with the raw API shape (like the original page)
  const ats = analysis?.ats_score || {};
  const ai = analysis?.ai_detailed_analysis || {};
  const overall = Number(ats.overall_score ?? 0);
  const overallColor = getScoreColor(overall)?.replace("text-", "bg-") || "bg-slate-500";

  const isJobSpecific =
    ats.technical_skills_score != null ||
    Boolean(analysis?.job_match_summary);

  const jobSummary =
    typeof analysis?.job_match_summary === "string"
      ? analysis.job_match_summary
      : analysis?.job_match_summary?.summary;

  return createPortal(
    <>
      {/* Backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
      />

      {/* Surface */}
      <div className="fixed z-50 inset-0 p-4 flex items-center justify-center overflow-hidden">
        <ModalSurface
          role="dialog"
          aria-modal="true"
          aria-labelledby="analysis-title"
          className="w-[min(1360px,96vw)] max-w-none h-[calc(100dvh-2rem)] max-h-[calc(100dvh-2rem)] flex flex-col rounded-2xl ring-1 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex items-center justify-between shrink-0">
            <div className="min-w-0">
              <h2 id="analysis-title" className="text-xl font-bold text-slate-100 truncate">
                AI Analysis — {documentName}
              </h2>
              {jobSummary ? (
                <p className="text-sm text-slate-400 mt-1 line-clamp-2">{jobSummary}</p>
              ) : (
                <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                  {isJobSpecific
                    ? "Job-specific analysis of this resume."
                    : "General resume analysis — select a job for detailed matching."}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onExportMarkdown && (
                <Button
                  variant="outline"
                  onClick={onExportMarkdown}
                  className="text-sm border-slate-600 text-slate-300 hover:bg-slate-700/40"
                >
                  ⬇️ Markdown
                </Button>
              )}
              {onExportPDF && (
                <Button
                  variant="outline"
                  onClick={onExportPDF}
                  className="text-sm border-slate-600 text-slate-300 hover:bg-slate-700/40"
                >
                  ⬇️ PDF
                </Button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/5 transition"
                aria-label="Close"
                type="button"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Overall Score Bar (kept from new UI) */}
          <div className="px-6 py-4 border-b border-white/10 bg-slate-900/40 shrink-0">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${overallColor} rounded-lg grid place-items-center text-slate-900 font-bold`}>
                  {Number.isFinite(overall) ? Math.round(overall) : 0}
                </div>
                <div>
                  <p className="text-sm text-slate-400">
                    {isJobSpecific ? "Overall ATS Score (Job Match)" : "Overall ATS Score"}
                  </p>
                  <p className={`text-lg font-semibold ${getScoreColor(overall)}`}>
                    {Number(overall || 0).toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full" /> 80–100 Good
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full" /> 60–79 Fair
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block w-2 h-2 bg-red-500 rounded-full" /> &lt; 60 Needs work
                </span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 space-y-4">

            {/* Analysis type banner (from original page) */}
            <div
              className={`p-4 rounded-lg border ${
                isJobSpecific
                  ? "bg-blue-900/30 border-blue-500/30 text-blue-200"
                  : "bg-amber-900/30 border-amber-500/30 text-amber-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{isJobSpecific ? "🎯" : "📊"}</span>
                <strong className="text-slate-200">
                  {isJobSpecific ? "Job-Specific Analysis" : "General Resume Analysis"}
                </strong>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed break-words m-0">
                {isJobSpecific
                  ? "This analysis compares your resume against job skills/requirements and provides targeted feedback."
                  : "This is a general analysis. Select a job for tailored matching."}
              </p>
            </div>

            {/* Collapsible score categories – derived directly from ats_score + ai_detailed_analysis */}
            {ats.technical_skills_score != null && (
              <ExpandableScoreCategory
                title="Technical Skills"
                score={ats.technical_skills_score}
                description="How well your technical skills align with job requirements"
                aiData={ai.technical_skills || {}}
              />
            )}

            {ats.soft_skills_score != null && (
              <ExpandableScoreCategory
                title="Soft Skills"
                score={ats.soft_skills_score}
                description="Presence of important soft skills relevant to this role"
                aiData={ai.soft_skills || {}}
              />
            )}

            {(ats.keyword_score != null || ai.keywords) && (
              <ExpandableScoreCategory
                title="Keywords"
                score={ats.keyword_score ?? 0}
                description="Job-specific terminology and industry language match"
                aiData={ai.keywords || {}}
              />
            )}

            {ats.formatting_score != null && (
              <ExpandableScoreCategory
                title="Formatting"
                score={ats.formatting_score}
                description="ATS-friendly structure and organization"
                aiData={ai.formatting || {}}
              />
            )}

            {/* Enhanced Section Quality (original extra block) */}
            {analysis.section_quality && Object.keys(analysis.section_quality).length > 0 && (
              <div className="p-4 rounded-lg border bg-slate-800/60 border-white/20">
                <h3 className="font-semibold mb-3 text-blue-300">📝 Section Quality Analysis</h3>
                <div className="space-y-3">
                  {Object.entries(analysis.section_quality).map(([section, data]) => (
                    <div key={section} className="flex items-center justify-between">
                      <span className="text-slate-200">{section}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-slate-700 rounded overflow-hidden">
                          <div
                            className={`h-2 rounded ${
                              Number(data.score) >= 80
                                ? "bg-green-500"
                                : Number(data.score) >= 60
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${Number(data.score || 0)}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400">{Number(data.score || 0).toFixed(0)}%</span>
                        {data.improvement_needed && (
                          <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded">Needs work</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Language / readability (original extra block) */}
            {analysis.action_verb_count !== undefined && (
              <div className="p-4 rounded-lg border bg-slate-800/60 border-white/20">
                <h3 className="font-semibold mb-3 text-blue-300">🔤 Language Analysis</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-slate-100">{analysis.action_verb_count}</div>
                    <p className="text-xs text-slate-400">Action Verbs</p>
                    <div className="mt-2 text-xs text-slate-300">
                      {Number(analysis.action_verb_count) >= 10
                        ? "Strong use of action verbs"
                        : "Consider adding more impactful verbs"}
                    </div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-slate-100">
                      {analysis.readability_score != null ? `${Number(analysis.readability_score).toFixed(0)}%` : "N/A"}
                    </div>
                    <p className="text-xs text-slate-400">Readability</p>
                    <div className="mt-2 text-xs text-slate-300">
                      {Number(analysis.readability_score || 0) >= 70
                        ? "Good content structure"
                        : "Content needs improvement"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Overall AI recommendations */}
            {ai?.overall_suggestions?.length > 0 && (
              <div className="p-4 rounded-lg border bg-slate-800/60 border-white/20">
                <h3 className="font-semibold mb-3 text-slate-100 flex items-center">
                  <span className="text-indigo-400 mr-2">✨</span> Key Recommendations
                </h3>
                <div className="grid gap-3">
                  {ai.overall_suggestions.map((suggestion, i) => (
                    <div
                      key={`${suggestion}-${i}`}
                      className="p-3 rounded-lg border border-indigo-500/20 bg-indigo-500/10 hover:bg-indigo-500/15 transition-colors"
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300 mr-3 mt-0.5">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-slate-200">{suggestion}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="p-4 rounded-lg border bg-slate-800/60 border-white/20">
              <h3 className="font-semibold mb-3 text-slate-100">Document Statistics</h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-lg font-bold text-slate-100">{analysis.word_count || 0}</div>
                  <p className="text-xs text-slate-400">Words</p>
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-100">
                    {Number(analysis.readability_score || 0).toFixed(1)}%
                  </div>
                  <p className="text-xs text-slate-400">Readability</p>
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-100">{analysis.missing_sections?.length || 0}</div>
                  <p className="text-xs text-slate-400">Missing Sections</p>
                </div>
              </div>
            </div>

            {/* Missing sections */}
            {Array.isArray(analysis.missing_sections) && analysis.missing_sections.length > 0 && (
              <div className="p-4 rounded-lg border bg-amber-500/10 border-amber-500/30">
                <h3 className="font-semibold mb-3 text-amber-300">⚠️ Missing Sections</h3>
                <ul className="list-disc pl-5 m-0 space-y-2 text-slate-100">
                  {analysis.missing_sections.map((s, i) => (
                    <li key={`${s}-${i}`}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-white/10 bg-white/5 flex items-center justify-end shrink-0">
            <button onClick={onClose} className="btn-ghost px-6 py-2.5 rounded-lg" type="button">
              Close
            </button>
          </div>
        </ModalSurface>
      </div>
    </>,
    document.body
  );
}
