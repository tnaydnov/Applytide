import { useState } from "react";
import { login, register } from "../lib/api";

export default function LoginPage() {
  const [mode, setMode] = useState("login"); // or "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password);
      window.location.href = "/pipeline";
    } catch (err) {
      setMsg(String(err));
    }
  }

  return (
    <div style={{ maxWidth: 420 }}>
      <h1>{mode === "login" ? "Login" : "Register"}</h1>
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" required />
        <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" required />
        <button type="submit">{mode === "login" ? "Login" : "Register"}</button>
      </form>
      <p style={{ color: "crimson" }}>{msg}</p>
      <button onClick={() => setMode(mode === "login" ? "register" : "login")} style={{ marginTop: 12 }}>
        Switch to {mode === "login" ? "Register" : "Login"}
      </button>
    </div>
  );
}
