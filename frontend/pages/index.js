import { useEffect, useState } from "react";

export default function Home() {
  const [status, setStatus] = useState("checking...");
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
    fetch(`${base}/health`)
      .then((r) => r.json())
      .then((d) => setStatus(d.status))
      .catch(() => setStatus("offline"));
  }, []);
  return (
    <main style={{ fontFamily: "system-ui", padding: 24 }}>
      <h1>JobFlow Copilot</h1>
      <p>Frontend is up. API health: <b>{status}</b></p>
      <p>Next step: add Auth & the Kanban board.</p>
    </main>
  );
}
