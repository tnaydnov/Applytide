import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Button } from "../../../components/ui";
import ExpandableScoreCategory from "./ExpandableScoreCategory";
import { getScoreColor } from "../utils/helpers";
import ModalSurface from "./ModalSurface";

/**
 * AnalysisModal
 * Read-only viewer for an AI resume/document analysis.
 *
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - analysis?: {
 *     overall_score?: number, // 0-100
 *     summary?: string,
 *     categories?: Array<{
 *       key: string,
 *       title: string,
 *       score?: number,
 *       description?: string,
 *       ai?: {
 *         improvements?: Array<{ suggestion: string, example_before?: string, example_after?: string, example?: string }>,
 *         strengths?: string[],
 *         weaknesses?: string[],
 *         missing_elements?: string[],
 *       }
 *     }>
 *   }
 * - documentName?: string
 * - onExportMarkdown?: () => void
 * - onExportPDF?: () => void
 */
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
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const overall = Number(analysis?.overall_score ?? 0);
  const overallColor = getScoreColor(overall)?.replace("text-", "bg-") || "bg-slate-500";
  const categories = useMemo(
    () => (Array.isArray(analysis?.categories) ? analysis.categories : []),
    [analysis?.categories]
  );

  if (!open) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
      />

      {/* Surface */}
      <div className="fixed z-50 inset-0 p-4 flex items-center justify-center">
        <ModalSurface
          role="dialog"
          aria-modal="true"
          aria-labelledby="analysis-title"
          className="w-full max-w-5xl h-[88vh] rounded-2xl ring-1 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
            <div className="min-w-0">
              <h2 id="analysis-title" className="text-xl font-bold text-slate-100 truncate">
                AI Analysis — {documentName}
              </h2>
              {analysis?.summary && (
                <p className="text-sm text-slate-400 mt-1 line-clamp-2">{analysis.summary}</p>
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

          {/* Overall Score Bar */}
          <div className="px-6 py-4 border-b border-white/10 bg-slate-900/40">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${overallColor} rounded-lg grid place-items-center text-slate-900 font-bold`}>
                  {Number.isFinite(overall) ? Math.round(overall) : 0}
                </div>
                <div>
                  <p className="text-sm text-slate-400">Overall ATS Score</p>
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
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {categories.length > 0 ? (
              categories.map((c) => (
                <ExpandableScoreCategory
                  key={c.key || c.title}
                  title={c.title || "Category"}
                  score={c.score ?? 0}
                  description={c.description || ""}
                  aiData={c.ai || {}}
                />
              ))
            ) : (
              <div className="text-center text-slate-400 py-12">
                No category details available for this analysis.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-white/10 bg-white/5 flex items-center justify-end">
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
