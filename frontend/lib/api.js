const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

function getTokens() {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("tokens");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setTokens(tokens) {
  if (typeof window === "undefined") return;
  localStorage.setItem("tokens", JSON.stringify(tokens));
}

export function logout() {
  if (typeof window !== "undefined") localStorage.removeItem("tokens");
  window.location.href = "/login";
}

async function tryRefreshAndRetry(path, init) {
  const { refresh_token } = getTokens();
  if (!refresh_token) throw new Error("No refresh token");
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token }),
  });
  if (!res.ok) throw new Error("Refresh failed");
  const data = await res.json();
  setTokens({ access_token: data.access_token, refresh_token: data.refresh_token });
  // retry original call
  return apiFetch(path, init, false);
}

export async function apiFetch(path, init = {}, allowRetry = true) {
  const { access_token } = getTokens();
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", headers.get("Content-Type") || "application/json");
  if (access_token) headers.set("Authorization", `Bearer ${access_token}`);
  const resp = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (resp.status === 401 && allowRetry) {
    try {
      return await tryRefreshAndRetry(path, init);
    } catch {
      logout();
      throw new Error("Auth expired");
    }
  }
  return resp;
}

export async function login(email, password) {
  const r = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(await r.text());
  const data = await r.json();
  setTokens({ access_token: data.access_token, refresh_token: data.refresh_token });
}

export async function register(email, password) {
  const r = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(await r.text());
  const data = await r.json();
  setTokens({ access_token: data.access_token, refresh_token: data.refresh_token });
}

export const api = {
  listJobs: () => apiFetch("/jobs").then(r => r.json()),
  scrapeJob: (url) =>
    apiFetch("/jobs/scrape", { method: "POST", body: JSON.stringify({ url }) }).then(r => r.json()),
  createJob: (payload) =>
    apiFetch("/jobs", { method: "POST", body: JSON.stringify(payload) }).then(r => r.json()),

  listResumes: () => apiFetch("/resumes").then(r => r.json()),
  uploadResume: async (label, file) => {
    const form = new FormData();
    form.append("label", label);
    form.append("file", file);
    const r = await fetch(`${API_BASE}/resumes`, { method: "POST", body: form });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  createApp: (payload) =>
    apiFetch("/applications", { method: "POST", body: JSON.stringify(payload) }).then(r => r.json()),
  listAppsByStatus: (status) =>
    apiFetch(`/applications?status=${encodeURIComponent(status)}`).then(r => r.json()),
  moveApp: (id, status) =>
    apiFetch(`/applications/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }).then(r => r.json()),
};
