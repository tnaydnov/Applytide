/**
 * @fileoverview Authentication API endpoints
 * Extracted from lib/api.js during refactoring
 */

import { apiFetch, login, logout } from '../../lib/api/core';

/**
 * Authentication API endpoints
 */
export const authApi = {
  /**
   * Register a new user
   * @param {Object} data - Registration data (email, password, etc.)
   * @returns {Promise<Object>} Registration response
   */
  register: async (data) => {
    const r = await fetch('/api/auth/register', {
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

  /**
   * Login with email and password
   * Re-exported from core for consistency
   */
  login,

  /**
   * Logout from current device
   * Re-exported from core for consistency
   */
  logout,

  /**
   * Get current authenticated user
   * @returns {Promise<Object>} User data
   */
  getCurrentUser: () => apiFetch("/auth/me").then((r) => r.json()),

  /**
   * Update user profile (auth endpoint)
   * @param {Object} profileData - Profile data to update
   * @returns {Promise<Object>} Updated profile
   */
  updateProfile: (profileData) =>
    apiFetch("/auth/profile", { method: "PUT", body: JSON.stringify(profileData) }).then((r) => r.json()),

  /**
   * Update user preferences
   * @param {Object} preferences - Preferences to update
   * @returns {Promise<Object>} Updated preferences
   */
  updatePreferences: (preferences) =>
    apiFetch("/auth/preferences", { method: "PUT", body: JSON.stringify(preferences) }).then((r) => r.json()),

  /**
   * Change password
   * @param {Object} passwordData - Old and new password
   * @returns {Promise<Object>} Success response
   */
  changePassword: (passwordData) =>
    apiFetch("/auth/change-password", { method: "POST", body: JSON.stringify(passwordData) }).then((r) => r.json()),

  /**
   * Upload user avatar
   * @param {File} file - Avatar image file
   * @returns {Promise<Object>} Upload response with avatar URL
   */
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
};
