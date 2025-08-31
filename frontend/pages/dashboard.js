import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function Dashboard() {
  const [m, setM] = useState(null);
  useEffect(() => { api.getMetrics().then(setM); }, []);
  if (!m) return <p>Loading…</p>;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h1>Dashboard</h1>
      <div style={{ display: "flex", gap: 12 }}>
        <Card title="Jobs" value={m.total_jobs} />
        <Card title="Resumes" value={m.total_resumes} />
        <Card title="Applications" value={m.total_applications} />
      </div>
      <h3>Applications by status</h3>
      <ul>
        {Object.entries(m.applications_by_status).map(([k,v]) => <li key={k}>{k}: {v}</li>)}
      </ul>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, minWidth: 120 }}>
      <div style={{ color: "#666" }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
