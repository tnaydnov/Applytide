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

        // Lock body scroll when modal opens
        document.body.style.overflow = "hidden";

        // Handle Escape key
        const handleEsc = (e) => {
            if (e.key === "Escape") onClose?.();
        };

        window.addEventListener("keydown", handleEsc);

        // Cleanup
        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", handleEsc);
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


    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 z-50"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex items-center justify-center">
                <div className="w-full max-w-5xl flex flex-col">
                    <ModalSurface
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="analysis-title"
                        className="rounded-xl shadow-xl max-h-[calc(100vh-2rem)] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center p-6 border-b border-white/10">
                            <h2
                                id="analysis-title"
                                className="text-xl font-semibold text-white"
                            >
                                Resume Analysis: {documentName}
                            </h2>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                aria-label="Close"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>

                        {/* Content - Scrollable container */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Overall Score */}
                            <div className="rounded-xl bg-slate-800/50 p-6">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div>
                                        <h3 className="text-lg font-medium text-white mb-1">
                                            Overall ATS Score {isJobSpecific ? "(Job Match)" : ""}
                                        </h3>
                                        <p className="text-white/70">
                                            {isJobSpecific
                                                ? "Resume evaluated against the selected job description"
                                                : "Generic ATS-readiness evaluation"}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <div className="text-sm text-white/50">80-100: Good</div>
                                            <div className="text-sm text-white/50">60-79: Fair</div>
                                            <div className="text-sm text-white/50">0-60: Needs work</div>
                                        </div>

                                        <div className={`w-24 h-24 rounded-full ${overallColor} flex items-center justify-center`}>
                                            <div className="text-2xl font-bold text-white">
                                                {overall ? `${Math.round(overall)}%` : "N/A"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Job-Specific Analysis */}
                            {isJobSpecific && (
                                <div className="rounded-xl bg-slate-800/50 p-6">
                                    <div className="flex items-start gap-2 mb-3">
                                        <div className="mt-0.5 text-pink-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                <polyline points="14 2 14 8 20 8"></polyline>
                                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                                <polyline points="10 9 9 9 8 9"></polyline>
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-medium text-white">Job-Specific Analysis</h3>
                                    </div>

                                    <p className="text-white/80 leading-relaxed mb-4">
                                        This analysis compares your resume against job skills/requirements and provides targeted feedback.
                                    </p>

                                    {jobSummary && (
                                        <div className="bg-slate-700/50 rounded-lg p-4 text-white/90 leading-relaxed">
                                            {jobSummary}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Section Quality Analysis */}
                            <div className="rounded-xl bg-slate-800/50 p-6">
                                <div className="flex items-start gap-2 mb-4">
                                    <div className="mt-0.5 text-blue-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                                            <polyline points="13 2 13 9 20 9"></polyline>
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-medium text-white">Section Quality Analysis</h3>
                                </div>

                                <div className="space-y-4">
                                    {ats.section_scores && Object.entries(ats.section_scores).map(([section, score]) => (
                                        <div key={section} className="flex items-center justify-between gap-3">
                                            <div className="font-medium text-white">{section}</div>
                                            <div className="flex items-center gap-2 min-w-[10rem] justify-end">
                                                <div className="w-full max-w-xs h-2 bg-slate-700 rounded overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-500"
                                                        style={{ width: `${score}%` }}
                                                    />
                                                </div>
                                                <div className="text-white/90 text-sm font-medium w-10 text-right">
                                                    {score}%
                                                </div>
                                                <div className="text-white/50 text-sm min-w-[5rem]">
                                                    {score > 80 ? "Good" : score > 60 ? "Fair" : "Needs work"}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Language Analysis */}
                            {ai.language_analysis && (
                                <div className="rounded-xl bg-slate-800/50 p-6">
                                    <div className="flex items-start gap-2 mb-4">
                                        <div className="mt-0.5 text-indigo-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-medium text-white">Language Analysis</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-slate-700/50 rounded-lg p-4">
                                            <div className="text-2xl font-bold text-white mb-1 text-center">
                                                {ai.language_analysis.action_verbs?.count || "N/A"}
                                            </div>
                                            <div className="text-center text-white/70 mb-3">Action Verbs</div>
                                            <p className="text-sm text-white/80">
                                                {ai.language_analysis.action_verbs?.analysis || "Consider adding more impactful verbs."}
                                            </p>
                                        </div>

                                        <div className="bg-slate-700/50 rounded-lg p-4">
                                            <div className="text-2xl font-bold text-white mb-1 text-center">
                                                {ai.language_analysis.readability?.score ? `${ai.language_analysis.readability.score}%` : "N/A"}
                                            </div>
                                            <div className="text-center text-white/70 mb-3">Readability</div>
                                            <p className="text-sm text-white/80">
                                                {ai.language_analysis.readability?.analysis || "Focus on making content clearer and more concise."}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Key Recommendations */}
                            {ai.key_recommendations && ai.key_recommendations.length > 0 && (
                                <div className="rounded-xl bg-slate-800/50 p-6">
                                    <div className="flex items-start gap-2 mb-4">
                                        <div className="mt-0.5 text-yellow-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-medium text-white">Key Recommendations</h3>
                                    </div>

                                    <div className="space-y-3">
                                        {ai.key_recommendations.map((rec, i) => (
                                            <div key={i} className="bg-slate-700/50 rounded-lg p-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="bg-yellow-500/20 text-yellow-300 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                                                        {i + 1}
                                                    </div>
                                                    <p className="text-white/90">{rec}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Document Statistics */}
                            <div className="rounded-xl bg-slate-800/50 p-6">
                                <h3 className="text-lg font-medium text-white mb-4">Document Statistics</h3>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-slate-700/50 rounded-lg p-4">
                                        <div className="text-2xl font-bold text-white mb-1 text-center">
                                            {ats.word_count || "N/A"}
                                        </div>
                                        <div className="text-center text-white/70">Words</div>
                                    </div>

                                    <div className="bg-slate-700/50 rounded-lg p-4">
                                        <div className="text-2xl font-bold text-white mb-1 text-center">
                                            {typeof ats.readability_score === 'number' ? `${Math.round(ats.readability_score * 100)}%` : "N/A"}
                                        </div>
                                        <div className="text-center text-white/70">Readability</div>
                                    </div>

                                    <div className="bg-slate-700/50 rounded-lg p-4">
                                        <div className="text-2xl font-bold text-white mb-1 text-center">
                                            {ats.missing_sections?.length || 0}
                                        </div>
                                        <div className="text-center text-white/70">Missing Sections</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-white/10 p-4 flex justify-end space-x-2">
                            {onExportMarkdown && (
                                <button
                                    onClick={onExportMarkdown}
                                    className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 transition-colors text-white"
                                >
                                    Export as Markdown
                                </button>
                            )}

                            {onExportPDF && (
                                <button
                                    onClick={onExportPDF}
                                    className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 transition-colors text-white"
                                >
                                    Export as PDF
                                </button>
                            )}
                        </div>
                    </ModalSurface>
                </div>
            </div>
        </>
    );
}
