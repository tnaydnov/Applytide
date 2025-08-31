import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Button, Card, Input, Textarea, Select, Modal } from "../components/ui";
import { useToast } from '../lib/toast';

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
  const [url, setUrl] = useState("");
  const [draft, setDraft] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [selectedResume, setSelectedResume] = useState("");
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [locationFilter, setLocationFilter] = useState("");
  const [remoteTypeFilter, setRemoteTypeFilter] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const toast = useToast();

  async function fetchSearchSuggestions(query) {
    if (!query || query.length < 2) {
      setSearchSuggestions([]);
      return;
    }
    
    try {
      const response = await api.get(`/jobs/suggestions?q=${encodeURIComponent(query)}`);
      setSearchSuggestions(response || []);
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
      setSearchSuggestions([]);
    }
  }

  async function loadJobs(page = 1) { 
    setLoading(true);
    try {
      // Build query parameters for the backend API
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

      // Use the search endpoint if there's a search term, otherwise use regular listing
      const endpoint = searchTerm.trim() ? `/jobs/search?${params}` : `/jobs?${params}`;
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}${endpoint}`);
      const data = await response.json();
      
      if (response.ok) {
        setJobs(data.items || []);
        setPagination({
          total: data.total || 0,
          page: data.page || 1,
          page_size: data.page_size || 12,
          pages: data.pages || 1,
          has_next: data.has_next || false,
          has_prev: data.has_prev || false
        });
      } else {
        throw new Error(data.detail || 'Failed to load jobs');
      }
    } catch (err) {
      console.error('Load jobs error:', err);
      toast.error("Failed to load jobs");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadResumes() { 
    try {
      const response = await api.listResumes();
      // Handle both paginated response (new) and direct array (old)
      const data = response.items || response;
      setResumes(data);
    } catch (err) {
      toast.error("Failed to load resumes");
    }
  }

  useEffect(() => { 
    loadJobs(); 
    loadResumes(); 
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
      loadJobs(1); // Reset to page 1 when filters change
    }, 300); // Debounce search

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, sortBy, sortOrder, locationFilter, remoteTypeFilter]);

  async function doScrape(e) {
    e.preventDefault();
    if (!url.trim()) {
      toast.error("Please enter a job URL");
      return;
    }
    
    setScraping(true);
    try {
      const d = await api.scrapeJob(url);
      setDraft(d);
      toast.success("Job scraped successfully!");
    } catch (err) { 
      toast.error(`Failed to scrape job: ${err.message || err}`);
    } finally {
      setScraping(false);
    }
  }

  async function saveJob() {
    try {
      await api.createJob(draft);
      setDraft(null);
      setUrl("");
      await loadJobs();
      toast.success("Job saved successfully!");
    } catch (err) { 
      toast.error(`Failed to save job: ${err.message || err}`);
    }
  }

  async function createApplication(jobId) {
    try {
      const payload = { job_id: jobId };
      if (selectedResume) payload.resume_id = selectedResume;
      await api.createApp(payload);
      toast.success("Application created! Check your pipeline.");
    } catch (err) { 
      toast.error(`Failed to create application: ${err.message || err}`);
    }
  }

  return (
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

      {/* Job Scraper */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🔍</span>
            <h2 className="text-xl font-semibold text-gray-900">Add New Job</h2>
          </div>
          <p className="text-gray-600">
            Paste any job URL to automatically extract and save job details
          </p>
          
          <form onSubmit={doScrape} className="flex gap-3">
            <Input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://jobs.company.com/software-engineer"
              className="flex-1"
              icon={<span>🔗</span>}
            />
            <Button type="submit" loading={scraping} disabled={!url.trim()}>
              {scraping ? "Scraping..." : "Scrape Job"}
            </Button>
          </form>
        </div>
      </Card>

      {/* Job Draft Modal */}
      <Modal 
        isOpen={!!draft} 
        onClose={() => setDraft(null)}
        title="Review Job Details"
        footer={
          <>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button onClick={saveJob}>
              Save Job
            </Button>
          </>
        }
      >
        {draft && (
          <div className="space-y-4">
            <Input
              label="Job Title"
              value={draft.title || ""}
              onChange={e => setDraft({ ...draft, title: e.target.value })}
              placeholder="Software Engineer"
            />
            <Input
              label="Company"
              value={draft.company_name || ""}
              onChange={e => setDraft({ ...draft, company_name: e.target.value })}
              placeholder="Amazing Tech Corp"
            />
            <Input
              label="Location"
              value={draft.location || ""}
              onChange={e => setDraft({ ...draft, location: e.target.value })}
              placeholder="San Francisco, CA"
            />
            <Textarea
              label="Description"
              rows={6}
              value={draft.description || ""}
              onChange={e => setDraft({ ...draft, description: e.target.value })}
              placeholder="Job description..."
            />
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
              icon={<span>�</span>}
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
          {jobs.map((job, index) => (
            <Card 
              key={job.id} 
              className="hover:shadow-lg transition-all duration-300 animate-slideIn"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex justify-between items-start space-x-4">
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 hover:text-indigo-600 transition-colors">
                      {job.title}
                    </h3>
                    {job.company_name && (
                      <p className="text-indigo-600 font-medium">{job.company_name}</p>
                    )}
                    {job.location && (
                      <p className="text-gray-500 flex items-center">
                        <span className="mr-1">📍</span>
                        {job.location}
                      </p>
                    )}
                  </div>
                  
                  {job.description && (
                    <p className="text-gray-600 text-sm line-clamp-3">
                      {job.description.substring(0, 200)}
                      {job.description.length > 200 && "..."}
                    </p>
                  )}
                  
                  {job.source_url && (
                    <a 
                      href={job.source_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-gray-400 hover:text-indigo-600 transition-colors inline-flex items-center"
                    >
                      <span className="mr-1">🔗</span>
                      View Original
                    </a>
                  )}
                </div>
                
                <div className="flex-shrink-0">
                  <Button 
                    onClick={() => createApplication(job.id)}
                    size="sm"
                    className="whitespace-nowrap"
                  >
                    <span className="mr-1">📝</span>
                    Apply
                  </Button>
                </div>
              </div>
            </Card>
          ))}
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
  );
}
