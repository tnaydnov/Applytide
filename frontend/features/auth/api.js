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
  changePassword: async (passwordData) => {
    const response = await apiFetch("/auth/change-password", { 
      method: "POST", 
      body: JSON.stringify(passwordData) 
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      
      // Handle validation errors with details array
      if (errorData.error?.details && Array.isArray(errorData.error.details)) {
        const messages = errorData.error.details.map(err => {
          // Clean up the message (remove "Value error, " prefix)
          return err.msg?.replace('Value error, ', '') || err.message || 'Validation error';
        });
        throw new Error(messages.join('. '));
      }
      // Handle simple error messages
      if (errorData.error?.message) {
        throw new Error(errorData.error.message);
      }
      // Handle detail field (common in FastAPI)
      if (errorData.detail) {
        throw new Error(errorData.detail);
      }
      
      throw new Error("Password change failed");
    }
    
    return response.json();
  },

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

  /**
   * Mark welcome modal as seen
   * @returns {Promise<Object>} Success response
   */
  markWelcomeModalSeen: () =>
    apiFetch("/auth/welcome-modal-seen", { method: "POST" }).then((r) => r.json()),
};
