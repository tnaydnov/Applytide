import { useState, useEffect, useMemo } from 'react';
import { Card, Button, Input, Select, Textarea, Badge } from '../components/ui';
import api from '../lib/api';
import AuthGuard from "../components/AuthGuard";
import { PremiumBadge, usePremiumFeature } from "../components/PremiumFeature";

const API_BASE_URL = "/api";

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
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);

  const [showAnalysis, setShowAnalysis] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [analysisUseAI, setAnalysisUseAI] = useState(true);

  const hasKeywordScore = analysis?.ats_score?.keyword_score != null;
  const hasKeywordAI = !!analysis?.ai_detailed_analysis?.keywords;

  const [showJobPicker, setShowJobPicker] = useState(false);
  const [jobPickerDoc, setJobPickerDoc] = useState(null);
  const [jobSearchTerm, setJobSearchTerm] = useState('');
  const [selectedJobForAnalysis, setSelectedJobForAnalysis] = useState(null);

  const [showPreviewNotice, setShowPreviewNotice] = useState(false);
  const [previewNoticeDoc, setPreviewNoticeDoc] = useState(null);

  const [aiSuggestionLoading, setAiSuggestionLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState({});

  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0, has_next: false, has_prev: false });
  const [filters, setFilters] = useState({ type: '', status: '', search: '' });

  const toast = {
    success: (m) => showToast('green', `✅ ${m}`),
    error: (m) => showToast('red', `❌ ${m}`),
    info: (m) => showToast('blue', `ℹ️ ${m}`)
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
      if (filters.type) params.append('document_type', filters.type);
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

      const resp = await fetch(`${API_BASE_URL}/documents/upload`, {
        method: 'POST',
        credentials: 'include', // Add this to send cookies
        body: formData
      });
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

  async function runAnalysis(document, jobId = '') {
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

      const result = await api.analyzeDocument(document.id, { jobId });
      if (result?.success === false) throw new Error(result.error || 'Analysis failed');

      if (result.technical_skills || result.keywords || result.soft_skills || result.formatting) {
        // If AI data is at root level, add it to ai_detailed_analysis
        result.ai_detailed_analysis = {
          technical_skills: result.technical_skills,
          keywords: result.keywords,
          soft_skills: result.soft_skills,
          formatting: result.formatting,
          overall_suggestions: result.overall_suggestions
        };
      }

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

    setIsGeneratingCoverLetter(true);
    setGeneratedCoverLetter(''); // Clear previous content

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
      setGeneratedCoverLetter(''); // Clear on error
    } finally {
      setIsGeneratingCoverLetter(false);
    }
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

      const response = await fetch(`${API_BASE_URL}/documents/upload`, {
        method: 'POST',
        credentials: 'include', // Add this to send cookies
        body: formData
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
      // Check if document is DOCX format
      if (document.format?.toLowerCase() === 'docx') {
        // Show the centered notification instead of a toast
        setPreviewNoticeDoc(document);
        setShowPreviewNotice(true);
        return;
      }

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

  const updateDocumentStatus = async (documentId, newStatus) => {
    try {
      await api.setDocumentStatus(documentId, newStatus);
      toast.success(`Document status updated to ${newStatus}`);
      loadDocuments(); // Refresh the list
    } catch (e) {
      toast.error(`Failed to update status: ${e.message || e}`);
    }
  };

  // Replace the entire ExpandableScoreCategory function starting at line 594
  function ExpandableScoreCategory({ title, score, description, details, categoryKey }) {
    const [isExpanded, setIsExpanded] = useState(false);

    console.log("Complete analysis object:", analysis);

    // Get the appropriate data from the AI analysis
    const aiData = analysis?.ai_detailed_analysis?.[categoryKey];

    // Check if aiData exists and has improvements
    const hasAIData = !!aiData && (
      Array.isArray(aiData.improvements) ||
      Array.isArray(aiData.strengths) ||
      Array.isArray(aiData.weaknesses)
    );
    const improvements = aiData?.improvements || [];
    const strengths = aiData?.strengths || [];
    const weaknesses = aiData?.weaknesses || [];

    console.log("AI Data for", categoryKey, ":", aiData);
    console.log("Improvements array:", improvements);

    return (
      <div className="rounded-lg border border-white/10 overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-3 focus:outline-none hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center">
            <span className={`inline-block w-2 h-2 mr-3 rounded-full ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              }`}></span>
            <span className="font-medium text-slate-200">{title}</span>
          </div>
          <div className="flex items-center">
            <span className={`mr-3 font-semibold ${score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400'
              }`}>
              {score.toFixed(1)}%
            </span>
            <svg
              className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {isExpanded && (
          <div className="p-4 bg-slate-900/50 border-t border-white/10">
            <p className="text-sm text-slate-300 leading-relaxed break-words mb-4">{description}</p>

            {/* Show missing elements if provided in AI data */}
            {aiData?.missing_elements && Array.isArray(aiData.missing_elements) && aiData.missing_elements.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs uppercase tracking-wider text-slate-400 mb-2">Missing Elements</h4>
                <div className="flex flex-wrap gap-2">
                  {aiData.missing_elements.map((item, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 text-xs rounded bg-red-500/20 text-red-300 border border-red-500/30"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths from AI analysis */}
            {hasAIData && strengths.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs uppercase tracking-wider text-green-400 mb-2">Strengths</h4>
                <ul className="space-y-1">
                  {strengths.map((strength, i) => (
                    <li key={i} className="text-sm flex items-start">
                      <span className="text-green-400 mr-2">✓</span>
                      <span className="text-slate-200">{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Weaknesses from AI analysis */}
            {hasAIData && weaknesses.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs uppercase tracking-wider text-amber-400 mb-2">Areas to Improve</h4>
                <ul className="space-y-1">
                  {weaknesses.map((weakness, i) => (
                    <li key={i} className="text-sm flex items-start">
                      <span className="text-amber-400 mr-2">!</span>
                      <span className="text-slate-200">{weakness}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improvements with examples from AI */}
            {hasAIData ? (
              improvements.length > 0 ? (
                <div className="mt-4">
                  <h4 className="text-xs uppercase tracking-wider text-indigo-400 mb-2">Personalized Suggestions</h4>
                  <div className="space-y-3">
                    {improvements.map((improvement, i) => (
                      <div key={i} className="bg-slate-800/60 rounded-lg p-3 border border-indigo-500/20">
                        <p className="text-sm text-slate-100 mb-2">{improvement.suggestion}</p>

                        {improvement.example_before && improvement.example_after && (
                          <div className="mt-2 text-xs">
                            <div className="flex gap-2 items-center mb-1">
                              <div className="bg-red-500/20 px-2 py-0.5 rounded text-red-300">Before</div>
                              <div className="text-slate-400">{improvement.example_before}</div>
                            </div>
                            <div className="flex gap-2 items-center">
                              <div className="bg-green-500/20 px-2 py-0.5 rounded text-green-300">After</div>
                              <div className="text-slate-300">{improvement.example_after}</div>
                            </div>
                          </div>
                        )}

                        {improvement.example && !improvement.example_before && (
                          <div className="mt-2 text-xs">
                            <div className="flex gap-2 items-center">
                              <div className="bg-blue-500/20 px-2 py-0.5 rounded text-blue-300">Example</div>
                              <div className="text-slate-300">{improvement.example}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-3 text-slate-400 text-sm">No personalized suggestions available.</div>
              )
            ) : (
              <div className="text-center py-3 text-slate-400 text-sm">No personalized suggestions for this category.</div>
            )}
          </div>
        )}
      </div>
    );
  }

  async function generateAiSuggestions(category, score, details) {
    setAiSuggestionLoading(true);

    try {
      // Use your existing AI API or LLM service
      // This is just a mockup - you'll need to implement the actual API call
      const prompt = `Based on a ${category} score of ${score}%, provide 3 specific, actionable 
      suggestions to improve this aspect of the resume. 
      ${details ? `These elements are missing: ${Array.isArray(details) ? details.join(', ') :
          (details.keywords_missing ? details.keywords_missing.join(', ') : '')}` : ''}
      Make suggestions industry-agnostic but practical.`;

      // Example response structure - replace with actual API call
      const response = await new Promise(resolve => {
        setTimeout(() => {
          resolve({
            suggestions: [
              `Identify the 3-5 most relevant ${category.toLowerCase()} from the job description and ensure they're prominently featured in your resume with specific examples of how you've used them.`,
              `Quantify your ${category.toLowerCase()} achievements with metrics (%, $, time saved) to demonstrate concrete impact.`,
              `Reorganize your ${category.toLowerCase()} section to list the most job-relevant skills first, using industry-standard terminology.`
            ]
          });
        }, 1000);
      });

      setAiSuggestions({
        ...aiSuggestions,
        [category]: response.suggestions
      });

      toast.success(`Generated AI suggestions for ${category}`);
    } catch (e) {
      toast.error(`Failed to generate suggestions: ${e.message}`);
    } finally {
      setAiSuggestionLoading(false);
    }
  }

  async function getDetailedSuggestion(suggestion, index) {
    setAiSuggestionLoading(true);

    try {
      // Example implementation - replace with your actual API call
      const response = await new Promise(resolve => {
        setTimeout(() => {
          resolve({
            before: "Managed team projects and ensured deadlines were met.",
            after: "Led cross-functional team of 8 engineers, delivering 3 critical projects 15% ahead of schedule through implementation of Agile methodologies and daily stand-ups.",
            explanation: "The improved version quantifies team size (8 engineers), specifies achievements (15% ahead of schedule), and mentions specific methodologies (Agile, daily stand-ups)."
          });
        }, 1000);
      });

      // Show this in a modal or expandable section
      setDetailedExample({
        suggestion,
        ...response
      });

    } catch (e) {
      toast.error(`Failed to generate example: ${e.message}`);
    } finally {
      setAiSuggestionLoading(false);
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-200">Document Manager</h1>
              <p className="text-slate-400 mt-2">Manage your resumes, cover letters, and other documents with AI-powered optimization</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowCoverLetterModal(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Generate Cover Letter
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 *:min-w-0">
              {documents.map(document => {
                const docType = DOCUMENT_TYPES.find(t => t.value === document.type) || { value: 'other', label: 'Other', icon: 'other' };
                const docStatus = DOCUMENT_STATUS.find(s => s.value === document.status) || DOCUMENT_STATUS[0];
                const name = getDocName(document);

                const format = document.format?.toUpperCase() || 'TXT';
                return (
                  <Card key={document.id} className="p-4 md:p-6 hover:shadow-lg transition-shadow glass-card glass-cyan">
                    <div className="flex items-start justify-between gap-3 mb-3 *:min-w-0">
                      <div className="flex items-center flex-1 min-w-0 overflow-hidden">
                        <div className="text-2xl mr-3 flex-shrink-0">{renderIcon(docType.icon)}</div>
                        <div className="min-w-0 overflow-hidden flex-1">
                          <h3
                            className="font-semibold text-slate-200 truncate w-full"
                            title={name}
                          >
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
                      <div className="relative group ml-2 flex-shrink-0">
                        <span
                          className="px-2 py-1 rounded-full text-xs bg-slate-700/60 border border-slate-600/50 cursor-pointer whitespace-nowrap"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.currentTarget.nextElementSibling.classList.toggle('hidden');
                          }}
                        >
                          {docStatus.label} ▾
                        </span>
                        <div className="absolute right-0 top-full mt-1 hidden z-10 bg-slate-800 border border-slate-700 rounded-md shadow-lg py-1 min-w-[120px]">
                          {DOCUMENT_STATUS.map(status => (
                            <button
                              key={status.value}
                              className={`w-full text-left px-3 py-1.5 text-sm ${status.value === document.status ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
                              onClick={(evt) => {
                                updateDocumentStatus(document.id, status.value);
                                evt.currentTarget.parentElement.classList.add('hidden');
                              }}
                            >
                              {status.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm"><span className="text-slate-400">Size:</span><span className="text-slate-200">{((document.file_size || 0) / 1024).toFixed(1)} KB</span></div>
                      <div className="flex justify-between text-sm"><span className="text-slate-400">Created:</span><span className="text-slate-200">{document.created_at ? new Date(document.created_at).toLocaleDateString() : '-'}</span></div>
                      {document.ats_score != null && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">ATS Score:</span>
                          <span className={getScoreColor(document.ats_score)}>{Number(document.ats_score).toFixed(1)}%</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4">
                      {/* Primary action for resume documents */}
                      {document.type === 'resume' && (
                        <div className="mb-3">
                          <Button
                            onClick={() => runAnalysis(document)}
                            variant="outline"
                            size="sm"
                            className="w-full bg-blue-600/30 hover:bg-blue-600/50 text-blue-100 border-blue-500/30"
                            disabled={analyzing}
                          >
                            {analyzing ? '🔄' : '🔍'} {analyzing ? 'Analyzing...' : 'Analyze Resume'}
                          </Button>
                        </div>
                      )}

                      {/* Action buttons - consistent across all document types */}
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          onClick={() => previewDocument(document)}
                          variant="outline"
                          size="sm"
                          className="flex flex-col items-center justify-center py-2 h-auto"
                          title={document.format?.toLowerCase() === 'docx' ? "DOCX preview not available" : "Preview document"}
                        >
                          <span className="text-lg mb-1">👁️</span>
                          <span className="text-xs">Preview</span>
                        </Button>

                        <Button
                          onClick={() => api.downloadDocument(document.id)}
                          variant="outline"
                          size="sm"
                          className="flex flex-col items-center justify-center py-2 h-auto"
                          title="Download document"
                        >
                          <span className="text-lg mb-1">📥</span>
                          <span className="text-xs">Download</span>
                        </Button>

                        <Button
                          onClick={() => deleteDocument(document.id)}
                          variant="outline"
                          size="sm"
                          className="flex flex-col items-center justify-center py-2 h-auto text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          title="Delete document"
                        >
                          <span className="text-lg mb-1">🗑️</span>
                          <span className="text-xs">Delete</span>
                        </Button>
                      </div>

                      {/* Secondary action for resume - only show if there are jobs */}
                      {document.type === 'resume' && jobs.length > 0 && (
                        <div className="mt-3">
                          <Button
                            onClick={() => { setJobPickerDoc(document); setShowJobPicker(true); }}
                            variant="outline"
                            size="sm"
                            className="w-full text-xs bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-100 border-indigo-500/30"
                            disabled={analyzing}
                          >
                            <span className="mr-1">🎯</span> Analyze with a Job ({jobs.length})
                          </Button>
                        </div>
                      )}
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
                        placeholder="e.g., John Doe – Resume"
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
              <div onClick={() => setShowCoverLetterModal(false)} className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 cursor-pointer" />
              <div className="fixed z-50 inset-0 flex items-center justify-center p-4">
                <div className="w-full max-w-4xl h-[85vh] modal-surface rounded-2xl ring-1 overflow-hidden" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>

                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-lg">✨</span>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-200">Generate AI Cover Letter</h2>
                        <p className="text-sm text-slate-400 mt-1">Create a tailored cover letter for your job application</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setShowCoverLetterModal(false)} className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/5 transition" aria-label="Close" type="button">✕</button>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="h-[calc(85vh-64px)] overflow-y-auto px-6 py-5">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                      {/* Left column */}
                      <div className="space-y-4">
                        <div>
                          <label className="field-label">Target Job *</label>
                          <select value={coverLetterForm.job_id} onChange={(e) => setCoverLetterForm({ ...coverLetterForm, job_id: e.target.value })} className="w-full input-glass">
                            <option value="">Select a job...</option>
                            {jobs.map(job => <option key={job.id} value={job.id}>{job.title} at {getCompany(job)}</option>)}
                          </select>
                        </div>

                        <div>
                          <label className="field-label">Resume *</label>
                          <select value={coverLetterForm.resume_id} onChange={(e) => setCoverLetterForm({ ...coverLetterForm, resume_id: e.target.value })} className="w-full input-glass">
                            <option value="">Select your resume...</option>
                            {resumes.map(resume => <option key={resume.id} value={resume.id}>{resume.label || `Resume ${resume.id}`}</option>)}
                          </select>
                        </div>

                        <div>
                          <label className="field-label">Tone</label>
                          <select value={coverLetterForm.tone} onChange={(e) => setCoverLetterForm({ ...coverLetterForm, tone: e.target.value })} className="w-full input-glass">
                            <option value="professional">Professional</option>
                            <option value="enthusiastic">Enthusiastic</option>
                            <option value="confident">Confident</option>
                            <option value="creative">Creative</option>
                          </select>
                        </div>

                        <div>
                          <label className="field-label">Length</label>
                          <select value={coverLetterForm.length} onChange={(e) => setCoverLetterForm({ ...coverLetterForm, length: e.target.value })} className="w-full input-glass">
                            <option value="short">Short (200-300 words)</option>
                            <option value="medium">Medium (300-400 words)</option>
                            <option value="long">Long (400-500 words)</option>
                          </select>
                        </div>

                        <button
                          onClick={generateCoverLetter}
                          disabled={!coverLetterForm.job_id || !coverLetterForm.resume_id || isGeneratingCoverLetter}
                          className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${(!coverLetterForm.job_id || !coverLetterForm.resume_id || isGeneratingCoverLetter)
                              ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                              : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl'
                            }`}
                        >
                          {isGeneratingCoverLetter ? (
                            <>
                              <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                              Creating...
                            </>
                          ) : (
                            <>
                              ✨ Generate Cover Letter
                            </>
                          )}
                        </button>
                      </div>

                      {/* Right column */}
                      <div className="space-y-4">
                        <div>
                          <label className="field-label">Generated Cover Letter</label>
                          {isGeneratingCoverLetter ? (
                            <div className="w-full h-80 p-3 bg-slate-800/50 border border-slate-600/30 rounded-lg text-slate-200 flex flex-col items-center justify-center space-y-4">
                              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                              <div className="text-center">
                                <p className="text-lg font-medium text-slate-200">Creating your cover letter...</p>
                                <p className="text-sm text-slate-400 mt-2">Analyzing your resume and matching it to the job requirements</p>
                              </div>
                            </div>
                          ) : (
                            <textarea
                              value={generatedCoverLetter}
                              onChange={(e) => setGeneratedCoverLetter(e.target.value)}
                              placeholder="Generated cover letter will appear here..."
                              className="w-full h-80 p-3 bg-slate-800/50 border border-slate-600/30 rounded-lg text-slate-200 placeholder-slate-400 resize-vertical focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
                              readOnly={!generatedCoverLetter}
                            />
                          )}
                          {generatedCoverLetter && (
                            <div className="flex gap-2 mt-3 justify-end">
                              <button
                                onClick={() => { navigator.clipboard.writeText(generatedCoverLetter); alert('Cover letter copied to clipboard!'); }}
                                className="btn-ghost px-3 py-1.5 rounded-lg text-sm"
                              >
                                📋 Copy
                              </button>
                              <button
                                onClick={saveCoverLetterAsDocument}
                                className="btn-ghost px-3 py-1.5 rounded-lg text-sm"
                              >
                                💾 Save as Document
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t border-white/10">
                      <button
                        onClick={() => setShowCoverLetterModal(false)}
                        className="btn-ghost px-6 py-2.5 rounded-lg"
                      >
                        Close
                      </button>
                    </div>
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
                      <p className="text-sm text-slate-300 leading-relaxed break-words m-0">
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
                              <p className="text-sm text-slate-300 leading-relaxed break-words mt-2">
                                {typeof analysis.job_match_summary === 'string' ? analysis.job_match_summary : analysis.job_match_summary?.summary}
                              </p>
                            )}
                          </div>

                          {/* Sub-scores */}
                          <div className="space-y-4">
                            {analysis.ats_score?.technical_skills_score != null && (
                              <ExpandableScoreCategory
                                title="Technical Skills"
                                score={analysis.ats_score.technical_skills_score}
                                description="How well your technical skills align with job requirements"
                                categoryKey="technical_skills"
                              />
                            )}

                            {analysis.ats_score?.soft_skills_score != null && (
                              <ExpandableScoreCategory
                                title="Soft Skills"
                                score={analysis.ats_score.soft_skills_score}
                                description="Presence of important soft skills relevant to this role"
                                categoryKey="soft_skills"
                              />
                            )}

                            {(hasKeywordScore || hasKeywordAI) && (
                              <ExpandableScoreCategory
                                title="Keywords"
                                score={analysis?.ats_score?.keyword_score ?? 0}
                                description="Job-specific terminology and industry language match"
                                categoryKey="keywords"
                              />
                            )}

                            {analysis.ats_score?.formatting_score != null && (
                              <ExpandableScoreCategory
                                title="Formatting"
                                score={analysis.ats_score.formatting_score}
                                description="ATS-friendly structure and organization"
                                categoryKey="formatting"
                              />
                            )}
                          </div>
                        </div>

                        {/* Enhanced Section Analysis - NEW */}
                        {analysis.section_quality && Object.keys(analysis.section_quality).length > 0 && (
                          <div className="p-4 rounded-lg border bg-slate-800/60 border-white/20">
                            <h3 className="font-semibold mb-3 text-blue-300">📝 Section Quality Analysis</h3>
                            <div className="space-y-3">
                              {Object.entries(analysis.section_quality).map(([section, data]) => (
                                <div key={section} className="flex items-center justify-between">
                                  <span className="text-slate-200">{section}</span>
                                  <div className="flex items-center gap-3">
                                    <div className="w-24 h-2 bg-slate-700 rounded overflow-hidden">
                                      <div
                                        className={`h-2 rounded ${data.score >= 80 ? 'bg-green-500' : data.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                        style={{ width: `${data.score}%` }}
                                      />
                                    </div>
                                    <span className="text-xs text-slate-400">{data.score.toFixed(0)}%</span>
                                    {data.improvement_needed && (
                                      <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded">Needs work</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action Verb Analysis - NEW */}
                        {analysis.action_verb_count !== undefined && (
                          <div className="p-4 rounded-lg border bg-slate-800/60 border-white/20">
                            <h3 className="font-semibold mb-3 text-blue-300">🔤 Language Analysis</h3>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                                <div className="text-xl font-bold text-slate-100">{analysis.action_verb_count}</div>
                                <p className="text-xs text-slate-400">Action Verbs</p>
                                <div className="mt-2 text-xs text-slate-300">
                                  {analysis.action_verb_count >= 10 ?
                                    'Strong use of action verbs' :
                                    'Consider adding more impactful verbs'}
                                </div>
                              </div>
                              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                                <div className="text-xl font-bold text-slate-100">
                                  {analysis.readability_score ? analysis.readability_score.toFixed(0) + '%' : 'N/A'}
                                </div>
                                <p className="text-xs text-slate-400">Readability</p>
                                <div className="mt-2 text-xs text-slate-300">
                                  {(analysis.readability_score || 0) >= 70 ?
                                    'Good content structure' :
                                    'Content needs improvement'}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Overall AI Recommendations */}
                        {analysis?.ai_detailed_analysis?.overall_suggestions && analysis.ai_detailed_analysis.overall_suggestions.length > 0 && (
                          <div className="p-4 rounded-lg border bg-slate-800/60 border-white/20">
                            <h3 className="font-semibold mb-3 text-slate-100 flex items-center">
                              <span className="text-indigo-400 mr-2">✨</span> Key Recommendations
                            </h3>

                            <div className="grid gap-3">
                              {analysis.ai_detailed_analysis.overall_suggestions.map((suggestion, i) => (
                                <div
                                  key={i}
                                  className="p-3 rounded-lg border border-indigo-500/20 bg-indigo-500/10 hover:bg-indigo-500/15 transition-colors"
                                >
                                  <div className="flex items-start">
                                    <div className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300 mr-3 mt-0.5">
                                      {i + 1}
                                    </div>
                                    <div>
                                      <p className="text-slate-200">{suggestion}</p>
                                    </div>
                                  </div>
                                </div>
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
          {/* DOCX Preview Notice */}
          {showPreviewNotice && (
            <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setShowPreviewNotice(false)}>
              <div
                className="bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-6 max-w-md mx-4"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-blue-500/20 p-2 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-300">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4" />
                      <path d="M12 8h.01" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-slate-100">Document Preview Unavailable</h3>
                </div>

                <p className="text-slate-300 mb-4">
                  DOCX files can't be previewed directly in the browser. Please download the file to view its contents.
                </p>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => {
                      api.downloadDocument(previewNoticeDoc.id);
                      setShowPreviewNotice(false);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex-1 transition-colors"
                  >
                    Download Document
                  </button>
                  <button
                    onClick={() => setShowPreviewNotice(false)}
                    className="px-4 py-2 bg-transparent hover:bg-slate-700 border border-slate-600 text-slate-300 rounded-md transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}

