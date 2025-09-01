import { useState, useEffect } from 'react';
import { Card, Button, Input, Select, Modal, Textarea, FileUpload } from '../components/ui';

// Enhanced Document Management with Intelligent ATS Analysis
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001';

const DOCUMENT_TYPES = [
  { value: 'resume', label: '📄 Resume', icon: '📄' },
  { value: 'cover_letter', label: '💼 Cover Letter', icon: '💼' },
  { value: 'portfolio', label: '🎨 Portfolio', icon: '🎨' },
  { value: 'certificate', label: '🏆 Certificate', icon: '🏆' },
  { value: 'transcript', label: '🎓 Transcript', icon: '🎓' },
  { value: 'reference', label: '👥 Reference', icon: '👥' },
  { value: 'other', label: '📎 Other', icon: '📎' }
];

export default function EnhancedDocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showCoverLetterModal, setShowCoverLetterModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [selectedJob, setSelectedJob] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  
  const [uploadForm, setUploadForm] = useState({
    file: null,
    document_type: 'resume'
  });

  const [coverLetterForm, setCoverLetterForm] = useState({
    user_name: '',
    company_name: '',
    additional_notes: ''
  });

  const [generatedCoverLetter, setGeneratedCoverLetter] = useState('');

  // Toast notification system
  const toast = {
    success: (message) => {
      const toastEl = document.createElement('div');
      toastEl.style.cssText = `
        position: fixed; 
        top: 20px; 
        right: 20px; 
        background: #10B981; 
        color: white; 
        padding: 12px 20px; 
        border-radius: 8px; 
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `;
      toastEl.innerHTML = `✅ ${message}`;
      document.body.appendChild(toastEl);
      setTimeout(() => document.body.removeChild(toastEl), 3000);
    },
    error: (message) => {
      const toastEl = document.createElement('div');
      toastEl.style.cssText = `
        position: fixed; 
        top: 20px; 
        right: 20px; 
        background: #EF4444; 
        color: white; 
        padding: 12px 20px; 
        border-radius: 8px; 
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `;
      toastEl.innerHTML = `❌ ${message}`;
      document.body.appendChild(toastEl);
      setTimeout(() => document.body.removeChild(toastEl), 4000);
    },
    info: (message) => {
      const toastEl = document.createElement('div');
      toastEl.style.cssText = `
        position: fixed; 
        top: 20px; 
        right: 20px; 
        background: #3B82F6; 
        color: white; 
        padding: 12px 20px; 
        border-radius: 8px; 
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `;
      toastEl.innerHTML = `ℹ️ ${message}`;
      document.body.appendChild(toastEl);
      setTimeout(() => document.body.removeChild(toastEl), 3500);
    }
  };

  useEffect(() => {
    loadDocuments();
    loadJobs();
  }, []);

  async function loadDocuments() {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/documents/`);
      if (!response.ok) throw new Error('Failed to fetch documents');
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }

  async function loadJobs() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/jobs`);
      if (!response.ok) throw new Error('Failed to fetch jobs');
      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  }

  async function handleUpload() {
    if (!uploadForm.file) {
      toast.error('Please select a file to upload');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('document_type', uploadForm.document_type);

      const response = await fetch(`${API_BASE_URL}/api/documents/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(`Document uploaded successfully!`);
        setShowUploadModal(false);
        setUploadForm({ file: null, document_type: 'resume' });
        loadDocuments();
        
        if (result.extraction_success) {
          toast.info(`Text extracted successfully (${result.text_length} characters)`);
        } else {
          toast.error(`Text extraction failed: ${result.extraction_error}`);
        }
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.message}`);
    }
  }

  async function handleAnalyze(document, jobId = '') {
    try {
      setAnalyzing(true);
      setSelectedDocument(document);
      setSelectedJob(jobId);
      
      const url = jobId 
        ? `${API_BASE_URL}/api/documents/${document.id}/analyze?job_id=${jobId}`
        : `${API_BASE_URL}/api/documents/${document.id}/analyze`;
        
      const response = await fetch(url, { method: 'POST' });
      if (!response.ok) throw new Error('Analysis failed');
      
      const result = await response.json();
      setAnalysis(result);
      setShowAnalysisModal(true);
      
      if (result.success) {
        const score = result.ats_score?.overall_score || 0;
        toast.success(`Analysis complete! ATS Score: ${score.toFixed(1)}%`);
      } else {
        toast.error(result.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error(`Analysis failed: ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleGenerateCoverLetter() {
    if (!selectedDocument || !selectedJob || !coverLetterForm.user_name || !coverLetterForm.company_name) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('job_id', selectedJob);
      formData.append('user_name', coverLetterForm.user_name);
      formData.append('company_name', coverLetterForm.company_name);
      formData.append('additional_notes', coverLetterForm.additional_notes);

      const response = await fetch(`${API_BASE_URL}/api/documents/${selectedDocument.id}/generate-cover-letter`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Cover letter generation failed');
      
      const result = await response.json();
      
      if (result.success) {
        setGeneratedCoverLetter(result.content);
        toast.success('Cover letter generated successfully!');
        
        if (result.skills_highlighted && result.skills_highlighted.length > 0) {
          toast.info(`Highlighted skills: ${result.skills_highlighted.join(', ')}`);
        }
      } else {
        throw new Error(result.error || 'Generation failed');
      }
    } catch (error) {
      console.error('Cover letter generation error:', error);
      toast.error(`Cover letter generation failed: ${error.message}`);
    }
  }

  async function handleDelete(document) {
    if (!confirm(`Are you sure you want to delete "${document.filename}"?`)) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${document.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Delete failed');
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('Document deleted successfully');
        loadDocuments();
      } else {
        throw new Error(result.message || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(`Delete failed: ${error.message}`);
    }
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = (extractionSuccess, textLength) => {
    if (extractionSuccess && textLength > 0) {
      return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">✅ Processed</span>;
    } else if (!extractionSuccess) {
      return <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">❌ Failed</span>;
    } else {
      return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">⚠️ Empty</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Intelligent Document Manager</h1>
          <p className="text-gray-600 mt-1">Upload, analyze, and optimize your career documents with AI-powered insights</p>
        </div>
        <Button 
          onClick={() => setShowUploadModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
        >
          📤 Upload Document
        </Button>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {documents.map(document => (
          <Card key={document.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <span className="text-2xl mr-3">
                  {DOCUMENT_TYPES.find(t => t.value === document.type)?.icon || '📄'}
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900 truncate">{document.filename}</h3>
                  <p className="text-sm text-gray-500">{document.type}</p>
                </div>
              </div>
              {getStatusBadge(document.extraction_success, document.text_length)}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Size:</span>
                <span>{(document.file_size / 1024).toFixed(1)} KB</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Text Length:</span>
                <span>{document.text_length || 0} chars</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Uploaded:</span>
                <span>{new Date(document.upload_date).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="space-y-2">
              {/* Job-specific analysis buttons */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-700">Quick Analysis:</p>
                <div className="flex flex-wrap gap-1">
                  {jobs.slice(0, 3).map(job => (
                    <Button
                      key={job.id}
                      onClick={() => handleAnalyze(document, job.id)}
                      disabled={analyzing || !document.extraction_success}
                      className="text-xs px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded"
                    >
                      {job.title.substring(0, 15)}...
                    </Button>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex space-x-2 pt-2">
                <Button
                  onClick={() => handleAnalyze(document)}
                  disabled={analyzing || !document.extraction_success}
                  className="flex-1 bg-green-50 text-green-700 hover:bg-green-100 text-sm py-2"
                >
                  {analyzing ? '🔄' : '🔍'} Analyze
                </Button>
                <Button
                  onClick={() => {
                    setSelectedDocument(document);
                    setShowCoverLetterModal(true);
                  }}
                  disabled={!document.extraction_success}
                  className="flex-1 bg-purple-50 text-purple-700 hover:bg-purple-100 text-sm py-2"
                >
                  ✍️ Cover Letter
                </Button>
                <Button
                  onClick={() => handleDelete(document)}
                  className="bg-red-50 text-red-700 hover:bg-red-100 text-sm py-2 px-3"
                >
                  🗑️
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {documents.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">No documents yet</h3>
          <p className="text-gray-600 mb-4">Upload your first document to get started with AI-powered analysis</p>
          <Button 
            onClick={() => setShowUploadModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Upload Your First Document
          </Button>
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}
      >
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          width: '90%',
          maxWidth: '500px',
          maxHeight: '90vh',
          overflow: 'auto'
        }}>
          <h2 className="text-2xl font-bold mb-6">📤 Upload Document</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Type
              </label>
              <Select
                value={uploadForm.document_type}
                onChange={(e) => setUploadForm({...uploadForm, document_type: e.target.value})}
                className="w-full"
              >
                {DOCUMENT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                File (PDF only)
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setUploadForm({...uploadForm, file: e.target.files[0]})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
              {uploadForm.file && (
                <p className="text-sm text-green-600 mt-1">
                  ✅ Selected: {uploadForm.file.name}
                </p>
              )}
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <Button
              onClick={() => setShowUploadModal(false)}
              className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
            >
              Upload & Process
            </Button>
          </div>
        </div>
      </Modal>

      {/* Analysis Modal */}
      <Modal
        isOpen={showAnalysisModal}
        onClose={() => setShowAnalysisModal(false)}
        style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}
      >
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          width: '90%',
          maxWidth: '700px',
          maxHeight: '90vh',
          overflow: 'auto'
        }}>
          <h2 className="text-2xl font-bold mb-6">
            🔍 ATS Analysis Results
            {analysis?.job_context && (
              <span className="block text-base font-normal text-gray-600 mt-1">
                For: {analysis.job_context.title} at {analysis.job_context.company}
              </span>
            )}
          </h2>

          {analysis && (
            <div className="space-y-6">
              {/* Overall Score */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-center">
                  <div className={`text-4xl font-bold ${getScoreColor(analysis.ats_score?.overall_score || 0)}`}>
                    {(analysis.ats_score?.overall_score || 0).toFixed(1)}%
                  </div>
                  <p className="text-gray-600">Overall ATS Compatibility</p>
                  {analysis.job_match_summary && (
                    <p className="text-sm mt-2 text-gray-700">
                      <strong>{analysis.job_match_summary.match_level}</strong>: {analysis.job_match_summary.summary}
                    </p>
                  )}
                </div>
              </div>

              {/* Detailed Scores */}
              {analysis.ats_score && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className={`text-xl font-semibold ${getScoreColor(analysis.ats_score.technical_skills_score)}`}>
                      {analysis.ats_score.technical_skills_score?.toFixed(1)}%
                    </div>
                    <p className="text-sm text-gray-600">Technical Skills</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className={`text-xl font-semibold ${getScoreColor(analysis.ats_score.soft_skills_score)}`}>
                      {analysis.ats_score.soft_skills_score?.toFixed(1)}%
                    </div>
                    <p className="text-sm text-gray-600">Soft Skills</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3">
                    <div className={`text-xl font-semibold ${getScoreColor(analysis.ats_score.keyword_score)}`}>
                      {analysis.ats_score.keyword_score?.toFixed(1)}%
                    </div>
                    <p className="text-sm text-gray-600">Keywords</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className={`text-xl font-semibold ${getScoreColor(analysis.ats_score.formatting_score)}`}>
                      {analysis.ats_score.formatting_score?.toFixed(1)}%
                    </div>
                    <p className="text-sm text-gray-600">Format</p>
                  </div>
                </div>
              )}

              {/* Keyword Analysis */}
              {analysis.keyword_analysis && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">🎯 Keyword Match</h3>
                  <p className="text-sm text-blue-700 mb-2">
                    {analysis.keyword_analysis.matched_keywords?.length || 0} of {analysis.keyword_analysis.total_job_keywords || 0} keywords matched
                  </p>
                  {analysis.keyword_analysis.matched_keywords && analysis.keyword_analysis.matched_keywords.length > 0 && (
                    <div>
                      <p className="text-xs text-blue-600 mb-1">Matched keywords:</p>
                      <div className="flex flex-wrap gap-1">
                        {analysis.keyword_analysis.matched_keywords.slice(0, 10).map((keyword, idx) => (
                          <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Missing Skills */}
              {analysis.missing_skills && (analysis.missing_skills.technical?.length > 0 || analysis.missing_skills.critical_missing?.length > 0) && (
                <div className="bg-red-50 rounded-lg p-4">
                  <h3 className="font-semibold text-red-900 mb-2">⚠️ Missing Skills</h3>
                  {analysis.missing_skills.critical_missing && analysis.missing_skills.critical_missing.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-red-600 mb-1">Critical missing keywords:</p>
                      <div className="flex flex-wrap gap-1">
                        {analysis.missing_skills.critical_missing.map((skill, idx) => (
                          <span key={idx} className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {analysis.missing_skills.technical && analysis.missing_skills.technical.length > 0 && (
                    <div>
                      <p className="text-xs text-red-600 mb-1">Missing technical skills:</p>
                      <div className="flex flex-wrap gap-1">
                        {analysis.missing_skills.technical.slice(0, 8).map((skill, idx) => (
                          <span key={idx} className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Recommendations */}
              {analysis.suggested_improvements && analysis.suggested_improvements.length > 0 && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-3">💡 Recommendations</h3>
                  <ul className="space-y-2">
                    {analysis.suggested_improvements.map((improvement, idx) => (
                      <li key={idx} className="flex items-start text-sm text-green-800">
                        <span className="text-green-600 mr-2">•</span>
                        {improvement}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Document Stats */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-semibold text-gray-900">{analysis.word_count || 0}</div>
                  <p className="text-xs text-gray-600">Words</p>
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900">{(analysis.readability_score || 0).toFixed(1)}%</div>
                  <p className="text-xs text-gray-600">Readability</p>
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900">{analysis.missing_sections?.length || 0}</div>
                  <p className="text-xs text-gray-600">Missing Sections</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-6">
            <Button
              onClick={() => setShowAnalysisModal(false)}
              className="bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cover Letter Modal */}
      <Modal
        isOpen={showCoverLetterModal}
        onClose={() => setShowCoverLetterModal(false)}
        style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}
      >
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          width: '90%',
          maxWidth: '700px',
          maxHeight: '90vh',
          overflow: 'auto'
        }}>
          <h2 className="text-2xl font-bold mb-6">✍️ Generate Cover Letter</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Job Position
              </label>
              <Select
                value={selectedJob}
                onChange={(e) => setSelectedJob(e.target.value)}
                className="w-full"
              >
                <option value="">Select a job...</option>
                {jobs.map(job => (
                  <option key={job.id} value={job.id}>
                    {job.title} at {job.company}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name *
                </label>
                <Input
                  value={coverLetterForm.user_name}
                  onChange={(e) => setCoverLetterForm({...coverLetterForm, user_name: e.target.value})}
                  placeholder="John Doe"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name *
                </label>
                <Input
                  value={coverLetterForm.company_name}
                  onChange={(e) => setCoverLetterForm({...coverLetterForm, company_name: e.target.value})}
                  placeholder="Company Inc"
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <Textarea
                value={coverLetterForm.additional_notes}
                onChange={(e) => setCoverLetterForm({...coverLetterForm, additional_notes: e.target.value})}
                placeholder="Any specific points you'd like to mention..."
                className="w-full h-24"
              />
            </div>

            {generatedCoverLetter && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Generated Cover Letter:</h3>
                <div className="bg-white border rounded p-4 max-h-64 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm">{generatedCoverLetter}</pre>
                </div>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedCoverLetter);
                    toast.success('Cover letter copied to clipboard!');
                  }}
                  className="mt-3 bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm"
                >
                  📋 Copy to Clipboard
                </Button>
              </div>
            )}
          </div>

          <div className="flex space-x-3 mt-6">
            <Button
              onClick={() => {
                setShowCoverLetterModal(false);
                setGeneratedCoverLetter('');
                setCoverLetterForm({ user_name: '', company_name: '', additional_notes: '' });
              }}
              className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateCoverLetter}
              className="flex-1 bg-purple-600 text-white hover:bg-purple-700"
            >
              Generate Cover Letter
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
