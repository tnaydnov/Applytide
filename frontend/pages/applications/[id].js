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

  async function load() {
    if (!id) return;
    const d = await api.getAppDetail(id);
    setData(d);
  }

  useEffect(() => { load(); }, [id]);

  async function addNote() {
    setMsg("");
    try {
      await api.addNote(id, note);
      setNote("");
      await load();
    } catch (e) { setMsg(String(e)); }
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

  if (!data) return <p>Loading…</p>;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h1>Application</h1>
      <div>
        <b>{data.job.title}</b>
        {data.job.company_name ? <span> • {data.job.company_name}</span> : null}
        <div>Status: {data.application.status}</div>
        {data.resume_label ? <div>Resume: {data.resume_label}</div> : null}
      </div>

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
