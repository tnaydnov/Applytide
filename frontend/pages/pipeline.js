import { useEffect, useState } from "react";
import { api } from "../lib/api";

const STATUSES = ["Saved", "Applied", "Phone Screen", "Tech", "On-site", "Offer", "Accepted", "Rejected"];

function Column({ status, items, onMove }) {
  return (
    <div style={{ minWidth: 260, background: "#fafafa", border: "1px solid #eee", borderRadius: 8, padding: 8 }}>
      <h3 style={{ marginTop: 0 }}>{status}</h3>
      <div style={{ display: "grid", gap: 8 }}>
        {items.map(a => (
          <div key={a.id} style={{ background: "white", border: "1px solid #e5e5e5", borderRadius: 6, padding: 8 }}>
            <div><b>{a.job_id}</b></div>
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              {STATUSES.filter(s => s !== status).slice(0,4).map(s => (
                <button key={s} onClick={() => onMove(a.id, s)} style={{ fontSize: 12 }}>{s}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [columns, setColumns] = useState({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    const result = {};
    await Promise.all(
      STATUSES.map(async (s) => {
        result[s] = await api.listAppsByStatus(s);
      })
    );
    setColumns(result);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function move(id, status) {
    setMsg("");
    try {
      await api.moveApp(id, status);
      await load();
    } catch (err) {
      setMsg(String(err));
    }
  }

  if (loading) return <p>Loading…</p>;

  return (
    <div style={{ display: "flex", gap: 12, overflowX: "auto" }}>
      {STATUSES.map(s => (
        <Column key={s} status={s} items={columns[s] || []} onMove={move} />
      ))}
      <p style={{ color: "crimson" }}>{msg}</p>
    </div>
  );
}
