/**
 * @fileoverview Profile API endpoints
 * Extracted from lib/api.js during refactoring
 */

import { apiFetch } from '../../lib/api/core';

/**
 * Profile API endpoints
 */
export const profileApi = {
  /**
   * Get user profile
   * @returns {Promise<Object>} User profile data
   */
  getUserProfile: () => apiFetch("/profile/").then((r) => r.json()),

  /**
   * Update user profile
   * @param {Object} profileData - Profile data to update
   * @returns {Promise<Object>} Updated profile
   */
  updateUserProfile: (profileData) =>
    apiFetch("/profile/", { method: "PUT", body: JSON.stringify(profileData) }).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
      return r.json();
    }),

  /**
   * Get job preferences
   * @returns {Promise<Object>} Job preferences
   */
  getUserJobPreferences: () => apiFetch("/profile/job-preferences").then((r) => r.json()),

  /**
   * Update job preferences
   * @param {Object} preferences - Job preferences to update
   * @returns {Promise<Object>} Updated preferences
   */
  updateJobPreferences: (preferences) =>
    apiFetch("/profile/job-preferences", { method: "PUT", body: JSON.stringify(preferences) }).then((r) => r.json()),

  /**
   * Get career goals
   * @returns {Promise<Object>} Career goals
   */
  getUserCareerGoals: () => apiFetch("/profile/career-goals").then((r) => r.json()),

  /**
   * Update career goals
   * @param {Object} goals - Career goals to update
   * @returns {Promise<Object>} Updated goals
   */
  updateCareerGoals: (goals) =>
    apiFetch("/profile/career-goals", { method: "PUT", body: JSON.stringify(goals) }).then((r) => r.json()),

  /**
   * Get user preferences
   * @returns {Promise<Array>} List of preferences
   */
  getPreferences: () => apiFetch("/preferences").then((r) => r.json()),

  /**
   * Get a specific preference
   * @param {string} key - Preference key
   * @returns {Promise<Object>} Preference value
   */
  getPreference: (key) => apiFetch(`/preferences/${key}`).then((r) => r.json()),

  /**
   * Save a new preference
   * @param {string} key - Preference key
   * @param {any} value - Preference value
   * @returns {Promise<Object>} Saved preference
   */
  savePreference: (key, value) =>
    apiFetch("/preferences", { method: "POST", body: JSON.stringify({ preference_key: key, preference_value: value }) })
      .then((r) => r.json()),

  /**
   * Update an existing preference
   * @param {string} key - Preference key
   * @param {any} value - New preference value
   * @returns {Promise<Object>} Updated preference
   */
  updatePreference: (key, value) =>
    apiFetch(`/preferences/${key}`, { method: "PUT", body: JSON.stringify({ preference_value: value }) }).then((r) =>
      r.json()
    ),
};
