import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Button, Card, Input, Textarea, Select, Modal } from "../components/ui";
import { useToast } from '../lib/toast';

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [url, setUrl] = useState("");
  const [draft, setDraft] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [selectedResume, setSelectedResume] = useState("");
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const toast = useToast();

  async function loadJobs() { 
    setLoading(true);
    try {
      const data = await api.listJobs();
      setJobs(data);
    } catch (err) {
      toast.error("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }

  async function loadResumes() { 
    try {
      const data = await api.listResumes();
      setResumes(data);
    } catch (err) {
      toast.error("Failed to load resumes");
    }
  }

  useEffect(() => { 
    loadJobs(); 
    loadResumes(); 
  }, []);

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

  const filteredJobs = jobs
    .filter(job => 
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.company_name && job.company_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (job.location && job.location.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        case "title":
          return a.title.localeCompare(b.title);
        case "company":
          return (a.company_name || "").localeCompare(b.company_name || "");
        default:
          return 0;
      }
    });

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
            {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''}
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
            {resumes.map(r => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </Select>
        </div>
      </Card>

      {/* Search and Filter */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <Input
            placeholder="Search jobs by title, company, or location..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1"
            icon={<span>🔍</span>}
          />
          <Select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="md:w-48"
          >
            <option value="newest">Newest First</option>
            <option value="title">By Title</option>
            <option value="company">By Company</option>
          </Select>
        </div>
      </Card>

      {/* Jobs Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-gray-600">Loading jobs...</p>
          </div>
        </div>
      ) : filteredJobs.length === 0 ? (
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
          {filteredJobs.map((job, index) => (
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
    </div>
  );
}
