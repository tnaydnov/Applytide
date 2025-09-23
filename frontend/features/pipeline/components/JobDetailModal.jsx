// frontend/features/pipeline/components/JobDetailModal.jsx
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/router";
import { Button} from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { STATUS_CONFIG as statusConfig, DEFAULT_STATUS_STYLE } from "@/utils/status";

/**
 * JobDetailModal
 * Props:
 *  - application: minimal app object { id, status, created_at, updated_at, job?: {...} }
 *  - onClose(): void
 */
export default function JobDetailModal({ application, onClose }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false); // SSR-safe portal guard
  const appId = useMemo(() => String(application?.id ?? ""), [application?.id]);

  const [stages, setStages] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loadingStages, setLoadingStages] = useState(true);
  const [loadingAttachments, setLoadingAttachments] = useState(true);

  useEffect(() => setMounted(true), []);

  // Load detail (stages + attachments) with abort safety
  useEffect(() => {
    if (!appId) return;
    const ac = new AbortController();

    (async () => {
      try {
        setLoadingStages(true);
        setLoadingAttachments(true);

        const res = await apiFetch(`/api/applications/${appId}/detail`, { signal: ac.signal });
        if (!res.ok) throw new Error("Failed to load application details");
        const detail = await res.json();

        setStages(Array.isArray(detail?.stages) ? detail.stages : []);
        setAttachments(Array.isArray(detail?.attachments) ? detail.attachments : []);
      } catch {
        if (!ac.signal.aborted) {
          setStages([]);
          setAttachments([]);
        }
      } finally {
        if (!ac.signal.aborted) {
          setLoadingStages(false);
          setLoadingAttachments(false);
        }
      }
    })();

    return () => ac.abort();
  }, [appId]);

  if (!mounted || !application || !appId) return null;

  const cfg = statusConfig[application.status] || DEFAULT_STATUS_STYLE;

  const appliedAt = application?.created_at ? new Date(application.created_at) : null;
  const appliedOnText = appliedAt
    ? appliedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "—";
  const daysSinceAppliedText = appliedAt
    ? `${Math.ceil((Date.now() - appliedAt.getTime()) / 86400000)} days`
    : "—";

  const job = application.job || {};
  const company =
    job?.company?.name ||
    job?.company_name ||
    "Unknown Company";

  return createPortal(
    <div className="fixed inset-0 z-[9999] p-4" role="dialog" aria-modal="true">
      <div className="modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
        <div className="modal-glass rounded-lg w-full max-w-full sm:max-w-4xl max-h-[calc(100vh-2rem)] my-4 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10 flex-shrink-0">
            <h2 className="text-xl font-semibold text-white drop-shadow-lg">Application Details</h2>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="border-b border-white/10 pb-4">
              <h3 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">
                {job?.title || "Unknown Position"}
              </h3>
              <p className="text-xl text-cyan-300 font-medium drop-shadow-sm">
                {company}
              </p>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="field-label">Current Status</h4>
                <div className="field-value flex items-center">
                  <span className="mr-2">{cfg.icon}</span>
                  <span className="font-medium">{application.status || "—"}</span>
                </div>
              </div>
              <div>
                <h4 className="field-label">Applied On</h4>
                <p className="field-value">{appliedOnText}</p>
              </div>
              <div>
                <h4 className="field-label">Days Since Applied</h4>
                <p className="field-value">{daysSinceAppliedText}</p>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h4 className="field-label mb-3">Timeline</h4>
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg border border-white/10">
                {loadingStages ? (
                  <div className="text-center text-white/70">
                    <p>Loading timeline...</p>
                  </div>
                ) : stages.length > 0 ? (
                  <div className="space-y-2">
                    {stages.map((stage, idx) => {
                      const scfg = statusConfig[stage?.name] || DEFAULT_STATUS_STYLE;
                      return (
                        <div key={stage?.id || idx} className="flex items-center justify-between text-sm">
                          <div className="flex items-center min-w-0">
                            <span className="mr-2 flex-shrink-0">{scfg.icon}</span>
                            <span className="text-white truncate">{stage?.name || "Stage"}</span>
                            {stage?.notes && (
                              <span className="ml-2 text-xs text-white/60 truncate">- {stage.notes}</span>
                            )}
                          </div>
                          <span className="text-white/60 flex-shrink-0">
                            {stage?.created_at ? new Date(stage.created_at).toLocaleDateString() : "Unknown date"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-white/70">
                    <p>No status changes recorded yet</p>
                    <p className="text-xs mt-1">Status changes will appear here as you move applications</p>
                  </div>
                )}
              </div>
            </div>

            {/* Location / Work type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {job?.location && (
                <div>
                  <h4 className="field-label">📍 Location</h4>
                  <p className="field-value">{job.location}</p>
                </div>
              )}
              {job?.remote_type && (
                <div>
                  <h4 className="field-label">💼 Work Type</h4>
                  <p className="field-value">{job.remote_type}</p>
                </div>
              )}
            </div>

            {/* Source URL */}
            {job?.source_url && (
              <div>
                <h4 className="field-label">🔗 Source URL</h4>
                <a
                  href={job.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="field-value text-cyan-300 hover:text-cyan-200 underline break-all"
                >
                  {job.source_url}
                </a>
              </div>
            )}

            {/* Description */}
            {job?.description && (
              <div>
                <h4 className="field-label">📝 Job Description</h4>
                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg border border-white/10 max-h-40 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-white/90 font-sans">
                    {job.description}
                  </pre>
                </div>
              </div>
            )}

            {/* Attachments */}
            <div>
              <h4 className="field-label mb-3">Attachments</h4>
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg border border-white/10">
                {loadingAttachments ? (
                  <div className="text-center text-white/70">
                    <p>Loading attachments...</p>
                  </div>
                ) : attachments.length > 0 ? (
                  <div className="space-y-2">
                    {attachments.map((a) => (
                      <div key={a?.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center min-w-0">
                          <span className="mr-2">📎</span>
                          <span className="text-white truncate">
                            {a?.filename || a?.name || "Attachment"}
                          </span>
                        </div>
                        <span className="text-white/60 flex-shrink-0">
                          {a?.created_at ? new Date(a.created_at).toLocaleDateString() : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-white/70">
                    <p>No attachments</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer meta */}
            <div className="text-sm text-gray-500 pt-2">
              <p>Application ID: {appId}</p>
              {application?.created_at && <p>Created: {new Date(application.created_at).toLocaleString()}</p>}
              {application?.updated_at && <p>Last Updated: {new Date(application.updated_at).toLocaleString()}</p>}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 border-t border-white/10 bg-white/5 flex-shrink-0">
            <Button onClick={() => router.push(`/applications/${appId}`)} className="bg-indigo-600 hover:bg-indigo-700">
              View Full Application
            </Button>
            <Button variant="outline" onClick={onClose} className="border-white/20 text-white hover:bg-white/10">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
