import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Button, Card, Input } from "../components/ui";
import { useToast } from '../lib/toast';
import AuthGuard from "../components/AuthGuard";

/* -------------------------------- Mobile Job Card -------------------------------- */
function MobileJobCard({ job, onSave, isSaving }) {
  const [expanded, setExpanded] = useState(false);
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const truncateText = (text, maxLength) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="mobile-card bg-gray-800/50 border border-gray-700/50 backdrop-blur-sm">
      {/* Header */}
      <div className="mobile-space-sm">
        <h3 className="mobile-subtitle text-white">{job.title}</h3>
        <div className="mobile-flex-between">
          <p className="mobile-body text-blue-400">{job.company_name}</p>
          {job.created_at && (
            <span className="mobile-caption text-gray-500">
              {formatDate(job.created_at)}
            </span>
          )}
        </div>
      </div>

      {/* Location & Type */}
      <div className="mobile-flex-between mobile-space-sm">
        <div className="flex items-center space-x-4">
          {job.location && (
            <span className="mobile-caption text-gray-400 flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {job.location}
            </span>
          )}
          {job.remote_type && (
            <span className={`px-2 py-1 rounded-md text-xs font-medium ${
              job.remote_type === 'Remote' 
                ? 'bg-green-500/20 text-green-400'
                : job.remote_type === 'Hybrid'
                ? 'bg-yellow-500/20 text-yellow-400' 
                : 'bg-blue-500/20 text-blue-400'
            }`}>
              {job.remote_type}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {job.description && (
        <div className="mobile-space-sm">
          <p className="mobile-body text-gray-300 leading-relaxed">
            {expanded ? job.description : truncateText(job.description, 120)}
          </p>
          {job.description.length > 120 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-blue-400 text-sm hover:text-blue-300 mt-1"
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      )}

      {/* Skills */}
      {job.skills && job.skills.length > 0 && (
        <div className="mobile-space-sm">
          <div className="flex flex-wrap gap-1">
            {job.skills.slice(0, 6).map((skill, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs"
              >
                {skill}
              </span>
            ))}
            {job.skills.length > 6 && (
              <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-xs">
                +{job.skills.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mobile-grid-2 pt-3 border-t border-gray-700/30">
        <button
          onClick={() => onSave(job)}
          disabled={isSaving}
          className="mobile-btn bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save Job'}
        </button>
        {job.source_url && (
          <a
            href={job.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mobile-btn bg-gray-600 hover:bg-gray-700 text-white font-medium text-center transition-colors"
          >
            View Original
          </a>
        )}
      </div>
    </div>
  );
}

/* -------------------------------- Manual Job Modal -------------------------------- */
function MobileJobModal({ isOpen, onClose, onSubmit }) {
  const [jobData, setJobData] = useState({
    title: '',
    company_name: '',
    location: '',
    description: '',
    source_url: '',
    remote_type: 'On-site',
    job_type: 'Full-time'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(jobData);
      setJobData({
        title: '', company_name: '', location: '', description: '',
        source_url: '', remote_type: 'On-site', job_type: 'Full-time'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-gray-800 rounded-t-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700">
          <div className="mobile-flex-between">
            <h3 className="mobile-title">Add New Job</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block mobile-caption text-gray-300 mb-2">Job Title *</label>
            <input
              type="text"
              required
              value={jobData.title}
              onChange={(e) => setJobData({...jobData, title: e.target.value})}
              className="w-full mobile-btn bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g. Senior Software Engineer"
            />
          </div>

          <div>
            <label className="block mobile-caption text-gray-300 mb-2">Company *</label>
            <input
              type="text"
              required
              value={jobData.company_name}
              onChange={(e) => setJobData({...jobData, company_name: e.target.value})}
              className="w-full mobile-btn bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g. Google"
            />
          </div>

          <div className="mobile-grid-2">
            <div>
              <label className="block mobile-caption text-gray-300 mb-2">Location</label>
              <input
                type="text"
                value={jobData.location}
                onChange={(e) => setJobData({...jobData, location: e.target.value})}
                className="w-full mobile-btn bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g. San Francisco, CA"
              />
            </div>
            <div>
              <label className="block mobile-caption text-gray-300 mb-2">Remote Type</label>
              <select
                value={jobData.remote_type}
                onChange={(e) => setJobData({...jobData, remote_type: e.target.value})}
                className="w-full mobile-btn bg-gray-700/50 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="On-site">On-site</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block mobile-caption text-gray-300 mb-2">Job Description</label>
            <textarea
              value={jobData.description}
              onChange={(e) => setJobData({...jobData, description: e.target.value})}
              rows="4"
              className="w-full mobile-btn bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Describe the role, requirements, and responsibilities..."
            />
          </div>

          <div>
            <label className="block mobile-caption text-gray-300 mb-2">Job URL</label>
            <input
              type="url"
              value={jobData.source_url}
              onChange={(e) => setJobData({...jobData, source_url: e.target.value})}
              className="w-full mobile-btn bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://..."
            />
          </div>

          {/* Actions */}
          <div className="mobile-grid-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="mobile-btn bg-gray-600 hover:bg-gray-700 text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="mobile-btn bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white"
            >
              {isSubmitting ? 'Creating...' : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------- Main Jobs Page -------------------------------- */
export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [remoteTypeFilter, setRemoteTypeFilter] = useState("");
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    page_size: 20,
    pages: 1,
    has_next: false,
    has_prev: false
  });

  const [showJobModal, setShowJobModal] = useState(false);
  const [savingJobs, setSavingJobs] = useState(new Set());

  const toast = useToast();

  // Load jobs
  useEffect(() => {
    loadJobs();
  }, [searchTerm, locationFilter, remoteTypeFilter]);

  const loadJobs = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pagination.page_size,
        search: searchTerm,
        location: locationFilter,
        remote_type: remoteTypeFilter,
      };
      
      const response = await api.getJobs(params);
      setJobs(response.jobs || []);
      setPagination(response.pagination || pagination);
    } catch (error) {
      console.error('Error loading jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveJob = async (job) => {
    setSavingJobs(prev => new Set([...prev, job.id]));
    try {
      await api.saveJob(job.id);
      toast.success('Job saved to your pipeline!');
    } catch (error) {
      console.error('Error saving job:', error);
      toast.error('Failed to save job');
    } finally {
      setSavingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(job.id);
        return newSet;
      });
    }
  };

  const handleCreateManualJob = async (jobData) => {
    try {
      const response = await api.createManualJob(jobData);
      toast.success('Job created successfully!');
      setShowJobModal(false);
      loadJobs();
      return response;
    } catch (error) {
      console.error('Error creating job:', error);
      toast.error('Failed to create job');
      throw error;
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setLocationFilter('');
    setRemoteTypeFilter('');
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="mobile-container">
          {/* Header */}
          <div className="mobile-space-xl">
            <h1 className="mobile-title">Job Board</h1>
            <p className="mobile-body text-gray-400">
              Discover and track amazing opportunities
            </p>
            <div className="flex items-center text-sm text-gray-500 mt-2">
              <span>{jobs.length} job{jobs.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Add New Job */}
          <div className="mobile-card bg-blue-500/10 border-2 border-blue-500/30 mobile-space-xl">
            <div className="mobile-flex-center mobile-space-md">
              <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div className="text-center mobile-space-md">
              <h3 className="mobile-subtitle text-blue-300">Manual Entry</h3>
              <p className="mobile-body text-blue-200/80">
                Enter job details manually with our user-friendly form
              </p>
            </div>
            <button
              onClick={() => setShowJobModal(true)}
              className="w-full mobile-btn bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              Create Job Manually
            </button>
          </div>

          {/* Search & Filter */}
          <div className="mobile-card bg-gray-800/30 border border-gray-700/50 mobile-space-xl">
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Search jobs by title, company, or keywords"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full mobile-btn bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              <div className="mobile-grid-2">
                <input
                  type="text"
                  placeholder="Location (e.g., Remote, NYC...)"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="mobile-btn bg-gray-700/50 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                
                <select
                  value={remoteTypeFilter}
                  onChange={(e) => setRemoteTypeFilter(e.target.value)}
                  className="mobile-btn bg-gray-700/50 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Types</option>
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="On-site">On-site</option>
                </select>
              </div>
              
              {(searchTerm || locationFilter || remoteTypeFilter) && (
                <button
                  onClick={clearFilters}
                  className="w-full mobile-btn bg-gray-600 hover:bg-gray-700 text-white text-sm"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Jobs List */}
          <div className="mobile-space-xl">
            <div className="mobile-flex-between mobile-space-md">
              <h2 className="mobile-subtitle">Available Jobs</h2>
              {loading && (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  <span className="mobile-caption text-gray-400">Loading...</span>
                </div>
              )}
            </div>

            {jobs.length === 0 ? (
              <div className="mobile-card bg-gray-800/30 border border-gray-700/50 text-center">
                <div className="mobile-flex-center mobile-space-md">
                  <svg className="w-12 h-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="mobile-subtitle text-gray-400">No jobs found</h3>
                <p className="mobile-body text-gray-500 mobile-space-md">
                  {searchTerm || locationFilter || remoteTypeFilter
                    ? 'Try adjusting your search criteria'
                    : 'No jobs available at the moment'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <MobileJobCard
                    key={job.id}
                    job={job}
                    onSave={handleSaveJob}
                    isSaving={savingJobs.has(job.id)}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="mobile-flex-center mobile-space-xl">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => loadJobs(pagination.page - 1)}
                    disabled={!pagination.has_prev}
                    className="mobile-btn bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white disabled:text-gray-500"
                  >
                    Previous
                  </button>
                  <span className="mobile-caption text-gray-400">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button
                    onClick={() => loadJobs(pagination.page + 1)}
                    disabled={!pagination.has_next}
                    className="mobile-btn bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white disabled:text-gray-500"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Manual Job Modal */}
        <MobileJobModal
          isOpen={showJobModal}
          onClose={() => setShowJobModal(false)}
          onSubmit={handleCreateManualJob}
        />
      </div>
    </AuthGuard>
  );
}