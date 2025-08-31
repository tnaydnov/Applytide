import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function ResumesPage() {
  const [label, setLabel] = useState("");
  const [file, setFile] = useState(null);
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState("");

  async function load() { setItems(await api.listResumes()); }
  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    try {
      if (!file) { setMsg("Choose a file"); return; }
      await api.uploadResume(label || file.name, file);
      setLabel(""); setFile(null);
      await load();
      setMsg("Uploaded");
    } catch (err) { setMsg(String(err)); }
  }

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 600 }}>
      <h1>Resumes</h1>
      <form onSubmit={submit} style={{ display: "grid", gap: 8 }}>
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Label (e.g., Backend v2)" />
        <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} accept=".pdf,.docx,.txt" />
        <button type="submit">Upload</button>
      </form>
      <div style={{ display: "grid", gap: 8 }}>
        {items.map(r => (
          <div key={r.id} style={{ border: "1px solid #eee", padding: 10 }}>
            <b>{r.label}</b>
            <div><small>{r.file_path}</small></div>
          </div>
        ))}
      </div>
      <p style={{ color: msg === "Uploaded" ? "green" : "crimson" }}>{msg}</p>
    </div>
  );
}
