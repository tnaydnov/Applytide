const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

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
      // persist in new shape so future reads work
      localStorage.setItem("tokens", JSON.stringify(migrated));
      // (optional) clean up old keys
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
  console.log("=== SET TOKENS DEBUG ===");
  console.log("setTokens called with:", tokens);
  
  if (typeof window === "undefined") {
    console.log("Window undefined, skipping token storage");
    return;
  }
  
  const tokenString = JSON.stringify(tokens);
  console.log("Storing token string:", tokenString);
  
  localStorage.setItem("tokens", tokenString);
  console.log("Tokens stored in localStorage");
  console.log("=== SET TOKENS DEBUG END ===");
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
    email: email, // Store email for display purposes
    loginTime: Date.now() // Store login time for session management
  });
  
  // Trigger custom auth change event for AuthGuard and NavBar
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event('authChange'));
  }
  
  return data;
}

export const api = {
  // Authentication
  register: async (data) => {
    console.log("=== API.REGISTER DEBUG START ===");
    console.log("A. Received data:", data);
    console.log("B. Data type:", typeof data);
    console.log("C. Data keys:", Object.keys(data));
    console.log("D. Data values:", Object.values(data));
    console.log("E. JSON stringify test:", JSON.stringify(data));
    
    const url = `${API_BASE}/auth/register`;
    console.log("F. Request URL:", url);
    
    const requestBody = JSON.stringify(data);
    console.log("G. Request body:", requestBody);
    
    const fetchOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
    };
    console.log("H. Fetch options:", fetchOptions);
    
    const r = await fetch(url, fetchOptions);
    console.log("I. Response status:", r.status);
    console.log("J. Response ok:", r.ok);
    
    if (!r.ok) {
      const errorText = await r.text();
      console.log("K. Error response text:", errorText);
      throw new Error(errorText);
    }
    
    const response = await r.json();
    console.log("L. Success response:", response);
    
    // Store tokens with user email for navbar display
    const tokens = { 
      access_token: response.access_token, 
      refresh_token: response.refresh_token,
      email: data.email, // Store email for display purposes
      loginTime: Date.now() // Store login time for session management
    };
    console.log("M. Tokens to store:", tokens);
    
    setTokens(tokens);
    console.log("N. Tokens stored");
    
    // Trigger custom auth change event for AuthGuard and NavBar
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event('authChange'));
      console.log("O. Auth change event dispatched");
    }
    
    console.log("P. Returning response:", response);
    console.log("=== API.REGISTER DEBUG END ===");
    return response;
  },

  login: async (email, password) => {
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
    
    return data;
  },

  // jobs
  listJobs: () => apiFetch("/jobs").then(r => r.json()),
  scrapeJob: (url) =>
    apiFetch("/jobs/scrape", { method: "POST", body: JSON.stringify({ url }) }).then(r => r.json()),
  aiAnalyzeJob: (url) =>
    apiFetch("/jobs/ai-analyze", { method: "POST", body: JSON.stringify({ url }) }).then(r => r.json()),
  createJob: (payload) =>
    apiFetch("/jobs", { method: "POST", body: JSON.stringify(payload) }).then(r => r.json()),
  createManualJob: (payload) =>
    apiFetch("/jobs/manual", { method: "POST", body: JSON.stringify(payload) }).then(r => r.json()),
  updateJob: (jobId, payload) =>
    apiFetch(`/jobs/${jobId}`, { method: "PUT", body: JSON.stringify(payload) }).then(r => r.json()),

  // Get current user info including premium status
  getCurrentUser: () =>
    apiFetch("/auth/me").then(r => r.json()),

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
  deleteApp: (id) =>
    apiFetch(`/kanban/applications/${id}`, { method: "DELETE" }),
  updateApplication: (id, payload) =>
    apiFetch(`/applications/${id}`, { method: "PATCH", body: JSON.stringify(payload) }).then(r => r.json()),
  getAppDetail: (id) =>
    apiFetch(`/applications/${id}/detail`).then(r => r.json()),
  addStage: (id, payload) =>
    apiFetch(`/applications/${id}/stages`, { method: "POST", body: JSON.stringify(payload) }).then(r => r.json()),
  getStages: (id) =>
    apiFetch(`/applications/${id}/stages`).then(r => r.json()),
  addNote: (id, body) =>
    apiFetch(`/applications/${id}/notes`, { method: "POST", body: JSON.stringify({ body }) }).then(r => r.json()),
  getNotes: (id) =>
    apiFetch(`/applications/${id}/notes`).then(r => r.json()),

  // dashboard
  getMetrics: () => apiFetch("/dashboard/metrics").then(r => r.json()),
  getApplications: () => apiFetch("/applications").then(r => r.json()),
  getApplicationCards: () => apiFetch("/applications/cards").then(r => r.json()),
  getUsedStatuses: () => apiFetch("/applications/statuses").then(r => r.json()),
  getApplicationsWithStages: () => apiFetch("/applications/with-stages").then(r => r.json()),
  
  // User Preferences
  getPreferences: () => apiFetch("/preferences").then(r => r.json()),
  getPreference: (key) => apiFetch(`/preferences/${key}`).then(r => r.json()),
  savePreference: (key, value) => apiFetch("/preferences", { 
    method: "POST", 
    body: JSON.stringify({ preference_key: key, preference_value: value }) 
  }).then(r => r.json()),
  updatePreference: (key, value) => apiFetch(`/preferences/${key}`, { 
    method: "PUT", 
    body: JSON.stringify({ preference_value: value }) 
  }).then(r => r.json()),
  
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

  // Document Management
  getDocuments: (params = '') => 
    apiFetch(`/documents?${params}`).then(r => r.json()),
  uploadDocument: (formData) => {
    const { access_token } = getTokens();
    return fetch(`${API_BASE}/documents/upload`, {
      method: "POST",
      headers: access_token ? { Authorization: `Bearer ${access_token}` } : {},
      body: formData
    }).then(async r => {
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    });
  },
  deleteDocument: (id) => 
    apiFetch(`/documents/${id}`, { method: "DELETE" }),
  // api.js
  downloadDocument: async (id) => {
    const { access_token } = getTokens();
    const response = await fetch(`${API_BASE}/documents/${id}/download`, {
      headers: access_token ? { Authorization: `Bearer ${access_token}` } : undefined,
    });
    if (!response.ok) throw new Error(await response.text());

    // Robust filename parsing (handles filename*=, quoted, unquoted)
    const cd = response.headers.get("content-disposition") || "";
    let filename = "document";
    console.log("[DOWNLOAD] Content-Disposition header:", cd);

    // RFC 5987 (filename*=UTF-8''...)
    const starMatch = cd.match(/filename\*\s*=\s*([^']+)''([^;]+)/i);
    if (starMatch) {
      try {
        filename = decodeURIComponent(starMatch[2]);
      } catch {
        filename = starMatch[2];
      }
      console.log("[DOWNLOAD] Parsed filename (RFC 5987):", filename);
    } else {
      // filename="..."
      const quoted = cd.match(/filename\s*=\s*"([^"]+)"/i);
      if (quoted) {
        filename = quoted[1];
        console.log("[DOWNLOAD] Parsed filename (quoted):", filename);
      } else {
        // filename=unquoted
        const unquoted = cd.match(/filename\s*=\s*([^;]+)/i);
        if (unquoted) {
          filename = unquoted[1].trim();
          console.log("[DOWNLOAD] Parsed filename (unquoted):", filename);
        }
      }
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", filename);  // <- ensure the browser uses our name
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },



  generateCoverLetter: async (payload) => {
    const response = await apiFetch("/documents/cover-letter/generate", { 
      method: "POST", 
      body: JSON.stringify(payload) 
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  },
  getCoverLetterTemplates: () =>
    apiFetch("/documents/cover-letter/templates").then(r => r.json()),

  // User Profile Management
  getUserProfile: () =>
    apiFetch("/profile/").then(r => r.json()),
  
  updateUserProfile: (profileData) => {
    console.log("=== FRONTEND API DEBUG ===");
    console.log("Profile data being sent:", profileData);
    console.log("Stringified data:", JSON.stringify(profileData));
    console.log("=== SENDING REQUEST ===");
    
    return apiFetch("/profile/", {
      method: "PUT",
      body: JSON.stringify(profileData)
    }).then(r => {
      console.log("Response status:", r.status);
      if (!r.ok) {
        console.error("Response not OK:", r.status, r.statusText);
        throw new Error(`HTTP ${r.status}: ${r.statusText}`);
      }
      return r.json();
    }).catch(error => {
      console.error("API call failed:", error);
      throw error;
    });
  },
  
  getUserJobPreferences: () =>
    apiFetch("/profile/job-preferences").then(r => r.json()),
  
  updateJobPreferences: (preferences) =>
    apiFetch("/profile/job-preferences", {
      method: "PUT", 
      body: JSON.stringify(preferences)
    }).then(r => r.json()),
  
  getUserCareerGoals: () =>
    apiFetch("/profile/career-goals").then(r => r.json()),
  
  updateCareerGoals: (goals) =>
    apiFetch("/profile/career-goals", {
      method: "PUT",
      body: JSON.stringify(goals) 
    }).then(r => r.json()),

  // Profile completeness check
  getProfileCompleteness: () =>
    apiFetch("/profile/completeness").then(r => r.json()),
}

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
