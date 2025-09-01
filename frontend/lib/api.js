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
  if (typeof window !== "undefined") {
    const { refresh_token } = getTokens();
    
    // Call logout endpoint if we have a refresh token
    if (refresh_token) {
      fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token }),
      }).catch(() => {}); // Don't worry if this fails
    }
    
    localStorage.removeItem("tokens");
    
    // Trigger auth change event for immediate navbar update
    window.dispatchEvent(new Event('authChange'));
  }
  window.location.href = "/login";
}

export async function logoutAll() {
  try {
    await apiFetch("/auth/logout_all", { method: "POST" });
  } catch (error) {
    console.log("Logout all failed:", error);
  } finally {
    if (typeof window !== "undefined") {
      localStorage.removeItem("tokens");
    }
    window.location.href = "/login";
  }
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
  
  // Store tokens with user email for navbar display
  setTokens({ 
    access_token: data.access_token, 
    refresh_token: data.refresh_token,
    email: email, // Store email for display purposes
    loginTime: Date.now() // Store login time for session management
  });
  
  // Trigger custom auth change event for AuthGuard and NavBar
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event('authChange'));
  }
}

export async function register(email, password) {
  const r = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(await r.text());
  const data = await r.json();
  
  // Store tokens with user email for navbar display
  setTokens({ 
    access_token: data.access_token, 
    refresh_token: data.refresh_token,
    email: email, // Store email for display purposes
    loginTime: Date.now() // Store login time for session management
  });
  
  // Trigger custom auth change event for AuthGuard and NavBar
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event('authChange'));
  }
}

export const api = {
  // jobs
  listJobs: () => apiFetch("/jobs").then(r => r.json()),
  scrapeJob: (url) =>
    apiFetch("/jobs/scrape", { method: "POST", body: JSON.stringify({ url }) }).then(r => r.json()),
  createJob: (payload) =>
    apiFetch("/jobs", { method: "POST", body: JSON.stringify(payload) }).then(r => r.json()),

  // resumes
  listResumes: () => apiFetch("/resumes").then(r => r.json()),
  uploadResume: async (label, file, setAsDefault = false) => {
    const form = new FormData();
    form.append("label", label);
    form.append("file", file);
    if (setAsDefault) form.append("set_as_default", "true");
    const { access_token } = getTokens();
    const r = await fetch(`${API_BASE}/resumes`, {
        method: "POST",
        headers: access_token ? { Authorization: `Bearer ${access_token}` } : undefined,
        body: form, // let the browser set multipart boundary
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  deleteResume: (id) =>
    apiFetch(`/resumes/${id}`, { method: "DELETE" }).then(r => r.json()),
  setDefaultResume: (id) =>
    apiFetch(`/resumes/${id}/default`, { method: "POST" }).then(r => r.json()),

  // applications
  createApp: (payload) =>
    apiFetch("/applications", { method: "POST", body: JSON.stringify(payload) }).then(r => r.json()),
  listAppsByStatus: (status) =>
    apiFetch(`/applications?status=${encodeURIComponent(status)}`).then(r => r.json()),
  listCardsByStatus: (status) =>
    apiFetch(`/applications/cards?status=${encodeURIComponent(status)}`).then(r => r.json()),
  moveApp: (id, status) =>
    apiFetch(`/applications/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }).then(r => r.json()),
  updateApplication: (id, payload) =>
    apiFetch(`/applications/${id}`, { method: "PATCH", body: JSON.stringify(payload) }).then(r => r.json()),
  getAppDetail: (id) =>
    apiFetch(`/applications/${id}/detail`).then(r => r.json()),
  addStage: (id, payload) =>
    apiFetch(`/applications/${id}/stages`, { method: "POST", body: JSON.stringify(payload) }).then(r => r.json()),
  addNote: (id, body) =>
    apiFetch(`/applications/${id}/notes`, { method: "POST", body: JSON.stringify({ body }) }).then(r => r.json()),

  // dashboard
  getMetrics: () => apiFetch("/dashboard/metrics").then(r => r.json()),
  getApplications: () => apiFetch("/applications").then(r => r.json()),
  getApplicationsWithStages: () => apiFetch("/applications/with-stages").then(r => r.json()),
  updateApplication: (id, data) => apiFetch(`/applications/${id}`, { method: "PUT", body: JSON.stringify(data) }).then(r => r.json()),
  
  // Stage management
  deleteStage: (applicationId, stageId) => apiFetch(`/applications/${applicationId}/stages/${stageId}`, { method: "DELETE" }),
  
  // Analytics
  getAnalytics: (timeRange = '6m') => apiFetch(`/analytics?range=${timeRange}`).then(r => r.json()),
  exportAnalyticsPDF: async (timeRange = '6m') => {
    const { access_token } = getTokens();
    const response = await fetch(`${API_BASE}/analytics/export/pdf?range=${timeRange}`, {
      headers: access_token ? { Authorization: `Bearer ${access_token}` } : undefined,
    });
    if (!response.ok) throw new Error(await response.text());
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-report-${timeRange}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
  exportAnalyticsCSV: async (timeRange = '6m') => {
    const { access_token } = getTokens();
    const response = await fetch(`${API_BASE}/analytics/export/csv?range=${timeRange}`, {
      headers: access_token ? { Authorization: `Bearer ${access_token}` } : undefined,
    });
    if (!response.ok) throw new Error(await response.text());
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-data-${timeRange}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Search
  advancedSearch: (payload) =>
    apiFetch("/search/advanced", { method: "POST", body: JSON.stringify(payload) }).then(r => r.json()),
  quickSearch: (query) =>
    apiFetch(`/search/quick?query=${encodeURIComponent(query)}`).then(r => r.json()),
  getSearchSuggestions: (query) =>
    apiFetch(`/search/suggestions?q=${encodeURIComponent(query)}`).then(r => r.json()),
  getFilterOptions: () =>
    apiFetch("/search/filters").then(r => r.json()),
  getSavedSearches: () =>
    apiFetch("/search/saved").then(r => r.json()),
  saveSearch: (payload) =>
    apiFetch("/search/saved", { method: "POST", body: JSON.stringify(payload) }).then(r => r.json()),
  deleteSavedSearch: (id) =>
    apiFetch(`/search/saved/${id}`, { method: "DELETE" }).then(r => r.json()),
  
  // Resume management
  listResumes: () => apiFetch("/resumes").then(r => r.json()),
  uploadResume: (filename, file, isDefault = false) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("label", filename);
    if (isDefault) formData.append("is_default", "true");
    return apiFetch("/resumes", { method: "POST", body: formData }).then(r => r.json());
  },
  deleteResume: (id) => apiFetch(`/resumes/${id}`, { method: "DELETE" }),
  setDefaultResume: (id) => apiFetch(`/resumes/${id}/default`, { method: "PUT" }),
};

// WebSocket helper
export function connectWS(onMsg) {
  const base = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000").replace("http", "ws");
  const ws = new WebSocket(`${base}/ws/updates`);
  ws.onmessage = (e) => {
    try { onMsg(JSON.parse(e.data)); } catch {}
  };
  return ws;
}


// IO (CSV)
export async function downloadApplicationsCSV() {
  const { access_token } = getTokens();
  const r = await fetch(`${API_BASE}/io/export/applications.csv`, {
    headers: access_token ? { Authorization: `Bearer ${access_token}` } : undefined,
  });
  if (!r.ok) throw new Error(await r.text());
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "applications.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importApplicationsCSV(file) {
  const { access_token } = getTokens();
  const form = new FormData();
  form.append("file", file);
  const r = await fetch(`${API_BASE}/io/import/applications`, {
    method: "POST",
    headers: access_token ? { Authorization: `Bearer ${access_token}` } : undefined,
    body: form,
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// Default export for convenience
export default api;
