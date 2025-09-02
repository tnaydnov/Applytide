import { useState, useEffect } from 'react';
import { Card, Button, Input, Select, Modal, Textarea, FileUpload } from '../components/ui';
import api, { apiFetch, getTokens } from '../lib/api';
import AuthGuard from "../components/AuthGuard";

// Enhanced Document Management with Intelligent ATS Analysis
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const DOCUMENT_TYPES = [
  { value: 'resume', label: '📄 Resume', icon: '📄' },
  { value: 'cover_letter', label: '💼 Cover Letter', icon: '💼' },
  { value: 'portfolio', label: '🎨 Portfolio', icon: '🎨' },
  { value: 'certificate', label: '🏆 Certificate', icon: '🏆' },
  { value: 'transcript', label: '🎓 Transcript', icon: '🎓' },
  { value: 'reference', label: '👥 Reference', icon: '👥' },
  { value: 'other', label: '📎 Other', icon: '📎' }
];

const DOCUMENT_STATUS = [
  { value: 'active', label: '✅ Active', color: 'green' },
  { value: 'draft', label: '📝 Draft', color: 'yellow' },
  { value: 'archived', label: '📦 Archived', color: 'gray' },
  { value: 'template', label: '📋 Template', color: 'blue' }
];

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showCoverLetterModal, setShowCoverLetterModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
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
    status: ''
  });
  
  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    file: null,
    type: 'resume',
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
        ? `${API_BASE_URL}/api/documents/${document.id}/analyze?job_id=${jobId}`
        : `${API_BASE_URL}/api/documents/${document.id}/analyze`;
        
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
    if (!uploadForm.file) {
      toast.error('Please select a file to upload');
      return;
    }

    try {
      // Try enhanced upload first
      if (uploadForm.file.name.toLowerCase().endsWith('.pdf')) {
        try {
          const formData = new FormData();
          formData.append('file', uploadForm.file);
          formData.append('document_type', uploadForm.type);

          // Create custom fetch with auth but without Content-Type for FormData
          const { access_token } = typeof window !== "undefined" ? 
            JSON.parse(localStorage.getItem("tokens") || "{}") : {};
          
          const headers = {};
          if (access_token) {
            headers.Authorization = `Bearer ${access_token}`;
          }

          const response = await fetch(`${API_BASE_URL}/api/documents/upload`, {
            method: 'POST',
            headers: headers,
            body: formData
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              toast.success(`Document uploaded successfully! Text extracted: ${result.text_length} chars`);
              setShowUploadModal(false);
              setUploadForm({ file: null, type: 'resume', metadata: {} });
              loadDocuments();
              return;
            }
          }
        } catch (enhancedError) {
          console.log('Enhanced upload failed, using fallback:', enhancedError);
        }
      }

      // Fallback to original upload
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('document_type', uploadForm.type);
      formData.append('metadata', JSON.stringify(uploadForm.metadata));

      await api.uploadDocument(formData);
      toast.success('Document uploaded successfully!');
      setShowUploadModal(false);
      setUploadForm({ file: null, type: 'resume', metadata: {} });
      loadDocuments();
    } catch (error) {
      toast.error(`Upload failed: ${error.message}`);
    }
  }

  async function analyzeDocument(document) {
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

      const response = await fetch(`${API_BASE_URL}/api/documents/${document.id}/analyze?job_id=${selectedJob}`, {
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
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }

  return (
    <AuthGuard>
      <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Document Manager</h1>
          <p className="text-gray-600 mt-2">Manage your resumes, cover letters, and other documents with AI-powered optimization</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setShowCoverLetterModal(true)} className="bg-purple-600 hover:bg-purple-700">
            ✨ Generate Cover Letter
          </Button>
          <Button onClick={() => setShowUploadModal(true)} className="bg-blue-600 hover:bg-blue-700">
            📤 Upload Document
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Document Type</label>
            <Select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-full"
            >
              <option value="">All Types</option>
              {DOCUMENT_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </Select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <Select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full"
            >
              <option value="">All Status</option>
              {DOCUMENT_STATUS.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <Button 
              onClick={() => setFilters({ type: '', status: '' })}
              variant="outline"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Documents Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading documents...</p>
        </div>
      ) : documents.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No documents found</h3>
          <p className="text-gray-600 mb-6">Upload your first document to get started</p>
          <Button onClick={() => setShowUploadModal(true)} className="bg-blue-600 hover:bg-blue-700">
            Upload Document
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map(document => {
            const docType = DOCUMENT_TYPES.find(t => t.value === document.type) || DOCUMENT_TYPES[0];
            const docStatus = DOCUMENT_STATUS.find(s => s.value === document.status) || DOCUMENT_STATUS[0];
            
            return (
              <Card key={document.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="text-2xl mr-3">{docType.icon}</div>
                    <div>
                      <h3 className="font-semibold text-gray-900 truncate">{document.name}</h3>
                      <p className="text-sm text-gray-600">{docType.label}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${docStatus.color}-100 text-${docStatus.color}-800`}>
                    {docStatus.label}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Size:</span>
                    <span>{(document.file_size / 1024).toFixed(1)} KB</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Created:</span>
                    <span>{new Date(document.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Version:</span>
                    <span>v{document.current_version}</span>
                  </div>
                  {document.ats_score && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">ATS Score:</span>
                      <span className={getScoreColor(document.ats_score)}>
                        {document.ats_score.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {/* Enhanced Analysis Button with Job Selection */}
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
                    
                    {/* Job Selection Dropdown */}
                    {jobs.length > 0 && (
                      <div className="mt-1">
                        <select 
                          className="w-full text-xs p-1 border rounded bg-blue-50 text-blue-700"
                          onChange={(e) => {
                            if (e.target.value) {
                              handleEnhancedAnalysis(document, e.target.value);
                              e.target.value = ''; // Reset selection
                            }
                          }}
                          disabled={analyzing}
                        >
                          <option value="">📋 Quick job analysis...</option>
                          {jobs.slice(0, 5).map(job => (
                            <option key={job.id} value={job.id}>
                              {job.title} - {job.company}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  
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
      {showUploadModal && (
        <>
          {/* Backdrop overlay */}
          <div 
            onClick={() => setShowUploadModal(false)}
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
            <div style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>Upload Document</h2>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Document Type
                </label>
                <select
                  value={uploadForm.type}
                  onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  {DOCUMENT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
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
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => setShowUploadModal(false)}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpload}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Upload
                </button>
              </div>
            </div>
          </div>
        </>
      )}

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
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
                ✨ Generate AI Cover Letter
              </h2>
              
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
          {/* Backdrop overlay */}
          <div 
            onClick={() => setShowAnalysisModal(false)}
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
            <div style={{ padding: '24px', minWidth: '800px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
                🔍 Document Analysis Results
                {analysis?.job_context && (
                  <div style={{ fontSize: '14px', fontWeight: 'normal', color: '#6b7280', marginTop: '4px' }}>
                    For: {analysis.job_context.title} at {analysis.job_context.company}
                  </div>
                )}
              </h2>
              
              {analysis ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Enhanced ATS Scores Display */}
                  <div style={{ 
                    padding: '16px', 
                    backgroundColor: '#f9fafb', 
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <h3 style={{ fontWeight: '600', marginBottom: '12px' }}>ATS Compatibility Scores</h3>
                    
                    {/* Overall Score Highlight */}
                    <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                      <div style={{ 
                        fontSize: '36px', 
                        fontWeight: 'bold', 
                        color: (analysis.ats_score?.overall_score || 0) >= 80 ? '#059669' : (analysis.ats_score?.overall_score || 0) >= 60 ? '#d97706' : '#dc2626'
                      }}>
                        {(analysis.ats_score?.overall_score || 0).toFixed(1)}%
                      </div>
                      <p style={{ fontSize: '16px', color: '#6b7280' }}>Overall ATS Compatibility</p>
                      {analysis.job_match_summary && (
                        <p style={{ fontSize: '14px', color: '#374151', marginTop: '8px' }}>
                          <strong>{analysis.job_match_summary.match_level}</strong>: {analysis.job_match_summary.summary}
                        </p>
                      )}
                    </div>

                    {/* Detailed Scores Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                      {analysis.ats_score?.technical_skills_score !== undefined && (
                        <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#dbeafe', borderRadius: '6px' }}>
                          <div style={{ 
                            fontSize: '20px', 
                            fontWeight: 'bold', 
                            color: analysis.ats_score.technical_skills_score >= 80 ? '#059669' : analysis.ats_score.technical_skills_score >= 60 ? '#d97706' : '#dc2626'
                          }}>
                            {analysis.ats_score.technical_skills_score.toFixed(1)}%
                          </div>
                          <p style={{ fontSize: '12px', color: '#6b7280' }}>Technical Skills</p>
                        </div>
                      )}
                      {analysis.ats_score?.soft_skills_score !== undefined && (
                        <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#dcfce7', borderRadius: '6px' }}>
                          <div style={{ 
                            fontSize: '20px', 
                            fontWeight: 'bold', 
                            color: analysis.ats_score.soft_skills_score >= 80 ? '#059669' : analysis.ats_score.soft_skills_score >= 60 ? '#d97706' : '#dc2626'
                          }}>
                            {analysis.ats_score.soft_skills_score.toFixed(1)}%
                          </div>
                          <p style={{ fontSize: '12px', color: '#6b7280' }}>Soft Skills</p>
                        </div>
                      )}
                      {analysis.ats_score?.keyword_score !== undefined && (
                        <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#fef3c7', borderRadius: '6px' }}>
                          <div style={{ 
                            fontSize: '20px', 
                            fontWeight: 'bold', 
                            color: analysis.ats_score.keyword_score >= 80 ? '#059669' : analysis.ats_score.keyword_score >= 60 ? '#d97706' : '#dc2626'
                          }}>
                            {analysis.ats_score.keyword_score.toFixed(1)}%
                          </div>
                          <p style={{ fontSize: '12px', color: '#6b7280' }}>Keywords</p>
                        </div>
                      )}
                      {analysis.ats_score?.formatting_score !== undefined && (
                        <div style={{ textAlign: 'center', padding: '12px', backgroundColor: '#e0e7ff', borderRadius: '6px' }}>
                          <div style={{ 
                            fontSize: '20px', 
                            fontWeight: 'bold', 
                            color: analysis.ats_score.formatting_score >= 80 ? '#059669' : analysis.ats_score.formatting_score >= 60 ? '#d97706' : '#dc2626'
                          }}>
                            {analysis.ats_score.formatting_score.toFixed(1)}%
                          </div>
                          <p style={{ fontSize: '12px', color: '#6b7280' }}>Formatting</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Enhanced Keyword Analysis */}
                  {analysis.keyword_analysis && (
                    <div style={{ 
                      padding: '16px', 
                      backgroundColor: '#eff6ff', 
                      borderRadius: '8px',
                      border: '1px solid #bfdbfe'
                    }}>
                      <h3 style={{ fontWeight: '600', marginBottom: '12px', color: '#1e40af' }}>🎯 Keyword Match Analysis</h3>
                      <p style={{ fontSize: '14px', color: '#374151', marginBottom: '12px' }}>
                        {analysis.keyword_analysis.matched_keywords?.length || 0} of {analysis.keyword_analysis.total_job_keywords || 0} keywords matched 
                        ({((analysis.keyword_analysis.matched_keywords?.length || 0) / (analysis.keyword_analysis.total_job_keywords || 1) * 100).toFixed(1)}%)
                      </p>
                      {analysis.keyword_analysis.matched_keywords && analysis.keyword_analysis.matched_keywords.length > 0 && (
                        <div>
                          <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>Matched keywords:</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {analysis.keyword_analysis.matched_keywords.slice(0, 15).map((keyword, idx) => (
                              <span key={idx} style={{ 
                                padding: '4px 8px', 
                                backgroundColor: '#dbeafe', 
                                color: '#1e40af', 
                                fontSize: '12px', 
                                borderRadius: '4px',
                                border: '1px solid #bfdbfe'
                              }}>
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Enhanced Missing Skills */}
                  {analysis.missing_skills && (analysis.missing_skills.technical?.length > 0 || analysis.missing_skills.critical_missing?.length > 0) && (
                    <div style={{ 
                      padding: '16px', 
                      backgroundColor: '#fef2f2', 
                      borderRadius: '8px',
                      border: '1px solid #fecaca'
                    }}>
                      <h3 style={{ fontWeight: '600', marginBottom: '12px', color: '#dc2626' }}>⚠️ Missing Skills & Keywords</h3>
                      {analysis.missing_skills.critical_missing && analysis.missing_skills.critical_missing.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>Critical missing keywords:</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {analysis.missing_skills.critical_missing.map((skill, idx) => (
                              <span key={idx} style={{ 
                                padding: '4px 8px', 
                                backgroundColor: '#fee2e2', 
                                color: '#dc2626', 
                                fontSize: '12px', 
                                borderRadius: '4px',
                                border: '1px solid #fecaca'
                              }}>
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {analysis.missing_skills.technical && analysis.missing_skills.technical.length > 0 && (
                        <div>
                          <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>Missing technical skills:</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {analysis.missing_skills.technical.slice(0, 10).map((skill, idx) => (
                              <span key={idx} style={{ 
                                padding: '4px 8px', 
                                backgroundColor: '#fee2e2', 
                                color: '#dc2626', 
                                fontSize: '12px', 
                                borderRadius: '4px',
                                border: '1px solid #fecaca'
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
                      backgroundColor: '#f0fdf4', 
                      borderRadius: '8px',
                      border: '1px solid #bbf7d0'
                    }}>
                      <h3 style={{ fontWeight: '600', marginBottom: '12px', color: '#166534' }}>💡 Improvement Recommendations</h3>
                      <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        {analysis.suggested_improvements.map((improvement, idx) => (
                          <li key={idx} style={{ 
                            fontSize: '14px', 
                            color: '#374151', 
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
                    backgroundColor: '#f9fafb', 
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <h3 style={{ fontWeight: '600', marginBottom: '12px' }}>Document Statistics</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', textAlign: 'center' }}>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#374151' }}>{analysis.word_count || 0}</div>
                        <p style={{ fontSize: '12px', color: '#6b7280' }}>Words</p>
                      </div>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#374151' }}>{(analysis.readability_score || 0).toFixed(1)}%</div>
                        <p style={{ fontSize: '12px', color: '#6b7280' }}>Readability</p>
                      </div>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#374151' }}>{analysis.missing_sections?.length || 0}</div>
                        <p style={{ fontSize: '12px', color: '#6b7280' }}>Missing Sections</p>
                      </div>
                    </div>
                  </div>

                  {/* Suggestions */}
                  {analysis.suggested_improvements.length > 0 && (
                    <div style={{ 
                      padding: '16px', 
                      backgroundColor: '#f0f9ff', 
                      borderRadius: '8px',
                      border: '1px solid #0ea5e9'
                    }}>
                      <h3 style={{ fontWeight: '600', marginBottom: '12px', color: '#0284c7' }}>💡 Suggested Improvements</h3>
                      <ul style={{ listStyle: 'disc', paddingLeft: '20px', margin: 0 }}>
                        {analysis.suggested_improvements.map((suggestion, index) => (
                          <li key={index} style={{ marginBottom: '8px', color: '#374151' }}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Missing Sections */}
                  {analysis.missing_sections.length > 0 && (
                    <div style={{ 
                      padding: '16px', 
                      backgroundColor: '#fef3c7', 
                      borderRadius: '8px',
                      border: '1px solid #f59e0b'
                    }}>
                      <h3 style={{ fontWeight: '600', marginBottom: '12px', color: '#d97706' }}>⚠️ Missing Sections</h3>
                      <ul style={{ listStyle: 'disc', paddingLeft: '20px', margin: 0 }}>
                        {analysis.missing_sections.map((section, index) => (
                          <li key={index} style={{ marginBottom: '8px', color: '#92400e' }}>{section}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Keyword Density */}
                  {Object.keys(analysis.keyword_density).length > 0 && (
                    <div style={{ 
                      padding: '16px', 
                      backgroundColor: '#f9fafb', 
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <h3 style={{ fontWeight: '600', marginBottom: '12px' }}>📊 Keyword Analysis</h3>
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
                <div style={{ textAlign: 'center', padding: '32px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    border: '4px solid #e5e7eb',
                    borderTop: '4px solid #2563eb',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 16px'
                  }}></div>
                  <p style={{ color: '#6b7280' }}>Analyzing document...</p>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button 
                  onClick={() => setShowAnalysisModal(false)}
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
      </div>
    </AuthGuard>
  );
}
