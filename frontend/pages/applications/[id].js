import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { Button, Card, Input, Textarea, Select, Badge } from "../../components/ui";
import { useToast } from "../../lib/toast";
import Link from "next/link";

/** ---------- constants & helpers (logic only; no UI changes) ---------- */
const API_BASE = "/api";

const ALLOWED_STATUSES = ["Applied", "Phone Screen", "Tech", "On-site", "Offer", "Accepted", "Rejected"];
const normalizeStatus = (s) => (s === "Saved" ? "Applied" : s);

const statusConfig = {
  Applied: { color: "bg-blue-100 text-blue-800", icon: "📨" },
  "Phone Screen": { color: "bg-yellow-100 text-yellow-800", icon: "📞" },
  Tech: { color: "bg-purple-100 text-purple-800", icon: "💻" },
  "On-site": { color: "bg-indigo-100 text-indigo-800", icon: "🏢" },
  Offer: { color: "bg-green-100 text-green-800", icon: "🎉" },
  Accepted: { color: "bg-emerald-100 text-emerald-800", icon: "✅" },
  Rejected: { color: "bg-red-100 text-red-800", icon: "❌" },
};

const fmtMB = (bytes) => ((bytes || 0) / 1024 / 1024).toFixed(2);
const toLocalInputValue = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
};
const toISOFromLocal = (value) => (value ? new Date(value).toISOString() : undefined);

const safeDate = (iso) => (iso ? new Date(iso) : null);
const fmtDate = (iso) => {
  const d = safeDate(iso);
  return d ? d.toLocaleDateString() : "—";
};
const fmtDateTime = (iso) => {
  const d = safeDate(iso);
  return d ? d.toLocaleString() : "—";
};


/** -------------------------------------------------------------------- */

export default function AppDetailPage() {
  const router = useRouter();
  const toast = useToast();

  // id is undefined until router is ready; also guard against string[]
  const appId = useMemo(
    () => (Array.isArray(router.query.id) ? router.query.id[0] : router.query.id),
    [router.query.id]
  );

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // notes
  const [note, setNote] = useState("");

  // add stage form
  const [stage, setStage] = useState({ name: "Phone Screen", scheduled_at: "", notes: "" });

  // attachments uploads
  const [uploadLoading, setUploadLoading] = useState(false);

  // scoring
  const [resumes, setResumes] = useState([]);
  const [score, setScore] = useState(null);
  const [keywords, setKeywords] = useState({ present: [], missing: [] });
  const [selectedResume, setSelectedResume] = useState("");
  const [scoring, setScoring] = useState(false);

  
  /** ---------------------------- data load ---------------------------- */
  async function load(idToLoad) {
    if (!idToLoad) return;
    setLoading(true);
    try {
      const [appData, resumeData] = await Promise.all([api.getAppDetail(idToLoad), api.listResumes()]);
      setData(appData);
      setResumes(resumeData);
      setSelectedResume(appData?.application?.resume_id || "");
    } catch (err) {
      toast.error("Failed to load application details");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!router.isReady || !appId) return;
    load(appId);
  }, [router.isReady, appId]);

  /** ----------------------- quick actions (status) -------------------- */
  async function quickStatusChange(newStatus) {
    if (!appId) return;
    try {
      const next = normalizeStatus(newStatus);
      // optimistic update
      setData((prev) =>
        prev ? { ...prev, application: { ...prev.application, status: next } } : prev
      );
      await api.updateApplication(appId, { status: next });
      toast.success(`Status changed to ${next}`);
    } catch (err) {
      toast.error(`Failed to update status: ${err?.message || err}`);
      // fallback reload to correct UI if optimistic update was wrong
      load(appId);
    }
  }

  async function quickAddFollowUp() {
    if (!appId) return;
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 3);

    try {
      await api.addStage(appId, {
        name: "Follow-up",
        scheduled_at: followUpDate.toISOString(),
        notes: "Automated follow-up reminder",
      });
      await load(appId);
      toast.success("Follow-up reminder added for 3 days from now");
    } catch (err) {
      toast.error(`Failed to add follow-up: ${err?.message || err}`);
    }
  }

  async function quickAddInterview() {
    if (!appId) return;
    const interviewDate = new Date();
    interviewDate.setDate(interviewDate.getDate() + 7);
    interviewDate.setHours(14, 0, 0);

    try {
      await api.addStage(appId, {
        name: "Interview",
        scheduled_at: interviewDate.toISOString(),
        notes: "Scheduled interview",
      });
      await load(appId);
      toast.success("Interview scheduled for next week");
    } catch (err) {
      toast.error(`Failed to add interview: ${err?.message || err}`);
    }
  }

  /** --------------------------- attachments -------------------------- */
  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !appId) return;

    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/applications/${appId}/attachments`, {
        method: "POST",
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error?.detail || "Upload failed");
      }

      await load(appId);
      toast.success("File uploaded successfully!");
    } catch (err) {
      toast.error(err?.message || "Upload failed");
    } finally {
      e.target.value = "";
      setUploadLoading(false);
    }
  }

  async function deleteAttachment(attachmentId) {
    if (!appId) return;
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      const res = await fetch(`${API_BASE}/applications/${appId}/attachments/${attachmentId}`, {
        method: "DELETE",
        credentials: 'include',
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error?.detail || "Delete failed");
      }
      await load(appId);
      toast.success("File deleted successfully!");
    } catch (err) {
      toast.error(err?.message || "Delete failed");
    }
  }

  function downloadAttachment(attachmentId, filename) {
    if (!appId) return;
    // direct URL download (works if the endpoint doesn't require Authorization header)
    const url = `${API_BASE}/applications/${appId}/attachments/${attachmentId}/download`;
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "download";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  /** ----------------------------- notes ------------------------------ */
  async function addNote() {
    if (!appId) return;
    if (!note.trim()) {
      toast.error("Please enter a note");
      return;
    }
    try {
      await api.addNote(appId, note.trim());
      setNote("");
      await load(appId);
      toast.success("Note added successfully!");
    } catch (e) {
      toast.error(`Failed to add note: ${e?.message || e}`);
    }
  }

  /** ----------------------------- stages ----------------------------- */
  async function addStage() {
    if (!appId) return;
    try {
      const payload = { name: normalizeStatus(stage.name) };
      const dt = toISOFromLocal(stage.scheduled_at);
      if (dt) payload.scheduled_at = dt;
      if (stage.notes) payload.notes = stage.notes;

      await api.addStage(appId, payload);
      setStage((s) => ({ ...s, notes: "" }));
      await load(appId);
      toast.success(`Added ${stage.name} stage!`);
    } catch (e) {
      toast.error(`Failed to add stage: ${e?.message || e}`);
    }
  }

  /** ------------------------------ score ----------------------------- */
  async function doScore() {
    if (!appId) return;
    if (!selectedResume) {
      toast.error("Please select a resume to score against");
      return;
    }
    setScoring(true);
    try {
      const r = await api
        .apiFetch(`/match/score?resume_id=${selectedResume}&job_id=${data.job.id}`, { method: "POST" })
        .then((x) => x.json());
      setScore(r.score);
      setKeywords({ present: r.keywords_present || [], missing: r.keywords_missing || [] });
      toast.success(`Match score calculated: ${r.score}%`);
    } catch (e) {
      toast.error(`Scoring failed: ${e?.message || e}`);
    } finally {
      setScoring(false);
    }
  }

  /** ---------------------------- derived UI -------------------------- */
  const normalized = useMemo(
    () => normalizeStatus(data?.application?.status || "Applied"),
    [data?.application?.status]
  );
  const currentStatus = statusConfig[normalized] || { color: "bg-gray-100 text-gray-800", icon: "📋" };

  /** ------------------------------ render ---------------------------- */
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-600 text-lg">Loading application details...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="text-center py-16">
        <div className="space-y-4">
          <div className="text-6xl">❌</div>
          <h3 className="text-xl font-semibold text-gray-900">Application Not Found</h3>
          <p className="text-gray-600">The application you're looking for doesn't exist.</p>
          <Link href="/pipeline">
            <Button>← Back to Pipeline</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Link href="/pipeline" className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center">
            ← Back to Pipeline
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{data.job.title}</h1>

          {data.job.company_name && (
            <div className="flex items-center space-x-4">
              <p className="text-xl text-indigo-600 font-medium">{data.job.company_name}</p>
              {data.job.company_website && (
                <a
                  href={data.job.company_website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-500 hover:text-indigo-600 flex items-center"
                >
                  <span className="mr-1">🌐</span>
                  Website
                </a>
              )}
            </div>
          )}

          <div className="flex items-center space-x-4">
            <Badge variant="default" size="lg">
              <span className="mr-2">{currentStatus.icon}</span>
              {data.application.status}
            </Badge>
            {data.job.location && (
              <span className="text-gray-500 flex items-center">
                <span className="mr-1">📍</span>
                {data.job.location}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">⚡</span>
            <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 *:min-w-0">
            {/* Status Change */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Move Status</label>
              <Select value={normalized} onChange={(e) => quickStatusChange(e.target.value)} className="w-full">
                {ALLOWED_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </div>

            {/* Quick Follow-up */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Schedule Reminder</label>
              <Button onClick={quickAddFollowUp} variant="outline" size="sm" className="w-full">
                📅 Follow-up in 3 days
              </Button>
            </div>

            {/* Quick Interview */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Add Interview</label>
              <Button onClick={quickAddInterview} variant="outline" size="sm" className="w-full">
                🗓️ Schedule Interview
              </Button>
            </div>

            {/* Email Templates */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email Templates</label>
              <Button
                onClick={() => {
                  const subject = `Following up on ${data.job.title} application`;
                  const body = `Hi,\n\nI wanted to follow up on my application for the ${data.job.title} position at ${data.job.company_name}. I'm very interested in this opportunity and would appreciate any updates you can provide.\n\nThank you for your time.\n\nBest regards`;
                  const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                  window.open(mailtoLink);
                }}
                variant="outline"
                size="sm"
                className="w-full"
              >
                ✉️ Email Template
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Job Info */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">💼</span>
            <h2 className="text-xl font-semibold text-gray-900">Job Details</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {data.resume_label && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-green-600">📄</span>
                    <span className="font-medium text-green-800">Resume: {data.resume_label}</span>
                  </div>
                </div>
              )}

              {data.job.source_url && (
                <a
                  href={data.job.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  <span className="mr-2">🔗</span>
                  View Original Job Posting
                </a>
              )}

              {data.job.company_website && (
                <a
                  href={data.job.company_website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  <span className="mr-2">🌐</span>
                  Company Website
                </a>
              )}
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-2 text-sm *:min-w-0">
                {data.job.location && (
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400">📍</span>
                    <span className="text-gray-600">Location:</span>
                    <span className="font-medium">{data.job.location}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">📅</span>
                  <span className="text-gray-600">Applied:</span>
                  <span className="font-medium">{fmtDate(data.application.created_at)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">🔄</span>
                  <span className="text-gray-600">Last Update:</span>
                  <span className="font-medium">{fmtDate(data.application.updated_at)}</span>
                </div>
              </div>
            </div>
          </div>

          {data.job.description && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Description</h4>
              <div className="text-gray-600 text-sm max-h-40 overflow-y-auto bg-gray-50 p-3 rounded-lg">
                {data.job.description.substring(0, 500)}
                {data.job.description.length > 500 && "..."}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Match Scoring */}
      <Card>
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🎯</span>
            <h2 className="text-xl font-semibold text-gray-900">Resume Match Analysis</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Select label="Select Resume to Analyze" value={selectedResume} onChange={(e) => setSelectedResume(e.target.value)}>
                <option value="">(Select a resume)</option>
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </Select>

              <Button onClick={doScore} disabled={!selectedResume} className="w-full">
                {scoring ? "Analyzing..." : "Analyze Match"}
              </Button>
            </div>

            {score !== null && (
              <div className="space-y-4">
                <div className="text-center p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
                  <div className="text-3xl font-bold text-indigo-600 mb-2">{score}%</div>
                  <div className="text-gray-600">Match Score</div>
                </div>
              </div>
            )}
          </div>

          {(keywords.missing.length > 0 || keywords.present.length > 0) && (
            <div className="grid md:grid-cols-2 gap-6">
              {keywords.present.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-green-800 flex items-center">
                    <span className="mr-2">✅</span>
                    Matching Keywords ({keywords.present.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {keywords.present.map((k) => (
                      <Badge key={k} variant="success" size="sm">
                        {k}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {keywords.missing.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-red-800 flex items-center">
                    <span className="mr-2">❌</span>
                    Missing Keywords ({keywords.missing.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {keywords.missing.map((k) => (
                      <Badge key={k} variant="danger" size="sm">
                        {k}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Attachments */}
      <Card>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">📎</span>
              <h2 className="text-xl font-semibold text-gray-900">Attachments</h2>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {uploadLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <span className="mr-2">📤</span>
                    Upload File
                  </>
                )}
              </label>
            </div>
          </div>

          {(data.attachments || []).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📁</div>
              <p>No files attached yet</p>
              <p className="text-sm mt-1">Upload documents, screenshots, or other relevant files</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.attachments.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <span className="text-2xl">
                        {a.content_type?.includes("image")
                          ? "🖼️"
                          : a.content_type?.includes("pdf")
                          ? "📄"
                          : a.content_type?.includes("doc")
                          ? "📝"
                          : "📎"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{a.filename}</p>
                      <p className="text-sm text-gray-500">
                        {fmtMB(a.file_size)} MB • {fmtDate(a.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button onClick={() => downloadAttachment(a.id, a.filename)} variant="outline" size="sm">
                      <span className="mr-1">⬇️</span>
                      Download
                    </Button>
                    <Button
                      onClick={() => deleteAttachment(a.id)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <span className="mr-1">🗑️</span>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Timeline */}
      <Card>
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">📅</span>
            <h2 className="text-xl font-semibold text-gray-900">Application Timeline</h2>
          </div>

          {(data.stages || []).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📋</div>
              <p>No stages added yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.stages.map((s, index) => (
                <div key={s.id} className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-indigo-600">{index + 1}</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-900">{s.name}</span>
                      {s.outcome && (
                        <Badge variant={s.outcome === "passed" ? "success" : "danger"} size="sm">
                          {s.outcome}
                        </Badge>
                      )}
                    </div>
                    {s.scheduled_at && (
                      <p className="text-sm text-gray-600">📅 {fmtDateTime(s.scheduled_at)}</p>
                    )}
                    {s.notes && <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{s.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Stage Form */}
          <div className="border-t pt-6 space-y-4">
            <h3 className="font-medium text-gray-900">Add New Stage</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Select label="Stage Type" value={stage.name} onChange={(e) => setStage({ ...stage, name: e.target.value })}>
                {ALLOWED_STATUSES.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </Select>

              <Input
                label="Schedule (Optional)"
                type="datetime-local"
                value={stage.scheduled_at}
                onChange={(e) => setStage({ ...stage, scheduled_at: e.target.value })}
              />
            </div>

            <Textarea
              label="Notes (Optional)"
              rows={3}
              placeholder="Add any notes about this stage..."
              value={stage.notes}
              onChange={(e) => setStage({ ...stage, notes: e.target.value })}
            />

            <Button onClick={addStage}>Add Stage</Button>
          </div>
        </div>
      </Card>

      {/* Notes */}
      <Card>
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">📝</span>
            <h2 className="text-xl font-semibold text-gray-900">Notes</h2>
          </div>

          {(data.notes || []).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📝</div>
              <p>No notes added yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.notes.map((n) => (
                <div key={n.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">{fmtDateTime(n.created_at)}</span>
                  </div>
                  <p className="text-gray-900">{n.body}</p>
                </div>
              ))}
            </div>
          )}

          <div className="border-t pt-6 space-y-4">
            <Textarea
              label="Add New Note"
              rows={3}
              placeholder="Write a note about this application..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <Button onClick={addNote} disabled={!note.trim()}>
              Add Note
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
