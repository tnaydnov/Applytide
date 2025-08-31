import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [url, setUrl] = useState("");
  const [draft, setDraft] = useState(null);
  const [msg, setMsg] = useState("");
  const [resumes, setResumes] = useState([]);
  const [selectedResume, setSelectedResume] = useState("");

  async function loadJobs() { setJobs(await api.listJobs()); }
  async function loadResumes() { setResumes(await api.listResumes()); }

  useEffect(() => { loadJobs(); loadResumes(); }, []);

  async function doScrape(e) {
    e.preventDefault();
    setMsg("");
    try {
      const d = await api.scrapeJob(url);
      setDraft(d);
    } catch (err) { setMsg(String(err)); }
  }

  async function saveJob() {
    setMsg("");
    try {
      await api.createJob(draft);
      setDraft(null);
      setUrl("");
      await loadJobs();
    } catch (err) { setMsg(String(err)); }
  }

  async function createApplication(jobId) {
    setMsg("");
    try {
      const payload = { job_id: jobId };
      if (selectedResume) payload.resume_id = selectedResume;
      await api.createApp(payload);
      setMsg("Application created. Go to Pipeline.");
    } catch (err) { setMsg(String(err)); }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h1>Jobs</h1>

      <form onSubmit={doScrape} style={{ display: "flex", gap: 8 }}>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Paste job URL" style={{ flex: 1 }} />
        <button type="submit">Scrape</button>
      </form>

      {draft && (
        <div style={{ border: "1px solid #ddd", padding: 12 }}>
          <h3>Draft from URL</h3>
          <label>Title</label>
          <input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
          <label>Company</label>
          <input value={draft.company_name || ""} onChange={e => setDraft({ ...draft, company_name: e.target.value })} />
          <label>Location</label>
          <input value={draft.location || ""} onChange={e => setDraft({ ...draft, location: e.target.value })} />
          <label>Description</label>
          <textarea rows={6} value={draft.description || ""} onChange={e => setDraft({ ...draft, description: e.target.value })} />
          <button onClick={saveJob}>Create Job</button>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span>Application resume:</span>
        <select value={selectedResume} onChange={e => setSelectedResume(e.target.value)}>
          <option value="">(none)</option>
          {resumes.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      </div>

      <h3>Existing Jobs</h3>
      <div style={{ display: "grid", gap: 8 }}>
        {jobs.map(j => (
          <div key={j.id} style={{ border: "1px solid #eee", padding: 10, display: "flex", justifyContent: "space-between" }}>
            <div>
              <b>{j.title}</b> {j.location ? `• ${j.location}` : ""}<br />
              <small>{j.source_url}</small>
            </div>
            <button onClick={() => createApplication(j.id)}>Create Application</button>
          </div>
        ))}
      </div>

      <p style={{ color: msg.startsWith("Application") ? "green" : "crimson" }}>{msg}</p>
    </div>
  );
}
