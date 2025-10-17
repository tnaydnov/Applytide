/**
 * @fileoverview Search API endpoints
 * Extracted from lib/api.js during refactoring
 */

import { apiFetch } from '../api/core';

/**
 * Search API endpoints
 */
export const searchApi = {
  /**
   * Advanced search across applications
   * @param {Object} payload - Search query and filters
   * @returns {Promise<Object>} Search results
   */
  advancedSearch: (payload) =>
    apiFetch("/search/advanced", { method: "POST", body: JSON.stringify(payload) }).then((r) => r.json()),

  /**
   * Get search suggestions
   * @param {string} query - Search query
   * @returns {Promise<Array>} Suggestions
   */
  getSearchSuggestions: (query) =>
    apiFetch(`/search/suggestions?q=${encodeURIComponent(query)}`).then((r) => r.json()),

  /**
   * Get available filter options
   * @returns {Promise<Object>} Filter options
   */
  getFilterOptions: () => apiFetch("/search/filters").then((r) => r.json()),

  /**
   * Get saved searches
   * @returns {Promise<Array>} List of saved searches
   */
  getSavedSearches: () => apiFetch("/search/saved").then((r) => r.json()),

  /**
   * Save a search
   * @param {Object} payload - Search to save
   * @returns {Promise<Object>} Saved search
   */
  saveSearch: (payload) =>
    apiFetch("/search/saved", { method: "POST", body: JSON.stringify(payload) }).then((r) => r.json()),

  /**
   * Delete a saved search
   * @param {number} id - Saved search ID
   * @returns {Promise<Object>} Delete response
   */
  deleteSavedSearch: (id) => apiFetch(`/search/saved/${id}`, { method: "DELETE" }).then((r) => r.json()),
};
