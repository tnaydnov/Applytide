/**
 * @fileoverview API Client - Backward Compatible Barrel Export
 * 
 * This file maintains 100% backward compatibility with the original lib/api.js
 * All existing imports will continue to work without any changes.
 * 
 * Original file refactored into:
 * - lib/api/core.js - Core fetch wrapper, auth, token management
 * - lib/api/websocket.js - WebSocket connection
 * - lib/api/utils.js - Helper utilities
 * - features/auth/api.js - Authentication endpoints
 * - features/jobs/api.js - Jobs endpoints
 * - features/documents/api.js - Documents endpoints
 * - features/applications/api.js - Applications endpoints
 * - features/analytics/api.js - Analytics endpoints
 * - features/profile/api.js - Profile endpoints
 * - features/search/api.js - Search endpoints
 * 
 * This index.js re-exports everything to maintain compatibility.
 */

// Core infrastructure
export { apiFetch, login, logout, logoutAll } from './api/core';
export { connectWS } from './api/websocket';

// Import feature APIs
import { authApi } from '../features/auth/api';
import { jobsApi } from '../features/jobs/api';
import { documentsApi } from '../features/documents/api';
import { applicationsApi } from '../features/applications/api';
import { analyticsApi } from '../features/analytics/api';
import { profileApi } from '../features/profile/api';
import { searchApi } from '../features/search/api';
import { apiFetch } from './api/core';

/**
 * Main API object - maintains exact same structure as original
 * This ensures all existing code using `import { api } from '../lib/api'` works unchanged
 */
export const api = {
  // Generic HTTP methods for direct API calls
  get: async (endpoint) => {
    const response = await apiFetch(endpoint, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    return await response.json();
  },
  post: async (endpoint, data) => {
    const response = await apiFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    return await response.json();
  },

  // Auth methods (from features/auth/api.js)
  register: authApi.register,
  login: authApi.login,
  logout: authApi.logout,
  getCurrentUser: authApi.getCurrentUser,
  updateProfile: authApi.updateProfile,
  updatePreferences: authApi.updatePreferences,
  changePassword: authApi.changePassword,
  uploadAvatar: authApi.uploadAvatar,
  markWelcomeModalSeen: authApi.markWelcomeModalSeen,

  // Jobs methods (from features/jobs/api.js)
  listJobs: jobsApi.listJobs,
  scrapeJob: jobsApi.scrapeJob,
  aiAnalyzeJob: jobsApi.aiAnalyzeJob,
  createJob: jobsApi.createJob,
  createManualJob: jobsApi.createManualJob,
  updateJob: jobsApi.updateJob,
  deleteJob: jobsApi.deleteJob,
  getJobById: jobsApi.getJobById,

  // Documents methods (from features/documents/api.js)
  getDocuments: documentsApi.getDocuments,
  getResumes: documentsApi.getResumes,
  listResumes: documentsApi.listResumes,
  getDocument: documentsApi.getDocument,
  uploadDocument: documentsApi.uploadDocument,
  deleteDocument: documentsApi.deleteDocument,
  downloadDocument: documentsApi.downloadDocument,
  previewDocument: documentsApi.previewDocument,
  optimizeDocument: documentsApi.optimizeDocument,
  setDocumentStatus: documentsApi.setDocumentStatus,
  analyzeDocument: documentsApi.analyzeDocument,
  attachExistingDocument: documentsApi.attachExistingDocument,
  getDocumentTemplates: documentsApi.getDocumentTemplates,
  generateCoverLetter: documentsApi.generateCoverLetter,

  // Applications methods (from features/applications/api.js)
  createApp: applicationsApi.createApp,
  listAppsByStatus: applicationsApi.listAppsByStatus,
  listCardsByStatus: applicationsApi.listCardsByStatus,
  moveApp: applicationsApi.moveApp,
  updateApplication: applicationsApi.updateApplication,
  deleteApp: applicationsApi.deleteApp,
  toggleArchiveApp: applicationsApi.toggleArchiveApp,
  getAppDetail: applicationsApi.getAppDetail,
  addStage: applicationsApi.addStage,
  getStages: applicationsApi.getStages,
  deleteStage: applicationsApi.deleteStage,
  addNote: applicationsApi.addNote,
  getNotes: applicationsApi.getNotes,
  getApplications: applicationsApi.getApplications,
  getApplicationCards: applicationsApi.getApplicationCards,
  getUsedStatuses: applicationsApi.getUsedStatuses,
  getApplicationsWithStages: applicationsApi.getApplicationsWithStages,

  // Analytics methods (from features/analytics/api.js)
  getAnalytics: analyticsApi.getAnalytics,
  exportAnalyticsPDF: analyticsApi.exportAnalyticsPDF,
  exportAnalyticsCSV: analyticsApi.exportAnalyticsCSV,
  getMetrics: analyticsApi.getMetrics,
  getDashboardInsights: analyticsApi.getDashboardInsights,

  // Profile methods (from features/profile/api.js)
  getUserProfile: profileApi.getUserProfile,
  updateUserProfile: profileApi.updateUserProfile,
  getUserJobPreferences: profileApi.getUserJobPreferences,
  updateJobPreferences: profileApi.updateJobPreferences,
  getUserCareerGoals: profileApi.getUserCareerGoals,
  updateCareerGoals: profileApi.updateCareerGoals,
  getPreferences: profileApi.getPreferences,
  getPreference: profileApi.getPreference,
  savePreference: profileApi.savePreference,
  updatePreference: profileApi.updatePreference,
  markWelcomeModalSeen: profileApi.markWelcomeModalSeen,

  // Search methods (from features/search/api.js)
  advancedSearch: searchApi.advancedSearch,
  getSearchSuggestions: searchApi.getSearchSuggestions,
  getFilterOptions: searchApi.getFilterOptions,
  getSavedSearches: searchApi.getSavedSearches,
  saveSearch: searchApi.saveSearch,
  deleteSavedSearch: searchApi.deleteSavedSearch,
};

/**
 * Default export - maintains compatibility with `import api from '../lib/api'`
 * This includes the main api object PLUS additional helper functions
 */
export default {
  ...api,
  uploadApplicationAttachment: applicationsApi.uploadApplicationAttachment,
};
