/**
 * Admin API Module
 * All API calls for admin panel
 * 
 * Backend routes: /api/admin/*
 * Note: apiFetch already prepends /api, so endpoints here start with /admin/
 */

import { apiFetch } from '../../lib/api/core';

// ============================================================================
// Helper
// ============================================================================

const api = {
  get: async <T = unknown>(url: string, params?: Record<string, string | number | undefined>): Promise<T> => {
    const filteredParams: Record<string, string> = {};
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) filteredParams[k] = String(v);
      });
    }
    const qs = Object.keys(filteredParams).length
      ? '?' + new URLSearchParams(filteredParams).toString()
      : '';
    const response = await apiFetch(url + qs);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `Request failed with status ${response.status}`);
    }
    return response.json();
  },
  post: async <T = unknown>(url: string, body?: unknown): Promise<T> => {
    const response = await apiFetch(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `Request failed with status ${response.status}`);
    }
    return response.json();
  },
  patch: async <T = unknown>(url: string, body?: unknown): Promise<T> => {
    const response = await apiFetch(url, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `Request failed with status ${response.status}`);
    }
    return response.json();
  },
  delete: async <T = unknown>(url: string, body?: unknown): Promise<T> => {
    const opts: RequestInit = { method: 'DELETE' };
    if (body) opts.body = JSON.stringify(body);
    const response = await apiFetch(url, opts);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `Request failed with status ${response.status}`);
    }
    return response.json();
  },
};

// ============================================================================
// Types
// ============================================================================

export interface DashboardStats {
  total_users: number;
  premium_users: number;
  total_applications: number;
  active_users: number;
  new_users_today: number;
  recent_errors_count: number;
}

export interface Activity {
  id: string;
  type: string;
  user: string;
  description: string;
  timestamp: string;
}

export interface ChartDataPoint {
  date: string;
  count: number;
}

export interface DashboardCharts {
  signups_last_7_days: ChartDataPoint[];
  applications_last_7_days: ChartDataPoint[];
  errors_last_7_days: ChartDataPoint[];
}

export interface ErrorLog {
  id: string;
  level: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  user_id?: string;
  user_email?: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

export interface LLMUsage {
  id: string;
  user_id: string;
  user_email: string;
  feature: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  timestamp: string;
}

export interface LLMStats {
  total_requests: number;
  total_tokens: number;
  total_cost: number;
  avg_tokens_per_request: number;
  requests_by_feature: Record<string, number>;
  cost_by_model: Record<string, number>;
}

export interface SecurityEvent {
  id: string;
  event_type: string;
  user_id?: string;
  user_email?: string;
  ip_address: string;
  user_agent?: string;
  description: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface Session {
  id: string;
  user_id: string;
  user_email: string;
  ip_address: string;
  user_agent: string;
  last_activity: string;
  created_at: string;
}

export interface SystemHealth {
  database: {
    status: 'healthy' | 'degraded' | 'down';
    connections: number;
    size_mb: number;
    response_time_ms: number;
  };
  redis: {
    status: 'healthy' | 'degraded' | 'down';
    memory_used_mb: number;
    memory_total_mb: number;
    keys: number;
  };
  llm_service: {
    status: 'healthy' | 'degraded' | 'down';
    avg_response_time_ms: number;
    success_rate: number;
  };
  uptime_seconds: number;
  last_checked: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'premium' | 'admin';
  is_banned: boolean;
  created_at: string;
  last_login?: string;
  total_applications: number;
}

// ============================================================================
// API Functions
// ============================================================================

export const adminApi = {
  // Dashboard
  getDashboardStats: () => api.get<DashboardStats>('/admin/dashboard/stats'),
  getActivityFeed: (limit = 20) => api.get<Activity[]>('/admin/dashboard/activity', { limit }),
  getDashboardCharts: () => api.get<DashboardCharts>('/admin/dashboard/charts'),

  // Users Management
  getUsers: (params?: { page?: number; search?: string; role?: string }) =>
    api.get<{ users: User[]; total: number; pages: number }>('/admin/users', params as Record<string, string | number>),
  getUser: (userId: string) => api.get<User>(`/admin/users/${userId}`),
  toggleUserPremium: (userId: string, subscriptionPlan: string, subscriptionStatus: string, expiresAt?: string) =>
    api.patch(`/admin/users/${userId}/premium`, {
      subscription_plan: subscriptionPlan,
      subscription_status: subscriptionStatus,
      subscription_ends_at: expiresAt,
    }),
  changeUserRole: (userId: string, role: string) =>
    api.patch(`/admin/users/${userId}/role`, { role }),
  deleteUser: (userId: string) => api.delete(`/admin/users/${userId}`),
  revokeUserSessions: (userId: string) =>
    api.post(`/admin/users/${userId}/revoke-sessions`),
  getUserApplications: (userId: string, limit = 50) =>
    api.get(`/admin/users/${userId}/applications`, { limit }),
  getUserJobs: (userId: string, limit = 50) =>
    api.get(`/admin/users/${userId}/jobs`, { limit }),
  getUserActivity: (userId: string, limit = 50) =>
    api.get(`/admin/users/${userId}/activity`, { limit }),

  // Error Monitoring
  getErrorLogs: (params?: { page?: number; level?: string }) =>
    api.get<{ errors: ErrorLog[]; total: number; pages: number }>('/admin/errors', params as Record<string, string | number>),
  getErrorSummary: () => api.get('/admin/errors/summary'),
  getError: (errorId: string) => api.get(`/admin/errors/${errorId}`),

  // Sessions Management
  getSessions: (params?: { page?: number }) =>
    api.get<{ sessions: Session[]; total: number; pages: number }>('/admin/sessions', params as Record<string, string | number>),
  getSessionStats: () => api.get('/admin/sessions/stats'),
  revokeSession: (sessionId: string) => api.delete(`/admin/sessions/${sessionId}`),

  // System Health (backend has separate endpoints, not one /system/health)
  getDatabaseHealth: () => api.get('/admin/system/database'),
  getStorageUsage: () => api.get('/admin/system/storage'),
  getApiHealth: () => api.get('/admin/system/api'),
  getSystemHealth: async (): Promise<SystemHealth> => {
    // Aggregate from three separate endpoints
    const [database, storage, apiHealth] = await Promise.all([
      api.get<SystemHealth['database']>('/admin/system/database').catch(() => ({
        status: 'down' as const, connections: 0, size_mb: 0, response_time_ms: 0,
      })),
      api.get('/admin/system/storage').catch(() => ({})),
      api.get('/admin/system/api').catch(() => ({})),
    ]);
    return {
      database,
      redis: { status: 'healthy', memory_used_mb: 0, memory_total_mb: 0, keys: 0 },
      llm_service: { status: 'healthy', avg_response_time_ms: 0, success_rate: 100 },
      uptime_seconds: 0,
      last_checked: new Date().toISOString(),
      ...(storage as object),
      ...(apiHealth as object),
    } as SystemHealth;
  },

  // LLM Usage (backend endpoint is /admin/llm-usage, not /admin/llm/)
  getLLMStats: (hours = 24) =>
    api.get<LLMStats>('/admin/llm-usage/stats', { hours }),
  getLLMUsage: (params?: { page?: number; feature?: string }) =>
    api.get<{ usage: LLMUsage[]; total: number; pages: number }>('/admin/llm-usage', params as Record<string, string | number>),

  // Security
  getSecurityStats: (hours = 24) =>
    api.get('/admin/security/stats', { hours }),
  getSecurityEvents: (params?: { page?: number; severity?: string }) =>
    api.get<{ events: SecurityEvent[]; total: number; pages: number }>('/admin/security/events', params as Record<string, string | number>),

  // Ban Management (ban/unban use user_id in body)
  banUser: (userId: string, data: { reason: string; duration_hours?: number; ban_ip?: boolean }) =>
    api.post('/admin/users/ban', { user_id: userId, ...data }),
  unbanUser: (userId: string) =>
    api.post('/admin/users/unban', { user_id: userId }),
  getUserBans: (userId: string) => api.get(`/admin/users/${userId}/bans`),
  listBans: (params?: Record<string, string | number>) =>
    api.get('/admin/bans', params),
  banEmail: (data: { email: string; reason: string }) =>
    api.post('/admin/bans/email', data),
  banIP: (data: { ip_address: string; reason: string }) =>
    api.post('/admin/bans/ip', data),
  unbanEmail: (email: string) =>
    api.delete('/admin/bans/email', { email }),
  unbanIP: (ipAddress: string) =>
    api.delete('/admin/bans/ip', { ip_address: ipAddress }),

  // Role update alias
  updateUserRole: (userId: string, role: string) =>
    api.patch(`/admin/users/${userId}/role`, { role }),
};
