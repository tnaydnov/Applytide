/* api.js */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

/* -----------------------------------
   Tokens & Auth helpers
----------------------------------- */

export async function logoutAll() {
  try {
    await apiFetch("/auth/logout_all", { method: "POST" });
  } catch {
    // ignore errors
  } finally {
    // No need to manually remove items from localStorage
    // The cookies will be cleared by the server response
    window.location.href = "/login";
  }
}

export async function logout() {
  try {
    const response = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    return response.ok;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
}

async function refreshToken() {
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include'
    });
    
    return response.ok;
  } catch (error) {
    console.error('Token refresh error:', error);
    return false;
  }
}

export async function apiFetch(endpoint, options = {}) {
  try {
    // Set credentials to include for all requests
    const fetchOptions = {
      ...options,
      credentials: 'include',
      headers: {
        ...options.headers,
        'Content-Type': options.headers?.['Content-Type'] || 'application/json'
      }
    };
    
    const response = await fetch(`${API_BASE}${endpoint}`, fetchOptions);
    
    // Only attempt refresh on 401 if we're not already trying to refresh/login
    if (response.status === 401 && 
        !endpoint.includes('/auth/refresh') && 
        !endpoint.includes('/auth/login')) {
      
      try {
        // Try to refresh the token
        const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include'
        });
        
        // If refresh succeeded, retry original request
        if (refreshResponse.ok) {
          return await fetch(`${API_BASE}${endpoint}`, fetchOptions);
        }
      } catch (refreshError) {
        console.error('Token refresh failed', refreshError);
      }
    }
    
    return response;
  } catch (error) {
    console.error(`API fetch error for ${endpoint}:`, error);
    throw error;
  }
}

export async function login(email, password, remember = false) {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        password: password,
        remember_me: remember 
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }
    
    return true;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
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

  logout,

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

    return fetch(`${API_BASE}/documents/upload`, {
      method: "POST",
      credentials: 'include',
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
    const response = await fetch(`${API_BASE}/documents/${id}/download`, {
      credentials: 'include',
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
    }),

  /* ---------- NEW: preview (opens a blob tab) ---------- */
  previewDocument: async (id) => {
    const resp = await fetch(`${API_BASE}/documents/${id}/preview`, {
      credentials: 'include',
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
  analyzeDocument: (documentId, { jobId} = {}) =>
    apiFetch(
      `/documents/${documentId}/analyze` +
        (jobId ? `?job_id=${encodeURIComponent(jobId)}` : "") +
        (jobId ? "&" : "?") + "use_ai=true",
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
    const response = await fetch(`${API_BASE}/analytics/export/pdf?range=${timeRange}`, {
      credentials: 'include',
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
    const response = await fetch(`${API_BASE}/analytics/export/csv?range=${timeRange}`, {
      credentials: 'include',
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
  const r = await fetch(`${API_BASE}/io/export/applications.csv`, {
    credentials: 'include',
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
  const form = new FormData();
  form.append("file", file);
  const r = await fetch(`${API_BASE}/io/import/applications`, {
    method: "POST",
    credentials: 'include',
    body: form,
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export default api;
