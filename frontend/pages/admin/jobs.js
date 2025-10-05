// frontend/pages/admin/jobs.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminGuard from '../../components/guards/AdminGuard';
import PageContainer from '../../components/layout/PageContainer';
import PageHeader from '../../components/layout/PageHeader';
import { 
  listJobs, 
  getJobDetail, 
  updateJob, 
  deleteJob, 
  bulkDeleteJobs,
  getJobAnalytics,
  verifyPassword
} from '../../services/admin';
import { showToast } from '../../lib/toast';

export default function AdminJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [remoteType, setRemoteType] = useState('');
  const [jobType, setJobType] = useState('');
  const [hasApplications, setHasApplications] = useState(null);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(50);
  
  // Selection
  const [selectedJobs, setSelectedJobs] = useState([]);
  
  // Modals
  const [editingJob, setEditingJob] = useState(null);
  const [viewingJob, setViewingJob] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [deleteJustification, setDeleteJustification] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    loadJobs();
  }, [search, location, remoteType, jobType, hasApplications, sortBy, sortOrder, page, limit]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const data = await listJobs({
        skip: page * limit,
        limit,
        search: search || null,
        location: location || null,
        remote_type: remoteType || null,
        job_type: jobType || null,
        has_applications: hasApplications,
        sort_by: sortBy,
        sort_order: sortOrder
      });
      setJobs(data.jobs);
      setTotal(data.total);
    } catch (error) {
      showToast.error('Failed to load jobs');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const data = await getJobAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const handleViewJob = async (jobId) => {
    try {
      const job = await getJobDetail(jobId);
      setViewingJob(job);
    } catch (error) {
      showToast.error('Failed to load job details');
    }
  };

  const handleEditJob = (job) => {
    setEditingJob({ ...job });
  };

  const handleSaveJob = async () => {
    if (!editingJob.justification) {
      showToast.error('Please provide a justification for the update');
      return;
    }

    try {
      // Check if step-up auth is needed
      setPendingAction(() => async () => {
        await updateJob(editingJob.id, {
          title: editingJob.title,
          location: editingJob.location,
          remote_type: editingJob.remote_type,
          job_type: editingJob.job_type,
          description: editingJob.description,
          requirements: editingJob.requirements,
          skills: editingJob.skills,
          source_url: editingJob.source_url,
          justification: editingJob.justification
        });
        showToast.success('Job updated successfully');
        setEditingJob(null);
        loadJobs();
      });
      setShowPasswordPrompt(true);
    } catch (error) {
      showToast.error('Failed to update job');
    }
  };

  const handleDeleteJob = (job) => {
    setViewingJob(job);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteJob = async () => {
    if (!deleteJustification) {
      showToast.error('Please provide a justification for deletion');
      return;
    }

    try {
      setPendingAction(() => async () => {
        await deleteJob(viewingJob.id, deleteJustification);
        showToast.success('Job deleted successfully');
        setShowDeleteConfirm(false);
        setViewingJob(null);
        setDeleteJustification('');
        loadJobs();
      });
      setShowPasswordPrompt(true);
    } catch (error) {
      showToast.error('Failed to delete job');
    }
  };

  const handleBulkDelete = () => {
    if (selectedJobs.length === 0) {
      showToast.error('Please select jobs to delete');
      return;
    }
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    if (!deleteJustification) {
      showToast.error('Please provide a justification for bulk deletion');
      return;
    }

    try {
      setPendingAction(() => async () => {
        await bulkDeleteJobs(selectedJobs, deleteJustification);
        showToast.success(`Deleted ${selectedJobs.length} jobs`);
        setShowBulkDeleteConfirm(false);
        setSelectedJobs([]);
        setDeleteJustification('');
        loadJobs();
      });
      setShowPasswordPrompt(true);
    } catch (error) {
      showToast.error('Failed to bulk delete jobs');
    }
  };

  const handlePasswordSubmit = async () => {
    try {
      await verifyPassword(password);
      setShowPasswordPrompt(false);
      setPassword('');
      if (pendingAction) {
        await pendingAction();
        setPendingAction(null);
      }
    } catch (error) {
      showToast.error('Invalid password');
    }
  };

  const toggleJobSelection = (jobId) => {
    setSelectedJobs(prev =>
      prev.includes(jobId)
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedJobs.length === jobs.length) {
      setSelectedJobs([]);
    } else {
      setSelectedJobs(jobs.map(j => j.id));
    }
  };

  return (
    <AdminGuard>
      <PageContainer>
        <PageHeader
          title="Job Management"
          subtitle="View, edit, and manage all job listings"
        />

        <div className="space-y-6">

          {/* Analytics Cards */}
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Jobs</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {analytics.total_jobs.toLocaleString()}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Last 7 Days</div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                  {analytics.jobs_7d.toLocaleString()}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">With Applications</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                  {analytics.jobs_with_applications.toLocaleString()}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Apps/Job</div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                  {analytics.avg_applications_per_job.toFixed(1)}
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <input
                type="text"
                placeholder="Search jobs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <input
                type="text"
                placeholder="Location..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <select
                value={remoteType}
                onChange={(e) => setRemoteType(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Remote Types</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
              </select>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Job Types</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>
              <select
                value={hasApplications === null ? '' : hasApplications.toString()}
                onChange={(e) => setHasApplications(e.target.value === '' ? null : e.target.value === 'true')}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Jobs</option>
                <option value="true">With Applications</option>
                <option value="false">No Applications</option>
              </select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedJobs.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6 flex justify-between items-center">
              <span className="text-blue-700 dark:text-blue-300">
                {selectedJobs.length} job(s) selected
              </span>
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete Selected
              </button>
            </div>
          )}

          {/* Jobs Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedJobs.length === jobs.length && jobs.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Remote Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Applications
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : jobs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No jobs found
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedJobs.includes(job.id)}
                          onChange={() => toggleJobSelection(job.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {job.title}
                        </div>
                        {job.company_name && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {job.company_name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {job.location || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {job.remote_type || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {job.total_applications}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(job.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleViewJob(job.id)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEditJob(job)}
                          className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteJob(job)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-6 flex justify-between items-center">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total} jobs
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={(page + 1) * limit >= total}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>

          {/* Edit Modal */}
          {editingJob && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Edit Job</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={editingJob.title}
                      onChange={(e) => setEditingJob({ ...editingJob, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={editingJob.location || ''}
                      onChange={(e) => setEditingJob({ ...editingJob, location: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={editingJob.description || ''}
                      onChange={(e) => setEditingJob({ ...editingJob, description: e.target.value })}
                      rows="4"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Justification (Required)
                    </label>
                    <input
                      type="text"
                      value={editingJob.justification || ''}
                      onChange={(e) => setEditingJob({ ...editingJob, justification: e.target.value })}
                      placeholder="Explain why you're making this change..."
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setEditingJob(null)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveJob}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* View Modal */}
          {viewingJob && !showDeleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                  {viewingJob.title}
                </h2>
                <div className="space-y-4">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Location:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{viewingJob.location || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Remote Type:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{viewingJob.remote_type || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Job Type:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{viewingJob.job_type || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Applications:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{viewingJob.total_applications}</span>
                  </div>
                  {viewingJob.description && (
                    <div>
                      <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">Description:</div>
                      <div className="text-gray-900 dark:text-white whitespace-pre-wrap">
                        {viewingJob.description}
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setViewingJob(null)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Password Prompt Modal */}
          {showPasswordPrompt && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                  Verify Your Password
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  This action requires step-up authentication. Please enter your password to continue.
                </p>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                  placeholder="Enter your password..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
                  autoFocus
                />
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowPasswordPrompt(false);
                      setPassword('');
                      setPendingAction(null);
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePasswordSubmit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Verify
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
                <h2 className="text-2xl font-bold mb-4 text-red-600 dark:text-red-400">
                  Delete Job
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Are you sure you want to delete this job? This will also delete all associated applications.
                </p>
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg mb-4">
                  <div className="font-medium text-red-900 dark:text-red-100">
                    {viewingJob?.title}
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {viewingJob?.total_applications} application(s) will be deleted
                  </div>
                </div>
                <textarea
                  value={deleteJustification}
                  onChange={(e) => setDeleteJustification(e.target.value)}
                  placeholder="Justification for deletion (required)..."
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
                />
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteJustification('');
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteJob}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Delete Job
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bulk Delete Confirmation Modal */}
          {showBulkDeleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
                <h2 className="text-2xl font-bold mb-4 text-red-600 dark:text-red-400">
                  Bulk Delete Jobs
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Are you sure you want to delete {selectedJobs.length} job(s)? This will also delete all associated applications.
                </p>
                <textarea
                  value={deleteJustification}
                  onChange={(e) => setDeleteJustification(e.target.value)}
                  placeholder="Justification for bulk deletion (required)..."
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
                />
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowBulkDeleteConfirm(false);
                      setDeleteJustification('');
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmBulkDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Delete {selectedJobs.length} Jobs
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </PageContainer>
    </AdminGuard>
  );
}
