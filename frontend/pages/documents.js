import { useState, useEffect } from 'react';
import { Card, Button, Input, Select, Modal, Textarea, FileUpload } from '../components/ui';
import api, { apiFetch, getTokens } from '../lib/api';
import AuthGuard from "../components/AuthGuard";
import { PremiumBadge, usePremiumFeature } from "../components/PremiumFeature";

// Enhanced Document Management with Intelligent ATS Analysis
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const DOCUMENT_TYPES = [
  { value: 'resume', label: 'Resume', icon: 'resume' },
  { value: 'cover_letter', label: 'Cover Letter', icon: 'cover_letter' },
  { value: 'portfolio', label: 'Portfolio', icon: 'portfolio' },
  { value: 'certificate', label: 'Certificate', icon: 'certificate' },
  { value: 'transcript', label: 'Transcript', icon: 'transcript' },
  { value: 'reference', label: 'Reference', icon: 'reference' },
  { value: 'other', label: 'Other', icon: 'other' }
];

const DOCUMENT_STATUS = [
  { value: 'active', label: 'Active', color: 'green' },
  { value: 'draft', label: 'Draft', color: 'yellow' },
  { value: 'archived', label: 'Archived', color: 'gray' },
  { value: 'template', label: 'Template', color: 'blue' }
];

// keep letters, numbers, spaces, dashes/underscores; strip any extension the user typed
function sanitizeName(name) {
  return (name || '')
    .replace(/\.[^/.]+$/, '')        // drop any extension the user entered
    .replace(/[^a-z0-9 _-]+/gi, '')  // keep simple safe chars
    .trim();
}


export default function DocumentsPage() {
  const { checkPremium, PremiumModal } = usePremiumFeature();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showCoverLetterModal, setShowCoverLetterModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedJob, setSelectedJob] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 20,
    total: 0,
    has_next: false,
    has_prev: false
  });
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    search: ''
  });
  
  // Job selection modal states
  const [showJobSelectionModal, setShowJobSelectionModal] = useState(false);
  const [jobSelectionDocument, setJobSelectionDocument] = useState(null);
  const [jobSearchTerm, setJobSearchTerm] = useState('');
  const [selectedJobForAnalysis, setSelectedJobForAnalysis] = useState(null);
  
  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    file: null,
    type: 'resume',
    name: '',
    metadata: {}
  });
  
  // Cover letter form state
  const [coverLetterForm, setCoverLetterForm] = useState({
    job_id: '',
    resume_id: '',
    tone: 'professional',
    length: 'medium',
    focus_areas: [],
    custom_intro: ''
  });
  
  const [jobs, setJobs] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState('');
  
  // Simple toast function with better UX
  const toast = {
    success: (message) => {
      // Create a temporary toast element
      const toastEl = document.createElement('div');
      toastEl.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50';
      toastEl.innerHTML = `<span class="block sm:inline">✅ ${message}</span>`;
      document.body.appendChild(toastEl);
      setTimeout(() => document.body.removeChild(toastEl), 3000);
    },
    error: (message) => {
      const toastEl = document.createElement('div');
      toastEl.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50';
      toastEl.innerHTML = `<span class="block sm:inline">❌ ${message}</span>`;
      document.body.appendChild(toastEl);
      setTimeout(() => document.body.removeChild(toastEl), 3000);
    },
    info: (message) => {
      const toastEl = document.createElement('div');
      toastEl.className = 'fixed top-4 right-4 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded z-50';
      toastEl.innerHTML = `<span class="block sm:inline">ℹ️ ${message}</span>`;
      document.body.appendChild(toastEl);
      setTimeout(() => document.body.removeChild(toastEl), 3000);
    }
  };

  useEffect(() => {
    loadDocuments();
    loadJobs();
    loadResumes();
  }, [pagination.page, filters]);

  async function loadDocuments() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        page_size: pagination.page_size.toString()
      });
      
      if (filters.type) params.append('document_type', filters.type);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('q', filters.search);
      
      const response = await api.getDocuments(params.toString());
      setDocuments(response.documents);
      setPagination({
        page: response.page,
        page_size: response.page_size,
        total: response.total,
        has_next: response.has_next,
        has_prev: response.has_prev
      });
    } catch (error) {
      toast.error(`Failed to load documents: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function loadResumes() {
    try {
      const response = await api.listResumes();
      const resumesData = response.items || response || [];
      console.log('Loaded resumes for cover letter:', resumesData);
      setResumes(resumesData);
    } catch (error) {
      console.error('Failed to load resumes:', error);
    }
  }

  async function loadJobs() {
    try {
      // Skip the enhanced API for now and use the main jobs API directly
      const response = await api.listJobs();
      const jobsData = response.items || [];
      console.log('Loaded jobs for cover letter:', jobsData);
      setJobs(jobsData);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    }
  }

  // Enhanced analysis function for Docker integration
  async function handleEnhancedAnalysis(document, jobId = '') {
    if (document?.type && document.type !== 'resume') {
      toast.error('Analysis is only available for resumes.');
      return;
    }
    try {
      setAnalyzing(true);
      setSelectedDocument(document);
      setSelectedJob(jobId);
      
      // Use authenticated fetch for enhanced API
      const { access_token } = typeof window !== "undefined" ? 
        JSON.parse(localStorage.getItem("tokens") || "{}") : {};
      
      const headers = {};
      if (access_token) {
        headers.Authorization = `Bearer ${access_token}`;
      }
      
      const url = jobId 
        ? `${API_BASE_URL}/documents/${document.id}/analyze?job_id=${jobId}`
        : `${API_BASE_URL}/documents/${document.id}/analyze`;
        
      const response = await fetch(url, { 
        method: 'POST',
        headers: headers
      });
      
      if (!response.ok) throw new Error('Analysis failed');
      
      const result = await response.json();
      setAnalysis(result);
      setShowAnalysisModal(true);
      
      if (result.success !== false) {
        const score = result.ats_score?.overall_score || 0;
        toast.success(`Analysis complete! ATS Score: ${score.toFixed(1)}%`);
      } else {
        toast.error(result.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Enhanced analysis failed, falling back to basic analysis:', error);
      // Fallback to basic analysis
      analyzeDocument(document);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleUpload() {
    if (uploading) return; // guard against double clicks
    if (!uploadForm.file) {
      toast.error('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);

      // build a safely renamed File if user provided a name
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

      // VERY IMPORTANT: send the chosen document type
      formData.append('document_type', uploadForm.type);

      // send name too (harmless if backend ignores; helpful if it supports it)
      if (desired) formData.append('name', desired);

      if (uploadForm.metadata) {
        formData.append('metadata', JSON.stringify(uploadForm.metadata));
      }

      const { access_token } = getTokens() || {};
      const headers = {};
      if (access_token) headers.Authorization = `Bearer ${access_token}`;

      const resp = await fetch(`${API_BASE_URL}/documents/upload`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!resp.ok) throw new Error(`Upload failed (${resp.status})`);
      await resp.json().catch(() => ({}));

      toast.success('Document uploaded successfully!');
      setShowUploadModal(false);
      setUploadForm({ file: null, type: 'resume', name: '', metadata: {} });
      await loadDocuments();
    } catch (error) {
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  }



  async function analyzeDocument(document) {
    if (document?.type && document.type !== 'resume') {
      toast.error('Analysis is only available for resumes.');
      return;
    }
    try {
      setSelectedDocument(document);
      setShowAnalysisModal(true);
      setAnalyzing(true);
      setAnalysis(null);
      
      // Check if a job is selected
      if (!selectedJob) {
        toast.error('Please select a job to analyze against');
        setShowAnalysisModal(false);
        setAnalyzing(false);
        return;
      }

      // Use enhanced API for analysis
      const { access_token } = typeof window !== "undefined" ? 
        JSON.parse(localStorage.getItem("tokens") || "{}") : {};
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (access_token) {
        headers.Authorization = `Bearer ${access_token}`;
      }

      const response = await fetch(`${API_BASE_URL}/documents/${document.id}/analyze?job_id=${selectedJob}`, {
        method: 'POST',
        headers: headers
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const analysisResult = await response.json();
      
      if (analysisResult.success) {
        setAnalysis(analysisResult);
        toast.success('Analysis completed successfully!');
      } else {
        throw new Error(analysisResult.message || 'Analysis failed');
      }
      
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error(`Analysis failed: ${error.message}`);
      setShowAnalysisModal(false);
    } finally {
      setAnalyzing(false);
    }
  }

  async function saveCoverLetterAsDocument() {
    if (!generatedCoverLetter) {
      toast.error('No cover letter to save');
      return;
    }

    try {
      const selectedJob = jobs.find(job => job.id === coverLetterForm.job_id);
      const filename = `Cover_Letter_${selectedJob?.company_name || 'Unknown'}_${selectedJob?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'Job'}.txt`;
      
      // Create a text file blob
      const blob = new Blob([generatedCoverLetter], { type: 'text/plain' });
      const file = new File([blob], filename, { type: 'text/plain' });
      
      // Create form data for upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', 'cover_letter');
      formData.append('metadata', JSON.stringify({
        generated_for_job: selectedJob?.title,
        generated_for_company: selectedJob?.company_name,
        tone: coverLetterForm.tone,
        length: coverLetterForm.length
      }));

      // Upload the document
      const response = await fetch(`${API_BASE_URL}/documents/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${getTokens().access_token}`
        }
      });

      if (response.ok) {
        toast.success('Cover letter saved as document!');
        loadDocuments(); // Refresh the documents list
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error(`Failed to save: ${error.message}`);
    }
  }

  async function generateCoverLetter() {
    if (!coverLetterForm.job_id) {
      toast.error('Please select a job');
      return;
    }
    
    if (!coverLetterForm.resume_id) {
      toast.error('Please select a resume');
      return;
    }

    checkPremium(async () => {
      try {
        console.log('Generating cover letter with:', coverLetterForm);
        const response = await api.generateCoverLetter(coverLetterForm);
        console.log('Cover letter response:', response);
        
        if (response.cover_letter) {
          setGeneratedCoverLetter(response.cover_letter);
          toast.success('Cover letter generated successfully!');
        } else {
          throw new Error('No cover letter content received');
        }
      } catch (error) {
        console.error('Cover letter generation error:', error);
        toast.error(`Generation failed: ${error.message}`);
      }
    }, "AI Cover Letter Generation");
  }

  async function deleteDocument(documentId) {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await api.deleteDocument(documentId);
      toast.success('Document deleted successfully');
      loadDocuments();
    } catch (error) {
      toast.error(`Delete failed: ${error.message}`);
    }
  }

  function getScoreColor(score) {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  }

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
      case 'other':
        return (
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
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
              <Button onClick={() => setShowUploadModal(true)} className="bg-blue-600 hover:bg-blue-700">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload Document
              </Button>
            </div>
          </div>

      {/* Search and Filters */}
      <Card className="glass-card glass-cyan">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🔍</span>
            <h2 className="text-xl font-semibold text-slate-100">Search & Filter Documents</h2>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Input
              placeholder="Search by filename, content, or metadata..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full input-glass input-cyan"
              icon={<span>🔍</span>}
            />
          </div>
          
          {/* Filter Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="input-glass input-cyan"
            >
              <option value="">All Types</option>
              {DOCUMENT_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </Select>
            
            <Select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="input-glass input-cyan"
            >
              <option value="">All Status</option>
              {DOCUMENT_STATUS.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </Select>
            
            <Button 
              onClick={() => setFilters({ type: '', status: '', search: '' })}
              className="input-glass input-cyan text-cyan-400 border-cyan-400/50 bg-cyan-500/10 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all duration-300"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* My Documents Header */}
      <div className="mb-6 mt-8">
        <h2 className="text-2xl font-bold text-slate-200">My Documents</h2>
        <p className="text-slate-400 mt-1">Manage and analyze your resumes, cover letters, and other documents</p>
      </div>

      {/* Documents Grid */}
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
          <Button onClick={() => setShowUploadModal(true)} className="bg-blue-600 hover:bg-blue-700">
            Upload Document
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map(document => {
            const docType =
              DOCUMENT_TYPES.find(t => t.value === document.type) ||
              { value: document.type || 'other', label: 'Other', icon: 'other' };
            const docStatus = DOCUMENT_STATUS.find(s => s.value === document.status) || DOCUMENT_STATUS[0];
            
            return (
              <Card key={document.id} className="p-6 hover:shadow-lg transition-shadow glass-card glass-cyan">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="text-2xl mr-3">
                      {renderIcon(docType.icon)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-200 truncate">{document.name}</h3>
                      <p className="text-sm text-slate-400">{docType.label}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${docStatus.color}-900/50 text-${docStatus.color}-300 border border-${docStatus.color}-500/30`}>
                    {docStatus.label}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Size:</span>
                    <span className="text-slate-200">{(document.file_size / 1024).toFixed(1)} KB</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Created:</span>
                    <span className="text-slate-200">{new Date(document.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Version:</span>
                    <span className="text-slate-200">v{document.current_version}</span>
                  </div>
                  {document.ats_score && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">ATS Score:</span>
                      <span className={getScoreColor(document.ats_score)}>
                        {document.ats_score.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {document.type === 'resume' && (
                    <div className="flex-1 relative">
                      <Button
                        onClick={() => handleEnhancedAnalysis(document)}
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={analyzing}
                      >
                        {analyzing ? '🔄' : '🔍'} {analyzing ? 'Analyzing...' : 'Analyze'}
                      </Button>

                      {jobs.length > 0 && (
                        <div className="mt-2">
                          <Button
                            onClick={() => {
                              setJobSelectionDocument(document);
                              setShowJobSelectionModal(true);
                            }}
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

                  <Button
                    onClick={() => api.downloadDocument(document.id)}
                    variant="outline"
                    size="sm"
                    className="px-3"
                  >
                    📥
                  </Button>
                  <Button
                    onClick={() => deleteDocument(document.id)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 px-3"
                  >
                    🗑️
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.total > pagination.page_size && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <Button
            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
            disabled={!pagination.has_prev}
            variant="outline"
          >
            Previous
          </Button>
          <span className="text-gray-600">
            Page {pagination.page} of {Math.ceil(pagination.total / pagination.page_size)}
          </span>
          <Button
            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
            disabled={!pagination.has_next}
            variant="outline"
          >
            Next
          </Button>
        </div>
      )}

      {/* Upload Modal */}
      <Modal 
        isOpen={showUploadModal} 
        onClose={() => setShowUploadModal(false)}
        title="Upload Document"
        size="md"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-slate-400 tracking-wide uppercase mb-2">
              Document Type
            </label>
            <Select
              value={uploadForm.type}
              onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value })}
              className="w-full text-sm font-medium text-slate-100"
            >
              {DOCUMENT_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </Select>
          </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Document Name (optional)
                </label>
                <input
                  type="text"
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                  placeholder="e.g., Tomer Naydnov – English Resume"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  We’ll keep your file extension and use this as the display name.
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  File
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  Supported formats: PDF, DOC, DOCX, TXT
                </p>
              </div>
              
                <div className="flex gap-3 justify-end pt-4">
                  <Button 
                    variant="outline"
                    onClick={() => setShowUploadModal(false)}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700/50"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleUpload}
                    disabled={uploading || !uploadForm.file}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {uploading ? 'Uploading...' : 'Upload'}
                  </Button>
                </div>
        </div>
      </Modal>

      {/* Cover Letter Modal */}
      {showCoverLetterModal && (
        <>
          {/* Backdrop overlay */}
          <div 
            onClick={() => setShowCoverLetterModal(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              zIndex: 10000,
              cursor: 'pointer'
            }}
          />
          
          {/* Modal content */}
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            zIndex: 10001,
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ padding: '24px', minWidth: '600px' }}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">✨</span>
                  </div>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
                      Generate AI Cover Letter
                    </h2>
                    <PremiumBadge size="sm" />
                  </div>
                </div>
                <button
                  onClick={() => setShowCoverLetterModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    color: '#6B7280'
                  }}
                >
                  ✕
                </button>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                {/* Left Column - Form */}
                <div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                      Target Job *
                    </label>
                    <select
                      value={coverLetterForm.job_id}
                      onChange={(e) => {
                        console.log('Job selected:', e.target.value);
                        setCoverLetterForm({ ...coverLetterForm, job_id: e.target.value });
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">Select a job...</option>
                      {jobs.map(job => (
                        <option key={job.id} value={job.id}>
                          {job.title} at {job.company_name || 'Unknown Company'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                      Resume *
                    </label>
                    <select
                      value={coverLetterForm.resume_id}
                      onChange={(e) => {
                        console.log('Resume selected:', e.target.value);
                        setCoverLetterForm({ ...coverLetterForm, resume_id: e.target.value });
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">Select your resume...</option>
                      {resumes.map(resume => (
                        <option key={resume.id} value={resume.id}>
                          {resume.file_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                      Tone
                    </label>
                    <select
                      value={coverLetterForm.tone}
                      onChange={(e) => setCoverLetterForm({ ...coverLetterForm, tone: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="professional">Professional</option>
                      <option value="enthusiastic">Enthusiastic</option>
                      <option value="confident">Confident</option>
                      <option value="creative">Creative</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                      Length
                    </label>
                    <select
                      value={coverLetterForm.length}
                      onChange={(e) => setCoverLetterForm({ ...coverLetterForm, length: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="short">Short (200-300 words)</option>
                      <option value="medium">Medium (300-400 words)</option>
                      <option value="long">Long (400-500 words)</option>
                    </select>
                  </div>

                  <button 
                    onClick={generateCoverLetter}
                    disabled={!coverLetterForm.job_id || !coverLetterForm.resume_id}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      backgroundColor: (!coverLetterForm.job_id || !coverLetterForm.resume_id) ? '#9ca3af' : '#7c3aed',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: (!coverLetterForm.job_id || !coverLetterForm.resume_id) ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    ✨ Generate Cover Letter
                  </button>
                </div>

                {/* Right Column - Generated Content */}
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                    Generated Cover Letter
                  </label>
                  <textarea
                    value={generatedCoverLetter}
                    onChange={(e) => setGeneratedCoverLetter(e.target.value)}
                    placeholder="Generated cover letter will appear here..."
                    style={{
                      width: '100%',
                      height: '300px',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      resize: 'vertical',
                      fontFamily: 'system-ui, sans-serif'
                    }}
                    readOnly={!generatedCoverLetter}
                  />
                  {generatedCoverLetter && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedCoverLetter);
                          alert('Cover letter copied to clipboard!');
                        }}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          backgroundColor: 'white',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        📋 Copy
                      </button>
                      <button
                        onClick={saveCoverLetterAsDocument}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          backgroundColor: 'white',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        💾 Save as Document
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => setShowCoverLetterModal(false)}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Analysis Modal */}
      {showAnalysisModal && (
        <>
          {/* Backdrop overlay with blur effect */}
          <div 
            onClick={() => setShowAnalysisModal(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 cursor-pointer"
          />
          
          {/* Modal content */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-4xl mx-4 max-h-[90vh] overflow-auto">
            <div className="glass-card border border-white/30 rounded-2xl p-6 backdrop-blur-xl bg-slate-900/95 shadow-2xl">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                  🔍 Document Analysis Results
                </h2>
                {analysis?.job_context && (
                  <p className="text-sm text-slate-400 mt-2">
                    For: {analysis.job_context.title} at {analysis.job_context.company}
                  </p>
                )}
              </div>
              
              {/* Analysis Type Explanation */}
              <div className={`p-4 rounded-lg border mb-6 ${
                selectedJob 
                  ? 'bg-blue-900/30 border-blue-500/30 text-blue-200' 
                  : 'bg-yellow-900/30 border-yellow-500/30 text-yellow-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{selectedJob ? '🎯' : '📊'}</span>
                  <strong className="text-slate-200">
                    {selectedJob ? 'Job-Specific Analysis' : 'General Analysis'}
                  </strong>
                </div>
                <p className="text-sm text-slate-300 m-0">
                  {selectedJob 
                    ? 'This analysis compares your document against specific job requirements, providing targeted feedback and keyword matching scores.'
                    : 'This is a general analysis without job context. For better insights, analyze against a specific job to see how well your document matches job requirements.'
                  }
                </p>
              </div>
              
              {analysis ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Analysis Header - Different for General vs Job-Specific */}
                  <div style={{ 
                    padding: '16px', 
                    backgroundColor: 'rgba(30, 41, 59, 0.8)', 
                    borderRadius: '8px',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    backdropFilter: 'blur(8px)'
                  }}>
                    {analysis.ats_score?.technical_skills_score !== null && analysis.ats_score?.soft_skills_score !== null ? (
                      <>
                        <h3 style={{ fontWeight: '600', marginBottom: '12px', color: '#f1f5f9' }}>🎯 Job-Specific Analysis</h3>
                        <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '16px' }}>
                          Analysis tailored to the selected job requirements
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 style={{ fontWeight: '600', marginBottom: '12px', color: '#f1f5f9' }}>📋 General Resume Analysis</h3>
                        <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '16px' }}>
                          Comprehensive review of resume structure and completeness. Select a job for targeted analysis.
                        </p>
                      </>
                    )}
                    
                    {/* Overall Score Display */}
                    <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                      <div style={{ 
                        fontSize: '36px', 
                        fontWeight: 'bold', 
                        color: (analysis.ats_score?.overall_score || 0) >= 80 ? '#059669' : (analysis.ats_score?.overall_score || 0) >= 60 ? '#d97706' : '#dc2626'
                      }}>
                        {(analysis.ats_score?.overall_score || 0).toFixed(1)}%
                      </div>
                      <p style={{ fontSize: '16px', color: '#6b7280' }}>
                        {analysis.ats_score?.technical_skills_score !== null ? 'Job Match Score' : 'Resume Quality Score'}
                      </p>
                      {analysis.job_match_summary && (
                        <p style={{ fontSize: '14px', color: '#374151', marginTop: '8px' }}>
                          {typeof analysis.job_match_summary === 'string' ? analysis.job_match_summary : analysis.job_match_summary.summary}
                        </p>
                      )}
                    </div>

                    {/* Detailed Scores Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                      {analysis.ats_score?.technical_skills_score !== null && analysis.ats_score?.technical_skills_score !== undefined && (
                        <div style={{ textAlign: 'center', padding: '12px', backgroundColor: 'rgba(59, 130, 246, 0.2)', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                          <div style={{ 
                            fontSize: '20px', 
                            fontWeight: 'bold', 
                            color: analysis.ats_score.technical_skills_score >= 80 ? '#10b981' : analysis.ats_score.technical_skills_score >= 60 ? '#f59e0b' : '#ef4444'
                          }}>
                            {(analysis.ats_score.technical_skills_score || 0).toFixed(1)}%
                          </div>
                          <p style={{ fontSize: '12px', color: '#94a3b8' }}>Technical Skills</p>
                        </div>
                      )}
                      {analysis.ats_score?.soft_skills_score !== null && analysis.ats_score?.soft_skills_score !== undefined && (
                        <div style={{ textAlign: 'center', padding: '12px', backgroundColor: 'rgba(16, 185, 129, 0.2)', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                          <div style={{ 
                            fontSize: '20px', 
                            fontWeight: 'bold', 
                            color: analysis.ats_score.soft_skills_score >= 80 ? '#10b981' : analysis.ats_score.soft_skills_score >= 60 ? '#f59e0b' : '#ef4444'
                          }}>
                            {(analysis.ats_score.soft_skills_score || 0).toFixed(1)}%
                          </div>
                          <p style={{ fontSize: '12px', color: '#94a3b8' }}>Soft Skills</p>
                        </div>
                      )}
                      {analysis.ats_score?.keyword_score !== undefined && (
                        <div style={{ textAlign: 'center', padding: '12px', backgroundColor: 'rgba(245, 158, 11, 0.2)', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                          <div style={{ 
                            fontSize: '20px', 
                            fontWeight: 'bold', 
                            color: analysis.ats_score.keyword_score >= 80 ? '#10b981' : analysis.ats_score.keyword_score >= 60 ? '#f59e0b' : '#ef4444'
                          }}>
                            {analysis.ats_score.keyword_score.toFixed(1)}%
                          </div>
                          <p style={{ fontSize: '12px', color: '#94a3b8' }}>Keywords</p>
                        </div>
                      )}
                      {analysis.ats_score?.formatting_score !== undefined && (
                        <div style={{ textAlign: 'center', padding: '12px', backgroundColor: 'rgba(99, 102, 241, 0.2)', borderRadius: '6px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                          <div style={{ 
                            fontSize: '20px', 
                            fontWeight: 'bold', 
                            color: analysis.ats_score.formatting_score >= 80 ? '#10b981' : analysis.ats_score.formatting_score >= 60 ? '#f59e0b' : '#ef4444'
                          }}>
                            {analysis.ats_score.formatting_score.toFixed(1)}%
                          </div>
                          <p style={{ fontSize: '12px', color: '#94a3b8' }}>Formatting</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Enhanced Keyword Analysis - Only for job-specific analysis */}
                  {analysis.keyword_analysis && analysis.ats_score?.technical_skills_score !== null && (
                    <div style={{ 
                      padding: '16px', 
                      backgroundColor: 'rgba(30, 41, 59, 0.8)', 
                      borderRadius: '8px',
                      border: '1px solid rgba(148, 163, 184, 0.3)',
                      backdropFilter: 'blur(8px)'
                    }}>
                      <h3 style={{ fontWeight: '600', marginBottom: '16px', color: '#60a5fa' }}>🎯 Detailed Keyword Analysis</h3>
                      
                      {/* Technical Skills Breakdown */}
                      {analysis.keyword_analysis.technical_skills && (
                        <div style={{ marginBottom: '20px' }}>
                          <h4 style={{ fontWeight: '600', marginBottom: '12px', color: '#f1f5f9' }}>💻 Technical Skills</h4>
                          
                          {/* Found Technical Skills */}
                          {analysis.keyword_analysis.technical_skills.found && analysis.keyword_analysis.technical_skills.found.length > 0 && (
                            <div style={{ marginBottom: '12px' }}>
                              <p style={{ fontSize: '14px', color: '#059669', marginBottom: '8px', fontWeight: '500' }}>
                                ✅ Found ({analysis.keyword_analysis.technical_skills.found.length}/{analysis.keyword_analysis.technical_skills.required.length}):
                              </p>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {analysis.keyword_analysis.technical_skills.found.map((skill, idx) => (
                                  <span key={idx} style={{ 
                                    padding: '4px 8px', 
                                    backgroundColor: '#dcfce7', 
                                    color: '#059669', 
                                    fontSize: '12px', 
                                    borderRadius: '4px',
                                    border: '1px solid #bbf7d0'
                                  }}>
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Missing Technical Skills */}
                          {analysis.keyword_analysis.technical_skills.missing && analysis.keyword_analysis.technical_skills.missing.length > 0 && (
                            <div style={{ marginBottom: '12px' }}>
                              <p style={{ fontSize: '14px', color: '#dc2626', marginBottom: '8px', fontWeight: '500' }}>
                                ❌ Missing ({analysis.keyword_analysis.technical_skills.missing.length}):
                              </p>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {analysis.keyword_analysis.technical_skills.missing.map((skill, idx) => (
                                  <span key={idx} style={{ 
                                    padding: '4px 8px', 
                                    backgroundColor: 'rgba(239, 68, 68, 0.2)', 
                                    color: '#ef4444', 
                                    fontSize: '12px', 
                                    borderRadius: '4px',
                                    border: '1px solid rgba(239, 68, 68, 0.3)'
                                  }}>
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Soft Skills Breakdown */}
                      {analysis.keyword_analysis.soft_skills && (
                        <div style={{ marginBottom: '20px' }}>
                          <h4 style={{ fontWeight: '600', marginBottom: '12px', color: '#f1f5f9' }}>🤝 Soft Skills</h4>
                          
                          {/* Found Soft Skills */}
                          {analysis.keyword_analysis.soft_skills.found && analysis.keyword_analysis.soft_skills.found.length > 0 && (
                            <div style={{ marginBottom: '12px' }}>
                              <p style={{ fontSize: '14px', color: '#059669', marginBottom: '8px', fontWeight: '500' }}>
                                ✅ Found ({analysis.keyword_analysis.soft_skills.found.length}/{analysis.keyword_analysis.soft_skills.required.length}):
                              </p>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {analysis.keyword_analysis.soft_skills.found.map((skill, idx) => (
                                  <span key={idx} style={{ 
                                    padding: '4px 8px', 
                                    backgroundColor: '#dcfce7', 
                                    color: '#059669', 
                                    fontSize: '12px', 
                                    borderRadius: '4px',
                                    border: '1px solid #bbf7d0'
                                  }}>
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Missing Soft Skills */}
                          {analysis.keyword_analysis.soft_skills.missing && analysis.keyword_analysis.soft_skills.missing.length > 0 && (
                            <div>
                              <p style={{ fontSize: '14px', color: '#dc2626', marginBottom: '8px', fontWeight: '500' }}>
                                ❌ Missing ({analysis.keyword_analysis.soft_skills.missing.length}):
                              </p>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {analysis.keyword_analysis.soft_skills.missing.map((skill, idx) => (
                                  <span key={idx} style={{ 
                                    padding: '4px 8px', 
                                    backgroundColor: 'rgba(239, 68, 68, 0.2)', 
                                    color: '#ef4444', 
                                    fontSize: '12px', 
                                    borderRadius: '4px',
                                    border: '1px solid rgba(239, 68, 68, 0.3)'
                                  }}>
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Overall Summary */}
                      <div style={{ 
                        padding: '12px', 
                        backgroundColor: 'rgba(30, 41, 59, 0.6)', 
                        borderRadius: '6px',
                        border: '1px solid rgba(148, 163, 184, 0.3)'
                      }}>
                        <p style={{ fontSize: '14px', color: '#f1f5f9', margin: 0 }}>
                          <strong>Summary:</strong> {analysis.keyword_analysis.matched_keywords?.length || 0} of {analysis.keyword_analysis.total_job_keywords || 0} job keywords found 
                          ({((analysis.keyword_analysis.matched_keywords?.length || 0) / Math.max(analysis.keyword_analysis.total_job_keywords || 1, 1) * 100).toFixed(1)}% match)
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Enhanced Missing Skills */}
                  {analysis.missing_skills && (analysis.missing_skills.technical?.length > 0 || analysis.missing_skills.critical_missing?.length > 0) && (
                    <div style={{ 
                      padding: '16px', 
                      backgroundColor: 'rgba(239, 68, 68, 0.15)', 
                      borderRadius: '8px',
                      border: '1px solid rgba(239, 68, 68, 0.3)'
                    }}>
                      <h3 style={{ fontWeight: '600', marginBottom: '12px', color: '#ef4444' }}>⚠️ Missing Skills & Keywords</h3>
                      {analysis.missing_skills.critical_missing && analysis.missing_skills.critical_missing.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Critical missing keywords:</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {analysis.missing_skills.critical_missing.map((skill, idx) => (
                              <span key={idx} style={{ 
                                padding: '4px 8px', 
                                backgroundColor: 'rgba(239, 68, 68, 0.25)', 
                                color: '#ef4444', 
                                fontSize: '12px', 
                                borderRadius: '4px',
                                border: '1px solid rgba(239, 68, 68, 0.4)'
                              }}>
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {analysis.missing_skills.technical && analysis.missing_skills.technical.length > 0 && (
                        <div>
                          <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Missing technical skills:</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {analysis.missing_skills.technical.slice(0, 10).map((skill, idx) => (
                              <span key={idx} style={{ 
                                padding: '4px 8px', 
                                backgroundColor: 'rgba(239, 68, 68, 0.25)', 
                                color: '#ef4444', 
                                fontSize: '12px', 
                                borderRadius: '4px',
                                border: '1px solid rgba(239, 68, 68, 0.4)'
                              }}>
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Enhanced Recommendations */}
                  {analysis.suggested_improvements && analysis.suggested_improvements.length > 0 && (
                    <div style={{ 
                      padding: '16px', 
                      backgroundColor: 'rgba(16, 185, 129, 0.15)', 
                      borderRadius: '8px',
                      border: '1px solid rgba(16, 185, 129, 0.3)'
                    }}>
                      <h3 style={{ fontWeight: '600', marginBottom: '12px', color: '#10b981' }}>💡 Improvement Recommendations</h3>
                      <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        {analysis.suggested_improvements.map((improvement, idx) => (
                          <li key={idx} style={{ 
                            fontSize: '14px', 
                            color: '#f1f5f9', 
                            marginBottom: '8px',
                            lineHeight: '1.5'
                          }}>
                            {improvement}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Document Statistics */}
                  <div style={{ 
                    padding: '16px', 
                    backgroundColor: 'rgba(30, 41, 59, 0.6)', 
                    borderRadius: '8px',
                    border: '1px solid rgba(148, 163, 184, 0.3)'
                  }}>
                    <h3 style={{ fontWeight: '600', marginBottom: '12px', color: '#f1f5f9' }}>Document Statistics</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', textAlign: 'center' }}>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f1f5f9' }}>{analysis.word_count || 0}</div>
                        <p style={{ fontSize: '12px', color: '#94a3b8' }}>Words</p>
                      </div>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f1f5f9' }}>{(analysis.readability_score || 0).toFixed(1)}%</div>
                        <p style={{ fontSize: '12px', color: '#94a3b8' }}>Readability</p>
                      </div>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f1f5f9' }}>{analysis.missing_sections?.length || 0}</div>
                        <p style={{ fontSize: '12px', color: '#94a3b8' }}>Missing Sections</p>
                      </div>
                    </div>
                  </div>

                  {/* Missing Sections */}
                  {analysis.missing_sections.length > 0 && (
                    <div style={{ 
                      padding: '16px', 
                      backgroundColor: 'rgba(245, 158, 11, 0.15)', 
                      borderRadius: '8px',
                      border: '1px solid rgba(245, 158, 11, 0.3)'
                    }}>
                      <h3 style={{ fontWeight: '600', marginBottom: '12px', color: '#f59e0b' }}>⚠️ Missing Sections</h3>
                      <ul style={{ listStyle: 'disc', paddingLeft: '20px', margin: 0 }}>
                        {analysis.missing_sections.map((section, index) => (
                          <li key={index} style={{ marginBottom: '8px', color: '#f1f5f9' }}>{section}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Keyword Density */}
                  {Object.keys(analysis.keyword_density).length > 0 && (
                    <div style={{ 
                      padding: '16px', 
                      backgroundColor: 'rgba(30, 41, 59, 0.6)', 
                      borderRadius: '8px',
                      border: '1px solid rgba(148, 163, 184, 0.3)'
                    }}>
                      <h3 style={{ fontWeight: '600', marginBottom: '12px', color: '#f1f5f9' }}>📊 Keyword Analysis</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {Object.entries(analysis.keyword_density).map(([keyword, density]) => (
                          <div key={keyword} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#374151' }}>{keyword}</span>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <div style={{ 
                                width: '96px', 
                                height: '8px', 
                                backgroundColor: '#e5e7eb', 
                                borderRadius: '4px', 
                                marginRight: '8px' 
                              }}>
                                <div style={{
                                  width: `${Math.min(density * 10, 100)}%`,
                                  height: '8px',
                                  backgroundColor: '#2563eb',
                                  borderRadius: '4px'
                                }}></div>
                              </div>
                              <span style={{ fontSize: '14px', color: '#6b7280' }}>{density.toFixed(1)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-400">Analyzing document...</p>
                </div>
              )}
              
              <div className="flex justify-end mt-6">
                <Button 
                  onClick={() => setShowAnalysisModal(false)}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700/50"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Job Selection Modal */}
      {showJobSelectionModal && (
        <>
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}>
            <div style={{
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
              {/* Header */}
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#f1f5f9', marginBottom: '8px' }}>
                  🎯 Select Job for Analysis
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                  Choose a job to analyze your {jobSelectionDocument?.filename} against specific requirements
                </p>
              </div>

              {/* Search */}
              <div style={{ marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="🔍 Search jobs by title, company, or keywords..."
                  value={jobSearchTerm}
                  onChange={(e) => setJobSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: 'rgba(30, 41, 59, 0.5)',
                    color: '#f1f5f9',
                    backdropFilter: 'blur(8px)'
                  }}
                />
              </div>

              {/* Job List */}
              <div style={{ 
                flex: 1, 
                overflowY: 'auto', 
                marginBottom: '20px',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                borderRadius: '8px',
                backgroundColor: 'rgba(30, 41, 59, 0.3)',
                backdropFilter: 'blur(8px)'
              }}>
                {jobs
                  .filter(job => 
                    job.title?.toLowerCase().includes(jobSearchTerm.toLowerCase()) ||
                    job.company?.toLowerCase().includes(jobSearchTerm.toLowerCase()) ||
                    job.location?.toLowerCase().includes(jobSearchTerm.toLowerCase())
                  )
                  .map((job, index) => (
                    <div
                      key={job.id}
                      onClick={() => setSelectedJobForAnalysis(job)}
                      style={{
                        padding: '16px',
                        borderBottom: index < jobs.length - 1 ? '1px solid rgba(148, 163, 184, 0.3)' : 'none',
                        cursor: 'pointer',
                        backgroundColor: selectedJobForAnalysis?.id === job.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                        borderLeft: selectedJobForAnalysis?.id === job.id ? '4px solid #3b82f6' : '4px solid transparent',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedJobForAnalysis?.id !== job.id) {
                          e.target.style.backgroundColor = 'rgba(148, 163, 184, 0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedJobForAnalysis?.id !== job.id) {
                          e.target.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ 
                            fontWeight: 'bold', 
                            color: '#f1f5f9', 
                            marginBottom: '4px',
                            fontSize: '16px'
                          }}>
                            {job.title}
                          </h4>
                          <p style={{ 
                            color: '#94a3b8', 
                            fontSize: '14px', 
                            marginBottom: '8px',
                            fontWeight: '500'
                          }}>
                            🏢 {job.company}
                          </p>
                          {job.location && (
                            <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>
                              📍 {job.location}
                            </p>
                          )}
                          {job.description && (
                            <p style={{ 
                              color: '#94a3b8', 
                              fontSize: '12px', 
                              lineHeight: '1.4',
                              maxHeight: '40px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {job.description.substring(0, 120)}...
                            </p>
                          )}
                        </div>
                        <div style={{ 
                          backgroundColor: selectedJobForAnalysis?.id === job.id ? '#3b82f6' : 'rgba(148, 163, 184, 0.3)',
                          color: selectedJobForAnalysis?.id === job.id ? 'white' : '#94a3b8',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          marginLeft: '12px',
                          flexShrink: 0
                        }}>
                          {selectedJobForAnalysis?.id === job.id ? '✓' : '○'}
                        </div>
                      </div>
                    </div>
                  ))}
                
                {jobs.filter(job => 
                  job.title?.toLowerCase().includes(jobSearchTerm.toLowerCase()) ||
                  job.company?.toLowerCase().includes(jobSearchTerm.toLowerCase()) ||
                  job.location?.toLowerCase().includes(jobSearchTerm.toLowerCase())
                ).length === 0 && (
                  <div style={{ 
                    padding: '40px', 
                    textAlign: 'center', 
                    color: '#9ca3af' 
                  }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔍</div>
                    <p>No jobs found matching "{jobSearchTerm}"</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                paddingTop: '16px',
                borderTop: '1px solid #e5e7eb'
              }}>
                <button
                  onClick={() => {
                    setShowJobSelectionModal(false);
                    setJobSelectionDocument(null);
                    setSelectedJobForAnalysis(null);
                    setJobSearchTerm('');
                  }}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    color: '#6b7280'
                  }}
                >
                  Cancel
                </button>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => {
                      handleEnhancedAnalysis(jobSelectionDocument, '');
                      setShowJobSelectionModal(false);
                      setJobSelectionDocument(null);
                      setSelectedJobForAnalysis(null);
                      setJobSearchTerm('');
                    }}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #9ca3af',
                      borderRadius: '6px',
                      backgroundColor: '#f3f4f6',
                      cursor: 'pointer',
                      color: '#4b5563'
                    }}
                  >
                    📊 Quick Analysis (No Job)
                  </button>
                  
                  <button
                    onClick={() => {
                      if (selectedJobForAnalysis) {
                        handleEnhancedAnalysis(jobSelectionDocument, selectedJobForAnalysis.id);
                        setShowJobSelectionModal(false);
                        setJobSelectionDocument(null);
                        setSelectedJobForAnalysis(null);
                        setJobSearchTerm('');
                      }
                    }}
                    disabled={!selectedJobForAnalysis}
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: '6px',
                      backgroundColor: selectedJobForAnalysis ? '#1e40af' : '#374151',
                      color: 'white',
                      cursor: selectedJobForAnalysis ? 'pointer' : 'not-allowed',
                      fontWeight: '500'
                    }}
                  >
                    🎯 Analyze Against Selected Job
                  </button>
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
