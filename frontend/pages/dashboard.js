import { useEffect, useState } from "react";
import { api, downloadApplicationsCSV, importApplicationsCSV } from "../lib/api";

export default function Dashboard() {
  const [m, setM] = useState(null);
  const [msg, setMsg] = useState("");
  useEffect(() => { api.getMetrics().then(setM); }, []);
  if (!m) return <p>Loading…</p>;

  async function doExport() {
    try { await downloadApplicationsCSV(); } catch (e) { setMsg(String(e)); }
  }
  async function doImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await importApplicationsCSV(file);
      setMsg(`Imported ${res.created} rows`);
      // refresh metrics
      setM(await api.getMetrics());
    } catch (e2) { setMsg(String(e2)); }
    e.target.value = "";
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h1>Dashboard</h1>
      <div style={{ display: "flex", gap: 12 }}>
        <Card title="Jobs" value={m.total_jobs} />
        <Card title="Resumes" value={m.total_resumes} />
        <Card title="Applications" value={m.total_applications} />
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button onClick={doExport}>Export Applications CSV</button>
        <label style={{ border: "1px dashed #bbb", padding: 8, borderRadius: 6 }}>
          Import CSV
          <input type="file" accept=".csv" onChange={doImport} style={{ display: "none" }} />
        </label>
        <span style={{ color: msg.startsWith("Imported") ? "green" : "crimson" }}>{msg}</span>
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
