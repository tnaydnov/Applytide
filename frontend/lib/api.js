/* api.js */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

/* -----------------------------------
   Tokens & Auth helpers
----------------------------------- */

export function getTokens() {
  if (typeof window === "undefined") return {};
  try {
    // new format
    const raw = localStorage.getItem("tokens");
    if (raw) return JSON.parse(raw);

    // --- LEGACY COMPAT ---
    const legacyAccess = localStorage.getItem("token") || localStorage.getItem("access_token");
    const legacyRefresh = localStorage.getItem("refresh_token");
    if (legacyAccess || legacyRefresh) {
      const migrated = {
        access_token: legacyAccess || undefined,
        refresh_token: legacyRefresh || undefined,
      };
      localStorage.setItem("tokens", JSON.stringify(migrated));
      localStorage.removeItem("token");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      return migrated;
    }
    // ---------------------
    return {};
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

    if (refresh_token) {
      fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token }),
      }).catch(() => {});
    }

    localStorage.removeItem("tokens");
    window.dispatchEvent(new Event("authChange"));
  }
  window.location.href = "/login";
}

export async function logoutAll() {
  try {
    await apiFetch("/auth/logout_all", { method: "POST" });
  } catch {
    // ignore
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
  if (!headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
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
    email,
    loginTime: Date.now(),
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("authChange"));
  }

  return data;
}

/* -----------------------------------
   Small utils
----------------------------------- */

function toQuery(params) {
  if (!params) return "";
  if (typeof params === "string") return params.replace(/^\?/, "");
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    usp.set(k, String(v));
  });
  return usp.toString();
}

/* -----------------------------------
   API surface
----------------------------------- */

export const api = {
  // Authentication
  register: async (data) => {
    const r = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error(await r.text());
    const response = await r.json();

    setTokens({
      access_token: response.access_token,
      refresh_token: response.refresh_token,
      email: data.email,
      loginTime: Date.now(),
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("authChange"));
    }

    return response;
  },

  // Keep compatibility: api.login -> top-level login()
  login,

  // jobs
  listJobs: () => apiFetch("/jobs").then((r) => r.json()),
  scrapeJob: (url) =>
    apiFetch("/jobs/scrape", { method: "POST", body: JSON.stringify({ url }) }).then((r) => r.json()),
  aiAnalyzeJob: (url) =>
    apiFetch("/jobs/ai-analyze", { method: "POST", body: JSON.stringify({ url }) }).then((r) => r.json()),
  createJob: (payload) =>
    apiFetch("/jobs", { method: "POST", body: JSON.stringify(payload) }).then((r) => r.json()),
  createManualJob: (payload) =>
    apiFetch("/jobs/manual", { method: "POST", body: JSON.stringify(payload) }).then((r) => r.json()),
  updateJob: (jobId, payload) =>
    apiFetch(`/jobs/${jobId}`, { method: "PUT", body: JSON.stringify(payload) }).then((r) => r.json()),
  deleteJob: (jobId) => apiFetch(`/jobs/${jobId}`, { method: "DELETE" }),

  // current user
  getCurrentUser: () => apiFetch("/auth/me").then((r) => r.json()),

  /* -----------------------------------
     DOCUMENTS (no more /resumes)
  ----------------------------------- */

  // List documents
  // params: { document_type?, page?, page_size? }
  getDocuments: (params) => {
    const qs = toQuery(params);
    return apiFetch(`/documents/${qs ? `?${qs}` : ""}`).then((r) => r.json());
  },

  // Get one document
  getDocument: (id) => apiFetch(`/documents/${id}`).then((r) => r.json()),

  // Upload document
  // args: { file: File, document_type: 'resume'|'cover_letter'|..., name?: string, metadata?: object }
  uploadDocument: ({ file, document_type, name, metadata }) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("document_type", document_type);
    if (name) formData.append("name", name);
    if (metadata) formData.append("metadata", JSON.stringify(metadata));

    const { access_token } = getTokens();
    return fetch(`${API_BASE}/documents/upload`, {
      method: "POST",
      headers: access_token ? { Authorization: `Bearer ${access_token}` } : {},
      body: formData,
    }).then(async (r) => {
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    });
  },

  // Delete
  deleteDocument: (id) => apiFetch(`/documents/${id}`, { method: "DELETE" }),

  // Download (keeps robust filename parsing)
  downloadDocument: async (id) => {
    const { access_token } = getTokens();
    const response = await fetch(`${API_BASE}/documents/${id}/download`, {
      headers: access_token ? { Authorization: `Bearer ${access_token}` } : undefined,
    });
    if (!response.ok) throw new Error(await response.text());

    const cd = response.headers.get("content-disposition") || "";
    let filename = "document";

    const starMatch = cd.match(/filename\*\s*=\s*([^']+)''([^;]+)/i);
    if (starMatch) {
      try {
        filename = decodeURIComponent(starMatch[2]);
      } catch {
        filename = starMatch[2];
      }
    } else {
      const quoted = cd.match(/filename\s*=\s*"([^"]+)"/i);
      if (quoted) {
        filename = quoted[1];
      } else {
        const unquoted = cd.match(/filename\s*=\s*([^;]+)/i);
        if (unquoted) filename = unquoted[1].trim();
      }
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Optimize document content
  optimizeDocument: (payload) =>
    apiFetch(`/documents/optimize`, { method: "POST", body: JSON.stringify(payload) }).then((r) => r.json()),

  // Templates (optionally filter by { category, document_type })
  getDocumentTemplates: (params) => {
    const qs = toQuery(params);
    return apiFetch(`/documents/templates/${qs ? `?${qs}` : ""}`).then((r) => r.json());
  },

  // Cover letter generation
  generateCoverLetter: async (payload) => {
    const response = await apiFetch("/documents/cover-letter/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  /* ---------- NEW: document status ---------- */
  setDocumentStatus: (id, new_status) =>
    apiFetch(`/documents/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ new_status }),
    }).then((r) => r.json()),

  /* ---------- NEW: preview (opens a blob tab) ---------- */
  previewDocument: async (id) => {
    const { access_token } = getTokens();
    const resp = await fetch(`${API_BASE}/documents/${id}/preview`, {
      headers: access_token ? { Authorization: `Bearer ${access_token}` } : undefined,
    });
    if (!resp.ok) throw new Error(await resp.text());
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return true;
  },

  /* ---------- NEW (helper): list resumes via documents ---------- */
  getResumes: () =>
    apiFetch(`/documents/?document_type=resume&page=1&page_size=200`).then((r) => r.json()),

  /* ---------- CHANGED: analyzeDocument now supports use_ai + jobId ---------- */
  analyzeDocument: (documentId, { jobId, use_ai } = {}) =>
    apiFetch(
      `/documents/${documentId}/analyze` +
        (jobId ? `?job_id=${encodeURIComponent(jobId)}` : "") +
        (use_ai ? (jobId ? "&" : "?") + "use_ai=true" : ""),
      { method: "POST" }
    ).then((r) => r.json()),


  /* -----------------------------------
     Applications / Dashboard / Preferences / etc.
     (unchanged from your original)
  ----------------------------------- */

  // applications
  createApp: (payload) =>
    apiFetch("/applications", { method: "POST", body: JSON.stringify(payload) }).then((r) => r.json()),
  listAppsByStatus: (status) => apiFetch(`/applications?status=${encodeURIComponent(status)}`).then((r) => r.json()),
  listCardsByStatus: (status) =>
    apiFetch(`/applications/cards?status=${encodeURIComponent(status)}`).then((r) => r.json()),
  moveApp: (id, status) =>
    apiFetch(`/applications/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }).then((r) => r.json()),
  deleteApp: (id) => apiFetch(`/kanban/applications/${id}`, { method: "DELETE" }),
  updateApplication: (id, payload) =>
    apiFetch(`/applications/${id}`, { method: "PATCH", body: JSON.stringify(payload) }).then((r) => r.json()),
  getAppDetail: (id) => apiFetch(`/applications/${id}/detail`).then((r) => r.json()),
  addStage: (id, payload) =>
    apiFetch(`/applications/${id}/stages`, { method: "POST", body: JSON.stringify(payload) }).then((r) => r.json()),
  getStages: (id) => apiFetch(`/applications/${id}/stages`).then((r) => r.json()),
  addNote: (id, body) =>
    apiFetch(`/applications/${id}/notes`, { method: "POST", body: JSON.stringify({ body }) }).then((r) => r.json()),
  getNotes: (id) => apiFetch(`/applications/${id}/notes`).then((r) => r.json()),

  // dashboard
  getMetrics: () => apiFetch("/dashboard/metrics").then((r) => r.json()),
  getApplications: () => apiFetch("/applications").then((r) => r.json()),
  getApplicationCards: () => apiFetch("/applications/cards").then((r) => r.json()),
  getUsedStatuses: () => apiFetch("/applications/statuses").then((r) => r.json()),
  getApplicationsWithStages: () => apiFetch("/applications/with-stages").then((r) => r.json()),

  // preferences
  getPreferences: () => apiFetch("/preferences").then((r) => r.json()),
  getPreference: (key) => apiFetch(`/preferences/${key}`).then((r) => r.json()),
  savePreference: (key, value) =>
    apiFetch("/preferences", { method: "POST", body: JSON.stringify({ preference_key: key, preference_value: value }) })
      .then((r) => r.json()),
  updatePreference: (key, value) =>
    apiFetch(`/preferences/${key}`, { method: "PUT", body: JSON.stringify({ preference_value: value }) }).then((r) =>
      r.json()
    ),

  // stage management
  deleteStage: (applicationId, stageId) =>
    apiFetch(`/applications/${applicationId}/stages/${stageId}`, { method: "DELETE" }),

  // analytics
  getAnalytics: (timeRange = "6m") => apiFetch(`/analytics?range=${timeRange}`).then((r) => r.json()),
  exportAnalyticsPDF: async (timeRange = "6m") => {
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
  exportAnalyticsCSV: async (timeRange = "6m") => {
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

  // search
  advancedSearch: (payload) =>
    apiFetch("/search/advanced", { method: "POST", body: JSON.stringify(payload) }).then((r) => r.json()),
  quickSearch: (query) => apiFetch(`/search/quick?query=${encodeURIComponent(query)}`).then((r) => r.json()),
  getSearchSuggestions: (query) =>
    apiFetch(`/search/suggestions?q=${encodeURIComponent(query)}`).then((r) => r.json()),
  getFilterOptions: () => apiFetch("/search/filters").then((r) => r.json()),
  getSavedSearches: () => apiFetch("/search/saved").then((r) => r.json()),
  saveSearch: (payload) =>
    apiFetch("/search/saved", { method: "POST", body: JSON.stringify(payload) }).then((r) => r.json()),
  deleteSavedSearch: (id) => apiFetch(`/search/saved/${id}`, { method: "DELETE" }).then((r) => r.json()),

  // user profile
  getUserProfile: () => apiFetch("/profile/").then((r) => r.json()),
  updateUserProfile: (profileData) =>
    apiFetch("/profile/", { method: "PUT", body: JSON.stringify(profileData) }).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
      return r.json();
    }),
  getUserJobPreferences: () => apiFetch("/profile/job-preferences").then((r) => r.json()),
  updateJobPreferences: (preferences) =>
    apiFetch("/profile/job-preferences", { method: "PUT", body: JSON.stringify(preferences) }).then((r) => r.json()),
  getUserCareerGoals: () => apiFetch("/profile/career-goals").then((r) => r.json()),
  updateCareerGoals: (goals) =>
    apiFetch("/profile/career-goals", { method: "PUT", body: JSON.stringify(goals) }).then((r) => r.json()),
  getProfileCompleteness: () => apiFetch("/profile/completeness").then((r) => r.json()),
};

/* -----------------------------------
   WebSocket helper
----------------------------------- */

export function connectWS(onMsg) {
  const base = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000").replace("http", "ws");
  const ws = new WebSocket(`${base}/ws/updates`);
  ws.onmessage = (e) => {
    try {
      onMsg(JSON.parse(e.data));
    } catch {}
  };
  return ws;
}

/* -----------------------------------
   IO (CSV)
----------------------------------- */

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

export default api;
