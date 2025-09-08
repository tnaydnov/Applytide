import { useState, useEffect, useMemo } from 'react';
import { Card, Button, Input, Select, Textarea, Badge } from '../components/ui';
import api, { getTokens } from '../lib/api';
import AuthGuard from "../components/AuthGuard";
import { PremiumBadge, usePremiumFeature } from "../components/PremiumFeature";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const DOCUMENT_TYPES = [
  { value: 'resume',       label: 'Resume',       icon: 'resume' },
  { value: 'cover_letter', label: 'Cover Letter', icon: 'cover_letter' },
  { value: 'portfolio',    label: 'Portfolio',    icon: 'portfolio' },
  { value: 'certificate',  label: 'Certificate',  icon: 'certificate' },
  { value: 'transcript',   label: 'Transcript',   icon: 'transcript' },
  { value: 'reference',    label: 'Reference',    icon: 'reference' },
  { value: 'other',        label: 'Other',        icon: 'other' }
];

const DOCUMENT_STATUS = [
  { value: 'active',   label: 'Active',   color: 'green'  },
  { value: 'draft',    label: 'Draft',    color: 'yellow' },
  { value: 'archived', label: 'Archived', color: 'gray'   },
  { value: 'template', label: 'Template', color: 'blue'   }
];

function sanitizeName(name) {
  return (name || '')
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-z0-9 _-]+/gi, '')
    .trim();
}

const getCompany = (job) => job?.company || job?.company_name || 'Unknown Company';
const getDocName = (d) => d?.name || d?.file_name || d?.filename || 'Untitled';

export default function DocumentsPage() {
  const { checkPremium, PremiumModal } = usePremiumFeature();

  const [documents, setDocuments] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [resumes, setResumes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ file: null, type: 'resume', name: '', metadata: {} });

  const [showCoverLetterModal, setShowCoverLetterModal] = useState(false);
  const [coverLetterForm, setCoverLetterForm] = useState({
    job_id: '', resume_id: '', tone: 'professional', length: 'medium', focus_areas: [], custom_intro: ''
  });
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState('');

  const [showAnalysis, setShowAnalysis] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [analysisUseAI, setAnalysisUseAI] = useState(true);

  const [showJobPicker, setShowJobPicker] = useState(false);
  const [jobPickerDoc, setJobPickerDoc] = useState(null);
  const [jobSearchTerm, setJobSearchTerm] = useState('');
  const [selectedJobForAnalysis, setSelectedJobForAnalysis] = useState(null);

  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustDoc, setAdjustDoc] = useState(null);
  const [adjustForm, setAdjustForm] = useState({
    job_id: '',
    mode: 'conservative',
    use_ai: true,
    save_as_new: true,
    new_name: '',
    output: 'docx', // <--- NEW
  });
  const [adjustResultText, setAdjustResultText] = useState('');

  const [showGenerator, setShowGenerator] = useState(false);
  const [genFormat, setGenFormat] = useState('docx');
  const [answers, setAnswers] = useState({
    full_name: '',
    title_or_objective: '',
    summary: '',
    skills: '',
    links: '',
    experience: [],
    projects: [],
    education: [],
    certifications: []
  });

  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0, has_next: false, has_prev: false });
  const [filters, setFilters] = useState({ type: '', status: '', search: '' });

  const toast = {
    success: (m) => showToast('green', `✅ ${m}`),
    error:   (m) => showToast('red',   `❌ ${m}`),
    info:    (m) => showToast('blue',  `ℹ️ ${m}`)
  };
  function showToast(color, text) {
    const el = document.createElement('div');
    el.className = `fixed top-4 right-4 bg-${color}-100 border border-${color}-400 text-${color}-700 px-4 py-3 rounded z-[9999]`;
    el.innerHTML = `<span class="block sm:inline">${text}</span>`;
    document.body.appendChild(el);
    setTimeout(() => document.body.removeChild(el), 3000);
  }

  useEffect(() => {
    loadDocuments();
    loadJobs();
    loadResumes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, filters]);

  async function loadDocuments() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(pagination.page),
        page_size: String(pagination.page_size)
      });
      if (filters.type)   params.append('document_type', filters.type);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('q', filters.search);

      const response = await api.getDocuments(params.toString());
      setDocuments(response.documents || []);
      setPagination({
        page: response.page,
        page_size: response.page_size,
        total: response.total,
        has_next: response.has_next,
        has_prev: response.has_prev
      });
    } catch (e) {
      toast.error(`Failed to load documents: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  }

  async function loadResumes() {
    try {
      const resp = await api.getResumes();
      setResumes((resp.documents || []).map(d => ({ id: d.id, label: d.name || d.file_name || 'Resume' })));
    } catch (e) {
      console.error('Failed to load resumes:', e);
    }
  }

  async function loadJobs() {
    try {
      const response = await api.listJobs();
      const jobsData = response.items || [];
      setJobs(jobsData);
    } catch (e) {
      console.error('Failed to load jobs:', e);
    }
  }

  async function handleUpload() {
    if (uploading) return;
    if (!uploadForm.file) return toast.error('Please select a file to upload');

    try {
      setUploading(true);
      const ext = uploadForm.file.name.includes('.')
        ? uploadForm.file.name.substring(uploadForm.file.name.lastIndexOf('.'))
        : '';
      const desired = sanitizeName(uploadForm.name || '');

      let fileToSend = uploadForm.file;
      if (desired) {
        fileToSend = new File([uploadForm.file], `${desired}${ext}`, {
          type: uploadForm.file.type || 'application/octet-stream'
        });
      }

      const formData = new FormData();
      formData.append('file', fileToSend);
      formData.append('document_type', uploadForm.type);
      if (desired) formData.append('name', desired);
      if (uploadForm.metadata) formData.append('metadata', JSON.stringify(uploadForm.metadata));

      const { access_token } = getTokens() || {};
      const headers = {};
      if (access_token) headers.Authorization = `Bearer ${access_token}`;

      const resp = await fetch(`${API_BASE_URL}/documents/upload`, { method: 'POST', headers, body: formData });
      if (!resp.ok) throw new Error(`Upload failed (${resp.status})`);
      await resp.json().catch(() => ({}));

      toast.success('Document uploaded successfully!');
      setShowUpload(false);
      setUploadForm({ file: null, type: 'resume', name: '', metadata: {} });
      await loadDocuments();
      await loadResumes();
    } catch (e) {
      toast.error(`Upload failed: ${e.message || e}`);
    } finally {
      setUploading(false);
    }
  }

  async function runAnalysis(document, jobId = '', useAI = analysisUseAI) {
    if (document?.type && document.type !== 'resume') {
      toast.error('Analysis is only available for resumes.');
      return;
    }
    try {
      setAnalyzing(true);
      setSelectedDocument(document);
      setSelectedJobId(jobId || '');
      setAnalysis(null);
      setShowAnalysis(true);

      const result = await api.analyzeDocument(document.id, { jobId, use_ai: !!useAI });
      if (result?.success === false) throw new Error(result.error || 'Analysis failed');

      setAnalysis(result || {});
      const score = result?.ats_score?.overall_score ?? 0;
      toast.success(`Analysis complete! ATS Score: ${Number(score).toFixed(1)}%`);
    } catch (e) {
      toast.error(`Analysis failed: ${e.message || e}`);
      setShowAnalysis(false);
    } finally {
      setAnalyzing(false);
    }
  }

  async function generateCoverLetter() {
    if (!coverLetterForm.job_id) return toast.error('Please select a job');
    if (!coverLetterForm.resume_id) return toast.error('Please select a resume');

    checkPremium(async () => {
      try {
        // Expect your api client to POST to /documents/cover-letter/generate
        const response = await api.generateCoverLetter(coverLetterForm);
        if (response?.cover_letter) {
          setGeneratedCoverLetter(response.cover_letter);
          toast.success('Cover letter generated successfully!');
        } else {
          throw new Error('No cover letter content received');
        }
      } catch (e) {
        toast.error(`Generation failed: ${e.message || e}`);
      }
    }, "AI Cover Letter Generation");
  }

  async function saveCoverLetterAsDocument() {
    if (!generatedCoverLetter) return toast.error('No cover letter to save');

    try {
      const selectedJob = jobs.find(j => String(j.id) === String(coverLetterForm.job_id));
      const filename = `Cover_Letter_${getCompany(selectedJob)}_${(selectedJob?.title || 'Job').replace(/[^a-zA-Z0-9]/g, '_')}.txt`;

      const blob = new Blob([generatedCoverLetter], { type: 'text/plain' });
      const file = new File([blob], filename, { type: 'text/plain' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', 'cover_letter');
      formData.append('metadata', JSON.stringify({
        generated_for_job: selectedJob?.title,
        generated_for_company: getCompany(selectedJob),
        tone: coverLetterForm.tone,
        length: coverLetterForm.length
      }));

      const { access_token } = getTokens() || {};
      const response = await fetch(`${API_BASE_URL}/documents/upload`, {
        method: 'POST',
        body: formData,
        headers: access_token ? { Authorization: `Bearer ${access_token}` } : {}
      });

      if (!response.ok) throw new Error('Upload failed');

      toast.success('Cover letter saved as document!');
      loadDocuments();
    } catch (e) {
      toast.error(`Failed to save: ${e.message || e}`);
    }
  }

  async function deleteDocument(documentId) {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.deleteDocument(documentId);
      toast.success('Document deleted successfully');
      loadDocuments();
      loadResumes();
    } catch (e) {
      toast.error(`Delete failed: ${e.message || e}`);
    }
  }

  async function previewDocument(document) {
    try {
      await api.previewDocument(document.id);
    } catch (e) {
      toast.error(`Preview failed: ${e.message || e}`);
    }
  }

  function getScoreColor(score) {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  }

  const filteredJobs = useMemo(() => {
    const q = jobSearchTerm.trim().toLowerCase();
    if (!q) return jobs;
    return (jobs || []).filter(j =>
      j?.title?.toLowerCase().includes(q) ||
      getCompany(j)?.toLowerCase().includes(q) ||
      j?.location?.toLowerCase().includes(q)
    );
  }, [jobs, jobSearchTerm]);

  const renderIcon = (iconType) => {
    switch (iconType) {
      case 'resume':
        return (
          <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'cover_letter':
        return (
          <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case 'portfolio':
        return (
          <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
      case 'certificate':
        return (
          <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'transcript':
        return (
          <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
      case 'reference':
        return (
          <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-200">Document Manager</h1>
              <p className="text-slate-400 mt-2">Manage your resumes, cover letters, and other documents with AI-powered optimization</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => checkPremium(() => setShowCoverLetterModal(true), "AI Cover Letter Generation")}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Generate Cover Letter
                <PremiumBadge size="xs" />
              </Button>
              <Button onClick={() => setShowUpload(true)} className="bg-blue-600 hover:bg-blue-700">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload Document
              </Button>
            </div>
          </div>

          {/* Search & Filters */}
          <Card className="glass-card glass-cyan">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🔍</span>
                <h2 className="text-xl font-semibold text-slate-100">Search & Filter Documents</h2>
              </div>

              <div className="relative">
                <Input
                  placeholder="Search by filename, content, or metadata..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full input-glass input-cyan"
                  icon={<span>🔍</span>}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} className="input-glass input-cyan">
                  <option value="">All Types</option>
                  {DOCUMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
                <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="input-glass input-cyan">
                  <option value="">All Status</option>
                  {DOCUMENT_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </Select>
                <Button onClick={() => setFilters({ type: '', status: '', search: '' })} className="input-glass input-cyan text-cyan-400 border-cyan-400/50 bg-cyan-500/10 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all duration-300">
                  Clear Filters
                </Button>
              </div>
            </div>
          </Card>

          {/* Header */}
          <div className="mb-6 mt-8">
            <h2 className="text-2xl font-bold text-slate-200">My Documents</h2>
            <p className="text-slate-400 mt-1">Manage and analyze your resumes, cover letters, and other documents</p>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mx-auto"></div>
              <p className="mt-4 text-slate-400">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <Card className="p-12 text-center glass-card glass-cyan">
              <div className="text-6xl mb-4">
                <svg className="w-16 h-16 mx-auto text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-200 mb-2">No documents found</h3>
              <p className="text-slate-400 mb-6">Upload your first document to get started</p>
              <Button onClick={() => setShowUpload(true)} className="bg-blue-600 hover:bg-blue-700">Upload Document</Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map(document => {
                const docType = DOCUMENT_TYPES.find(t => t.value === document.type) || { value: 'other', label: 'Other', icon: 'other' };
                const docStatus = DOCUMENT_STATUS.find(s => s.value === document.status) || DOCUMENT_STATUS[0];
                const name = getDocName(document);

                return (
                  <Card key={document.id} className="p-6 hover:shadow-lg transition-shadow glass-card glass-cyan">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <div className="text-2xl mr-3">{renderIcon(docType.icon)}</div>
                        <div>
                          <h3 className="font-semibold text-slate-200 truncate">{name}</h3>
                          <p className="text-sm text-slate-400">{docType.label}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${docStatus.color}-900/50 text-${docStatus.color}-300 border border-${docStatus.color}-500/30`}>
                        {docStatus.label}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm"><span className="text-slate-400">Size:</span><span className="text-slate-200">{((document.file_size || 0) / 1024).toFixed(1)} KB</span></div>
                      <div className="flex justify-between text-sm"><span className="text-slate-400">Created:</span><span className="text-slate-200">{document.created_at ? new Date(document.created_at).toLocaleDateString() : '-'}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-slate-400">Version:</span><span className="text-slate-200">v{document.current_version ?? 1}</span></div>
                      {document.ats_score != null && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">ATS Score:</span>
                          <span className={getScoreColor(document.ats_score)}>{Number(document.ats_score).toFixed(1)}%</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {document.type === 'resume' && (
                        <div className="flex-1">
                          <Button onClick={() => runAnalysis(document)} variant="outline" size="sm" className="w-full" disabled={analyzing}>
                            {analyzing ? '🔄' : '🔍'} {analyzing ? 'Analyzing...' : 'Analyze'}
                          </Button>
                          {jobs.length > 0 && (
                            <div className="mt-2">
                              <Button
                                onClick={() => { setJobPickerDoc(document); setShowJobPicker(true); }}
                                variant="outline"
                                size="sm"
                                className="w-full text-xs bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                                disabled={analyzing}
                              >
                                🎯 Analyze against specific job ({jobs.length} available)
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      <Button onClick={() => previewDocument(document)} variant="outline" size="sm" className="px-3">👁️</Button>
                      <Button onClick={() => api.downloadDocument(document.id)} variant="outline" size="sm" className="px-3">📥</Button>
                      <Button onClick={() => deleteDocument(document.id)} variant="outline" size="sm" className="text-red-600 hover:text-red-700 px-3">🗑️</Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {pagination.total > pagination.page_size && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <Button onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })} disabled={!pagination.has_prev} variant="outline">Previous</Button>
              <span className="text-gray-600">Page {pagination.page} of {Math.ceil(pagination.total / pagination.page_size)}</span>
              <Button onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })} disabled={!pagination.has_next} variant="outline">Next</Button>
            </div>
          )}

          {/* Upload Modal */}
          {showUpload && (
            <>
              <div onClick={() => setShowUpload(false)} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 cursor-pointer" />
              <div className="fixed z-50 inset-0 flex items-center justify-center p-4">
                <div className="modal-surface w-full max-w-md rounded-2xl ring-1 p-6" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-100">Upload Document</h3>
                    <button onClick={() => setShowUpload(false)} className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/5 transition" aria-label="Close" type="button">✕</button>
                  </div>

                  <div className="space-y-6">
                    <div>
                                            <label className="block text-xs font-semibold text-slate-400 tracking-wide uppercase mb-2">Document Type</label>
                      <Select value={uploadForm.type} onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value })} className="w-full text-sm font-medium text-slate-100">
                        {DOCUMENT_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-2">Document Name (optional)</label>
                      <input
                        type="text"
                        value={uploadForm.name}
                        onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                        placeholder="e.g., Tomer Naydnov – English Resume"
                        className="w-full input-glass"
                      />
                      <p className="text-xs text-slate-400 mt-1">We’ll keep your file extension and use this as the display name.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-2">File</label>
                      <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })} className="w-full input-glass" />
                      <p className="text-xs text-slate-400 mt-1">Supported formats: PDF, DOC, DOCX, TXT</p>
                    </div>

                    <div className="flex gap-3 justify-end pt-2">
                      <Button variant="outline" onClick={() => setShowUpload(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700/50">Cancel</Button>
                      <Button onClick={handleUpload} disabled={uploading || !uploadForm.file} className="bg-blue-600 hover:bg-blue-700 text-white">
                        {uploading ? 'Uploading...' : 'Upload'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ================= Cover Letter Modal ================= */}
          {showCoverLetterModal && (
            <>
              <div onClick={() => setShowCoverLetterModal(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 10000, cursor: 'pointer' }} />
              <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', zIndex: 10001, maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto', border: '1px solid #e5e7eb' }}>
                <div style={{ padding: '24px', minWidth: '600px' }}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center"><span className="text-white text-lg">✨</span></div>
                      <div>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Generate AI Cover Letter</h2>
                        <PremiumBadge size="sm" />
                      </div>
                    </div>
                    <button onClick={() => setShowCoverLetterModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6B7280' }}>✕</button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                    {/* Left column */}
                    <div>
                      <div style={{ marginBottom: '16px' }}>
                        <label className="field-label">Target Job *</label>
                        <select value={coverLetterForm.job_id} onChange={(e) => setCoverLetterForm({ ...coverLetterForm, job_id: e.target.value })} className="w-full input-glass">
                          <option value="">Select a job...</option>
                          {jobs.map(job => <option key={job.id} value={job.id}>{job.title} at {getCompany(job)}</option>)}
                        </select>
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <label className="field-label">Resume *</label>
                        <select value={coverLetterForm.resume_id} onChange={(e) => setCoverLetterForm({ ...coverLetterForm, resume_id: e.target.value })} className="w-full input-glass">
                          <option value="">Select your resume...</option>
                          {resumes.map(resume => <option key={resume.id} value={resume.id}>{resume.label || `Resume ${resume.id}`}</option>)}
                        </select>
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <label className="field-label">Tone</label>
                        <select value={coverLetterForm.tone} onChange={(e) => setCoverLetterForm({ ...coverLetterForm, tone: e.target.value })} className="w-full input-glass">
                          <option value="professional">Professional</option>
                          <option value="enthusiastic">Enthusiastic</option>
                          <option value="confident">Confident</option>
                          <option value="creative">Creative</option>
                        </select>
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <label className="field-label">Length</label>
                        <select value={coverLetterForm.length} onChange={(e) => setCoverLetterForm({ ...coverLetterForm, length: e.target.value })} className="w-full input-glass">
                          <option value="short">Short (200-300 words)</option>
                          <option value="medium">Medium (300-400 words)</option>
                          <option value="long">Long (400-500 words)</option>
                        </select>
                      </div>

                      <button
                        onClick={generateCoverLetter}
                        disabled={!coverLetterForm.job_id || !coverLetterForm.resume_id}
                        style={{
                          width: '100%', padding: '12px 16px',
                          backgroundColor: (!coverLetterForm.job_id || !coverLetterForm.resume_id) ? '#9ca3af' : '#7c3aed',
                          color: 'white', border: 'none', borderRadius: '6px',
                          cursor: (!coverLetterForm.job_id || !coverLetterForm.resume_id) ? 'not-allowed' : 'pointer',
                          fontSize: '14px', fontWeight: '500'
                        }}
                      >
                        ✨ Generate Cover Letter
                      </button>
                    </div>

                    {/* Right column */}
                    <div>
                      <label className="field-label">Generated Cover Letter</label>
                      <textarea
                        value={generatedCoverLetter}
                        onChange={(e) => setGeneratedCoverLetter(e.target.value)}
                        placeholder="Generated cover letter will appear here..."
                        style={{ width: '100%', height: '300px', padding: '12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', resize: 'vertical', fontFamily: 'system-ui, sans-serif' }}
                        readOnly={!generatedCoverLetter}
                      />
                      {generatedCoverLetter && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
                          <button onClick={() => { navigator.clipboard.writeText(generatedCoverLetter); alert('Cover letter copied to clipboard!'); }} className="btn-ghost px-3 py-1 rounded">📋 Copy</button>
                          <button onClick={saveCoverLetterAsDocument} className="btn-ghost px-3 py-1 rounded">💾 Save as Document</button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowCoverLetterModal(false)} className="btn-ghost px-4 py-2 rounded">Close</button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ================= Analysis Modal ================= */}
          {showAnalysis && (
            <>
              <div onClick={() => setShowAnalysis(false)} className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 cursor-pointer" />
              <div className="fixed z-50 inset-0 flex items-center justify-center p-4">
                <div className="w-full max-w-5xl h-[85vh] modal-surface rounded-2xl ring-1 overflow-hidden" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
                    <div>
                      <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">🔍 Document Analysis Results</h2>
                      {selectedJobId && (
                        <p className="text-sm text-slate-400 mt-1">
                          Against job ID: <span className="text-slate-200">{selectedJobId}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-slate-200 flex items-center gap-2">
                        <input type="checkbox" checked={analysisUseAI} onChange={(e) => setAnalysisUseAI(e.target.checked)} />
                        Use AI suggestions
                      </label>
                      <Button onClick={() => runAnalysis(selectedDocument, selectedJobId, analysisUseAI)} size="sm" variant="outline">↻ Re-run</Button>
                      <button onClick={() => setShowAnalysis(false)} className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/5 transition" aria-label="Close" type="button">✕</button>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="h-[calc(85vh-64px)] overflow-y-auto px-6 py-5">
                    <div className={`p-4 rounded-lg border mb-6 ${selectedJobId ? 'bg-blue-900/30 border-blue-500/30 text-blue-200' : 'bg-amber-900/30 border-amber-500/30 text-amber-200'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{selectedJobId ? '🎯' : '📊'}</span>
                        <strong className="text-slate-200">{selectedJobId ? 'Job-Specific Analysis' : 'General Resume Analysis'}</strong>
                      </div>
                      <p className="text-sm text-slate-300 m-0">
                        {selectedJobId
                          ? 'This analysis compares your resume against job skills/requirements and provides targeted feedback.'
                          : 'This is a general analysis. Select a job for tailored matching.'}
                      </p>
                    </div>

                    {analysis ? (
                      <div className="flex flex-col gap-6">
                        {/* Score block */}
                        <div className="p-4 rounded-lg border bg-slate-800/60 border-white/20">
                          <div className="text-center mb-4">
                            <div
                              className="text-4xl font-bold"
                              style={{
                                color:
                                  (analysis.ats_score?.overall_score || 0) >= 80 ? '#059669' :
                                  (analysis.ats_score?.overall_score || 0) >= 60 ? '#d97706' : '#dc2626'
                              }}
                            >
                              {(analysis.ats_score?.overall_score || 0).toFixed(1)}%
                            </div>
                            <p className="text-base text-slate-400">
                              {analysis.ats_score?.technical_skills_score != null ? 'Job Match Score' : 'Resume Quality Score'}
                            </p>
                            {analysis.job_match_summary && (
                              <p className="text-sm text-slate-300 mt-2">
                                {typeof analysis.job_match_summary === 'string' ? analysis.job_match_summary : analysis.job_match_summary?.summary}
                              </p>
                            )}
                          </div>

                          {/* Sub-scores */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {analysis.ats_score?.technical_skills_score != null && (
                              <div className="text-center p-3 rounded bg-blue-500/20 border border-blue-500/30">
                                <div className="text-xl font-bold" style={{ color: analysis.ats_score.technical_skills_score >= 80 ? '#10b981' : analysis.ats_score.technical_skills_score >= 60 ? '#f59e0b' : '#ef4444' }}>
                                  {(analysis.ats_score.technical_skills_score || 0).toFixed(1)}%
                                </div>
                                <p className="text-xs text-slate-300">Technical Skills</p>
                              </div>
                            )}
                            {analysis.ats_score?.soft_skills_score != null && (
                              <div className="text-center p-3 rounded bg-emerald-500/20 border border-emerald-500/30">
                                <div className="text-xl font-bold" style={{ color: analysis.ats_score.soft_skills_score >= 80 ? '#10b981' : analysis.ats_score.soft_skills_score >= 60 ? '#f59e0b' : '#ef4444' }}>
                                  {(analysis.ats_score.soft_skills_score || 0).toFixed(1)}%
                                </div>
                                <p className="text-xs text-slate-300">Soft Skills</p>
                              </div>
                            )}
                            {analysis.ats_score?.keyword_score != null && (
                              <div className="text-center p-3 rounded bg-amber-500/20 border border-amber-500/30">
                                <div className="text-xl font-bold" style={{ color: analysis.ats_score.keyword_score >= 80 ? '#10b981' : analysis.ats_score.keyword_score >= 60 ? '#f59e0b' : '#ef4444' }}>
                                  {analysis.ats_score.keyword_score.toFixed(1)}%
                                </div>
                                <p className="text-xs text-slate-300">Keywords</p>
                              </div>
                            )}
                            {analysis.ats_score?.formatting_score != null && (
                              <div className="text-center p-3 rounded bg-indigo-500/20 border border-indigo-500/30">
                                <div className="text-xl font-bold" style={{ color: analysis.ats_score.formatting_score >= 80 ? '#10b981' : analysis.ats_score.formatting_score >= 60 ? '#f59e0b' : '#ef4444' }}>
                                  {analysis.ats_score.formatting_score.toFixed(1)}%
                                </div>
                                <p className="text-xs text-slate-300">Formatting</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Keyword Analysis */}
                        {analysis.keyword_analysis && (
                          <div className="p-4 rounded-lg border bg-slate-800/60 border-white/20">
                            <h3 className="font-semibold mb-4 text-blue-300">🎯 Keyword Analysis</h3>

                            {Array.isArray(analysis.keyword_analysis.keywords_found) && analysis.keyword_analysis.keywords_found.length > 0 && (
                              <div className="mb-4">
                                <p className="text-sm text-emerald-400 mb-2 font-medium">✅ Found</p>
                                <div className="flex flex-wrap gap-2">
                                  {analysis.keyword_analysis.keywords_found.map((k, i) => (
                                    <span key={i} className="px-2 py-1 text-xs rounded bg-emerald-100 text-emerald-700 border border-emerald-200">{k}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {Array.isArray(analysis.keyword_analysis.keywords_missing) && analysis.keyword_analysis.keywords_missing.length > 0 && (
                              <div className="mb-4">
                                <p className="text-sm text-red-400 mb-2 font-medium">❌ Missing</p>
                                <div className="flex flex-wrap gap-2">
                                  {analysis.keyword_analysis.keywords_missing.map((k, i) => (
                                    <span key={i} className="px-2 py-1 text-xs rounded bg-red-500/20 text-red-300 border border-red-500/30">{k}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Density bars */}
                            {analysis.keyword_analysis.keyword_density && Object.keys(analysis.keyword_analysis.keyword_density).length > 0 && (
                              <div className="mt-3">
                                <h4 className="font-semibold mb-2 text-slate-100">📊 Density</h4>
                                <div className="flex flex-col gap-2">
                                  {Object.entries(analysis.keyword_analysis.keyword_density).map(([k, d]) => (
                                    <div key={k} className="flex items-center justify-between">
                                      <span className="text-slate-300">{k}</span>
                                      <div className="flex items-center">
                                        <div className="w-24 h-2 bg-slate-200 rounded mr-2 overflow-hidden">
                                          <div className="h-2 bg-blue-600 rounded" style={{ width: `${Math.min(Number(d) * 10, 100)}%` }} />
                                        </div>
                                        <span className="text-xs text-slate-400">{Number(d).toFixed(1)}%</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Suggested improvements */}
                        {Array.isArray(analysis.suggested_improvements) && analysis.suggested_improvements.length > 0 && (
                          <div className="p-4 rounded-lg border bg-slate-800/60 border-white/20">
                            <h3 className="font-semibold mb-3 text-slate-100">🛠 Suggested Improvements</h3>
                            <ul className="list-disc pl-5 m-0 space-y-2 text-slate-100">
                              {analysis.suggested_improvements.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                          </div>
                        )}

                        {/* Missing skills */}
                        {analysis.missing_skills && (
                          <div className="p-4 rounded-lg border bg-red-500/10 border-red-500/30">
                            <h3 className="font-semibold mb-3 text-red-300">⚠️ Missing Skills & Keywords</h3>
                            <div className="flex flex-wrap gap-2">
                              {(Array.isArray(analysis.missing_skills) ? analysis.missing_skills : analysis.missing_skills.skills || []).slice(0, 30).map((s, i) => (
                                <span key={i} className="px-2 py-1 text-xs rounded bg-red-500/25 text-red-300 border border-red-500/40">{s}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Stats */}
                        <div className="p-4 rounded-lg border bg-slate-800/60 border-white/20">
                          <h3 className="font-semibold mb-3 text-slate-100">Document Statistics</h3>
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div><div className="text-lg font-bold text-slate-100">{analysis.word_count || 0}</div><p className="text-xs text-slate-400">Words</p></div>
                            <div><div className="text-lg font-bold text-slate-100">{(analysis.readability_score || 0).toFixed(1)}%</div><p className="text-xs text-slate-400">Readability</p></div>
                            <div><div className="text-lg font-bold text-slate-100">{analysis.missing_sections?.length || 0}</div><p className="text-xs text-slate-400">Missing Sections</p></div>
                          </div>
                        </div>

                        {/* Missing sections */}
                        {Array.isArray(analysis.missing_sections) && analysis.missing_sections.length > 0 && (
                          <div className="p-4 rounded-lg border bg-amber-500/10 border-amber-500/30">
                            <h3 className="font-semibold mb-3 text-amber-300">⚠️ Missing Sections</h3>
                            <ul className="list-disc pl-5 m-0 space-y-2 text-slate-100">
                              {analysis.missing_sections.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-400">Analyzing document...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ================= Job Selection Modal ================= */}
          {showJobPicker && (
            <>
              <div onClick={() => { setShowJobPicker(false); setJobPickerDoc(null); setSelectedJobForAnalysis(null); setJobSearchTerm(''); }} className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 cursor-pointer" />
              <div className="fixed z-50 inset-0 flex items-center justify-center p-4">
                <div className="w-full max-w-4xl h-[85vh] modal-surface rounded-2xl ring-1 overflow-hidden flex flex-col" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                  <div className="px-6 py-4 border-b border-white/10 bg-white/5">
                    <h3 className="text-xl font-bold text-slate-100">🎯 Select Job for Analysis</h3>
                    <p className="text-slate-400 text-sm mt-1">Choose a job to analyze your {getDocName(jobPickerDoc)} against specific requirements</p>
                  </div>
                  <div className="p-4">
                    <Input type="text" placeholder="🔍 Search jobs by title, company, or keywords..." value={jobSearchTerm} onChange={(e) => setJobSearchTerm(e.target.value)} className="input-glass" />
                  </div>
                  <div className="flex-1 overflow-y-auto mx-4 mb-4 rounded-lg border border-white/10">
                    {filteredJobs.length ? (
                      filteredJobs.map((job) => {
                        const isSelected = String(selectedJobForAnalysis?.id) === String(job.id);
                        return (
                          <button key={job.id} onClick={() => setSelectedJobForAnalysis(job)} className={`w-full text-left p-4 border-b border-white/10 transition ${isSelected ? 'bg-blue-500/20 ring-1 ring-blue-500/40' : 'hover:bg-white/5'}`}>
                            <div className="flex items-start justify-between">
                              <div className="pr-3">
                                <h4 className="font-semibold text-slate-100 mb-1">{job.title}</h4>
                                <p className="text-sm text-slate-400 mb-1">🏢 {getCompany(job)}</p>
                                {job.location && <p className="text-xs text-slate-400 mb-2">📍 {job.location}</p>}
                                {job.description && <p className="text-xs text-slate-400 line-clamp-3">{job.description}</p>}
                              </div>
                              <span className={`flex-none w-6 h-6 rounded-full flex items-center justify-center ${isSelected ? 'bg-blue-600 text-white' : 'bg-white/20 text-slate-300'}`}>{isSelected ? '✓' : '○'}</span>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-10 text-center text-slate-400">No jobs found matching “{jobSearchTerm}”.</div>
                    )}
                  </div>
                  <div className="px-6 py-4 border-t border-white/10 bg-white/5 flex justify-between">
                    <Button variant="outline" onClick={() => { setShowJobPicker(false); setJobPickerDoc(null); setSelectedJobForAnalysis(null); setJobSearchTerm(''); }} className="border-slate-600 text-slate-300 hover:bg-slate-700/50">Cancel</Button>
                    <div className="flex gap-2">
                      <Button variant="default" onClick={() => { runAnalysis(jobPickerDoc, ''); setShowJobPicker(false); setJobPickerDoc(null); setSelectedJobForAnalysis(null); setJobSearchTerm(''); }} className="bg-slate-200/10 text-slate-100 hover:bg-slate-200/20">📊 Quick Analysis (No Job)</Button>
                      <Button onClick={() => { if (selectedJobForAnalysis) { runAnalysis(jobPickerDoc, selectedJobForAnalysis.id); setShowJobPicker(false); setJobPickerDoc(null); setSelectedJobForAnalysis(null); setJobSearchTerm(''); } }} disabled={!selectedJobForAnalysis} className="bg-blue-700 hover:bg-blue-800 disabled:bg-slate-700 disabled:cursor-not-allowed">🎯 Analyze Against Selected Job</Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Premium Modal */}
          <PremiumModal />
        </div>
      </div>
    </AuthGuard>
  );
}

