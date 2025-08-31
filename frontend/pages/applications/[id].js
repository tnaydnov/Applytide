import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function AppDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [data, setData] = useState(null);
  const [note, setNote] = useState("");
  const [stage, setStage] = useState({ name: "Phone Screen", scheduled_at: "", notes: "" });
  const [msg, setMsg] = useState("");

  // scoring
  const [resumes, setResumes] = useState([]);
  const [score, setScore] = useState(null);
  const [keywords, setKeywords] = useState({ present: [], missing: [] });
  const [selectedResume, setSelectedResume] = useState("");

  async function load() {
    if (!id) return;
    const d = await api.getAppDetail(id);
    setData(d);
    setResumes(await api.listResumes());
    setSelectedResume(d.application.resume_id || "");
  }

  useEffect(() => { load(); }, [id]);

  async function addNote() {
    setMsg("");
    try { await api.addNote(id, note); setNote(""); await load(); }
    catch (e) { setMsg(String(e)); }
  }
  async function addStage() {
    setMsg("");
    try {
      const payload = { name: stage.name };
      if (stage.scheduled_at) payload.scheduled_at = new Date(stage.scheduled_at).toISOString();
      if (stage.notes) payload.notes = stage.notes;
      await api.addStage(id, payload);
      setStage({ ...stage, notes: "" });
      await load();
    } catch (e) { setMsg(String(e)); }
  }

  async function doScore() {
    if (!selectedResume) { setMsg("Pick a resume"); return; }
    try {
      const res = await api.apiFetch(`/match/score?resume_id=${selectedResume}&job_id=${data.job.id}`, { method: "POST" }).then(r=>r.json());
      setScore(res.score);
      setKeywords({ present: res.keywords_present, missing: res.keywords_missing });
    } catch (e) { setMsg(String(e)); }
  }

  if (!data) return <p>Loading…</p>;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h1>Application</h1>
      <div>
        <b>{data.job.title}</b>{data.job.company_name ? <span> • {data.job.company_name}</span> : null}
        <div>Status: {data.application.status}</div>
        {data.resume_label ? <div>Resume: {data.resume_label}</div> : null}
      </div>

      {/* Scoring panel */}
      <section style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
        <h3>Match Scoring</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span>Resume:</span>
          <select value={selectedResume} onChange={e => setSelectedResume(e.target.value)}>
            <option value="">(pick)</option>
            {resumes.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <button onClick={doScore}>Score Match</button>
          {score != null && <b>Score: {score}%</b>}
        </div>
        {keywords.missing.length > 0 && (
          <div>
            <h4>Missing keywords</h4>
            <ul>{keywords.missing.map(k => <li key={k}>{k}</li>)}</ul>
          </div>
        )}
        {keywords.present.length > 0 && (
          <div>
            <h4>Present keywords</h4>
            <ul>{keywords.present.map(k => <li key={k}>{k}</li>)}</ul>
          </div>
        )}
      </section>

      <section>
        <h3>Timeline (Stages)</h3>
        <ul>
          {data.stages.map(s => (
            <li key={s.id}>
              <b>{s.name}</b>
              {s.scheduled_at ? ` @ ${new Date(s.scheduled_at).toLocaleString()}` : ""}
              {s.outcome ? ` • ${s.outcome}` : ""}
              {s.notes ? <div>{s.notes}</div> : null}
            </li>
          ))}
        </ul>
        <div style={{ display: "grid", gap: 8, maxWidth: 420 }}>
          <select value={stage.name} onChange={e => setStage({ ...stage, name: e.target.value })}>
            {["Saved","Applied","Phone Screen","Tech","On-site","Offer","Accepted","Rejected"].map(x => <option key={x}>{x}</option>)}
          </select>
          <input placeholder="Schedule (optional, YYYY-MM-DD HH:MM)" value={stage.scheduled_at} onChange={e => setStage({ ...stage, scheduled_at: e.target.value })} />
          <textarea rows={3} placeholder="Notes (optional)" value={stage.notes} onChange={e => setStage({ ...stage, notes: e.target.value })} />
          <button onClick={addStage}>Add Stage</button>
        </div>
      </section>

      <section>
        <h3>Notes</h3>
        <ul>
          {data.notes.map(n => (
            <li key={n.id}>
              <small>{new Date(n.created_at).toLocaleString()}</small>
              <div>{n.body}</div>
            </li>
          ))}
        </ul>
        <div style={{ display: "grid", gap: 8, maxWidth: 600 }}>
          <textarea rows={3} placeholder="Add a note…" value={note} onChange={e => setNote(e.target.value)} />
          <button onClick={addNote}>Add Note</button>
        </div>
      </section>

      <p style={{ color: "crimson" }}>{msg}</p>
    </div>
  );
}
