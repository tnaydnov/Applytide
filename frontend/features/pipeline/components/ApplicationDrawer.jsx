import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Button, Card, Select, Input } from '../../../components/ui';
import { useToast } from '../../../lib/toast';
import { api, apiFetch } from '../../../lib/api';
import { getReminders as getGoogleReminders, createReminder as createGoogleReminder } from '../../../services/googleCalendar';
import { DOC_TYPES, typeLabel, typeChipClass, ACCEPT_ATTR } from "../utils/docTypes";

/** --- Doc type helpers (kept local to the drawer) --- */

export default function ApplicationDrawer({ application, onClose }) {
  const toast = useToast();
  const router = useRouter();

  // App ID (defensive across shapes)
  const appId = String(application?.id ?? application?.application_id ?? '');

  // Attachments
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState('other');
  const [attachingId, setAttachingId] = useState(null);

  // Docs picker
  const [showDocsPicker, setShowDocsPicker] = useState(false);
  const [docs, setDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Reminders
  const [allReminders, setAllReminders] = useState([]);
  const [showCreateReminder, setShowCreateReminder] = useState(false);
  const [creatingReminder, setCreatingReminder] = useState(false);
  const [newReminder, setNewReminder] = useState({
    title: 'Follow-up',
    type: 'Follow-up',
    due_date: '',
    add_meet_link: false,
    description: '',
  });

  const companyName = application?.job?.company?.name || application?.job?.company_name || '';
  const jobTitle = application?.job?.title || application?.title || 'Application';

  /* ------------------------------ Attachments ------------------------------ */
  const loadAttachments = useCallback(async () => {
    if (!appId) return setAttachments([]);
    try {
      const res = await apiFetch(`/applications/${appId}/attachments`);
      const body = await res.json().catch(() => null);
      const items = Array.isArray(body?.items) ? body.items : Array.isArray(body) ? body : [];
      setAttachments(items);
    } catch (e) {
      console.error('loadAttachments error', e);
      setAttachments([]);
    }
  }, [appId]);

  const handleUploadFile = async (file) => {
    if (!appId || !file) return;
    try {
      setUploading(true);

      // Upload into Documents with the chosen document_type
      const form = new FormData();
      form.append('file', file);
      form.append('document_type', uploadType);
      const upRes = await apiFetch(`/documents/upload`, { method: 'POST', body: form });
      const up = await upRes.json().catch(() => null);
      const newDocId = up?.document?.id || up?.id;
      if (!newDocId) throw new Error('Upload succeeded but no document id returned');

      // Attach to application
      await api.attachExistingDocument(appId, String(newDocId), uploadType);
      toast.success('Attachment uploaded');
      await loadAttachments();
    } catch (e) {
      console.error('handleUploadFile error', e);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = async (attachmentId) => {
    if (!appId || !attachmentId) return;
    try {
      if (api.removeAttachment) {
        await api.removeAttachment(appId, attachmentId);
      } else {
        await apiFetch(`/applications/${appId}/attachments/${attachmentId}`, { method: 'DELETE' });
      }
      setAttachments((prev) => prev.filter((a) => String(a.id) !== String(attachmentId)));
      toast.success('Attachment removed');
    } catch (e) {
      console.error('removeAttachment error', e);
      toast.error('Failed to remove attachment');
    }
  };

  /* ------------------------------ Docs Picker ------------------------------ */
  const openDocsPicker = async () => {
    setShowDocsPicker(true);
    setLoadingDocs(true);
    try {
      const res = await api.getDocuments({ page: 1, page_size: 100 });
      setDocs(Array.isArray(res?.documents) ? res.documents : []);
    } catch (e) {
      console.error('openDocsPicker error', e);
      toast.error('Couldn’t load documents');
      setDocs([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  const useExistingDocument = async (docId) => {
    if (!docId || !appId) return;
    try {
      setAttachingId(docId);
      await api.attachExistingDocument(appId, String(docId));
      toast.success('Attached from Documents');
      setShowDocsPicker(false);
      await loadAttachments();
    } catch (e) {
      console.error('useExistingDocument error', e);
      toast.error('Failed to attach document');
    } finally {
      setAttachingId(null);
    }
  };

  /* -------------------------------- Reminders ------------------------------ */
  const loadReminders = useCallback(async () => {
    try {
      const list = await getGoogleReminders();
      setAllReminders(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('loadReminders error', e);
      setAllReminders([]);
    }
  }, []);

  const nextReminder = useMemo(() => {
    const id = appId;
    if (!id) return null;
    return (
      allReminders
        .filter((r) => String(r?.application_id) === id)
        .sort(
          (a, b) =>
            new Date(a?.due_date || a?.scheduled_at || 0) -
            new Date(b?.due_date || b?.scheduled_at || 0)
        )[0] || null
    );
  }, [allReminders, appId]);

  const createReminderInline = async (e) => {
    e?.preventDefault?.();
    if (!appId) return;
    if (!newReminder.due_date) {
      toast.error('Pick a date & time');
      return;
    }
    try {
      setCreatingReminder(true);
      const hydratedTitle =
        newReminder.type &&
        !newReminder.title.toLowerCase().includes(newReminder.type.toLowerCase())
          ? `${newReminder.type}: ${newReminder.title}`
          : newReminder.title;

      const payload = {
        application_id: appId,
        title: hydratedTitle,
        description: newReminder.description || '',
        due_date: new Date(newReminder.due_date).toISOString(),
        add_meet_link: !!newReminder.add_meet_link,
        email_notify: true,
        timezone_str: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      };

      await createGoogleReminder(payload);
      toast.success('Reminder created');
      setShowCreateReminder(false);
      setNewReminder({
        title: 'Follow-up',
        type: 'Follow-up',
        due_date: '',
        add_meet_link: false,
        description: '',
      });
      await loadReminders();
    } catch (e) {
      console.error('createReminderInline error', e);
      toast.error('Failed to create reminder');
    } finally {
      setCreatingReminder(false);
    }
  };

  /* -------------------------------- Lifecycle ------------------------------ */
  useEffect(() => {
    if (!appId) return;
    loadAttachments();
    loadReminders();
  }, [appId, loadAttachments, loadReminders]);

  /* --------------------------------- Render -------------------------------- */
  return (
    <div className="fixed inset-0 z-[9998] flex" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <button
        onClick={onClose}
        className="flex-1 bg-black/50 backdrop-blur-[2px]"
        aria-label="Close drawer backdrop"
        type="button"
      />

      {/* Drawer panel */}
      <div
        className="
          relative
          w-full sm:w-[480px] lg:w-[560px]
          h-full
          bg-[#0f1422]
          border-l border-white/10
          shadow-2xl
          animate-[slideIn_.25s_ease-out]
        "
        style={{ willChange: 'transform' }}
      >
        <style jsx global>{`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0.6;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}</style>

        <div className="p-5 overflow-y-auto h-full">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="text-2xl font-semibold text-slate-100">
                  {jobTitle}
                </div>
                <div className="text-slate-400">{companyName || '—'}</div>
              </div>
              <button
                onClick={onClose}
                className="px-3 py-1 rounded-md bg-slate-800/70 border border-slate-700 text-slate-300 hover:bg-slate-700"
                type="button"
              >
                Close
              </button>
            </div>

            {/* Details row (Applied / Last update) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-slate-800/40 border-slate-700/50">
                <div className="text-sm text-slate-400">Applied</div>
                <div className="text-slate-200">
                  {application?.applied_at
                    ? new Date(application.applied_at).toLocaleDateString()
                    : application?.created_at
                    ? new Date(application.created_at).toLocaleDateString()
                    : '—'}
                </div>
              </Card>
              <Card className="bg-slate-800/40 border-slate-700/50">
                <div className="text-sm text-slate-400">Last update</div>
                <div className="text-slate-200">
                  {application?.updated_at
                    ? new Date(application.updated_at).toLocaleDateString()
                    : '—'}
                </div>
              </Card>
            </div>

            {/* Attachments */}
            <Card className="bg-slate-800/40 border-slate-700/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-slate-200 font-semibold">Attachments</h3>

                <div className="flex items-center gap-2">
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value)}
                    className="rounded-md bg-slate-800 border border-slate-700 text-slate-200 px-2 py-1"
                    title="Document type"
                  >
                    {DOC_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {typeLabel(t)}
                      </option>
                    ))}
                  </select>

                  <label className="inline-flex items-center px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer">
                    {/* Accept includes audio types per your requirement */}
                    <input
                      type="file"
                      className="hidden"
                      accept={ACCEPT_ATTR}
                      onChange={(e) => handleUploadFile(e.target.files?.[0] || null)}
                    />
                    {uploading ? 'Uploading…' : 'Upload'}
                  </label>

                  <Button variant="outline" onClick={openDocsPicker}>
                    Choose from documents
                  </Button>
                </div>
              </div>

              {attachments.length === 0 ? (
                <div className="text-sm text-slate-400">No files attached</div>
              ) : (
                <div className="space-y-2">
                  {attachments.map((att) => {
                    const dtype = att?.document_type || att?.type || att?.doc_type || 'other';
                    const filename = att?.filename || att?.name || 'Untitled';
                    const id = att?.id;
                    return (
                      <div
                        key={id ?? filename}
                        className="flex items-center justify-between rounded-md bg-slate-900/40 px-3 py-2 border border-slate-700/50"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`px-2 py-0.5 rounded-full text-xs border ${typeChipClass(dtype)}`}>
                            {typeLabel(dtype)}
                          </span>
                          <div className="truncate text-slate-200">{filename}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {id && (
                            <a
                              className="px-2 py-1 rounded-md bg-slate-700 text-slate-100"
                              href={`/api/applications/${appId}/attachments/${id}/download`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open
                            </a>
                          )}
                          {id && (
                            <Button variant="outline" onClick={() => removeAttachment(id)}>
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Documents picker modal (inline simple) */}
              {showDocsPicker && (
                <div className="mt-4 p-3 rounded-md bg-slate-900/60 border border-slate-700/60">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-slate-300 font-medium">Choose from Documents</div>
                    <Button variant="outline" onClick={() => setShowDocsPicker(false)}>
                      Close
                    </Button>
                  </div>
                  {loadingDocs ? (
                    <div className="text-sm text-slate-400">Loading…</div>
                  ) : docs.length === 0 ? (
                    <div className="text-sm text-slate-400">No documents found</div>
                  ) : (
                    <div className="space-y-2">
                      {docs.map((d) => {
                        const dname = d?.name || d?.filename || 'Untitled';
                        return (
                          <div key={d?.id ?? dname} className="flex items-center justify-between bg-slate-800/50 rounded px-3 py-2">
                            <div className="truncate text-slate-200">{dname}</div>
                            <Button size="sm" disabled={attachingId === d?.id} onClick={() => useExistingDocument(d?.id)}>
                              {attachingId === d?.id ? 'Attaching…' : 'Attach'}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Reminders */}
            <Card className="bg-slate-800/40 border-slate-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-slate-200 font-semibold">Reminders</h3>
                {!showCreateReminder && (
                  <Button size="sm" onClick={() => setShowCreateReminder(true)}>
                    Add reminder
                  </Button>
                )}
              </div>

              {!nextReminder && !showCreateReminder && (
                <div className="mt-2 text-sm text-slate-400">No reminders linked to this application.</div>
              )}

              {nextReminder && !showCreateReminder && (
                <div className="mt-3 rounded-md bg-slate-900/50 border border-slate-700/50 p-3 flex items-center justify-between">
                  <div>
                    <div className="text-slate-100">{nextReminder.title || nextReminder.name}</div>
                    <div className="text-slate-400 text-sm">
                      {(() => {
                        const d = new Date(nextReminder.due_date || nextReminder.scheduled_at || 0);
                        return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
                      })()}
                    </div>
                  </div>
                  <a className="px-3 py-1.5 rounded-md bg-slate-700 text-slate-100" href="/reminders">
                    Open Events
                  </a>
                </div>
              )}

              {showCreateReminder && (
                <form className="mt-3 space-y-3" onSubmit={createReminderInline}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Select
                      value={newReminder.type}
                      onChange={(e) => setNewReminder((r) => ({ ...r, type: e.target.value }))}
                    >
                      <option value="Follow-up">Follow-up</option>
                      <option value="Interview">Interview</option>
                      <option value="Deadline">Application Deadline</option>
                      <option value="Custom">Custom</option>
                    </Select>

                    <Input
                      value={newReminder.title}
                      onChange={(e) => setNewReminder((r) => ({ ...r, title: e.target.value }))}
                      placeholder="Reminder title"
                    />

                    <Input
                      type="datetime-local"
                      value={newReminder.due_date}
                      onChange={(e) => setNewReminder((r) => ({ ...r, due_date: e.target.value }))}
                    />

                    <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={!!newReminder.add_meet_link}
                        onChange={(e) => setNewReminder((r) => ({ ...r, add_meet_link: e.target.checked }))}
                      />
                      Create Google Meet link
                    </label>
                  </div>

                  <textarea
                    rows={3}
                    className="w-full rounded-md bg-slate-900/50 border border-slate-700 text-slate-200"
                    placeholder="Notes…"
                    value={newReminder.description}
                    onChange={(e) => setNewReminder((r) => ({ ...r, description: e.target.value }))}
                  />

                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setShowCreateReminder(false)} type="button">
                      Cancel
                    </Button>
                    <Button disabled={creatingReminder} type="submit">
                      {creatingReminder ? 'Creating…' : 'Create'}
                    </Button>
                  </div>
                </form>
              )}
            </Card>

            {/* Job details deep link */}
            <div className="flex justify-between items-center">
              <Button
                className="btn-ghost"
                onClick={() => {
                  const id = application?.job?.id || application?.job_id;
                  if (!id) return toast.error('No job linked to this application');
                  router.push(
                    { pathname: '/jobs', query: { job: String(id), details: '1' } },
                    undefined,
                    { shallow: true }
                  );
                }}
              >
                🔎 Job details
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}