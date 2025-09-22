import { useState } from "react";
import { Button, Input, Textarea, Select, Modal } from "./ui";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";

const DEFAULT = {
  title: "",
  company_name: "",
  location: "",
  description: "",
  requirements: [],
  skills: [],
  remote_type: "On-site",
  job_type: "Full-time",
  source_url: ""
};

export default function ManualJobModal({ isOpen, onClose, onSaved }) {
  const [data, setData] = useState(DEFAULT);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleArray = (field, v) =>
    setData(prev => ({ ...prev, [field]: v.split("\n").map(s => s.trim()).filter(Boolean) }));

  const reset = () => setData(DEFAULT);

  async function save() {
    setLoading(true);
    try {
      const clean = {
        title: data.title.trim(),
        company_name: data.company_name.trim(),
      };
      if (data.location?.trim()) clean.location = data.location.trim();
      if (data.remote_type && data.remote_type !== "On-site") clean.remote_type = data.remote_type;
      if (data.job_type && data.job_type !== "Full-time") clean.job_type = data.job_type;
      if (data.description?.trim()) clean.description = data.description.trim();
      if (data.source_url?.trim()) clean.source_url = data.source_url.trim();
      if (data.requirements?.length) clean.requirements = data.requirements;
      if (data.skills?.length) clean.skills = data.skills;

      await api.createManualJob(clean);
      toast.success("Job created successfully!");
      onClose?.();
      reset();
      onSaved?.(); // caller can reload jobs
    } catch (e) {
      toast.error(`Failed to create job: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose?.(); reset(); }} title="Create Job Manually" size="xl">
      <div className="space-y-6">
        <div className="section">
          <h3 className="modal-title text-base mb-3">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Job Title *</label>
              <Input value={data.title} onChange={e => setData(p => ({ ...p, title: e.target.value }))} placeholder="Senior Software Engineer" required />
            </div>
            <div>
              <label className="field-label">Company Name *</label>
              <Input value={data.company_name} onChange={e => setData(p => ({ ...p, company_name: e.target.value }))} placeholder="Amazing Tech Corp" required />
            </div>
          </div>
        </div>

        <div className="section">
          <label className="field-label">Job Posting URL (Optional)</label>
          <Input value={data.source_url} onChange={e => setData(p => ({ ...p, source_url: e.target.value }))} placeholder="https://company.com/careers/job-posting" />
        </div>

        <div className="section">
          <h3 className="modal-title text-base mb-3">Job Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Location</label>
              <Input value={data.location} onChange={e => setData(p => ({ ...p, location: e.target.value }))} placeholder="San Francisco, CA" />
            </div>
            <div>
              <label className="field-label">Remote Type</label>
              <Select value={data.remote_type} onChange={e => setData(p => ({ ...p, remote_type: e.target.value }))}>
                <option value="On-site">On-site</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
              </Select>
            </div>
            <div>
              <label className="field-label">Job Type</label>
              <Select value={data.job_type} onChange={e => setData(p => ({ ...p, job_type: e.target.value }))}>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </Select>
            </div>
          </div>
        </div>

        <div className="section">
          <h3 className="modal-title text-base mb-3">Job Description</h3>
          <Textarea rows={6} value={data.description} onChange={e => setData(p => ({ ...p, description: e.target.value }))} placeholder="Describe the role, responsibilities, and what makes this opportunity exciting..." />
          <p className="text-xs text-slate-500 mt-1">Use line breaks for better formatting. Bullet points (•, -, *) will be formatted automatically.</p>
        </div>

        <div className="section">
          <h3 className="modal-title text-base mb-3">Requirements</h3>
          <Textarea rows={4} value={data.requirements.join("\n")} onChange={e => handleArray("requirements", e.target.value)} placeholder={"5+ years of experience...\nStrong knowledge of React and Node.js\nExperience with cloud platforms"} />
        </div>

        <div className="section">
          <h3 className="modal-title text-base mb-3">Required Skills</h3>
          <Textarea rows={3} value={data.skills.join("\n")} onChange={e => handleArray("skills", e.target.value)} placeholder={"JavaScript\nReact\nNode.js\nPostgreSQL\nDocker"} />
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <Button variant="outline" onClick={() => { onClose?.(); reset(); }}>Cancel</Button>
          <Button onClick={save} loading={loading} disabled={!data.title || !data.company_name}>💾 Save Job</Button>
        </div>
      </div>
    </Modal>
  );
}
