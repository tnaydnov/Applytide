/**
 * @fileoverview Applications API endpoints
 * Extracted from lib/api.js during refactoring
 */

import { apiFetch } from '../../lib/api/core';

/**
 * Applications API endpoints
 */
export const applicationsApi = {
  /**
   * Create a new application
   * @param {Object} payload - Application data
   * @returns {Promise<Object>} Created application
   */
  createApp: (payload) =>
    apiFetch("/applications", { method: "POST", body: JSON.stringify(payload) }).then((r) => r.json()),

  /**
   * List applications by status
   * @param {string} status - Application status
   * @returns {Promise<Array>} Applications with given status
   */
  listAppsByStatus: (status) => apiFetch(`/applications?status=${encodeURIComponent(status)}`).then((r) => r.json()),

  /**
   * List application cards by status
   * @param {string} status - Application status
   * @returns {Promise<Array>} Application cards for kanban view
   */
  listCardsByStatus: (status) =>
    apiFetch(`/applications/cards?status=${encodeURIComponent(status)}`).then((r) => r.json()),

  /**
   * Move application to different status
   * @param {number} id - Application ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated application
   */
  moveApp: (id, status) =>
    apiFetch(`/applications/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }).then((r) => r.json()),

  /**
   * Update application
   * @param {number} id - Application ID
   * @param {Object} payload - Updated data
   * @returns {Promise<Object>} Updated application
   */
  updateApplication: (id, payload) =>
    apiFetch(`/applications/${id}`, { method: "PATCH", body: JSON.stringify(payload) }).then((r) => r.json()),

  /**
   * Delete application
   * @param {number} id - Application ID
   * @returns {Promise<Response>} Delete response
   */
  deleteApp: (id) =>
    apiFetch(`/applications/${id}`, { method: "DELETE" }),

  /**
   * Get application details
   * @param {number} id - Application ID
   * @returns {Promise<Object>} Application details
   */
  getAppDetail: (id) => apiFetch(`/applications/${id}/detail`).then((r) => r.json()),

  /**
   * Add stage to application
   * @param {number} id - Application ID
   * @param {Object} payload - Stage data
   * @returns {Promise<Object>} Created stage
   */
  addStage: (id, payload) =>
    apiFetch(`/applications/${id}/stages`, { method: "POST", body: JSON.stringify(payload) }).then((r) => r.json()),

  /**
   * Get application stages
   * @param {number} id - Application ID
   * @returns {Promise<Array>} List of stages
   */
  getStages: (id) => apiFetch(`/applications/${id}/stages`).then((r) => r.json()),

  /**
   * Delete a stage
   * @param {number} applicationId - Application ID
   * @param {number} stageId - Stage ID
   * @returns {Promise<Response>} Delete response
   */
  deleteStage: (applicationId, stageId) =>
    apiFetch(`/applications/${applicationId}/stages/${stageId}`, { method: "DELETE" }),

  /**
   * Add note to application
   * @param {number} id - Application ID
   * @param {string} body - Note content
   * @returns {Promise<Object>} Created note
   */
  addNote: (id, body) =>
    apiFetch(`/applications/${id}/notes`, { method: "POST", body: JSON.stringify({ body }) }).then((r) => r.json()),

  /**
   * Get application notes
   * @param {number} id - Application ID
   * @returns {Promise<Array>} List of notes
   */
  getNotes: (id) => apiFetch(`/applications/${id}/notes`).then((r) => r.json()),

  /**
   * Get all applications
   * @returns {Promise<Array>} All applications
   */
  getApplications: () => apiFetch("/applications").then((r) => r.json()),

  /**
   * Get all application cards
   * @returns {Promise<Array>} All application cards
   */
  getApplicationCards: () => apiFetch("/applications/cards").then((r) => r.json()),

  /**
   * Get used statuses
   * @returns {Promise<Array>} List of statuses in use
   */
  getUsedStatuses: () => apiFetch("/applications/statuses").then((r) => r.json()),

  /**
   * Get applications with stages
   * @returns {Promise<Array>} Applications including stage data
   */
  getApplicationsWithStages: () => apiFetch("/applications/with-stages").then((r) => r.json()),

  /**
   * Upload attachment to application
   * @param {number} appId - Application ID
   * @param {FormData} formData - Form data with file
   * @returns {Promise<Object>} Upload response
   */
  uploadApplicationAttachment: async (appId, formData) => {
    const r = await apiFetch(`/applications/${appId}/attachments`, {
      method: 'POST',
      body: formData,
    });
    if (!r.ok) throw new Error('Upload failed');
    return r.json();
  },
};
