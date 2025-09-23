import { useEffect, useState } from 'react';
import { Modal, Input, Select, Textarea, Button } from '../../../components/ui';
import { parseJobForDisplay } from '../utils/parseJob';
import { api } from '../../../lib/api';
import { useToast } from '../../../lib/toast';

export default function JobDetailsModal({
  isOpen,
  job,
  mode = 'view', // 'view' | 'edit'
  onClose,
  onSaved,
}) {
  const toast = useToast();
  const [jobDetailsMode, setJobDetailsMode] = useState(mode);
  const [editJobData, setEditJobData] = useState(null);

  useEffect(() => {
    setJobDetailsMode(mode);
  }, [mode]);

  useEffect(() => {
    if (!job) { setEditJobData(null); return; }
    setEditJobData({
      title: job.title || '',
      company_name: job.company_name || '',
      location: job.location || '',
      description: job.description || '',
      requirements: Array.isArray(job?.requirements) ? job.requirements : [],
      skills: Array.isArray(job?.skills) ? job.skills : [],
      remote_type: job.remote_type || 'On-site',
      job_type: job.job_type || 'Full-time',
      source_url: job.source_url || '',
    });
  }, [job]);

  async function saveJobChanges() {
    if (!job || !editJobData) return;
    try {
      const clean = {
        title: editJobData.title.trim(),
        company_name: editJobData.company_name.trim(),
      };
      if (editJobData.location?.trim()) clean.location = editJobData.location.trim();
      if (editJobData.remote_type && editJobData.remote_type !== 'On-site') clean.remote_type = editJobData.remote_type;
      if (editJobData.job_type && editJobData.job_type !== 'Full-time') clean.job_type = editJobData.job_type;
      if (editJobData.description?.trim()) clean.description = editJobData.description.trim();
      if (editJobData.source_url?.trim()) {
        try { new URL(editJobData.source_url.trim()); clean.source_url = editJobData.source_url.trim(); } catch { }
      }
      if (editJobData.requirements?.length) clean.requirements = editJobData.requirements.filter((x) => x.trim());
      if (editJobData.skills?.length) clean.skills = editJobData.skills.filter((x) => x.trim());

      await api.updateJob(job.id, clean);
      toast.success('Job updated successfully!');
      setJobDetailsMode('view');
      onSaved?.();
    } catch (e) {
      console.error('Job update error:', e);
      toast.error(`Failed to update job: ${e.message || e}`);
    }
  }

  if (!isOpen || !job) return null;
  const parsed = parseJobForDisplay(job);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={jobDetailsMode === 'view' ? 'Job Details' : 'Edit Job'}
      size="xl"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="pb-4">
          <div className="flex justify-between items-start">
            {jobDetailsMode === 'view' ? (
              <h2 className="text-2xl font-bold text-slate-100">{job.title}</h2>
            ) : (
              <Input
                value={editJobData?.title || ''}
                onChange={(e) => setEditJobData((p) => ({ ...p, title: e.target.value }))}
                placeholder="Job Title"
                className="text-2xl font-bold border-0 p-0 focus:ring-0"
              />
            )}

            <div className="flex items-center space-x-2">
              {jobDetailsMode === 'view' ? (
                <Button onClick={() => setJobDetailsMode('edit')} variant="outline" size="sm" type="button">
                  ✏️ Edit
                </Button>
              ) : (
                <div className="flex space-x-2">
                  <Button onClick={() => setJobDetailsMode('view')} variant="outline" size="sm" type="button">
                    Cancel
                  </Button>
                  <Button onClick={saveJobChanges} size="sm" className="bg-blue-600 text-white" type="button">
                    Save Changes
                  </Button>
                </div>
              )}
            </div>
          </div>

          {jobDetailsMode === 'view' ? (
            <p className="text-lg text-slate-300 mt-1">{job.company_name}</p>
          ) : (
            <Input
              value={editJobData?.company_name || ''}
              onChange={(e) => setEditJobData((p) => ({ ...p, company_name: e.target.value }))}
              placeholder="Company Name"
              className="text-lg border-0 p-0 focus:ring-0 mt-1"
            />
          )}
        </div>

        <div className="soft-divider my-2" />

        {/* Meta */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="section">
            <label className="field-label">Location</label>
            {jobDetailsMode === 'view' ? (
              <p className="field-value-quiet">{job.location || 'Not specified'}</p>
            ) : (
              <Input
                value={editJobData?.location || ''}
                onChange={(e) => setEditJobData((p) => ({ ...p, location: e.target.value }))}
                placeholder="Location"
              />
            )}
          </div>

          <div className="section">
            <label className="field-label">Work Type</label>
            {jobDetailsMode === 'view' ? (
              <p className="field-value-quiet">{job.remote_type || 'On-site'}</p>
            ) : (
              <Select
                value={editJobData?.remote_type || 'On-site'}
                onChange={(e) => setEditJobData((p) => ({ ...p, remote_type: e.target.value }))}
              >
                <option value="On-site">On-site</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
              </Select>
            )}
          </div>

          <div className="section">
            <label className="field-label">Job Type</label>
            {jobDetailsMode === 'view' ? (
              <p className="field-value-quiet">{job.job_type || 'Full-time'}</p>
            ) : (
              <Select
                value={editJobData?.job_type || 'Full-time'}
                onChange={(e) => setEditJobData((p) => ({ ...p, job_type: e.target.value }))}
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
          <label className="field-label">Source URL</label>
          {jobDetailsMode === 'view' ? (
            job.source_url ? (
              <a
                href={job.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-400 underline break-all"
              >
                {job.source_url}
              </a>
            ) : (
              <p className="field-empty">No source URL provided</p>
            )
          ) : (
            <Input
              type="url"
              value={editJobData?.source_url || ''}
              onChange={(e) => setEditJobData((p) => ({ ...p, source_url: e.target.value }))}
              placeholder="https://..."
            />
          )}
        </div>

        {/* Description */}
        <div className="section">
          <label className="field-label">Description</label>
          {jobDetailsMode === 'view' ? (
            parsed.cleanDescription ? (
              <pre className="job-desc whitespace-pre-wrap break-words">{parsed.cleanDescription}</pre>
            ) : (
              <p className="text-slate-500 italic">No description provided</p>
            )
          ) : (
            <Textarea
              value={editJobData?.description || ''}
              onChange={(e) => setEditJobData((p) => ({ ...p, description: e.target.value }))}
              rows={6}
              placeholder="Job description…"
            />
          )}
        </div>

        {/* Requirements */}
        <div className="section">
          <label className="field-label">Requirements</label>

          {jobDetailsMode === 'edit' ? (
            <Textarea
              rows={4}
              value={(editJobData?.requirements || []).join('\n')}
              onChange={(e) =>
                setEditJobData((p) => ({
                  ...p,
                  requirements: e.target.value
                    .split(/\r?\n/)
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
              placeholder="One requirement per line…"
            />
          ) : parsed.requirements?.length ? (
            <ul className="list-disc list-inside space-y-1">
              {parsed.requirements.map((r, i) => (
                <li key={i} className="text-sm text-slate-100">{r}</li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 italic">No requirements specified</p>
          )}
        </div>

        {/* Skills */}
        <div className="section">
          <label className="field-label">Required Skills</label>

          {jobDetailsMode === 'edit' ? (
            <Textarea
              rows={3}
              value={(editJobData?.skills || []).join('\n')}
              onChange={(e) =>
                setEditJobData((p) => ({
                  ...p,
                  skills: Array.from(
                    new Set(
                      e.target.value
                        .split(/[,\r\n]+/) 
                        .map((s) => s.trim())
                        .filter(Boolean)
                    )
                  ),
                }))
              }
              placeholder="One per line or comma-separated (e.g., JavaScript, React)…"
            />
          ) : job?.skills?.length ? (
            <div className="flex flex-wrap gap-2">
              {job.skills.map((s, i) => (
                <span
                  key={`${s}-${i}`}
                  className="px-2 py-0.5 rounded bg-white/10 text-slate-200 text-xs"
                >
                  {s}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 italic">No skills specified</p>
          )}
        </div>




        {/* Footer meta */}
        <div className="text-sm text-gray-500 pt-2">
          <p>Created: {job.created_at ? new Date(job.created_at).toLocaleDateString() : '—'}</p>
          {job.source_url && <p className="mt-1">Source: Job posting URL</p>}
        </div>
      </div>
    </Modal>
  );
}
