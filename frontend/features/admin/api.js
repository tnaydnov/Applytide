/**
 * Admin API Client
 * All API calls for admin panel
 */
import { apiFetch } from '../../lib/api';

// Helper to create axios-like API wrapper
const api = {
  get: async (url, options = {}) => {
    const params = options.params ? '?' + new URLSearchParams(options.params).toString() : '';
    const response = await apiFetch(url + params, { method: 'GET' });
    const data = await response.json();
    return { data };
  },
  post: async (url, body, options = {}) => {
    const response = await apiFetch(url, { 
      method: 'POST', 
      body: JSON.stringify(body),
      ...options 
    });
    const data = await response.json();
    return { data };
  },
  put: async (url, body, options = {}) => {
    const response = await apiFetch(url, { 
      method: 'PUT', 
      body: JSON.stringify(body),
      ...options 
    });
    const data = await response.json();
    return { data };
  },
  patch: async (url, body, options = {}) => {
    const response = await apiFetch(url, { 
      method: 'PATCH', 
      body: JSON.stringify(body),
      ...options 
    });
    const data = await response.json();
    return { data };
  },
  delete: async (url, options = {}) => {
    const response = await apiFetch(url, { method: 'DELETE', ...options });
    const data = await response.json();
    return { data };
  },
};

export const adminApi = {
  // ============================================================================
  // Dashboard
  // ============================================================================
  
  /**
   * Get dashboard statistics
   */
  getDashboardStats: async () => {
    const response = await api.get('/admin/dashboard/stats');
    return response.data;
  },

  /**
   * Get activity feed
   */
  getActivityFeed: async (limit = 20) => {
    const response = await api.get('/admin/dashboard/activity', {
      params: { limit }
    });
    return response.data;
  },

  /**
   * Get dashboard charts data
   */
  getDashboardCharts: async () => {
    const response = await api.get('/admin/dashboard/charts');
    return response.data;
  },

  // ============================================================================
  // Users Management
  // ============================================================================
  
  /**
   * Get users list with filters
   */
  getUsers: async (params = {}) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  /**
   * Get user detail
   */
  getUser: async (userId) => {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  },

  /**
   * Toggle user premium status
   */
  toggleUserPremium: async (userId, isPremium, expiresAt = null) => {
    const response = await api.patch(`/admin/users/${userId}/premium`, {
      is_premium: isPremium,
      expires_at: expiresAt
    });
    return response.data;
  },

  /**
   * Change user role
   */
  changeUserRole: async (userId, role) => {
    const response = await api.patch(`/admin/users/${userId}/role`, { role });
    return response.data;
  },

  /**
   * Delete user
   */
  deleteUser: async (userId) => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },

  /**
   * Revoke all user sessions
   */
  revokeUserSessions: async (userId) => {
    const response = await api.post(`/admin/users/${userId}/revoke-sessions`);
    return response.data;
  },

  /**
   * Get user's applications
   */
  getUserApplications: async (userId, limit = 50) => {
    const response = await api.get(`/admin/users/${userId}/applications`, {
      params: { limit }
    });
    return response.data;
  },

  /**
   * Get user's saved jobs
   */
  getUserJobs: async (userId, limit = 50) => {
    const response = await api.get(`/admin/users/${userId}/jobs`, {
      params: { limit }
    });
    return response.data;
  },

  /**
   * Get user's activity logs
   */
  getUserActivity: async (userId, limit = 50) => {
    const response = await api.get(`/admin/users/${userId}/activity`, {
      params: { limit }
    });
    return response.data;
  },

  // ============================================================================
  // Error Monitoring
  // ============================================================================
  
  /**
   * Get errors list with filters
   */
  getErrors: async (params = {}) => {
    const response = await api.get('/admin/errors', { params });
    return response.data;
  },

  /**
   * Get error summary statistics
   */
  getErrorSummary: async () => {
    const response = await api.get('/admin/errors/summary');
    return response.data;
  },

  /**
   * Get error detail
   */
  getError: async (errorId) => {
    const response = await api.get(`/admin/errors/${errorId}`);
    return response.data;
  },

  // ============================================================================
  // Sessions Management
  // ============================================================================
  
  /**
   * Get sessions list with filters
   */
  getSessions: async (params = {}) => {
    const response = await api.get('/admin/sessions', { params });
    return response.data;
  },

  /**
   * Get session statistics
   */
  getSessionStats: async () => {
    const response = await api.get('/admin/sessions/stats');
    return response.data;
  },

  /**
   * Revoke a session
   */
  revokeSession: async (sessionId) => {
    const response = await api.delete(`/admin/sessions/${sessionId}`);
    return response.data;
  },

  // ============================================================================
  // System Health
  // ============================================================================
  
  /**
   * Get database health
   */
  getDatabaseHealth: async () => {
    const response = await api.get('/admin/system/database');
    return response.data;
  },

  /**
   * Get storage usage
   */
  getStorageUsage: async () => {
    const response = await api.get('/admin/system/storage');
    return response.data;
  },

  /**
   * Get API health
   */
  getApiHealth: async () => {
    const response = await api.get('/admin/system/api');
    return response.data;
  },

  // ============================================================================
  // LLM Usage Tracking
  // ============================================================================
  
  /**
   * Get LLM usage statistics
   */
  getLLMUsageStats: async (hours = 24) => {
    const response = await api.get('/admin/llm-usage/stats', {
      params: { hours }
    });
    return response.data;
  },

  /**
   * Get LLM usage list with filters
   */
  getLLMUsageList: async (params = {}) => {
    const response = await api.get('/admin/llm-usage', { params });
    return response.data;
  },

  // ============================================================================
  // Security Monitoring
  // ============================================================================
  
  /**
   * Get security statistics
   */
  getSecurityStats: async (hours = 24) => {
    const response = await api.get('/admin/security/stats', {
      params: { hours }
    });
    return response.data;
  },

  /**
   * Get security events
   */
  getSecurityEvents: async (params = {}) => {
    const response = await api.get('/admin/security/events', { params });
    return response.data;
  }
};

export default adminApi;
