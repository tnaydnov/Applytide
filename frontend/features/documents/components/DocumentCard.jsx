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

  return (
    <Card className="p-4 md:p-6 hover:shadow-lg transition-shadow glass-card glass-cyan">
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
            <div className="flex items-center gap-2">
              <p className="text-sm text-slate-400">{docType.label}</p>
              <span className="px-1.5 py-0.5 bg-slate-700 text-xs font-medium rounded text-slate-300">
                {format}
              </span>
            </div>
          </div>
        </div>

        {/* Status */}
        <StatusDropdown
          value={document.status}
          options={statusOptions}
          onChange={(v) => onChangeStatus?.(document.id, v)}
        />
      </div>

      {/* Meta */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Size:</span>
          <span className="text-slate-200">{sizeKb} KB</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Created:</span>
          <span className="text-slate-200">{createdAt}</span>
        </div>
        {document?.ats_score != null && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">ATS Score:</span>
            <span className={getScoreColor(document.ats_score)}>
              {Number(document.ats_score).toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Primary Resume Action */}
      {document.type === "resume" && (
        <div className="mb-3">
          <Button
            onClick={() => onAnalyze?.(document)}
            variant="outline"
            size="sm"
            className="w-full bg-blue-600/30 hover:bg-blue-600/50 text-blue-100 border-blue-500/30"
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
          className="flex flex-col items-center justify-center py-2 h-auto"
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
          className="flex flex-col items-center justify-center py-2 h-auto"
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
            className="w-full text-xs bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-100 border-indigo-500/30"
            disabled={!!analyzing}
          >
            <span className="mr-1">🎯</span> Analyze with a Job ({jobsCount})
          </Button>
        </div>
      )}
    </Card>
  );
}
