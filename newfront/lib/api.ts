/**
 * @fileoverview API Client - Barrel export
 * 
 * Re-exports core infrastructure and all feature APIs.
 * Import from here for convenience: import { apiFetch, adminApi } from '../lib/api'
 */

// Core infrastructure
export { apiFetch, login, logout, logoutAll, clearCache, ApiError } from './api/core';
export { connectWS } from './api/websocket';
export type { WSMessage, WSEventType } from './api/websocket';
export { toQuery } from './api/utils';
export { API_BASE } from './api/core';

// Feature APIs
export { adminApi } from '../features/admin/api';
export { analyticsApi } from '../features/analytics/api';
export { applicationsApi } from '../features/applications/api';
export { dashboardApi } from '../features/dashboard/api';
export { documentsApi } from '../features/documents/api';
export { jobsApi } from '../features/jobs/api';
export { profileApi } from '../features/profile/api';
export { remindersApi } from '../features/reminders/api';

// Re-export apiFetch as default for backward compatibility
import { apiFetch } from './api/core';

/**
 * Lightweight api helper for direct endpoint calls.
 * Prefer using feature-specific APIs (adminApi, jobsApi, etc.) instead.
 */
export const api = {
  get: async (endpoint: string) => {
    const response = await apiFetch(endpoint);
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  },
  post: async (endpoint: string, data?: unknown) => {
    const response = await apiFetch(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  },
  put: async (endpoint: string, data?: unknown) => {
    const response = await apiFetch(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  },
  delete: async (endpoint: string) => {
    const response = await apiFetch(endpoint, { method: 'DELETE' });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  },

  // Auth shortcuts
  getCurrentUser: async () => {
    const response = await apiFetch('/auth/me');
    if (!response.ok) return null;
    return response.json();
  },
};

export default api;
