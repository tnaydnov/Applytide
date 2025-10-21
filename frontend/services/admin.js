// frontend/services/admin.js
import { apiFetch } from '../lib/api';

// ==================== DASHBOARD & STATS ====================

export const getDashboardStats = async () => {
  const res = await apiFetch('/admin/dashboard/stats');
  if (!res.ok) throw new Error('Failed to fetch dashboard stats');
  return res.json();
};

export const getSystemHealth = async () => {
  const res = await apiFetch('/admin/system/health');
  if (!res.ok) throw new Error('Failed to fetch system health');
  return res.json();
};

export const getAnalytics = async (days = 30) => {
  const res = await apiFetch(`/admin/analytics?days=${days}`);
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
};

// ==================== USER MANAGEMENT ====================

export const listUsers = async ({
  page = 1,
  page_size = 50,
  search = null,
  is_premium = null,
  is_admin = null,
  sort_by = 'created_at',
  sort_order = 'desc'
}) => {
  const params = new URLSearchParams();
  params.append('page', page);
  params.append('page_size', page_size);
  if (search) params.append('search', search);
  if (is_premium !== null) params.append('is_premium', is_premium);
  if (is_admin !== null) params.append('is_admin', is_admin);
  params.append('sort_by', sort_by);
  params.append('sort_order', sort_order);

  const res = await apiFetch(`/admin/users?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
};

export const getUserDetail = async (userId) => {
  const res = await apiFetch(`/admin/users/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch user details');
  return res.json();
};

export const updateUserAdminStatus = async (userId, isAdmin) => {
  const res = await apiFetch(`/admin/users/${userId}/admin-status`, {
    method: 'PATCH',
    body: JSON.stringify({ is_admin: isAdmin })
  });
  if (!res.ok) throw new Error('Failed to update admin status');
  return res.json();
};

export const updateUserPremiumStatus = async (userId, isPremium, expiresAt = null) => {
  const res = await apiFetch(`/admin/users/${userId}/premium-status`, {
    method: 'PATCH',
    body: JSON.stringify({ is_premium: isPremium, expires_at: expiresAt })
  });
  if (!res.ok) throw new Error('Failed to update premium status');
  return res.json();
};

// ==================== ADMIN LOGS ====================

export const getAdminLogs = async ({
  page = 1,
  page_size = 50,
  admin_id = null,
  action = null
}) => {
  const params = new URLSearchParams();
  params.append('page', page);
  params.append('page_size', page_size);
  if (admin_id) params.append('admin_id', admin_id);
  if (action) params.append('action', action);

  const res = await apiFetch(`/admin/logs?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch admin logs');
  return res.json();
};

export const exportLogs = async () => {
  const res = await apiFetch('/admin/logs/export');
  if (!res.ok) throw new Error('Failed to export logs');
  return res.blob();
};

export const verifyPassword = async (password) => {
  const res = await apiFetch('/admin/verify-password', {
    method: 'POST',
    body: JSON.stringify({ password })
  });
  if (!res.ok) throw new Error('Failed to verify password');
  return res.json();
};

// ==================== JOB MANAGEMENT ====================

export const listJobs = async ({
  skip = 0,
  limit = 50,
  search = null,
  location = null,
  remote_type = null,
  job_type = null,
  has_applications = null,
  sort_by = 'created_at',
  sort_order = 'desc'
}) => {
  const params = new URLSearchParams();
  params.append('skip', skip);
  params.append('limit', limit);
  if (search) params.append('search', search);
  if (location) params.append('location', location);
  if (remote_type) params.append('remote_type', remote_type);
  if (job_type) params.append('job_type', job_type);
  if (has_applications !== null) params.append('has_applications', has_applications);
  params.append('sort_by', sort_by);
  params.append('sort_order', sort_order);

  const res = await apiFetch(`/admin/jobs?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch jobs');
  return res.json();
};

export const getJobDetail = async (jobId) => {
  const res = await apiFetch(`/admin/jobs/${jobId}`);
  if (!res.ok) throw new Error('Failed to fetch job details');
  return res.json();
};

export const updateJob = async (jobId, updates) => {
  const res = await apiFetch(`/admin/jobs/${jobId}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw new Error('Failed to update job');
  return res.json();
};

export const deleteJob = async (jobId, justification) => {
  const res = await apiFetch(`/admin/jobs/${jobId}?justification=${encodeURIComponent(justification)}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete job');
  return res.json();
};

export const bulkDeleteJobs = async (jobIds, justification) => {
  const res = await apiFetch('/admin/jobs/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ job_ids: jobIds, justification })
  });
  if (!res.ok) throw new Error('Failed to bulk delete jobs');
  return res.json();
};

export const getJobAnalytics = async () => {
  const res = await apiFetch('/admin/jobs/analytics/overview');
  if (!res.ok) throw new Error('Failed to fetch job analytics');
  return res.json();
};

// ==================== APPLICATION MANAGEMENT ====================

export const listApplications = async ({
  skip = 0,
  limit = 50,
  search = null,
  status = null,
  source = null,
  user_id = null,
  job_id = null,
  sort_by = 'created_at',
  sort_order = 'desc'
}) => {
  const params = new URLSearchParams();
  params.append('skip', skip);
  params.append('limit', limit);
  if (search) params.append('search', search);
  if (status) params.append('status', status);
  if (source) params.append('source', source);
  if (user_id) params.append('user_id', user_id);
  if (job_id) params.append('job_id', job_id);
  params.append('sort_by', sort_by);
  params.append('sort_order', sort_order);

  const res = await apiFetch(`/admin/applications?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch applications');
  return res.json();
};

export const getApplicationDetail = async (appId) => {
  const res = await apiFetch(`/admin/applications/${appId}`);
  if (!res.ok) throw new Error('Failed to fetch application details');
  return res.json();
};

export const updateApplicationStatus = async (appId, status, justification) => {
  const res = await apiFetch(`/admin/applications/${appId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, justification })
  });
  if (!res.ok) throw new Error('Failed to update application status');
  return res.json();
};

export const deleteApplication = async (appId, justification) => {
  const res = await apiFetch(`/admin/applications/${appId}?justification=${encodeURIComponent(justification)}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete application');
  return res.json();
};

export const bulkDeleteApplications = async (appIds, justification) => {
  const res = await apiFetch('/admin/applications/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ application_ids: appIds, justification })
  });
  if (!res.ok) throw new Error('Failed to bulk delete applications');
  return res.json();
};

export const getApplicationAnalytics = async () => {
  const res = await apiFetch('/admin/applications/analytics/overview');
  if (!res.ok) throw new Error('Failed to fetch application analytics');
  return res.json();
};

// ==================== DATABASE QUERY INTERFACE ====================

export const executeDatabaseQuery = async ({ query, justification, password }) => {
  const res = await apiFetch('/admin/database/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Password': password
    },
    body: JSON.stringify({ query, justification })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to execute query');
  }
  return res.json();
};

export const listDatabaseTables = async () => {
  const res = await apiFetch('/admin/database/tables');
  if (!res.ok) throw new Error('Failed to fetch database tables');
  return res.json();
};

export const getTableSchema = async (tableName) => {
  const res = await apiFetch(`/admin/database/schema/${encodeURIComponent(tableName)}`);
  if (!res.ok) throw new Error('Failed to fetch table schema');
  return res.json();
};

// ==================== CACHE MANAGEMENT ====================

export const getCacheStats = async () => {
  const res = await apiFetch('/admin/cache/stats');
  if (!res.ok) throw new Error('Failed to fetch cache stats');
  return res.json();
};

export const listCacheKeys = async ({ pattern = '*', limit = 100 }) => {
  const params = new URLSearchParams();
  params.append('pattern', pattern);
  params.append('limit', limit);
  
  const res = await apiFetch(`/admin/cache/keys?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to list cache keys');
  return res.json();
};

export const getCacheKeyDetail = async (key) => {
  const res = await apiFetch(`/admin/cache/keys/${encodeURIComponent(key)}`);
  if (!res.ok) throw new Error('Failed to fetch key detail');
  return res.json();
};

export const deleteCacheKey = async ({ key, justification, password }) => {
  const res = await apiFetch('/admin/cache/keys', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Password': password
    },
    body: JSON.stringify({ key, justification })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to delete key');
  }
  return res.json();
};

export const flushCachePattern = async ({ pattern, justification, maxKeys = 1000, password }) => {
  const res = await apiFetch('/admin/cache/flush', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Password': password
    },
    body: JSON.stringify({ pattern, justification, max_keys: maxKeys })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to flush pattern');
  }
  return res.json();
};

// ==================== DOCUMENTS MANAGEMENT ====================

export const listDocuments = async ({
  page = 0,
  limit = 50,
  user_id = null,
  document_type = null,
  min_size = null,
  max_size = null,
  date_from = null,
  date_to = null,
  sort_by = 'created_at',
  sort_order = 'desc'
}) => {
  const params = new URLSearchParams();
  params.append('page', page);
  params.append('limit', limit);
  if (user_id) params.append('user_id', user_id);
  if (document_type) params.append('document_type', document_type);
  if (min_size) params.append('min_size', min_size);
  if (max_size) params.append('max_size', max_size);
  if (date_from) params.append('date_from', date_from);
  if (date_to) params.append('date_to', date_to);
  params.append('sort_by', sort_by);
  params.append('sort_order', sort_order);

  const res = await apiFetch(`/admin/documents?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
};

export const getDocumentDetail = async (documentId) => {
  const res = await apiFetch(`/admin/documents/${documentId}`);
  if (!res.ok) throw new Error('Failed to fetch document details');
  return res.json();
};

export const deleteDocument = async ({ documentId, justification, password }) => {
  const res = await apiFetch(`/admin/documents/${documentId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Password': password
    },
    body: JSON.stringify({ justification })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to delete document');
  }
  return res.json();
};

export const getDocumentAnalytics = async () => {
  const res = await apiFetch('/admin/documents/analytics');
  if (!res.ok) throw new Error('Failed to fetch document analytics');
  return res.json();
};

export const getOrphanedDocuments = async (limit = 100) => {
  const res = await apiFetch(`/admin/documents/orphaned?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch orphaned documents');
  return res.json();
};

export const cleanupOrphanedDocuments = async ({ justification, password }) => {
  const res = await apiFetch('/admin/documents/cleanup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Password': password
    },
    body: JSON.stringify({ justification })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to cleanup orphaned documents');
  }
  return res.json();
};

// ==================== EMAIL MONITORING ====================

export const getEmailStats = async () => {
  const res = await apiFetch('/admin/email/stats');
  if (!res.ok) throw new Error('Failed to fetch email stats');
  return res.json();
};

export const getRecentEmails = async (limit = 50) => {
  const res = await apiFetch(`/admin/email/recent?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch recent emails');
  return res.json();
};

export const sendTestEmail = async ({ toEmail, justification, password }) => {
  const res = await apiFetch('/admin/email/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Password': password
    },
    body: JSON.stringify({ to_email: toEmail, justification })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to send test email');
  }
  return res.json();
};

// ==================== STORAGE MANAGEMENT ====================

export const getStorageStats = async () => {
  const res = await apiFetch('/admin/storage/stats');
  if (!res.ok) throw new Error('Failed to fetch storage stats');
  return res.json();
};

export const getStorageByType = async () => {
  const res = await apiFetch('/admin/storage/by-type');
  if (!res.ok) throw new Error('Failed to fetch storage by type');
  return res.json();
};

export const getStorageByUser = async (limit = 50) => {
  const res = await apiFetch(`/admin/storage/by-user?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch storage by user');
  return res.json();
};

export const cleanupOrphanedFiles = async ({ justification, password }) => {
  const res = await apiFetch('/admin/storage/cleanup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Password': password
    },
    body: JSON.stringify({ justification })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to cleanup orphaned files');
  }
  return res.json();
};

// ==================== SECURITY MONITORING ====================

export const getFailedLogins = async ({ hours = 24, limit = 100 }) => {
  const params = new URLSearchParams();
  params.append('hours', hours);
  params.append('limit', limit);
  
  const res = await apiFetch(`/admin/security/failed-logins?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch failed logins');
  return res.json();
};

export const getBlockedIPs = async (limit = 100) => {
  const res = await apiFetch(`/admin/security/blocked-ips?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch blocked IPs');
  return res.json();
};

export const blockIP = async ({ ipAddress, reason, duration, justification, password }) => {
  const res = await apiFetch('/admin/security/block-ip', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Password': password
    },
    body: JSON.stringify({ ip_address: ipAddress, reason, duration_minutes: duration, justification })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to block IP');
  }
  return res.json();
};

export const unblockIP = async ({ ipAddress, justification, password }) => {
  const res = await apiFetch('/admin/security/unblock-ip', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Password': password
    },
    body: JSON.stringify({ ip_address: ipAddress, justification })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to unblock IP');
  }
  return res.json();
};

// ==================== GDPR COMPLIANCE ====================

export const getGDPRStats = async () => {
  const res = await apiFetch('/admin/gdpr/stats');
  if (!res.ok) throw new Error('Failed to fetch GDPR stats');
  return res.json();
};

export const listGDPRRequests = async ({ requestType = null, limit = 100 }) => {
  const params = new URLSearchParams();
  if (requestType) params.append('request_type', requestType);
  params.append('limit', limit);
  
  const res = await apiFetch(`/admin/gdpr/requests?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch GDPR requests');
  return res.json();
};

export const createExportRequest = async ({ userId, justification, password }) => {
  const res = await apiFetch('/admin/gdpr/export', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Password': password
    },
    body: JSON.stringify({ user_id: userId, justification })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to create export request');
  }
  return res.json();
};

export const createDeleteRequest = async ({ userId, justification, password }) => {
  const res = await apiFetch('/admin/gdpr/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Password': password
    },
    body: JSON.stringify({ user_id: userId, justification })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to create delete request');
  }
  return res.json();
};

// ==================== ENHANCED ANALYTICS ====================

export const getCohortRetention = async (monthsBack = 12) => {
  const res = await apiFetch(`/admin/analytics/cohort-retention?months_back=${monthsBack}`);
  if (!res.ok) throw new Error('Failed to fetch cohort retention');
  return res.json();
};

export const predictChurn = async (daysInactive = 30) => {
  const res = await apiFetch(`/admin/analytics/churn-prediction?days_inactive=${daysInactive}`);
  if (!res.ok) throw new Error('Failed to predict churn');
  return res.json();
};

export const getFeatureAdoption = async () => {
  const res = await apiFetch('/admin/analytics/feature-adoption');
  if (!res.ok) throw new Error('Failed to fetch feature adoption');
  return res.json();
};

export const getConversionFunnel = async (days = 30) => {
  const res = await apiFetch(`/admin/analytics/conversion-funnel?days=${days}`);
  if (!res.ok) throw new Error('Failed to fetch conversion funnel');
  return res.json();
};

export const getApplicationVelocity = async (days = 30) => {
  const res = await apiFetch(`/admin/analytics/application-velocity?days=${days}`);
  if (!res.ok) throw new Error('Failed to fetch application velocity');
  return res.json();
};

// ==================== LLM USAGE MONITORING ====================

export const getLLMStats = async (hours = 24) => {
  const res = await apiFetch(`/admin/llm-usage/stats?hours=${hours}`);
  if (!res.ok) throw new Error('Failed to fetch LLM stats');
  return res.json();
};

export const getLLMUsageByUser = async (limit = 10, hours = 24) => {
  const res = await apiFetch(`/admin/llm-usage/by-user?limit=${limit}&hours=${hours}`);
  if (!res.ok) throw new Error('Failed to fetch LLM usage by user');
  return res.json();
};

export const getLLMUsageByModel = async (hours = 24) => {
  const res = await apiFetch(`/admin/llm-usage/by-model?hours=${hours}`);
  if (!res.ok) throw new Error('Failed to fetch LLM usage by model');
  return res.json();
};

export const getRecentLLMCalls = async (limit = 50, includeErrors = null) => {
  const params = new URLSearchParams();
  params.append('limit', limit);
  if (includeErrors !== null) params.append('include_errors', includeErrors);
  
  const res = await apiFetch(`/admin/llm-usage/recent?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch recent LLM calls');
  return res.json();
};

export const getLLMCosts = async (hours = 24) => {
  const res = await apiFetch(`/admin/llm-usage/costs?hours=${hours}`);
  if (!res.ok) throw new Error('Failed to fetch LLM costs');
  return res.json();
};

export const getLLMTrends = async (days = 7) => {
  const res = await apiFetch(`/admin/llm-usage/trends?days=${days}`);
  if (!res.ok) throw new Error('Failed to fetch LLM trends');
  return res.json();
};

// ==================== SECURITY EVENTS ====================

export const getSecurityEventsRecent = async ({
  limit = 50,
  event_type = null,
  severity = null,
  resolved = null,
  hours = 24
}) => {
  const params = new URLSearchParams();
  params.append('limit', limit);
  params.append('hours', hours);
  if (event_type) params.append('event_type', event_type);
  if (severity) params.append('severity', severity);
  if (resolved !== null) params.append('resolved', resolved);
  
  const res = await apiFetch(`/admin/security/events/recent?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch security events');
  return res.json();
};

export const getSecurityEventsStats = async (hours = 24) => {
  const res = await apiFetch(`/admin/security/events/stats?hours=${hours}`);
  if (!res.ok) throw new Error('Failed to fetch security event stats');
  return res.json();
};

export const getSecurityEventDetail = async (eventId) => {
  const res = await apiFetch(`/admin/security/events/${eventId}`);
  if (!res.ok) throw new Error('Failed to fetch security event details');
  return res.json();
};

export const resolveSecurityEvent = async (eventId, notes = '') => {
  const res = await apiFetch(`/admin/security/events/${eventId}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ notes })
  });
  if (!res.ok) throw new Error('Failed to resolve security event');
  return res.json();
};

// ==================== ERROR LOGS ====================

export const getErrorLogsRecent = async ({
  limit = 50,
  severity = null,
  resolved = null,
  hours = 24
}) => {
  const params = new URLSearchParams();
  params.append('limit', limit);
  params.append('hours', hours);
  if (severity) params.append('severity', severity);
  if (resolved !== null) params.append('resolved', resolved);
  
  const res = await apiFetch(`/admin/errors/recent?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch error logs');
  return res.json();
};

export const getErrorStats = async (hours = 24) => {
  const res = await apiFetch(`/admin/errors/stats?hours=${hours}`);
  if (!res.ok) throw new Error('Failed to fetch error stats');
  return res.json();
};

export const getErrorDetail = async (errorId) => {
  const res = await apiFetch(`/admin/errors/${errorId}`);
  if (!res.ok) throw new Error('Failed to fetch error details');
  return res.json();
};

export const resolveError = async (errorId, notes = '') => {
  const res = await apiFetch(`/admin/errors/${errorId}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ notes })
  });
  if (!res.ok) throw new Error('Failed to resolve error');
  return res.json();
};

// ==================== ACTIVE SESSIONS ====================

export const getActiveSessions = async (limit = 100) => {
  const res = await apiFetch(`/admin/sessions/active?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch active sessions');
  return res.json();
};

export const getSessionStats = async () => {
  const res = await apiFetch('/admin/sessions/stats');
  if (!res.ok) throw new Error('Failed to fetch session stats');
  return res.json();
};

export const terminateSession = async (sessionId) => {
  const res = await apiFetch(`/admin/sessions/${sessionId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to terminate session');
  return res.json();
};

export const terminateUserSessions = async (userId) => {
  const res = await apiFetch(`/admin/sessions/user/${userId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to terminate user sessions');
  return res.json();
};


