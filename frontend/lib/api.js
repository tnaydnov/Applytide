/* api.js */

const API_BASE = '/api';

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

    // Clear any client-side state if needed
    return response.ok;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  } finally {
    // Always trigger a redirect in the calling code
    // (the actual redirect happens in AuthContext.js)
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
    const interceptorActive = typeof window !== 'undefined' && window.__APPLYTIDE_FETCH_INTERCEPTOR__;
    const isFormData = options?.body instanceof FormData;
    const headers = {
      ...(options.headers || {}),
      ...(isFormData ? {} : { 'Content-Type': options.headers?.['Content-Type'] || 'application/json' }),
    };

    const fetchOptions = {
      credentials: 'include', // ensure cookies are sent
      ...options,
      headers,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, fetchOptions);

    if (!interceptorActive && response.status === 401 &&
      !endpoint.includes('/auth/refresh') &&
      !endpoint.includes('/auth/login')) {
      try {
        const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include'
        });
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

    // Return the actual response data
    const data = await response.json();
    return data;
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
      credentials: "include",
    });
    if (!r.ok) throw new Error(await r.text());

    // If your server doesn't set cookies during register, auto-login:
    // (Safe no-op if cookies already set)
    try {
      await login(data.email, data.password, true);
    } catch (_) {
      // ignore; caller can handle redirect/UI
    }

    return r.json();
  },

  listResumes: async () => {
    const res = await api.getResumes(); // now returns the full DocumentListResponse
    const docs = Array.isArray(res?.documents) ? res.documents
      : Array.isArray(res) ? res
        : Array.isArray(res?.items) ? res.items // legacy fallback
          : [];
    return docs.map(d => ({
      id: d.id,
      label: d.name || d.label || d.filename || 'Resume'
    }));
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
  getJobById: (id) => apiFetch(`/jobs/${id}`).then(r => r.json()),

  // current user
  getCurrentUser: () => apiFetch("/auth/me").then((r) => r.json()),

  /* -----------------------------------
     DOCUMENTS (no more /resumes)
  ----------------------------------- */

  // List documents
  // params: { document_type?, page?, page_size? }
  getDocuments: (params) => {
    const qs = toQuery(params);
    const base = "/documents/";              // <- note the slash
    return apiFetch(`${base}${qs ? `?${qs}` : ""}`).then(r => r.json());
  },

  // Attach an existing Document to an Application
  attachExistingDocument: (appId, documentId) =>
    apiFetch(`/applications/${appId}/attachments/from-document`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document_id: String(documentId) })
    }).then(r => r.json()),


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

    const data = await response.json();
    console.log("Cover letter API response:", data);

    // Extract the actual cover letter text from various possible response formats
    let coverLetterText = '';

    if (typeof data === 'string') {
      // Direct string response
      coverLetterText = data;
    } else if (data?.content) {
      // { content: "..." } format
      coverLetterText = data.content;
    } else if (data?.text) {
      // { text: "..." } format
      coverLetterText = data.text;
    } else if (data?.choices && data.choices[0]?.message?.content) {
      // OpenAI API format
      coverLetterText = data.choices[0].message.content;
    } else if (data?.assistant) {
      // Format from your OpenAI log
      coverLetterText = data.assistant;
    } else if (data?.output) {
      // Another common format
      coverLetterText = data.output;
    }

    // If we still don't have text, return the whole object and let component handle it
    return coverLetterText || data;
  },

  /* ---------- NEW: document status ---------- */
  setDocumentStatus: (id, new_status) =>
    apiFetch(`/documents/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ new_status }),
    }).then(r => r.json()),

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
  getResumes: async () => {
    const r = await apiFetch(`/documents/?document_type=resume&page=1&page_size=200`);
    const data = await r.json();
    return Array.isArray(data?.documents) ? data.documents : [];
  },

  /* ---------- CHANGED: analyzeDocument now supports use_ai + jobId ---------- */
  analyzeDocument: (documentId, { jobId } = {}) =>
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
    const cd = response.headers.get("content-disposition") || "";
    let filename = `analytics-report-${timeRange}.pdf`;

    const starMatch = cd.match(/filename\*\s*=\s*[^']+''([^;]+)/i);
    const quoted = cd.match(/filename\s*=\s*"([^"]+)"/i);
    const unquoted = cd.match(/filename\s*=\s*([^;]+)/i);
    if (starMatch) filename = decodeURIComponent(starMatch[1]);
    else if (quoted) filename = quoted[1];
    else if (unquoted) filename = unquoted[1].trim();

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
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
    const cd = response.headers.get("content-disposition") || "";
    let filename = `analytics-data-${timeRange}.csv`;

    const starMatch = cd.match(/filename\*\s*=\s*[^']+''([^;]+)/i);
    const quoted = cd.match(/filename\s*=\s*"([^"]+)"/i);
    const unquoted = cd.match(/filename\s*=\s*([^;]+)/i);
    if (starMatch) filename = decodeURIComponent(starMatch[1]);
    else if (quoted) filename = quoted[1];
    else if (unquoted) filename = unquoted[1].trim();

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // search
  advancedSearch: (payload) =>
    apiFetch("/search/advanced", { method: "POST", body: JSON.stringify(payload) }).then((r) => r.json()),
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

  // Auth profile management
  updateProfile: (profileData) =>
    apiFetch("/auth/profile", { method: "PUT", body: JSON.stringify(profileData) }).then((r) => r.json()),
  updatePreferences: (preferences) =>
    apiFetch("/auth/preferences", { method: "PUT", body: JSON.stringify(preferences) }).then((r) => r.json()),
  changePassword: (passwordData) =>
    apiFetch("/auth/change-password", { method: "POST", body: JSON.stringify(passwordData) }).then((r) => r.json()),
  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch("/auth/upload-avatar", {
      method: "POST",
      body: formData,
      // Don't set Content-Type, let browser set it with boundary for FormData
      headers: {}
    }).then((r) => r.json());
  },
  getUserCareerGoals: () => apiFetch("/profile/career-goals").then((r) => r.json()),
  updateCareerGoals: (goals) =>
    apiFetch("/profile/career-goals", { method: "PUT", body: JSON.stringify(goals) }).then((r) => r.json()),
};

/* -----------------------------------
   WebSocket helper
----------------------------------- */

export function connectWS(onMsg) {
  const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = `${wsProto}//${window.location.host}`;
  const url = `${host}/api/ws/updates`; // cookie-based auth on the server side

  let socket;
  let isIntentionallyClosed = false;
  let connectionTimeout;
  let heartbeatTimer;
  let retryCount = 0;

  const getRetryDelay = (attempt) => {
    // 1s * 2^attempt, capped at 30s
    const base = 1000 * Math.pow(2, attempt);
    return Math.min(base, 30000);
  };

  const clearHeartbeat = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  const startHeartbeat = () => {
    clearHeartbeat();
    heartbeatTimer = setInterval(() => {
      try { socket?.readyState === WebSocket.OPEN && socket.send('ping'); } catch {}
    }, 25000); // 25s
  };

  const tryConnect = () => {
    if (isIntentionallyClosed) return;

    const ws = new WebSocket(url);

    // connection timeout (10s)
    connectionTimeout = setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    }, 10000);

    ws.onopen = () => {
      clearTimeout(connectionTimeout);
      retryCount = 0;
      startHeartbeat();
    };

    ws.onmessage = (e) => {
      try {
        onMsg(JSON.parse(e.data));
      } catch (err) {
        // ignore non-JSON keepalives
      }
    };

    ws.onerror = () => {
      clearTimeout(connectionTimeout);
    };

    ws.onclose = (evt) => {
      clearTimeout(connectionTimeout);
      clearHeartbeat();

      if (isIntentionallyClosed) return;

      // retry indefinitely with backoff for transient codes
      const transient = [1000, 1001, 1005, 1006];
      if (transient.includes(evt.code)) {
        const delay = getRetryDelay(retryCount++);
        setTimeout(tryConnect, delay);
      } else {
        // hard failures: still retry, but with capped delay
        const delay = getRetryDelay(retryCount++);
        setTimeout(tryConnect, delay);
      }
    };

    socket = ws;
  };

  tryConnect();

  return {
    close: () => {
      isIntentionallyClosed = true;
      clearTimeout(connectionTimeout);
      clearHeartbeat();
      try { socket?.close(1000, 'Client initiated close'); } catch {}
    },
    send: (data) => socket?.send(data),
    get readyState() { return socket?.readyState || WebSocket.CLOSED; }
  };
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

async function uploadApplicationAttachment(appId, formData) {
  const r = await apiFetch(`/applications/${appId}/attachments`, {
    method: 'POST',
    body: formData,
  });
  if (!r.ok) throw new Error('Upload failed');
  return r.json();
}

export default {
  ...api,
  uploadApplicationAttachment,
};