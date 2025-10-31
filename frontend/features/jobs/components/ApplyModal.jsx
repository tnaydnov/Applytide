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

const SOURCE_OPTIONS = [
  { value: 'LinkedIn', label: 'LinkedIn' },
  { value: 'Indeed', label: 'Indeed' },
  { value: 'Glassdoor', label: 'Glassdoor' },
  { value: 'Company Website', label: 'Company Website' },
  { value: 'Job Board', label: 'Job Board' },
  { value: 'Recruiter', label: 'Recruiter' },
  { value: 'Referral', label: 'Referral' },
  { value: 'Job Fair', label: 'Job Fair' },
  { value: 'AngelList', label: 'AngelList/Wellfound' },
  { value: 'Other', label: 'Other' },
];

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
  const [source, setSource] = useState('');

  const getDocType = (d) =>
    String(d?.type ?? d?.document_type ?? '').toLowerCase() || 'other';

  // Load user's documents when opening
  useEffect(() => {
    if (!isOpen) return;
    setTab('select');
    setSelectedDocIds(new Set());
    setUploads([]);
    setFilterType('');
    setSource('');

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
      return toast.error("Pick at least one document or switch to 'Skip' tab.");
    }
    if (tab === 'upload' && uploads.length === 0) {
      return toast.error('Choose files to upload or switch tabs.');
    }

    try {
      setApplying(true);
      // 1) Create application
      const app = await api.createApp({ 
        job_id: job.id, 
        status: 'Applied',
        source: source || null
      });
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
        const attachResults = await Promise.allSettled(toAttach.map(id => api.attachExistingDocument(appId, id)));
        const failed = attachResults.filter(r => r.status === 'rejected');
        if (failed.length) toast.error(`Attached ${toAttach.length - failed.length}/${toAttach.length} files (some failed).`);
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
      title={`Apply to ${job?.title || 'Job'}`}
      size='2xl'
      contentClassName="sm:max-w-2xl"
    >
      <div className="space-y-6">
        {/* Job Info Card */}
        {job && (
          <div className="rounded-lg bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 p-4">
            <h3 className="font-semibold text-white text-lg mb-1">{job.title}</h3>
            <div className="flex flex-wrap gap-2 text-sm text-slate-300">
              {job.company_name && <span>{job.company_name}</span>}
              {job.location && <span>• {job.location}</span>}
            </div>
          </div>
        )}

        {/* Step 1: Where did you find this job? */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-sm font-semibold">1</span>
            <h4 className="text-slate-200 font-medium">Where did you find this job?</h4>
            <span className="text-xs text-slate-500">(Optional)</span>
          </div>
          <Select 
            value={source} 
            onChange={(e) => setSource(e.target.value)}
            className="w-full"
          >
            <option value="">Select source...</option>
            {SOURCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Step 2: Add documents */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-sm font-semibold">2</span>
            <h4 className="text-slate-200 font-medium">Add your documents</h4>
          </div>

          {/* Tab Selection - Cleaner */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-800/50 rounded-lg">
            <button
              onClick={() => setTab('select')}
              className={`px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                tab === 'select'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-lg">📂</span>
                <span>My Files</span>
              </div>
            </button>
            <button
              onClick={() => setTab('upload')}
              className={`px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                tab === 'upload'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-lg">⬆️</span>
                <span>Upload New</span>
              </div>
            </button>
            <button
              onClick={() => setTab('none')}
              className={`px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                tab === 'none'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-lg">✓</span>
                <span>Skip</span>
              </div>
            </button>
          </div>

          {/* Tab Content */}
          <div className="min-h-[280px]">
            {/* SELECT EXISTING */}
            {tab === 'select' && (
              <div className="space-y-3">
                <p className="text-sm text-slate-400">Choose documents from your library</p>
                {applyDocsLoading ? (
                  <div className="flex items-center justify-center h-48 text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading your documents...</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Filter */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-slate-400">Type:</label>
                      <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="flex-1">
                        <option value="">All documents</option>
                        {DOC_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {typeLabel(t)}
                          </option>
                        ))}
                      </Select>
                    </div>

                    {/* Document List */}
                    <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-700 bg-slate-800/30">
                      {(() => {
                        const filtered = docs.filter((d) => !filterType || getDocType(d) === filterType);
                        if (filtered.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                              <svg className="w-12 h-12 mb-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <p className="text-sm">{docs.length ? 'No documents match this type' : 'No documents yet'}</p>
                              {!docs.length && <p className="text-xs text-slate-500 mt-1">Try "Upload New" tab</p>}
                            </div>
                          );
                        }
                        return filtered.map((d) => {
                          const checked = selectedDocIds.has(String(d.id));
                          const dtype = getDocType(d);
                          return (
                            <label
                              key={d.id}
                              className={`flex items-center gap-3 p-3 cursor-pointer transition-colors border-b border-slate-700/50 last:border-b-0 ${
                                checked ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500' : 'hover:bg-slate-700/30'
                              }`}
                            >
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
                                className="w-5 h-5 text-indigo-600 rounded border-slate-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-slate-200 font-medium truncate">{docDisplayName(d)}</div>
                                <div className="flex gap-2 text-xs text-slate-400 mt-0.5">
                                  <span className="px-1.5 py-0.5 bg-slate-700/50 rounded">{typeLabel(dtype)}</span>
                                  <span>{String(d.format || '').toUpperCase()}</span>
                                  {d.created_at && <span>• {new Date(d.created_at).toLocaleDateString()}</span>}
                                </div>
                              </div>
                            </label>
                          );
                        });
                      })()}
                    </div>
                    {selectedDocIds.size > 0 && (
                      <div className="text-sm text-indigo-400">
                        ✓ {selectedDocIds.size} document{selectedDocIds.size > 1 ? 's' : ''} selected
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* UPLOAD NOW */}
            {tab === 'upload' && (
              <div className="space-y-3">
                <p className="text-sm text-slate-400">Upload new documents for this application</p>
                
                {/* Upload Button */}
                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-indigo-500/5 transition-colors">
                  <svg className="w-10 h-10 text-slate-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-sm text-slate-300 font-medium">Click to select files</span>
                  <span className="text-xs text-slate-500 mt-1">PDF, DOC, TXT or images (max 10MB)</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.rtf,.png,.jpg,.jpeg,.mp3,.m4a,.aac,.wav,.flac,.ogg,.opus,audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                        .filter(f => f.size <= 10 * 1024 * 1024);
                      setUploads(prev => [...prev, ...files.map(file => ({ file, type: 'resume' }))]);
                    }}
                  />
                </label>

                {/* Files List */}
                {uploads.length > 0 && (
                  <div className="rounded-lg border border-slate-700 bg-slate-800/30 divide-y divide-slate-700/50">
                    {uploads.map((u, i) => (
                      <div key={i} className="flex items-center gap-3 p-3">
                        <svg className="w-8 h-8 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <div className="text-slate-200 font-medium truncate">{u.file.name}</div>
                          <div className="text-xs text-slate-400">{Math.ceil(u.file.size / 1024)} KB</div>
                        </div>
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
                          className="bg-slate-700/50 text-slate-200 border border-slate-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                          className="text-red-400 hover:text-red-300 p-1"
                          title="Remove"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* NONE */}
            {tab === 'none' && (
              <div className="flex flex-col items-center justify-center h-full py-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="text-center space-y-2">
                  <h5 className="text-slate-200 font-medium">No documents needed</h5>
                  <p className="text-sm text-slate-400 max-w-sm">
                    You can create the application now and attach documents later from your pipeline.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-700">
          <Button variant="ghost" onClick={onClose} disabled={applying} className="text-slate-400 hover:text-slate-200">
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
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6"
          >
            {applying ? 'Creating...' : 'Create Application'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
