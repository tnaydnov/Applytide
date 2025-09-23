import { useEffect, useState } from 'react';
import { Modal, Button, Select } from '../../../components/ui';
import { api } from '../../../lib/api';
import { useToast } from '../../../lib/toast';

const DOC_TYPES = [
  'resume',
  'cover_letter',
  'portfolio',
  'certificate',
  'transcript',
  'reference',
  'other',
];

const TYPE_LABELS = {
  resume: 'Resume',
  cover_letter: 'Cover letter',
  portfolio: 'Portfolio',
  certificate: 'Certificate',
  transcript: 'Transcript',
  reference: 'Reference',
  other: 'Other',
};

const typeLabel = (t) => TYPE_LABELS[t] || (t?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Other');
const docDisplayName = (d) => d?.name || d?.file_name || d?.filename || 'Untitled';

export default function ApplyModal({ isOpen, job, onClose, onApplied }) {
  const toast = useToast();

  const [tab, setTab] = useState('select'); // 'select' | 'upload' | 'none'
  const [applyDocsLoading, setApplyDocsLoading] = useState(false);
  const [docs, setDocs] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState(new Set());
  const [uploads, setUploads] = useState([]); // [{ file, type }]
  const [applying, setApplying] = useState(false);

  const getDocType = (d) =>
    String(d?.type ?? d?.document_type ?? '').toLowerCase() || 'other';

  // Load user's documents when opening
  useEffect(() => {
    if (!isOpen) return;
    setTab('select');
    setSelectedDocIds(new Set());
    setUploads([]);
    setFilterType('');

    (async () => {
      try {
        setApplyDocsLoading(true);
        const res = await api.getDocuments({ page: 1, page_size: 200 });
        setDocs(Array.isArray(res?.documents) ? res.documents : []);
      } catch (e) {
        console.error('Failed to load document options:', e);
        toast.error("Couldn't load your documents.");
        setDocs([]);
      } finally {
        setApplyDocsLoading(false);
      }
    })();
  }, [isOpen]);

  async function uploadOneDocument(type, file) {
    if (!file) return null;
    const body = await api.uploadDocument({ file, document_type: type });
    if (body?.id) return body.id;
    throw new Error("Upload succeeded but didn't return an id");
  }

  async function handleSubmit() {
    if (!job?.id) return toast.error('No job selected.');

    if (tab === 'select' && selectedDocIds.size === 0) {
      return toast.error("Pick at least one document or switch to 'Apply without files'.");
    }
    if (tab === 'upload' && uploads.length === 0) {
      return toast.error('Choose files to upload or switch tabs.');
    }

    try {
      setApplying(true);
      // 1) Create application
      const app = await api.createApp({ job_id: job.id, status: 'Applied' });
      const appId = app?.id;
      if (!appId) throw new Error('Application create did not return an id');

      // 2) Determine document ids to attach
      const toAttach = [];
      if (tab === 'select') {
        selectedDocIds.forEach((id) => toAttach.push(String(id)));
      } else if (tab === 'upload') {
        for (const item of uploads) {
          const id = await uploadOneDocument(item.type || 'other', item.file);
          toAttach.push(String(id));
        }
      }

      // 3) Attach
      if (toAttach.length) {
        await Promise.all(toAttach.map((id) => api.attachExistingDocument(appId, id)));
      }

      toast.success(toAttach.length ? 'Application created and files attached!' : 'Application created!');
      onApplied?.(appId);
      onClose?.();
    } catch (e) {
      console.error(e);
      toast.error(`Failed to apply: ${e.message || e}`);
    } finally {
      setApplying(false);
    }
  }

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={job ? `Apply to ${job.title || 'Job'}` : 'Apply'}
      size="2xl"
    >
      <div className="space-y-6 sm:space-y-7">
        {/* Job summary */}
        {job && (
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-semibold text-slate-100">{job.title}</span>
              {job.company_name && <span className="text-slate-400">• {job.company_name}</span>}
              {job.location && <span className="text-slate-400">• {job.location}</span>}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-3">
          <Button variant={tab === 'select' ? 'default' : 'outline'} size="sm" onClick={() => setTab('select')}>
            📂 Choose from My Documents
          </Button>
          <Button variant={tab === 'upload' ? 'default' : 'outline'} size="sm" onClick={() => setTab('upload')}>
            ⬆️ Upload Now
          </Button>
          <Button variant={tab === 'none' ? 'default' : 'outline'} size="sm" onClick={() => setTab('none')}>
            🚫 Apply without files
          </Button>
        </div>

        {/* SELECT EXISTING */}
        {tab === 'select' && (
          <div className="space-y-5">
            {applyDocsLoading ? (
              <div className="text-slate-400">Loading your documents…</div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-slate-300">Filter by type</label>
                  <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-44">
                    <option value="">All</option>
                    {DOC_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {typeLabel(t)}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="mt-2 max-h-72 overflow-y-auto rounded-lg border border-white/10 divide-y divide-white/10">
                  {(() => {
                    const filtered = docs.filter((d) => !filterType || getDocType(d) === filterType);
                    if (filtered.length === 0) {
                      return (
                        <div className="p-3 text-slate-400 text-sm">
                          {docs.length
                            ? 'No documents match this type.'
                            : 'No documents found. Try the “Upload now” tab.'}
                        </div>
                      );
                    }
                    return filtered.map((d) => {
                      const checked = selectedDocIds.has(String(d.id));
                      const dtype = getDocType(d);
                      return (
                        <label
                          key={d.id}
                          className={`flex items-center justify-between p-3 cursor-pointer ${checked ? 'bg-white/10' : 'hover:bg-white/5'
                            }`}
                        >
                          <div className="min-w-0 pr-3">
                            <div className="text-slate-100 font-medium truncate">{docDisplayName(d)}</div>
                            <div className="text-xs text-slate-400">
                              {typeLabel(dtype)} • {String(d.format || '').toUpperCase()} •{' '}
                              {d.created_at ? new Date(d.created_at).toLocaleDateString() : '-'}
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const id = String(d.id);
                              setSelectedDocIds((prev) => {
                                const next = new Set(prev);
                                e.target.checked ? next.add(id) : next.delete(id);
                                return next;
                              });
                            }}
                            className="w-4 h-4"
                          />
                        </label>
                      );
                    });
                  })()}
                </div>
              </>
            )}
          </div>
        )}

        {/* UPLOAD NOW */}
        {tab === 'upload' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-300">Pick files</label>
              <input
                type="file"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setUploads((prev) => [
                    ...prev,
                    ...files.map((file) => ({ file, type: 'resume' })), // default type
                  ]);
                }}
              />
            </div>

            <div className="rounded-lg border border-white/10 divide-y divide-white/10">
              {uploads.map((u, i) => (
                <div key={i} className="flex items-center justify-between p-3">
                  <div className="min-w-0 pr-3">
                    <div className="text-slate-100 font-medium truncate">{u.file.name}</div>
                    <div className="text-xs text-slate-400">{Math.ceil(u.file.size / 1024)} KB</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={u.type}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUploads((prev) => {
                          const next = [...prev];
                          next[i] = { ...next[i], type: val };
                          return next;
                        });
                      }}
                      className="bg-slate-900/40 text-slate-100 border border-white/20 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    >
                      {DOC_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {typeLabel(t)}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => setUploads((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-red-300 hover:text-red-200"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              {!uploads.length && <div className="p-3 text-slate-400 text-sm">No files selected.</div>}
            </div>
          </div>
        )}

        {/* NONE */}
        {tab === 'none' && (
          <div className="p-4 rounded-lg bg-amber-900/20 border border-amber-500/30 text-amber-100">
            You’re about to create an application without attaching any files. You can attach or upload files later from the
            pipeline.
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pt-4 border-t border-white/10">
          <div className="text-xs text-slate-400 sm:order-1">
            {tab === 'select' && "Tip: You can keep one or both selections empty if you switch to 'Apply without files'."}
            {tab === 'upload' && 'Only the files you pick will be uploaded and attached.'}
          </div>
          <div className="flex gap-2 sm:order-2 sm:justify-end">
            <Button variant="outline" onClick={onClose} disabled={applying}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              loading={applying}
              disabled={
                applying ||
                (tab === 'select' && selectedDocIds.size === 0) ||
                (tab === 'upload' && uploads.length === 0)
              }
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {tab === 'none' ? 'Apply without files' : 'Create Application'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
