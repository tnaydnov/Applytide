import { useMemo } from "react";
import { Card, Button } from "../../../components/ui";
import DocumentIcon from "./DocumentIcon";
import StatusDropdown from "./StatusDropdown";
import { getDocName, getScoreColor } from "../utils/helpers";

/**
 * DocumentCard
 * Stateless UI card for a single document with actions.
 *
 * Props:
 * - document: object (required)
 * - documentTypes: Array<{ value, label, icon }>
 * - statusOptions: Array<{ value, label, color }>
 * - analyzing: boolean
 * - jobsCount: number
 * - onAnalyze: (doc) => void
 * - onAnalyzeWithJob: (doc) => void
 * - onPreview: (doc) => void
 * - onDownload: (doc) => void
 * - onDelete: (doc) => void
 * - onChangeStatus: (id, newStatus) => void
 */
export default function DocumentCard({
  document,
  documentTypes = [],
  statusOptions = [],
  analyzing = false,
  jobsCount = 0,
  onAnalyze,
  onAnalyzeWithJob,
  onPreview,
  onDownload,
  onDelete,
  onChangeStatus,
}) {
  // Guard early
  if (!document || !document.id) return null;

  const docType = useMemo(() => {
    const found =
      documentTypes.find((t) => t.value === document.type) ||
      { value: "other", label: "Other", icon: "other" };
    return found;
  }, [document?.type, documentTypes]);

  const docStatus = useMemo(() => {
    return (
      statusOptions.find((s) => s.value === document.status) ||
      statusOptions[0] || { value: "active", label: "Active" }
    );
  }, [document?.status, statusOptions]);

  const name = getDocName(document);
  const format = (document?.format || "txt").toUpperCase();
  const sizeKb = (((document?.file_size || 0) / 1024) || 0).toFixed(1);
  const createdAt =
    document?.created_at ? new Date(document.created_at).toLocaleDateString() : "-";

  const atsVal = Number(document?.ats_score);
  const atsTier = Number.isFinite(atsVal) ? (atsVal >= 80 ? "good" : atsVal >= 60 ? "fair" : "poor") : null;
  const atsBadgeCls =
    atsTier === "good"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      : atsTier === "fair"
      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
      : atsTier === "poor"
      ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
      : "bg-slate-600/30 text-slate-300 border-slate-600/40";

  return (
    <Card className="p-4 md:p-5 hover:shadow-lg transition-shadow glass-card glass-cyan">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3 *:min-w-0">
        <div className="flex items-center flex-1 min-w-0 overflow-hidden">
          <div className="text-2xl mr-3 flex-shrink-0">
            <DocumentIcon type={docType.icon} />
          </div>
          <div className="min-w-0 overflow-hidden flex-1">
            <h3 className="font-semibold text-slate-200 truncate w-full" title={name}>
              {name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span className="inline-flex items-center gap-1">
                {docType.label}
                <span className="px-1.5 py-0.5 bg-slate-700/80 text-[10px] font-medium rounded text-slate-300 ml-1">
                  {format}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: ATS + Status */}
        <div className="flex flex-col items-end gap-2 flex-none">
          <div className={`px-2 py-1 rounded border text-xs font-semibold ${atsBadgeCls}`}>
            {Number.isFinite(atsVal) ? `${atsVal.toFixed(1)}% ATS` : "No Score"}
          </div>
          <StatusDropdown
            value={document.status}
            options={statusOptions}
            onChange={(v) => onChangeStatus?.(document.id, v)}
          />
        </div>
      </div>

      {/* Meta (compact row) */}
      <div className="mb-4 text-xs text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>{sizeKb} KB</span>
        <span className="opacity-40">•</span>
        <span>Created {createdAt}</span>
      </div>

      {/* Primary Resume Action */}
      {document.type === "resume" && (
        <div className="mb-3">
          <Button
            onClick={() => onAnalyze?.(document)}
            variant="outline"
            size="sm"
            className="w-full bg-blue-600/30 hover:bg-blue-600/50 text-blue-50 border-blue-500/30 font-semibold"
            disabled={!!analyzing}
          >
            {analyzing ? "🔄" : "🔍"} {analyzing ? "Analyzing..." : "Analyze Resume"}
          </Button>
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          onClick={() => onPreview?.(document)}
          variant="outline"
          size="sm"
          className="flex flex-col items-center justify-center py-2 h-auto hover:bg-slate-700/40"
          title={
            document?.format?.toLowerCase() === "docx"
              ? "DOCX preview not available"
              : "Preview document"
          }
        >
          <span className="text-lg mb-1">👁️</span>
          <span className="text-xs">Preview</span>
        </Button>

        <Button
          onClick={() => onDownload?.(document)}
          variant="outline"
          size="sm"
          className="flex flex-col items-center justify-center py-2 h-auto hover:bg-slate-700/40"
          title="Download document"
        >
          <span className="text-lg mb-1">📥</span>
          <span className="text-xs">Download</span>
        </Button>

        <Button
          onClick={() => onDelete?.(document)}
          variant="outline"
          size="sm"
          className="flex flex-col items-center justify-center py-2 h-auto text-red-400 hover:text-red-300 hover:bg-red-900/20"
          title="Delete document"
        >
          <span className="text-lg mb-1">🗑️</span>
          <span className="text-xs">Delete</span>
        </Button>
      </div>

      {/* Secondary resume action */}
      {document.type === "resume" && Number(jobsCount) > 0 && (
        <div className="mt-3">
          <Button
            onClick={() => onAnalyzeWithJob?.(document)}
            variant="outline"
            size="sm"
            className="w-full text-xs bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-100 border-indigo-500/30"
            disabled={!!analyzing}
          >
            <span className="mr-1">🎯</span> Analyze with a Job ({jobsCount})
          </Button>
        </div>
      )}
    </Card>
  );
}
