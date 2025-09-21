import { useEffect, useState } from "react";
import { api, apiFetch } from "../lib/api";
import { Button, Card, Input, Textarea, Select, Modal } from "../components/ui";
import { useToast } from '../lib/toast';
import AuthGuard from "../components/AuthGuard";
import { useRouter } from "next/router";


export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    page_size: 12,
    pages: 1,
    has_next: false,
    has_prev: false
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [locationFilter, setLocationFilter] = useState("");
  const [remoteTypeFilter, setRemoteTypeFilter] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Manual job creation
  const [showJobModal, setShowJobModal] = useState(false);
  const [manualJobData, setManualJobData] = useState({
    title: '',
    company_name: '',
    location: '',
    description: '',
    requirements: [],
    skills: [],
    remote_type: 'On-site',
    job_type: 'Full-time',
    source_url: ''
  });

  // Job details/edit states
  const [showJobDetailsModal, setShowJobDetailsModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobDetailsMode, setJobDetailsMode] = useState('view'); // 'view' or 'edit'
  const [editJobData, setEditJobData] = useState(null);
  const [expandedJobs, setExpandedJobs] = useState(new Set());

  // ── Apply modal state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyTargetJob, setApplyTargetJob] = useState(null);

  // Doc options for the modal
  const [applyDocsLoading, setApplyDocsLoading] = useState(false);
  const [applyAllDocs, setApplyAllDocs] = useState([]);

  // User choices in the modal
  const [applyTab, setApplyTab] = useState('select'); // 'select' | 'upload' | 'none'
  const [selectedDocIds, setSelectedDocIds] = useState(new Set()); // IDs from Documents
  const [pendingUploads, setPendingUploads] = useState([]); // [{ file, type }]
  const [filterType, setFilterType] = useState(""); // UI filter only

  const [applying, setApplying] = useState(false);


  // --- Doc type helpers (add near top) ---
  const DOC_TYPES = ["resume", "cover_letter", "portfolio", "certificate", "transcript", "reference", "other"];
  const TYPE_LABELS = {
    resume: "Resume",
    cover_letter: "Cover letter",
    portfolio: "Portfolio",
    certificate: "Certificate",
    transcript: "Transcript",
    reference: "Reference",
    other: "Other"
  };
  const typeLabel = (t) => TYPE_LABELS[t] || (t?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "Other");


  async function loadApplyDocs() {
    try {
      setApplyDocsLoading(true);
      // Grab everything and show types. (If your API supports it, keep status=Active casing)
      const resp = await api.getDocuments("page=1&page_size=200&status=Active");
      setApplyAllDocs(resp?.documents || resp?.items || []);
    } catch (e) {
      console.error("Failed to load document options:", e);
      toast.error("Couldn't load your documents.");
      setApplyAllDocs([]);
    } finally {
      setApplyDocsLoading(false);
    }
  }

  function openApply(job) {
    setApplyTargetJob(job);
    setApplyTab('select');
    setSelectedDocIds(new Set());
    setPendingUploads([]);
    setFilterType("");
    setShowApplyModal(true);
    loadApplyDocs();
  }


  async function uploadOneDocument(type, file) {
    if (!file) return null;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', type);

    const resp = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    if (!resp.ok) throw new Error(`Upload ${type} failed (${resp.status})`);

    // Try to read ID from response; fall back to re-query if needed
    const body = await resp.json().catch(() => ({}));
    const idGuess = body?.document?.id ?? body?.id ?? body?.doc?.id ?? null;

    if (idGuess) return idGuess;

    // Fallback: fetch latest of that type and assume newest belongs to us
    const latest = await api.getDocuments(`page=1&page_size=1&document_type=${type}&status=active&order=desc&sort=created_at`);
    const doc = latest?.documents?.[0];
    if (doc?.id) return doc.id;

    throw new Error(`Upload ${type} succeeded but couldn't locate new file id`);
  }



  const API_BASE_URL = "/api"; // used for direct uploads like in documents.js
  const docDisplayName = (d) => d?.name || d?.file_name || d?.filename || 'Untitled';


  const toast = useToast();

  async function loadJobs(page = 1) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pagination.page_size.toString(),
        sort: sortBy,
        order: sortOrder
      });

      if (searchTerm.trim()) params.append('q', searchTerm.trim());
      if (locationFilter.trim()) params.append('location', locationFilter.trim());
      if (remoteTypeFilter) params.append('remote_type', remoteTypeFilter);

      const data = await apiFetch(`/jobs?${params}`).then(r => r.json());
      setJobs(data.items || []);
      setPagination({
        total: data.total || 0,
        page: data.page || 1,
        page_size: data.page_size || 12,
        pages: data.pages || 1,
        has_next: data.has_next || false,
        has_prev: data.has_prev || false
      });
    } catch (err) {
      console.error('Load jobs error:', err);
      if (!err.message?.includes('Auth expired') && !err.message?.includes('Not authenticated')) {
        toast.error("Failed to load jobs");
      }
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSearchSuggestions(query) {
    if (!query || query.length < 2) {
      setSearchSuggestions([]);
      return;
    }
    try {
      const response = await apiFetch(`/jobs/suggestions?q=${encodeURIComponent(query)}`).then(r => r.json());
      setSearchSuggestions(response || []);
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
      setSearchSuggestions([]);
    }
  }

  // Save a manually created/edited job
  async function handleManualJobSave() {
    setLoading(true);
    try {
      const cleanData = {
        title: manualJobData.title.trim(),
        company_name: manualJobData.company_name.trim(),
      };

      if (manualJobData.location?.trim()) cleanData.location = manualJobData.location.trim();
      if (manualJobData.remote_type && manualJobData.remote_type !== 'On-site') {
        cleanData.remote_type = manualJobData.remote_type;
      }
      if (manualJobData.job_type && manualJobData.job_type !== 'Full-time') {
        cleanData.job_type = manualJobData.job_type;
      }
      if (manualJobData.description?.trim()) cleanData.description = manualJobData.description.trim();
      if (manualJobData.source_url?.trim()) cleanData.source_url = manualJobData.source_url.trim();

      if (manualJobData.requirements?.length) {
        cleanData.requirements = manualJobData.requirements.map(r => r.trim()).filter(Boolean);
      }
      if (manualJobData.skills?.length) {
        cleanData.skills = manualJobData.skills.map(s => s.trim()).filter(Boolean);
      }

      await api.createManualJob(cleanData);
      toast.success("Job created successfully!");
      setShowJobModal(false);
      resetJobForm();
      await loadJobs();
    } catch (err) {
      console.error('Manual job creation error:', err);
      toast.error(`Failed to create job: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }


  function resetJobForm() {
    setManualJobData({
      title: '',
      company_name: '',
      location: '',
      description: '',
      requirements: [],
      skills: [],
      remote_type: 'On-site',
      job_type: 'Full-time',
      source_url: ''
    });
  }

  async function submitApplyChoice() {
    if (!applyTargetJob?.id) {
      toast.error("No job selected.");
      return;
    }

    if (applyTab === 'select' && selectedDocIds.size === 0) {
      toast.error("Pick at least one document or switch to 'Apply without files'.");
      return;
    }
    if (applyTab === 'upload' && pendingUploads.length === 0) {
      toast.error("Choose files to upload or switch tabs.");
      return;
    }

    try {
      setApplying(true);
      // 1) Create application
      const app = await api.createApp({ job_id: applyTargetJob.id, status: "Applied" });
      const appId = app?.id;
      if (!appId) throw new Error("Application create did not return an id");

      // 2) Build list of document IDs to attach
      const toAttach = [];

      if (applyTab === 'select') {
        selectedDocIds.forEach(id => toAttach.push(String(id)));
      } else if (applyTab === 'upload') {
        // Upload each with its chosen type, then attach
        for (const item of pendingUploads) {
          const type = item.type || "other";
          const id = await uploadOneDocument(type, item.file);
          toAttach.push(String(id));
        }
      }
      // 'none' => nothing

      // 3) Attach to application
      if (toAttach.length) {
        await Promise.all(
          toAttach.map(id =>
            apiFetch(`/applications/${appId}/attachments/from-document`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ document_id: id })
            })
          )
        );
      }

      toast.success(toAttach.length ? "Application created and files attached!" : "Application created!");
      setShowApplyModal(false);
      setApplyTargetJob(null);
    } catch (e) {
      console.error(e);
      toast.error(`Failed to apply: ${e.message || e}`);
    } finally {
      setApplying(false);
    }
  }


  async function deleteJob(jobId) {
    if (!confirm("Are you sure you want to delete this job? This action cannot be undone.")) {
      return;
    }
    try {
      await api.deleteJob(jobId);
      setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
      toast.success("Job deleted successfully!");
    } catch (err) {
      toast.error(`Failed to delete job: ${err.message || err}`);
    }
  }

  // Handle array inputs for skills, requirements
  function handleArrayInput(field, value) {
    setManualJobData(prev => ({ ...prev, [field]: value.split('\n') }));
  }

  // Toggle expanded state for job description
  function toggleJobExpanded(jobId) {
    setExpandedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) newSet.delete(jobId);
      else newSet.add(jobId);
      return newSet;
    });
  }

  // SAFER: robust + never blocks modal open
  function openJobDetails(job) {
    setSelectedJob(job);
    setJobDetailsMode('view');

    let nextEdit = {
      title: job.title || '',
      company_name: job.company_name || '',
      location: job.location || '',
      description: job.description || '',
      requirements: Array.isArray(job.requirements) ? job.requirements : [],
      skills: Array.isArray(job.skills) ? job.skills : [],
      remote_type: job.remote_type || 'On-site',
      job_type: job.job_type || 'Full-time',
      source_url: job.source_url || ''
    };

    try {
      const text = job.description || '';

      // Use [\s\S] instead of /s flag for broader compatibility
      const reqMatch = text.match(/\*\*Requirements:\*\*\n([\s\S]*?)(?=\n\n\*\*|$)/);
      if (reqMatch) {
        const reqs = reqMatch[1]
          .split('\n')
          .map(r => r.replace(/^• /, '').trim())
          .filter(Boolean);
        nextEdit.requirements = reqs;
        nextEdit.description = (text || '').replace(/\n\n\*\*Requirements:\*\*\n[\s\S]*?(?=\n\n\*\*|$)/, '').trim();
      }

      const skillsMatch = text.match(/\*\*Required Skills:\*\*\n([\s\S]*?)(?=\n\n\*\*|$)/);
      if (skillsMatch) {
        const skills = skillsMatch[1]
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
        nextEdit.skills = skills;
        nextEdit.description = (nextEdit.description || text).replace(/\n\n\*\*Required Skills:\*\*\n[\s\S]*?(?=\n\n\*\*|$)/, '').trim();
      }
    } catch (e) {
      console.warn('Non-fatal parse error in openJobDetails:', e);
      // fall back to defaults in nextEdit
    } finally {
      setEditJobData(nextEdit);
      setShowJobDetailsModal(true); // ensure the modal opens even if parsing fails
    }
  }

  function closeJobDetails() {
    setShowJobDetailsModal(false);
    setSelectedJob(null);
    setEditJobData(null);
    setJobDetailsMode('view');
    router.replace('/jobs', undefined, { shallow: true });
  }

  function switchToEditMode() {
    setJobDetailsMode('edit');
  }

  async function saveJobChanges() {
    if (!selectedJob || !editJobData) return;

    setLoading(true);
    try {
      const cleanData = {
        title: editJobData.title.trim(),
        company_name: editJobData.company_name.trim(),
      };

      if (editJobData.location?.trim()) cleanData.location = editJobData.location.trim();
      if (editJobData.remote_type && editJobData.remote_type !== 'On-site') {
        cleanData.remote_type = editJobData.remote_type;
      }
      if (editJobData.job_type && editJobData.job_type !== 'Full-time') {
        cleanData.job_type = editJobData.job_type;
      }
      if (editJobData.description?.trim()) cleanData.description = editJobData.description.trim();
      if (editJobData.source_url?.trim()) cleanData.source_url = editJobData.source_url.trim();

      if (editJobData.requirements?.length) {
        cleanData.requirements = editJobData.requirements.filter(req => req.trim());
      }
      if (editJobData.skills?.length) {
        cleanData.skills = editJobData.skills.filter(skill => skill.trim());
      }

      await api.updateJob(selectedJob.id, cleanData);
      toast.success("Job updated successfully!");
      setJobDetailsMode('view');
      await loadJobs(); // Refresh the job list
    } catch (err) {
      console.error('Job update error:', err);
      toast.error(`Failed to update job: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  const router = useRouter();

  useEffect(() => {
    const { job, details } = router.query || {};
    if (!details || !job) return;

    let cancelled = false;

    (async () => {
      // Try to find the job locally first
      let j = Array.isArray(jobs) ? jobs.find(x => String(x.id) === String(job)) : null;

      // If not found, fetch it (fallback)
      if (!j) {
        try {
          j = await api.getJobById(String(job)); // or api.apiFetch(`/jobs/${job}`).then(r => r.json())
        } catch {
          // ignore fetch error; you might show a toast if you want
        }
      }

      if (!cancelled && j) {
        openJobDetails(j);
      }
    })();

    return () => { cancelled = true; };
  }, [router.query?.job, router.query?.details, jobs]);

  // Initial load (jobs)
  useEffect(() => {
    // safety: ensure page is scrollable on mount
    document.body.style.overflow = "";
    const timer = setTimeout(() => {
      loadJobs();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Debounced search suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showSuggestions) fetchSearchSuggestions(searchTerm);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchTerm, showSuggestions]);

  // Reload jobs when search/filter params change
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      loadJobs(1);
    }, 300);
    return () => clearTimeout(delayedSearch);
  }, [searchTerm, sortBy, sortOrder, locationFilter, remoteTypeFilter]);

  // --- Robust parsing for display-only (no DB writes) ---
  function parseJobForDisplay(job) {
    const rawDesc = (job?.description || "").replace(/\r/g, "");
    const existingReqs = Array.isArray(job?.requirements) ? [...job.requirements] : [];
    const existingSkills = Array.isArray(job?.skills) ? [...job.skills] : [];

    const reqHeaders = [
      "requirements",
      "minimum requirements",
      "must have",
      "nice to have",
      "qualifications",
      "about you",
      "what you'll need",
      "what you bring",
    ];

    const skillHeaders = [
      "skills",
      "required skills",
      "preferred skills",
      "nice to have skills",
      "technical skills",
      "tech stack",
      "technology stack",
      "our stack",
      "stack",
    ];

    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const reqHeaderRe = new RegExp(`^\\s*(?:${reqHeaders.map(esc).join("|")})\\s*:?\\s*$`, "i");
    const skillHeaderRe = new RegExp(`^\\s*(?:${skillHeaders.map(esc).join("|")})\\s*:?\\s*$`, "i");
    const skillInlineRe = new RegExp(`^\\s*(?:${skillHeaders.map(esc).join("|")})\\s*:\\s*(.+)$`, "i");

    const isBullet = (s) => /^\s*(?:[-–—•·*]|\d+\.)\s+/.test(s);
    const normalizeBullet = (s) => s.replace(/^\s*(?:[-–—•·*]|\d+\.)\s+/, "").trim();

    const cleanToken = (s) =>
      s.replace(/^[•\-–—·*\s]+/, "")
        .replace(/[.,;:()\s]+$/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const tokenizeSkillList = (s) => {
      const parts = s.split(/[,\|/•·]+/).map(cleanToken).filter(Boolean);
      return parts.filter((t) => t.split(/\s+/).length <= 4 && !/[.!?]$/.test(t));
    };

    const looksLikeRequirementLine = (s) => {
      const t = s.trim();
      if (!t) return false;
      if (t.length > 220) return false;
      if (/\.\s*[A-Z]/.test(t)) return false;
      return true;
    };

    const lines = rawDesc.split("\n");
    const descOut = [];
    const foundReqs = [];
    const foundSkills = [];

    let inReqBlock = false;
    let inSkillsBlock = false;
    let lastPushed = "";

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const line = raw.replace(/\*\*/g, "");

      if (reqHeaderRe.test(line)) { inReqBlock = true; inSkillsBlock = false; continue; }
      if (skillHeaderRe.test(line)) { inSkillsBlock = true; inReqBlock = false; continue; }

      const mInline = line.match(skillInlineRe);
      if (mInline && mInline[1]) { foundSkills.push(...tokenizeSkillList(mInline[1])); continue; }

      if (inReqBlock) {
        if (isBullet(line)) { foundReqs.push(normalizeBullet(line)); continue; }
        if (skillHeaderRe.test(line)) { inReqBlock = false; inSkillsBlock = true; continue; }
        if (line.trim() === "") { inReqBlock = false; continue; }
        if (looksLikeRequirementLine(line)) { foundReqs.push(cleanToken(line)); continue; }
        inReqBlock = false;
      }

      if (inSkillsBlock) {
        if (isBullet(line)) { foundSkills.push(cleanToken(normalizeBullet(line))); continue; }
        if (line.trim() === "") { inSkillsBlock = false; continue; }
        const maybeList = tokenizeSkillList(line);
        if (maybeList.length >= 2) { foundSkills.push(...maybeList); continue; }
        inSkillsBlock = false;
      }

      const trimmed = raw.trimEnd();
      if (trimmed !== lastPushed) { descOut.push(trimmed); lastPushed = trimmed; }
    }

    const cleanDescription = descOut.join("\n").replace(/\n{3,}/g, "\n\n").trim();

    const canon = (s) => s.replace(/\s+/g, " ").replace(/[.,;:)\]\s]+$/g, "").toLowerCase().trim();
    const pretty = (s) => s.replace(/\s+/g, " ").replace(/[.,;:)\]\s]+$/g, "").trim();

    const reqMap = new Map();
    [...existingReqs, ...foundReqs].filter(Boolean).forEach((s) => {
      const key = canon(String(s));
      if (!key) return;
      if (!reqMap.has(key)) reqMap.set(key, pretty(String(s)));
    });

    const skillMap = new Map();
    [...existingSkills, ...foundSkills].filter(Boolean).forEach((s) => {
      const key = canon(String(s));
      if (!key) return;
      if (!skillMap.has(key)) skillMap.set(key, pretty(String(s)));
    });

    return {
      cleanDescription,
      requirements: Array.from(reqMap.values()),
      skills: Array.from(skillMap.values()),
    };
  }

  // --- UI fallback for missing locations (grabs "Location: ..." from text) ---
  function displayLocation(job) {
    const loc = (job?.location || "").trim();
    if (loc) return loc;

    const source = (job?.description || "") + "\n" + (job?.company_name || "");
    const m = source.match(/(?:^|\n)\s*Location\s*:\s*([^\n]+)\n?/i);
    if (m && m[1]) return m[1].trim();

    return "Not specified";
  }

  return (
    <AuthGuard>
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div>
                <h1 className="text-3xl font-bold text-slate-200">Job Board</h1>
                <p className="text-slate-400 mt-1">Discover and track amazing opportunities</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-400">
                  {pagination.total} job{pagination.total !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Job Creation Card (Manual only) */}
            <Card className="glass-card glass-rose">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <h2 className="text-xl font-semibold text-slate-200">Add New Job</h2>
                  </div>
                </div>

                {/* Manual Entry - Free Feature */}
                <div className="p-4 border-2 border-dashed border-blue-500/30 bg-blue-900/20 rounded-lg hover:border-blue-400/50 transition-all backdrop-blur-sm">
                  <div className="flex items-center space-x-2 mb-2">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <h3 className="font-semibold text-slate-200">Manual Entry</h3>
                  </div>
                  <p className="text-sm text-slate-400 mb-3">
                    Enter job details manually with our user-friendly form
                  </p>
                  <Button
                    onClick={() => setShowJobModal(true)}
                    variant="outline"
                    className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Create Job Manually
                  </Button>
                </div>
              </div>
            </Card>

            {/* Job Creation Modal (Manual only) */}
            <Modal
              isOpen={showJobModal}
              onClose={() => { setShowJobModal(false); resetJobForm(); }}
              title="Create Job Manually"
              size="xl"
            >
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="section">
                  <h3 className="modal-title text-base mb-3">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="field-label">Job Title *</label>
                      <Input
                        value={manualJobData.title}
                        onChange={e => setManualJobData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Senior Software Engineer"
                        required
                        className="text-sm font-medium text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="field-label">Company Name *</label>
                      <Input
                        value={manualJobData.company_name}
                        onChange={e => setManualJobData(prev => ({ ...prev, company_name: e.target.value }))}
                        placeholder="Amazing Tech Corp"
                        required
                        className="text-sm font-medium text-slate-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Source URL */}
                <div className="section">
                  <div>
                    <label className="field-label">Job Posting URL (Optional)</label>
                    <Input
                      value={manualJobData.source_url}
                      onChange={e => setManualJobData(prev => ({ ...prev, source_url: e.target.value }))}
                      placeholder="https://company.com/careers/job-posting"
                      className="text-sm font-medium text-slate-100"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Link to the original job posting for reference
                    </p>
                  </div>
                </div>

                {/* Job Details */}
                <div className="section">
                  <h3 className="modal-title text-base mb-3">Job Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="field-label">Location</label>
                      <Input
                        value={manualJobData.location}
                        onChange={e => setManualJobData(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="San Francisco, CA"
                        className="text-sm font-medium text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="field-label">Remote Type</label>
                      <Select
                        value={manualJobData.remote_type}
                        onChange={e => setManualJobData(prev => ({ ...prev, remote_type: e.target.value }))}
                        className="text-sm font-medium text-slate-100"
                      >
                        <option value="On-site">On-site</option>
                        <option value="Remote">Remote</option>
                        <option value="Hybrid">Hybrid</option>
                      </Select>
                    </div>
                    <div>
                      <label className="field-label">Job Type</label>
                      <Select
                        value={manualJobData.job_type}
                        onChange={e => setManualJobData(prev => ({ ...prev, job_type: e.target.value }))}
                        className="text-sm font-medium text-slate-100"
                      >
                        <option value="Full-time">Full-time</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Contract">Contract</option>
                        <option value="Internship">Internship</option>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="section">
                  <h3 className="modal-title text-base mb-3">Job Description</h3>
                  <div>
                    <Textarea
                      rows={6}
                      value={manualJobData.description}
                      onChange={e => setManualJobData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe the role, responsibilities, and what makes this opportunity exciting..."
                      className="w-full text-sm font-medium text-slate-100"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Use line breaks for better formatting. Bullet points (•, -, *) will be formatted automatically.
                    </p>
                  </div>
                </div>

                {/* Requirements */}
                <div className="section">
                  <h3 className="modal-title text-base mb-3">Requirements</h3>
                  <div>
                    <Textarea
                      rows={4}
                      value={manualJobData.requirements.join('\n\n')}
                      onChange={e => handleArrayInput('requirements', e.target.value)}
                      placeholder="5+ years of experience in software development&#10;Strong knowledge of React and Node.js&#10;Experience with cloud platforms (AWS, GCP, Azure)"
                      className="w-full text-sm font-medium text-slate-100"
                    />
                  </div>
                </div>

                {/* Skills */}
                <div className="section">
                  <h3 className="modal-title text-base mb-3">Required Skills</h3>
                  <div>
                    <Textarea
                      rows={3}
                      value={manualJobData.skills.join('\n')}
                      onChange={e => handleArrayInput('skills', e.target.value)}
                      placeholder="JavaScript&#10;React&#10;Node.js&#10;PostgreSQL&#10;Docker"
                      className="w-full text-sm font-medium text-slate-100"
                    />
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => { setShowJobModal(false); resetJobForm(); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleManualJobSave}
                    loading={loading}
                    disabled={!manualJobData.title || !manualJobData.company_name}
                  >
                    💾 Save Job
                  </Button>
                </div>
              </div>
            </Modal>

            {/* Job Details/Edit Modal */}
            <Modal
              isOpen={showJobDetailsModal}
              onClose={closeJobDetails}
              title={jobDetailsMode === 'view' ? "Job Details" : "Edit Job"}
              size="xl"
            >
              {selectedJob && (
                <div className="space-y-6">
                  {/* Job Header */}
                  <div className="pb-4">
                    <div className="flex justify-between items-start">
                      {/* Title */}
                      {jobDetailsMode === 'view' ? (
                        <h2 className="text-2xl font-bold text-slate-100">{selectedJob.title}</h2>
                      ) : (
                        <div className="mt-0">
                          <Input
                            value={editJobData?.title || ''}
                            onChange={(e) => setEditJobData(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Job Title"
                            className="text-2xl font-bold border-0 p-0 focus:ring-0"
                          />
                        </div>
                      )}

                      {/* Company name */}
                      {jobDetailsMode === 'view' ? (
                        <p className="text-lg text-slate-300 mt-1">{selectedJob.company_name}</p>
                      ) : (
                        <div className="text-lg mt-1">
                          <Input
                            value={editJobData?.company_name || ''}
                            onChange={(e) => setEditJobData(prev => ({ ...prev, company_name: e.target.value }))}
                            placeholder="Company Name"
                            className="text-lg border-0 p-0 focus:ring-0"
                          />
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        {jobDetailsMode === 'view' ? (
                          <Button
                            onClick={switchToEditMode}
                            variant="outline"
                            size="sm"
                            className="text-blue-600 border-blue-200"
                            type="button"
                          >
                            <span className="mr-1">✏️</span>
                            Edit
                          </Button>
                        ) : (
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => setJobDetailsMode('view')}
                              variant="outline"
                              size="sm"
                              type="button"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={saveJobChanges}
                              disabled={loading}
                              size="sm"
                              className="bg-blue-600 text-white"
                              type="button"
                            >
                              Save Changes
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="soft-divider my-2" />

                  {/* Job Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Location */}
                    <div className="section">
                      <label className="field-label">
                        Location
                      </label>
                      {jobDetailsMode === 'view' ? (
                        <p className="field-value-quiet">{displayLocation(selectedJob)}</p>
                      ) : (
                        <Input
                          value={editJobData?.location || ''}
                          onChange={(e) => setEditJobData(prev => ({ ...prev, location: e.target.value }))}
                          placeholder="Location"
                          className="text-sm font-medium text-slate-100"
                        />
                      )}
                    </div>

                    {/* Remote Type */}
                    <div className="section">
                      <label className="field-label">
                        Work Type
                      </label>
                      {jobDetailsMode === 'view' ? (
                        <p className="field-value-quiet">{selectedJob.remote_type || 'On-site'}</p>
                      ) : (
                        <Select
                          value={editJobData?.remote_type || 'On-site'}
                          onChange={(e) => setEditJobData(prev => ({ ...prev, remote_type: e.target.value }))}
                          className="text-sm font-medium text-slate-100"
                        >
                          <option value="On-site">On-site</option>
                          <option value="Remote">Remote</option>
                          <option value="Hybrid">Hybrid</option>
                        </Select>
                      )}
                    </div>

                    {/* Job Type */}
                    <div className="section">
                      <label className="field-label">
                        Job Type
                      </label>
                      {jobDetailsMode === 'view' ? (
                        <p className="field-value-quiet">{selectedJob.job_type || 'Full-time'}</p>
                      ) : (
                        <Select
                          value={editJobData?.job_type || 'Full-time'}
                          onChange={(e) => setEditJobData(prev => ({ ...prev, job_type: e.target.value }))}
                          className="text-sm font-medium text-slate-100"
                        >
                          <option value="Full-time">Full-time</option>
                          <option value="Part-time">Part-time</option>
                          <option value="Contract">Contract</option>
                          <option value="Internship">Internship</option>
                        </Select>
                      )}
                    </div>
                  </div>

                  {/* Source URL */}
                  <div className="section">
                    <label className="field-label">
                      Source URL
                    </label>
                    {jobDetailsMode === 'view' ? (
                      selectedJob.source_url ? (
                        <a
                          href={selectedJob.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-blue-400 hover:text-blue-300 underline break-all"
                        >
                          {selectedJob.source_url}
                        </a>
                      ) : (
                        <p className="field-empty">No source URL provided</p>
                      )
                    ) : (
                      <Input
                        type="url"
                        value={editJobData?.source_url || ''}
                        onChange={(e) => setEditJobData(prev => ({ ...prev, source_url: e.target.value }))}
                        placeholder="https://..."
                        className="text-sm font-medium text-slate-100"
                      />
                    )}
                  </div>

                  {/* Description */}
                  <div className="section">
                    <label className="field-label">Description</label>
                    {jobDetailsMode === 'view' ? (
                      <div className="card-subtle">
                        {selectedJob?.description ? (
                          (() => {
                            const parsed = parseJobForDisplay(selectedJob);
                            return parsed.cleanDescription
                              ? <pre className="job-desc whitespace-pre-wrap break-words">{parsed.cleanDescription}</pre>
                              : <p className="text-slate-500 italic">No description provided</p>;
                          })()
                        ) : (
                          <p className="text-slate-500 italic">No description provided</p>
                        )}
                      </div>
                    ) : (
                      <Textarea
                        value={editJobData?.description || ''}
                        onChange={(e) => setEditJobData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Job description…"
                        rows={6}
                        className="text-sm font-medium text-slate-100"
                      />
                    )}
                  </div>

                  {/* Requirements */}
                  <div className="section">
                    <label className="field-label">Requirements</label>
                    {(() => {
                      const parsed = parseJobForDisplay(selectedJob);

                      const canon = (s) => s.replace(/\s+/g, " ").replace(/[.,;:)\]\s]+$/g, "").toLowerCase().trim();
                      const pretty = (s) => s.replace(/\s+/g, " ").replace(/[.,;:)\]\s]+$/g, "").trim();
                      const dedupe = (arr) => Array.from(new Map(arr.filter(Boolean).map(s => [canon(s), pretty(s)])).values());

                      const base = Array.isArray(selectedJob?.requirements) ? selectedJob.requirements : [];
                      const reqs = dedupe([...(base || []), ...(parsed.requirements || [])]);

                      return reqs.length ? (
                        <ul className="list-disc list-inside space-y-1">
                          {reqs.map((req, i) => <li key={i} className="text-sm font-medium text-slate-100">{req}</li>)}
                        </ul>
                      ) : (
                        <p className="text-slate-500 italic">No requirements specified</p>
                      );
                    })()}
                  </div>
                  {/* Skills */}
                  <div className="section">
                    <label className="field-label">Required Skills</label>
                    {(() => {
                      const parsed = parseJobForDisplay(selectedJob);

                      const canon = (s) => s.replace(/\s+/g, " ").replace(/[.,;:)\]\s]+$/g, "").toLowerCase().trim();
                      const pretty = (s) => s.replace(/\s+/g, " ").replace(/[.,;:)\]\s]+$/g, "").trim();
                      const dedupe = (arr) => Array.from(new Map(arr.filter(Boolean).map(s => [canon(s), pretty(s)])).values());

                      const base = Array.isArray(selectedJob?.skills) ? selectedJob.skills : [];
                      const skills = dedupe([...(base || []), ...(parsed.skills || [])]);

                      return skills.length ? (
                        <div className="flex flex-wrap gap-2">
                          {skills.map((s, i) => (
                            <span key={i} className="bg-blue-900/50 text-blue-200 px-2 py-1 rounded-full text-sm font-medium border border-blue-500/30">
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500 italic">No skills specified</p>
                      );
                    })()}
                  </div>

                  <div className="soft-divider my-2" />

                  {/* Job Metadata */}
                  <div className="pt-4">
                    <div className="text-sm text-gray-500">
                      <p>Created: {new Date(selectedJob.created_at).toLocaleDateString()}</p>
                      {selectedJob.source_url && (
                        <p className="mt-1">Source: Job posting URL</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Modal>

            {/* Search & Filter */}
            <Card className="glass-card glass-amber">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">🔍</span>
                  <h2 className="text-xl font-semibold text-slate-100">Search & Filter Jobs</h2>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Input
                    placeholder="Search jobs by title, company, or description..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="w-full input-glass input-amber"
                    icon={<span>🔍</span>}
                  />

                  {/* Search Suggestions Dropdown */}
                  {showSuggestions && searchSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 dropdown-light max-h-60 overflow-y-auto">
                      {searchSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          className="w-full text-left item"
                          onMouseDown={() => {
                            setSearchTerm(suggestion);
                            setShowSuggestions(false);
                          }}
                        >
                          <span className="text-slate-300 dark:text-gray-200">{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 *:min-w-0">
                  <Input
                    placeholder="Location (e.g., Remote, NYC...)"
                    value={locationFilter}
                    onChange={e => setLocationFilter(e.target.value)}
                    icon={<span>📍</span>}
                    className="input-glass input-amber"
                  />

                  <Select
                    value={remoteTypeFilter}
                    onChange={e => setRemoteTypeFilter(e.target.value)}
                    className="input-glass input-amber"
                  >
                    <option value="">All Types</option>
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="On-site">On-site</option>
                  </Select>

                  <Select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="input-glass input-amber"
                  >
                    <option value="created_at">Date Posted</option>
                    <option value="title">Job Title</option>
                  </Select>

                  <Select
                    value={sortOrder}
                    onChange={e => setSortOrder(e.target.value)}
                    className="input-glass input-amber"
                  >
                    <option value="desc">Newest First</option>
                    <option value="asc">Oldest First</option>
                  </Select>
                </div>

                {/* Results Summary */}
                <div className="flex items-center justify-between pt-2 border-t gap-2 *:min-w-0">
                  <p className="text-sm text-slate-300 dark:text-gray-400">
                    Showing {jobs.length} of {pagination.total} job{pagination.total !== 1 ? 's' : ''}{searchTerm && ` for "${searchTerm}"`}
                  </p>
                  {(searchTerm || locationFilter || remoteTypeFilter) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchTerm('');
                        setLocationFilter('');
                        setRemoteTypeFilter('');
                      }}
                      type="button"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Available Jobs Header */}
            <div>
              <h2 className="text-2xl font-bold text-slate-200">Available Jobs</h2>
              <p className="text-slate-400 mt-1">Discover and apply to amazing opportunities</p>
            </div>

            {/* Jobs Grid */}
            {loading ? (
              <div className="space-y-6">
                {[...Array(3)].map((_, index) => (
                  <Card key={index} className="animate-pulse">
                    <div className="flex justify-between items-start space-x-4">
                      <div className="flex-1 space-y-3">
                        <div className="space-y-2">
                          <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
                          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3"></div>
                        </div>
                        <div className="space-y-2">
                          <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-full"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-5/6"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-4/6"></div>
                        </div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="h-8 w-16 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <Card className="text-center py-12">
                <div className="space-y-4">
                  <div className="text-6xl">📋</div>
                  <h3 className="text-xl font-semibold text-slate-100 dark:text-gray-100">No jobs found</h3>
                  <p className="text-slate-300 dark:text-gray-400">
                    {searchTerm ? "Try adjusting your search terms" : "Start by adding your first job!"}
                  </p>
                </div>
              </Card>
            ) : (
              <div className="grid gap-6">
                {jobs.map((job, index) => {
                  const parsedJob = parseJobForDisplay(job);
                  const isExpanded = expandedJobs.has(job.id);
                  const descriptionLines = parsedJob.cleanDescription.split('\n').filter(line => line.trim());
                  const shouldShowReadMore = descriptionLines.length > 3;

                  return (
                    <Card
                      key={job.id}
                      className="glass-card group hover:border-white/20 transition-all duration-300 animate-slideIn overflow-hidden"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {/* Job Header */}
                      <div className="flex justify-between items-start space-x-4 mb-4">
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-3 mb-2 *:min-w-0">
                            <h3 className="text-xl font-bold text-slate-100 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight truncate">
                              {job.title}
                            </h3>
                            <div className="flex items-center space-x-2 ml-4">
                              {job.remote_type && (
                                <span
                                  className={`chip ${job.remote_type === 'Remote' ? 'chip-cyan' :
                                    job.remote_type === 'Hybrid' ? 'chip-amber' : 'chip-rose'
                                    }`}
                                >
                                  {job.remote_type}
                                </span>
                              )}
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                {new Date(job.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          {/* Company and Location */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-300 dark:text-gray-400 mb-3">
                            {job.company_name && (
                              <div className="flex items-center">
                                <span className="mr-1">🏢</span>
                                <span className="font-medium text-indigo-600 dark:text-indigo-400">{job.company_name}</span>
                              </div>
                            )}
                            {job.location && (
                              <div className="flex items-center">
                                <span className="mr-1">📍</span>
                                <span>{job.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Job Description */}
                      {parsedJob.cleanDescription && (
                        <div className="mb-4">
                          <div className="text-slate-300 dark:text-gray-300 text-sm leading-relaxed break-words">
                            {(isExpanded ? descriptionLines : descriptionLines.slice(0, 3)).map((line, idx) => (
                              <div key={idx} className={line.startsWith('•') ? 'ml-4 mb-1' : 'mb-2'}>
                                {line}
                              </div>
                            ))}
                            {shouldShowReadMore && (
                              <button
                                onClick={() => toggleJobExpanded(job.id)}
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-slate-300 text-sm font-medium transition-colors mt-2"
                                type="button"
                              >
                                {isExpanded ? '...read less' : '...read more'}
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Skills Tags */}
                      {parsedJob.skills && parsedJob.skills.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {parsedJob.skills.slice(0, 5).map((skill, idx) => (
                            <span key={idx} className="chip chip-cyan">
                              {skill}
                            </span>
                          ))}
                          {parsedJob.skills.length > 5 && (
                            <span className="chip text-slate-300 bg-white/10 border border-white/15">
                              +{parsedJob.skills.length - 5} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Requirements Preview (if expanded) */}
                      {isExpanded && parsedJob.requirements && parsedJob.requirements.length > 0 && (
                        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <h4 className="text-sm font-medium text-slate-100 dark:text-gray-100 mb-2">Requirements:</h4>
                          <ul className="text-sm text-slate-300 dark:text-gray-300 space-y-1">
                            {parsedJob.requirements.slice(0, 3).map((req, idx) => (
                              <li key={idx} className="flex items-start">
                                <span className="text-indigo-500 dark:text-indigo-400 mr-2">•</span>
                                <span>{req}</span>
                              </li>
                            ))}
                            {parsedJob.requirements.length > 3 && (
                              <li className="text-gray-500 dark:text-gray-400 italic">
                                ...and {parsedJob.requirements.length - 3} more requirements
                              </li>
                            )}
                          </ul>
                        </div>
                      )}

                      {/* Job Actions */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-600">
                        <div className="flex items-center space-x-3">
                          {job.source_url && (
                            <>
                              <a
                                href={job.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors inline-flex items-center"
                              >
                                <span className="mr-1">🔗</span>
                                View Original
                              </a>
                              <button
                                onClick={() => {
                                  const url = job.source_url?.trim();
                                  if (!url) return;
                                  if (navigator.share) {
                                    navigator.share({
                                      title: `${job.title} at ${job.company_name}`,
                                      text: `Check out this job opportunity: ${job.title} at ${job.company_name}`,
                                      url
                                    }).catch(err => console.log('Error sharing:', err));
                                  } else {
                                    const shareText = `${job.title} at ${job.company_name}\n${url}`;
                                    navigator.clipboard.writeText(shareText).then(() => {
                                      toast.success("Job details copied to clipboard!");
                                    }).catch(() => {
                                      toast.error("Failed to copy to clipboard");
                                    });
                                  }
                                }}
                                className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center"
                                type="button"
                              >
                                <span className="mr-1">📤</span>
                                Share
                              </button>
                            </>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={() => openJobDetails(job)}
                            variant="outline"
                            size="sm"
                            className="btn-ghost"
                            type="button"
                          >
                            <span className="mr-1">👁️</span> View Details
                          </Button>
                          <Button
                            onClick={() => openApply(job)}
                            size="sm"
                            className="btn-orchid"
                            type="button"
                          >
                            <span className="mr-1">📝</span> Apply Now
                          </Button>
                          <Button
                            onClick={() => deleteJob(job.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 border-red-800/50 hover:border-red-700/50"
                            type="button"
                          >
                            <span className="mr-1">🗑️</span> Delete
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
            {/* ================= Apply Modal ================= */}
            <Modal
              isOpen={showApplyModal}
              onClose={() => { setShowApplyModal(false); setApplyTargetJob(null); }}
              title={applyTargetJob ? `Apply to ${applyTargetJob.title || 'Job'}` : "Apply"}
              size="xl"
            >
              <div className="space-y-5">
                {/* Job summary */}
                {applyTargetJob && (
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="font-semibold text-slate-100">{applyTargetJob.title}</span>
                      {applyTargetJob.company_name && <span className="text-slate-400">• {applyTargetJob.company_name}</span>}
                      {applyTargetJob.location && <span className="text-slate-400">• {applyTargetJob.location}</span>}
                    </div>
                  </div>
                )}

                {/* Tabs */}
                <div className="flex gap-2">
                  <Button
                    variant={applyTab === 'select' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setApplyTab('select')}
                  >
                    📂 Choose from My Documents
                  </Button>
                  <Button
                    variant={applyTab === 'upload' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setApplyTab('upload')}
                  >
                    ⬆️ Upload Now
                  </Button>
                  <Button
                    variant={applyTab === 'none' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setApplyTab('none')}
                  >
                    🚫 Apply without files
                  </Button>
                </div>

                {/* SELECT EXISTING */}
                {applyTab === 'select' && (
                  <div className="space-y-4">
                    {applyDocsLoading ? (
                      <div className="text-slate-400">Loading your documents…</div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <label className="text-sm text-slate-300">Filter by type</label>
                          <Select value={filterType} onChange={e => setFilterType(e.target.value)} className="max-w-xs">
                            <option value="">All</option>
                            {DOC_TYPES.map(t => <option key={t} value={t}>{typeLabel(t)}</option>)}
                          </Select>
                        </div>

                        <div className="max-h-64 overflow-y-auto rounded-lg border border-white/10">
                          {applyAllDocs
                            .filter(d => !filterType || d.document_type === filterType)
                            .map((d) => {
                              const checked = selectedDocIds.has(String(d.id));
                              return (
                                <label
                                  key={d.id}
                                  className={`flex items-center justify-between p-3 border-b border-white/10 cursor-pointer ${checked ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                >
                                  <div className="min-w-0 pr-3">
                                    <div className="text-slate-100 font-medium truncate">{docDisplayName(d)}</div>
                                    <div className="text-xs text-slate-400">
                                      {typeLabel(d.document_type)} • {String(d.format || '').toUpperCase()} • {d.created_at ? new Date(d.created_at).toLocaleDateString() : '-'}
                                    </div>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const id = String(d.id);
                                      setSelectedDocIds(prev => {
                                        const next = new Set(prev);
                                        e.target.checked ? next.add(id) : next.delete(id);
                                        return next;
                                      });
                                    }}
                                    className="w-4 h-4"
                                  />
                                </label>
                              );
                            })}
                          {!applyAllDocs.length && (
                            <div className="p-3 text-slate-400 text-sm">No documents found. Try the “Upload now” tab.</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}


                {/* UPLOAD NOW */}
                {applyTab === 'upload' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-slate-300">Pick files</label>
                      <input
                        type="file"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          setPendingUploads((prev) => [
                            ...prev,
                            ...files.map((file) => ({ file, type: 'resume' })) // default; user can change per file below
                          ]);
                        }}
                      />
                    </div>

                    {/* Per-file type selection */}
                    <div className="rounded-lg border border-white/10 divide-y divide-white/10">
                      {pendingUploads.map((u, i) => (
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
                                setPendingUploads((prev) => {
                                  const next = [...prev];
                                  next[i] = { ...next[i], type: val };
                                  return next;
                                });
                              }}
                              className="bg-transparent border border-white/20 rounded px-2 py-1 text-sm"
                            >
                              {DOC_TYPES.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
                            </select>
                            <button
                              type="button"
                              onClick={() => setPendingUploads((prev) => prev.filter((_, idx) => idx !== i))}
                              className="text-red-300 hover:text-red-200"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                      {!pendingUploads.length && (
                        <div className="p-3 text-slate-400 text-sm">No files selected.</div>
                      )}
                    </div>
                  </div>
                )}



                {/* NONE */}
                {applyTab === 'none' && (
                  <div className="p-4 rounded-lg bg-amber-900/20 border border-amber-500/30 text-amber-100">
                    You’re about to create an application without attaching any files. You can attach or upload files later from the
                    pipeline.
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-between items-center pt-2">
                  <div className="text-xs text-slate-400">
                    {applyTab === 'select' && "Tip: You can keep one or both selections empty if you switch to 'No files'."}
                    {applyTab === 'upload' && "Only the files you pick will be uploaded and attached."}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => { setShowApplyModal(false); setApplyTargetJob(null); }}
                      disabled={applying}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={submitApplyChoice}
                      loading={applying}
                      disabled={
                        applying ||
                        (applyTab === 'select' && selectedDocIds.size === 0) ||
                        (applyTab === 'upload' && pendingUploads.length === 0)
                      }

                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      {applyTab === 'none' ? 'Apply without files' : 'Create Application'}
                    </Button>
                  </div>
                </div>
              </div>
            </Modal>


            {/* Pagination Controls */}
            {pagination.pages > 1 && (
              <Card className="mt-8">
                <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                  <div className="text-sm text-slate-300 dark:text-gray-400">
                    Showing {((pagination.page - 1) * pagination.page_size) + 1} to{' '}
                    {Math.min(pagination.page * pagination.page_size, pagination.total)} of{' '}
                    {pagination.total} jobs
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => loadJobs(pagination.page - 1)}
                      disabled={!pagination.has_prev || loading}
                      variant="outline"
                      size="sm"
                      className="flex items-center"
                      type="button"
                    >
                      <span className="mr-1">←</span>
                      Previous
                    </Button>

                    <div className="flex items-center space-x-1">
                      {(() => {
                        const currentPage = pagination.page;
                        const totalPages = pagination.pages;
                        const pages = [];

                        if (currentPage > 3) {
                          pages.push(1);
                          if (currentPage > 4) pages.push('…');
                        }

                        for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
                          pages.push(i);
                        }

                        if (currentPage < totalPages - 2) {
                          if (currentPage < totalPages - 3) pages.push('…');
                          pages.push(totalPages);
                        }

                        return pages.map((page, index) =>
                          page === '…' ? (
                            <span key={`ellipsis-${index}`} className="px-2 py-1 text-gray-400 dark:text-gray-500">…</span>
                          ) : (
                            <Button
                              key={page}
                              onClick={() => loadJobs(page)}
                              disabled={loading}
                              variant={page === currentPage ? "default" : "outline"}
                              size="sm"
                              className="min-w-[2.5rem] h-8"
                              type="button"
                            >
                              {page}
                            </Button>
                          )
                        );
                      })()}
                    </div>

                    <Button
                      onClick={() => loadJobs(pagination.page + 1)}
                      disabled={!pagination.has_next || loading}
                      variant="outline"
                      size="sm"
                      className="flex items-center"
                      type="button"
                    >
                      Next
                      <span className="ml-1">→</span>
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
