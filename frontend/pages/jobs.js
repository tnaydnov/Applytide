import { useEffect, useState } from "react";
import { api, apiFetch } from "../lib/api";
import { Button, Card, Input, Textarea, Select, Modal } from "../components/ui";
import { useToast } from '../lib/toast';
import AuthGuard from "../components/AuthGuard";
import { PremiumBadge, usePremiumFeature } from "../components/PremiumFeature";

export default function JobsPage() {
  const { checkPremium, PremiumModal } = usePremiumFeature();
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    page_size: 12,
    pages: 1,
    has_next: false,
    has_prev: false
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [selectedResume, setSelectedResume] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [locationFilter, setLocationFilter] = useState("");
  const [remoteTypeFilter, setRemoteTypeFilter] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Job creation states
  const [showJobModal, setShowJobModal] = useState(false);
  const [jobCreationMode, setJobCreationMode] = useState(''); // 'ai' or 'manual'
  const [jobUrl, setJobUrl] = useState('');
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [manualJobData, setManualJobData] = useState({
    title: '',
    company_name: '',
    location: '',
    description: '',
    requirements: [],
    skills: [],
    benefits: [],
    salary_min: '',
    salary_max: '',
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

  const toast = useToast();

  // Load user info and check premium status
  async function loadCurrentUser() {
    try {
      const user = await api.getCurrentUser();
      setCurrentUser(user);
    } catch (err) {
      console.error('Failed to load user:', err);
    }
  }

  async function loadJobs(page = 1) { 
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pagination.page_size.toString(),
        sort: sortBy,
        order: sortOrder
      });
      
      if (searchTerm.trim()) {
        params.append('q', searchTerm.trim());
      }
      if (locationFilter.trim()) {
        params.append('location', locationFilter.trim());
      }
      if (remoteTypeFilter) {
        params.append('remote_type', remoteTypeFilter);
      }

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
      if (!err.message.includes('Auth expired') && !err.message.includes('Not authenticated')) {
        toast.error("Failed to load jobs");
      }
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadResumes() { 
    try {
      const response = await api.listResumes();
      const data = response.items || response;
      setResumes(data);
    } catch (err) {
      toast.error("Failed to load resumes");
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

  // Handle AI job analysis
  async function handleAiAnalyze() {
    if (!jobUrl.trim()) {
      toast.error("Please enter a job URL");
      return;
    }

    checkPremium(async () => {
      setAiAnalyzing(true);
      try {
        const analyzedJob = await api.aiAnalyzeJob(jobUrl);

        // Fill the manual form with AI results so the user can review/edit
        setManualJobData({
          title: analyzedJob.title || '',
          company_name: analyzedJob.company_name || '',
          location: analyzedJob.location || '',
          description: analyzedJob.description || '',
          requirements: analyzedJob.requirements || [],
          skills: analyzedJob.skills || [],
          benefits: analyzedJob.benefits || [],
          salary_min: analyzedJob.salary_min || '',
          salary_max: analyzedJob.salary_max || '',
          remote_type: analyzedJob.remote_type || 'On-site',
          job_type: analyzedJob.job_type || 'Full-time',
          source_url: jobUrl
        });

        setJobCreationMode('manual');
        toast.success("Job analyzed successfully! Review the details below.");
      } catch (err) {
        console.error('AI analysis failed:', err);
        toast.error(`AI analysis failed: ${err.message}`);
      } finally {
        setAiAnalyzing(false);
      }
    });
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

      if (manualJobData.salary_min && !isNaN(parseInt(manualJobData.salary_min))) {
        cleanData.salary_min = parseInt(manualJobData.salary_min);
      }
      if (manualJobData.salary_max && !isNaN(parseInt(manualJobData.salary_max))) {
        cleanData.salary_max = parseInt(manualJobData.salary_max);
      }

      if (manualJobData.requirements?.length) {
        cleanData.requirements = manualJobData.requirements.map(r => r.trim()).filter(Boolean);
      }
      if (manualJobData.skills?.length) {
        cleanData.skills = manualJobData.skills.map(s => s.trim()).filter(Boolean);
      }
      if (manualJobData.benefits?.length) {
        cleanData.benefits = manualJobData.benefits.map(b => b.trim()).filter(Boolean);
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
    setJobUrl('');
    setJobCreationMode('');
    setManualJobData({
      title: '',
      company_name: '',
      location: '',
      description: '',
      requirements: [],
      skills: [],
      benefits: [],
      salary_min: '',
      salary_max: '',
      remote_type: 'On-site',
      job_type: 'Full-time',
      source_url: ''
    });
  }

  async function createApplication(jobId) {
    try {
      const payload = { 
        job_id: jobId
      };
      if (selectedResume) payload.resume_id = selectedResume;
      await api.createApp(payload);
      toast.success("Application created! Check your pipeline.");
    } catch (err) { 
      toast.error(`Failed to create application: ${err.message || err}`);
    }
  }

  // Handle array inputs for skills, requirements, benefits
  function handleArrayInput(field, value) {
    setManualJobData(prev => ({ ...prev, [field]: value.split('\n') }));
  }

  // Format description with proper line breaks and bullet points
  function formatJobDescription(description) {
    if (!description) return '';
    
    return description
      .split('\n')
      .map(line => line.trim())
      .filter(line => line)
      .map(line => {
        // Convert bullet points to proper format
        if (line.startsWith('*') || line.startsWith('-') || line.startsWith('•')) {
          return `• ${line.slice(1).trim()}`;
        }
        return line;
      })
      .join('\n');
  }

  // Parse job data for display (extract clean description and metadata)
  function parseJobForDisplay(job) {
    if (!job.description) {
      return {
        cleanDescription: '',
        requirements: [],
        skills: [],
        benefits: []
      };
    }

    let cleanDescription = job.description;
    const requirements = [];
    const skills = [];
    const benefits = [];

    // Extract and remove requirements section
    const reqMatch = job.description.match(/\*\*Requirements:\*\*\n(.*?)(?=\n\n\*\*|$)/s);
    if (reqMatch) {
      const reqText = reqMatch[1];
      reqText.split('\n').forEach(req => {
        const cleanReq = req.replace(/^• /, '').trim();
        if (cleanReq) requirements.push(cleanReq);
      });
      cleanDescription = cleanDescription.replace(/\n\n\*\*Requirements:\*\*\n.*?(?=\n\n\*\*|$)/s, '');
    }

    // Extract and remove skills section
    const skillsMatch = job.description.match(/\*\*Required Skills:\*\*\n(.*?)(?=\n\n\*\*|$)/s);
    if (skillsMatch) {
      const skillsText = skillsMatch[1];
      skillsText.split(',').forEach(skill => {
        const cleanSkill = skill.trim();
        if (cleanSkill) skills.push(cleanSkill);
      });
      cleanDescription = cleanDescription.replace(/\n\n\*\*Required Skills:\*\*\n.*?(?=\n\n\*\*|$)/s, '');
    }

    // Extract and remove benefits section
    const benefitsMatch = job.description.match(/\*\*Benefits:\*\*\n(.*?)(?=\n\n\*\*|$)/s);
    if (benefitsMatch) {
      const benefitsText = benefitsMatch[1];
      benefitsText.split('\n').forEach(benefit => {
        const cleanBenefit = benefit.replace(/^• /, '').trim();
        if (cleanBenefit) benefits.push(cleanBenefit);
      });
      cleanDescription = cleanDescription.replace(/\n\n\*\*Benefits:\*\*\n.*?(?=\n\n\*\*|$)/s, '');
    }

    return {
      cleanDescription: cleanDescription.trim(),
      requirements,
      skills,
      benefits
    };
  }

  // Toggle expanded state for job description
  function toggleJobExpanded(jobId) {
    setExpandedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  }

  function shareJob(job) {
    const url = job.source_url?.trim();
    if (!url) return; // nothing to share
    if (navigator.share) {
      navigator.share({
        title: `${job.title} at ${job.company_name}`,
        text: `Check out this job opportunity: ${job.title} at ${job.company_name}`,
        url
      }).catch(err => console.log('Error sharing:', err));
    } else {
      // Fallback: copy to clipboard
      const shareText = `${job.title} at ${job.company_name}\n${url}`;
      navigator.clipboard.writeText(shareText).then(() => {
        toast.success("Job details copied to clipboard!");
      }).catch(() => {
        toast.error("Failed to copy to clipboard");
      });
    }
  }

  // Job details/edit functions
  function openJobDetails(job) {
    setSelectedJob(job);
    setJobDetailsMode('view');
    
    // Parse requirements, skills, and benefits from description if they exist
    let requirements = [];
    let skills = [];
    let benefits = [];
    let cleanDescription = job.description || '';
    
    if (job.description) {
      // Extract requirements section
      const reqMatch = job.description.match(/\*\*Requirements:\*\*\n(.*?)(?=\n\n\*\*|$)/s);
      if (reqMatch) {
        requirements = reqMatch[1].split('\n').map(req => req.replace(/^• /, '').trim()).filter(req => req);
        cleanDescription = cleanDescription.replace(/\n\n\*\*Requirements:\*\*\n.*?(?=\n\n\*\*|$)/s, '');
      }
      
      // Extract skills section
      const skillsMatch = job.description.match(/\*\*Required Skills:\*\*\n(.*?)(?=\n\n\*\*|$)/s);
      if (skillsMatch) {
        skills = skillsMatch[1].split(',').map(skill => skill.trim()).filter(skill => skill);
        cleanDescription = cleanDescription.replace(/\n\n\*\*Required Skills:\*\*\n.*?(?=\n\n\*\*|$)/s, '');
      }
      
      // Extract benefits section
      const benefitsMatch = job.description.match(/\*\*Benefits:\*\*\n(.*?)(?=\n\n\*\*|$)/s);
      if (benefitsMatch) {
        benefits = benefitsMatch[1].split('\n').map(benefit => benefit.replace(/^• /, '').trim()).filter(benefit => benefit);
        cleanDescription = cleanDescription.replace(/\n\n\*\*Benefits:\*\*\n.*?(?=\n\n\*\*|$)/s, '');
      }
      
      // Clean up the description
      cleanDescription = cleanDescription.trim();
    }
    
    setEditJobData({
      title: job.title || '',
      company_name: job.company_name || '',
      location: job.location || '',
      description: cleanDescription,
      requirements: requirements,
      skills: skills,
      benefits: benefits,
      salary_min: job.salary_min || '',
      salary_max: job.salary_max || '',
      remote_type: job.remote_type || 'On-site',
      job_type: job.job_type || 'Full-time',
      source_url: job.source_url || ''
    });
    setShowJobDetailsModal(true);
  }

  function closeJobDetails() {
    setShowJobDetailsModal(false);
    setSelectedJob(null);
    setEditJobData(null);
    setJobDetailsMode('view');
  }

  function switchToEditMode() {
    setJobDetailsMode('edit');
  }

  async function saveJobChanges() {
    if (!selectedJob || !editJobData) return;

    setLoading(true);
    try {
      // Clean the data before sending
      const cleanData = {
        title: editJobData.title.trim(),
        company_name: editJobData.company_name.trim(),
      };

      // Only add optional fields if they have actual values
      if (editJobData.location && editJobData.location.trim()) {
        cleanData.location = editJobData.location.trim();
      }
      
      if (editJobData.remote_type && editJobData.remote_type !== 'On-site') {
        cleanData.remote_type = editJobData.remote_type;
      }
      
      if (editJobData.job_type && editJobData.job_type !== 'Full-time') {
        cleanData.job_type = editJobData.job_type;
      }
      
      if (editJobData.description && editJobData.description.trim()) {
        cleanData.description = editJobData.description.trim();
      }
      
      if (editJobData.source_url && editJobData.source_url.trim()) {
        cleanData.source_url = editJobData.source_url.trim();
      }
      
      // Only add salary if both values are provided and valid
      if (editJobData.salary_min && !isNaN(parseInt(editJobData.salary_min))) {
        cleanData.salary_min = parseInt(editJobData.salary_min);
      }
      
      if (editJobData.salary_max && !isNaN(parseInt(editJobData.salary_max))) {
        cleanData.salary_max = parseInt(editJobData.salary_max);
      }
      
      // Only add arrays if they have actual content
      if (editJobData.requirements && editJobData.requirements.length > 0) {
        cleanData.requirements = editJobData.requirements.filter(req => req.trim());
      }
      
      if (editJobData.skills && editJobData.skills.length > 0) {
        cleanData.skills = editJobData.skills.filter(skill => skill.trim());
      }
      
      if (editJobData.benefits && editJobData.benefits.length > 0) {
        cleanData.benefits = editJobData.benefits.filter(benefit => benefit.trim());
      }

      console.log('Updating job with data:', cleanData);

      // Call API to update job
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

  useEffect(() => { 
    const timer = setTimeout(() => {
      loadJobs(); 
      loadResumes(); 
      loadCurrentUser();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Debounced search suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showSuggestions) {
        fetchSearchSuggestions(searchTerm);
      }
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

  return (
    <AuthGuard>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Job Board</h1>
            <p className="text-gray-600 mt-1">Discover and track amazing opportunities</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {pagination.total} job{pagination.total !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Job Creation Card */}
        <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">✨</span>
                <h2 className="text-xl font-semibold text-gray-900">Add New Job</h2>
              </div>
              {currentUser?.is_premium && (
                <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium rounded-full">
                  PREMIUM
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* AI Analysis - Premium Feature */}
              {/* AI Analysis - Premium Feature */}
              <div className="p-6 border-2 border-dashed rounded-lg transition-all border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 hover:border-purple-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-lg">🤖</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">AI Job Analysis</h3>
                      <PremiumBadge size="sm" />
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">
                  Paste any job URL and let AI extract all the details automatically
                </p>
                
                <Button
                  onClick={() => checkPremium(() => setShowJobModal(true), "AI Job Analysis")}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium"
                >
                  🔗 Analyze Job URL
                </Button>
              </div>

              {/* Manual Entry - Free Feature */}
              <div className="p-4 border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg hover:border-blue-400 transition-all">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">✍️</span>
                  <h3 className="font-semibold text-gray-900">Manual Entry</h3>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    Free
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Enter job details manually with our user-friendly form
                </p>
                <Button
                  onClick={() => {
                    setJobCreationMode('manual');
                    setShowJobModal(true);
                  }}
                  className="w-full"
                  variant="outline"
                >
                  📝 Create Job Manually
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Job Creation Modal */}
        <Modal 
          isOpen={showJobModal} 
          onClose={() => {
            setShowJobModal(false);
            resetJobForm();
          }}
          title={jobCreationMode === 'ai' ? "AI Job Analysis" : "Create Job Manually"}
          size="lg"
        >
          <div className="space-y-6">
            {/* AI Analysis Mode */}
            {jobCreationMode === 'ai' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job URL
                  </label>
                  <Input
                    value={jobUrl}
                    onChange={e => setJobUrl(e.target.value)}
                    placeholder="https://company.com/jobs/software-engineer"
                    className="w-full"
                  />
                </div>
                <Button
                  onClick={handleAiAnalyze}
                  loading={aiAnalyzing}
                  disabled={!jobUrl.trim()}
                  className="w-full"
                >
                  {aiAnalyzing ? "🤖 Analyzing..." : "🔍 Analyze with AI"}
                </Button>
              </div>
            )}

            {/* Manual Creation Form */}
            {jobCreationMode === 'manual' && (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Job Title *"
                    value={manualJobData.title}
                    onChange={e => setManualJobData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Senior Software Engineer"
                    required
                  />
                  <Input
                    label="Company Name *"
                    value={manualJobData.company_name}
                    onChange={e => setManualJobData(prev => ({ ...prev, company_name: e.target.value }))}
                    placeholder="Amazing Tech Corp"
                    required
                  />
                </div>

                {/* Source URL */}
                <div>
                  <Input
                    label="Job Posting URL (Optional)"
                    value={manualJobData.source_url}
                    onChange={e => setManualJobData(prev => ({ ...prev, source_url: e.target.value }))}
                    placeholder="https://company.com/careers/job-posting"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Link to the original job posting for reference
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Location"
                    value={manualJobData.location}
                    onChange={e => setManualJobData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="San Francisco, CA"
                  />
                  <Select
                    label="Remote Type"
                    value={manualJobData.remote_type}
                    onChange={e => setManualJobData(prev => ({ ...prev, remote_type: e.target.value }))}
                  >
                    <option value="On-site">On-site</option>
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                  </Select>
                  <Select
                    label="Job Type"
                    value={manualJobData.job_type}
                    onChange={e => setManualJobData(prev => ({ ...prev, job_type: e.target.value }))}
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </Select>
                </div>

                {/* Salary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Minimum Salary"
                    type="number"
                    value={manualJobData.salary_min}
                    onChange={e => setManualJobData(prev => ({ ...prev, salary_min: e.target.value }))}
                    placeholder="120000"
                  />
                  <Input
                    label="Maximum Salary"
                    type="number"
                    value={manualJobData.salary_max}
                    onChange={e => setManualJobData(prev => ({ ...prev, salary_max: e.target.value }))}
                    placeholder="180000"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Description
                  </label>
                  <Textarea
                    rows={6}
                    value={manualJobData.description}
                    onChange={e => setManualJobData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the role, responsibilities, and what makes this opportunity exciting..."
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use line breaks for better formatting. Bullet points (•, -, *) will be formatted automatically.
                  </p>
                </div>

                {/* Requirements */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Requirements (one per line)
                  </label>
                  <Textarea
                    rows={4}
                    value={manualJobData.requirements.join('\n')}
                    onChange={e => handleArrayInput('requirements', e.target.value)}
                    placeholder="5+ years of experience in software development&#10;Strong knowledge of React and Node.js&#10;Experience with cloud platforms (AWS, GCP, Azure)"
                    className="w-full"
                  />
                </div>

                {/* Skills */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Required Skills (one per line)
                  </label>
                  <Textarea
                    rows={3}
                    value={manualJobData.skills.join('\n')}
                    onChange={e => handleArrayInput('skills', e.target.value)}
                    placeholder="JavaScript&#10;React&#10;Node.js&#10;PostgreSQL&#10;Docker"
                    className="w-full"
                  />
                </div>

                {/* Benefits */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Benefits & Perks (one per line)
                  </label>
                  <Textarea
                    rows={3}
                    value={manualJobData.benefits.join('\n')}
                    onChange={e => handleArrayInput('benefits', e.target.value)}
                    placeholder="Health, dental, and vision insurance&#10;401(k) with company matching&#10;Flexible work hours&#10;Professional development budget"
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowJobModal(false);
                  resetJobForm();
                }}
              >
                Cancel
              </Button>
              {jobCreationMode === 'manual' && (
                <Button
                  onClick={handleManualJobSave}
                  loading={loading}
                  disabled={!manualJobData.title || !manualJobData.company_name}
                >
                  💾 Save Job
                </Button>
              )}
            </div>
          </div>
        </Modal>

        {/* Job Details/Edit Modal */}
        <Modal 
          isOpen={showJobDetailsModal} 
          onClose={closeJobDetails}
          title={jobDetailsMode === 'view' ? "Job Details" : "Edit Job"}
          size="lg"
        >
          {selectedJob && (
            <div className="space-y-6">
              {/* Job Header */}
              <div className="border-b pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {jobDetailsMode === 'view' ? selectedJob.title : 
                        <Input
                          value={editJobData?.title || ''}
                          onChange={(e) => setEditJobData(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Job Title"
                          className="text-2xl font-bold border-0 p-0 focus:ring-0"
                        />
                      }
                    </h2>
                    <p className="text-lg text-gray-600 mt-1">
                      {jobDetailsMode === 'view' ? selectedJob.company_name :
                        <Input
                          value={editJobData?.company_name || ''}
                          onChange={(e) => setEditJobData(prev => ({ ...prev, company_name: e.target.value }))}
                          placeholder="Company Name"
                          className="text-lg border-0 p-0 focus:ring-0"
                        />
                      }
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {jobDetailsMode === 'view' ? (
                      <Button
                        onClick={switchToEditMode}
                        variant="outline"
                        size="sm"
                        className="text-blue-600 border-blue-200"
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
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={saveJobChanges}
                          disabled={loading}
                          size="sm"
                          className="bg-blue-600 text-white"
                        >
                          Save Changes
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Job Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  {jobDetailsMode === 'view' ? (
                    <p className="text-gray-900">{selectedJob.location || 'Not specified'}</p>
                  ) : (
                    <Input
                      value={editJobData?.location || ''}
                      onChange={(e) => setEditJobData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Location"
                    />
                  )}
                </div>

                {/* Remote Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Work Type
                  </label>
                  {jobDetailsMode === 'view' ? (
                    <p className="text-gray-900">{selectedJob.remote_type || 'On-site'}</p>
                  ) : (
                    <Select
                      value={editJobData?.remote_type || 'On-site'}
                      onChange={(e) => setEditJobData(prev => ({ ...prev, remote_type: e.target.value }))}
                    >
                      <option value="On-site">On-site</option>
                      <option value="Remote">Remote</option>
                      <option value="Hybrid">Hybrid</option>
                    </Select>
                  )}
                </div>

                {/* Job Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Type
                  </label>
                  {jobDetailsMode === 'view' ? (
                    <p className="text-gray-900">{selectedJob.job_type || 'Full-time'}</p>
                  ) : (
                    <Select
                      value={editJobData?.job_type || 'Full-time'}
                      onChange={(e) => setEditJobData(prev => ({ ...prev, job_type: e.target.value }))}
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Internship">Internship</option>
                    </Select>
                  )}
                </div>

                {/* Salary Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Salary Range
                  </label>
                  {jobDetailsMode === 'view' ? (
                    <p className="text-gray-900">
                      {selectedJob.salary_min || selectedJob.salary_max ? 
                        `$${selectedJob.salary_min || 'N/A'} - $${selectedJob.salary_max || 'N/A'}` : 
                        'Not specified'
                      }
                    </p>
                  ) : (
                    <div className="flex space-x-2">
                      <Input
                        type="number"
                        value={editJobData?.salary_min || ''}
                        onChange={(e) => setEditJobData(prev => ({ ...prev, salary_min: e.target.value }))}
                        placeholder="Min"
                      />
                      <Input
                        type="number"
                        value={editJobData?.salary_max || ''}
                        onChange={(e) => setEditJobData(prev => ({ ...prev, salary_max: e.target.value }))}
                        placeholder="Max"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Source URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source URL
                </label>
                {jobDetailsMode === 'view' ? (
                  selectedJob.source_url ? (
                    <a 
                      href={selectedJob.source_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline break-all"
                    >
                      {selectedJob.source_url}
                    </a>
                  ) : (
                    <p className="text-gray-500">No source URL provided</p>
                  )
                ) : (
                  <Input
                    type="url"
                    value={editJobData?.source_url || ''}
                    onChange={(e) => setEditJobData(prev => ({ ...prev, source_url: e.target.value }))}
                    placeholder="https://..."
                  />
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                {jobDetailsMode === 'view' ? (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {editJobData?.description ? (
                      <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                        {editJobData.description}
                      </pre>
                    ) : (
                      <p className="text-gray-500 italic">No description provided</p>
                    )}
                  </div>
                ) : (
                  <Textarea
                    value={editJobData?.description || ''}
                    onChange={(e) => setEditJobData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Job description..."
                    rows={6}
                  />
                )}
              </div>

              {/* Requirements */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Requirements
                </label>
                {jobDetailsMode === 'view' ? (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {editJobData?.requirements && editJobData.requirements.length > 0 ? (
                      <ul className="list-disc list-inside space-y-1">
                        {editJobData.requirements.map((req, index) => (
                          <li key={index} className="text-sm text-gray-700">{req}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 italic">No requirements specified</p>
                    )}
                  </div>
                ) : (
                  <Textarea
                    value={editJobData?.requirements?.join('\n') || ''}
                    onChange={(e) => setEditJobData(prev => ({
                      ...prev,
                      requirements: e.target.value.split('\n')
                    }))}
                    placeholder="5+ years of experience in software development&#10;Strong knowledge of React and Node.js&#10;Experience with cloud platforms"
                    rows={4}
                  />
                )}
              </div>

              {/* Skills */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Required Skills
                </label>
                {jobDetailsMode === 'view' ? (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {editJobData?.skills && editJobData.skills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {editJobData.skills.map((skill, index) => (
                          <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">No skills specified</p>
                    )}
                  </div>
                ) : (
                  <Textarea
                    value={editJobData?.skills?.join('\n') || ''}
                    onChange={(e) => setEditJobData(prev => ({
                      ...prev,
                      skills: e.target.value.split('\n')
                    }))}
                    placeholder="JavaScript&#10;React&#10;Node.js&#10;PostgreSQL&#10;Docker"
                    rows={3}
                  />
                )}
              </div>

              {/* Benefits */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Benefits & Perks
                </label>
                {jobDetailsMode === 'view' ? (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {editJobData?.benefits && editJobData.benefits.length > 0 ? (
                      <ul className="list-disc list-inside space-y-1">
                        {editJobData.benefits.map((benefit, index) => (
                          <li key={index} className="text-sm text-gray-700">{benefit}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 italic">No benefits specified</p>
                    )}
                  </div>
                ) : (
                  <Textarea
                    value={editJobData?.benefits?.join('\n') || ''}
                    onChange={(e) => setEditJobData(prev => ({
                      ...prev,
                      benefits: e.target.value.split('\n')
                    }))}
                    placeholder="Health, dental, and vision insurance&#10;401(k) with company matching&#10;Flexible work hours&#10;Professional development budget"
                    rows={3}
                  />
                )}
              </div>

              {/* Job Metadata */}
              <div className="border-t pt-4">
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

        {/* Resume Selection */}
        <Card>
          <div className="flex items-center space-x-4">
            <span className="text-lg">📄</span>
            <Select
              label="Default Resume for Applications"
              value={selectedResume}
              onChange={e => setSelectedResume(e.target.value)}
              className="flex-1"
            >
              <option value="">(No resume selected)</option>
              {Array.isArray(resumes) && resumes.map(r => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </Select>
          </div>
        </Card>

        {/* Enhanced Search and Filter */}
        <Card>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🔍</span>
              <h2 className="text-xl font-semibold text-gray-900">Search & Filter Jobs</h2>
            </div>
            
            {/* Search Bar */}
            <div className="relative">
              <Input
                placeholder="Search jobs by title, company, or description..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full"
                icon={<span>🔍</span>}
              />
              
              {/* Search Suggestions Dropdown */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                      onMouseDown={() => {
                        setSearchTerm(suggestion);
                        setShowSuggestions(false);
                      }}
                    >
                      <span className="text-gray-700">{suggestion}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                placeholder="Location (e.g., Remote, NYC...)"
                value={locationFilter}
                onChange={e => setLocationFilter(e.target.value)}
                icon={<span>📍</span>}
              />
              
              <Select
                value={remoteTypeFilter}
                onChange={e => setRemoteTypeFilter(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
              </Select>
              
              <Select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                <option value="created_at">Date Posted</option>
                <option value="title">Job Title</option>
                <option value="salary_min">Salary</option>
              </Select>
              
              <Select
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value)}
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </Select>
            </div>
            
            {/* Results Summary */}
            <div className="flex items-center justify-between pt-2 border-t">
              <p className="text-sm text-gray-600">
                Showing {jobs.length} of {pagination.total} job{pagination.total !== 1 ? 's' : ''}
                {searchTerm && ` for "${searchTerm}"`}
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
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Jobs Grid */}
        {loading ? (
          <div className="space-y-6">
            {/* Skeleton Loading */}
            {[...Array(3)].map((_, index) => (
              <Card key={index} className="animate-pulse">
                <div className="flex justify-between items-start space-x-4">
                  <div className="flex-1 space-y-3">
                    <div className="space-y-2">
                      <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                      <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                      <div className="h-3 bg-gray-200 rounded w-4/6"></div>
                    </div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
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
              <h3 className="text-xl font-semibold text-gray-900">No jobs found</h3>
              <p className="text-gray-600">
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
                  className="group hover:shadow-xl hover:border-indigo-200 transition-all duration-300 animate-slideIn overflow-hidden"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Job Header */}
                  <div className="flex justify-between items-start space-x-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors leading-tight">
                          {job.title}
                        </h3>
                        <div className="flex items-center space-x-2 ml-4">
                          {job.remote_type && (
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              {job.remote_type}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            {new Date(job.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      {/* Company and Location */}
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                        {job.company_name && (
                          <div className="flex items-center">
                            <span className="mr-1">🏢</span>
                            <span className="font-medium text-indigo-600">{job.company_name}</span>
                          </div>
                        )}
                        {job.location && (
                          <div className="flex items-center">
                            <span className="mr-1">📍</span>
                            <span>{job.location}</span>
                          </div>
                        )}
                        {job.salary_min && job.salary_max && (
                          <div className="flex items-center">
                            <span className="mr-1">💰</span>
                            <span className="font-medium text-green-600">
                              ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Job Description */}
                  {parsedJob.cleanDescription && (
                    <div className="mb-4">
                      <div className="text-gray-700 text-sm leading-relaxed">
                        {(isExpanded ? descriptionLines : descriptionLines.slice(0, 3)).map((line, idx) => (
                          <div key={idx} className={line.startsWith('•') ? 'ml-4 mb-1' : 'mb-2'}>
                            {line}
                          </div>
                        ))}
                        {shouldShowReadMore && (
                          <button
                            onClick={() => toggleJobExpanded(job.id)}
                            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors mt-2"
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
                        <span key={idx} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-md">
                          {skill}
                        </span>
                      ))}
                      {parsedJob.skills.length > 5 && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-md">
                          +{parsedJob.skills.length - 5} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Requirements Preview (if expanded) */}
                  {isExpanded && parsedJob.requirements && parsedJob.requirements.length > 0 && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Requirements:</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {parsedJob.requirements.slice(0, 3).map((req, idx) => (
                          <li key={idx} className="flex items-start">
                            <span className="text-indigo-500 mr-2">•</span>
                            <span>{req}</span>
                          </li>
                        ))}
                        {parsedJob.requirements.length > 3 && (
                          <li className="text-gray-500 italic">
                            ...and {parsedJob.requirements.length - 3} more requirements
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Job Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-3">
                      {job.source_url && (
                        <>
                          <a
                            href={job.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-gray-500 hover:text-indigo-600 transition-colors inline-flex items-center"
                          >
                            <span className="mr-1">🔗</span>
                            View Original
                          </a>
                          <button
                            onClick={() => shareJob(job)}
                            className="text-sm text-gray-500 hover:text-blue-600 transition-colors inline-flex items-center"
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
                        className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                      >
                        <span className="mr-1">👁️</span>
                        View Details
                      </Button>
                      <Button 
                        onClick={() => createApplication(job.id)}
                        size="sm"
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                      >
                        <span className="mr-1">📝</span>
                        Apply Now
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {pagination.pages > 1 && (
          <Card className="mt-8">
            <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
              {/* Page Info */}
              <div className="text-sm text-gray-600">
                Showing {((pagination.page - 1) * pagination.page_size) + 1} to{' '}
                {Math.min(pagination.page * pagination.page_size, pagination.total)} of{' '}
                {pagination.total} jobs
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center space-x-2">
                {/* Previous Button */}
                <Button
                  onClick={() => loadJobs(pagination.page - 1)}
                  disabled={!pagination.has_prev || loading}
                  variant="outline"
                  size="sm"
                  className="flex items-center"
                >
                  <span className="mr-1">←</span>
                  Previous
                </Button>

                {/* Page Numbers */}
                <div className="flex items-center space-x-1">
                  {(() => {
                    const currentPage = pagination.page;
                    const totalPages = pagination.pages;
                    const pages = [];
                    
                    // Always show first page
                    if (currentPage > 3) {
                      pages.push(1);
                      if (currentPage > 4) {
                        pages.push('...');
                      }
                    }
                    
                    // Show pages around current page
                    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
                      pages.push(i);
                    }
                    
                    // Always show last page
                    if (currentPage < totalPages - 2) {
                      if (currentPage < totalPages - 3) {
                        pages.push('...');
                      }
                      pages.push(totalPages);
                    }
                    
                    return pages.map((page, index) => (
                      page === '...' ? (
                        <span key={`ellipsis-${index}`} className="px-2 py-1 text-gray-400">
                          ...
                        </span>
                      ) : (
                        <Button
                          key={page}
                          onClick={() => loadJobs(page)}
                          disabled={loading}
                          variant={page === currentPage ? "default" : "outline"}
                          size="sm"
                          className="min-w-[2.5rem] h-8"
                        >
                          {page}
                        </Button>
                      )
                    ));
                  })()}
                </div>

                {/* Next Button */}
                <Button
                  onClick={() => loadJobs(pagination.page + 1)}
                  disabled={!pagination.has_next || loading}
                  variant="outline"
                  size="sm"
                  className="flex items-center"
                >
                  Next
                  <span className="ml-1">→</span>
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
      
      {/* Premium Modal */}
      <PremiumModal />
    </AuthGuard>
  );
}
