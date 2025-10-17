/**
 * @fileoverview Jobs API endpoints
 * Extracted from lib/api.js during refactoring
 */

import { apiFetch } from '../api/core';

/**
 * Jobs API endpoints
 */
export const jobsApi = {
  /**
   * List all jobs
   * @returns {Promise<Array>} List of jobs
   */
  listJobs: () => apiFetch("/jobs").then((r) => r.json()),

  /**
   * Scrape job from URL
   * @param {string} url - Job posting URL
   * @returns {Promise<Object>} Scraped job data
   */
  scrapeJob: (url) =>
    apiFetch("/jobs/scrape", { method: "POST", body: JSON.stringify({ url }) }).then((r) => r.json()),

  /**
   * AI analyze job from URL
   * @param {string} url - Job posting URL
   * @returns {Promise<Object>} AI analysis of job
   */
  aiAnalyzeJob: (url) =>
    apiFetch("/jobs/ai-analyze", { method: "POST", body: JSON.stringify({ url }) }).then((r) => r.json()),

  /**
   * Create a new job
   * @param {Object} payload - Job data
   * @returns {Promise<Object>} Created job
   */
  createJob: (payload) =>
    apiFetch("/jobs", { method: "POST", body: JSON.stringify(payload) }).then((r) => r.json()),

  /**
   * Create a manual job entry
   * @param {Object} payload - Manual job data
   * @returns {Promise<Object>} Created job
   */
  createManualJob: (payload) =>
    apiFetch("/jobs/manual", { method: "POST", body: JSON.stringify(payload) }).then((r) => r.json()),

  /**
   * Update an existing job
   * @param {number} jobId - Job ID
   * @param {Object} payload - Updated job data
   * @returns {Promise<Object>} Updated job
   */
  updateJob: (jobId, payload) =>
    apiFetch(`/jobs/${jobId}`, { method: "PUT", body: JSON.stringify(payload) }).then((r) => r.json()),

  /**
   * Delete a job
   * @param {number} jobId - Job ID
   * @returns {Promise<Response>} Delete response
   */
  deleteJob: (jobId) => apiFetch(`/jobs/${jobId}`, { method: "DELETE" }),

  /**
   * Get job by ID
   * @param {number} id - Job ID
   * @returns {Promise<Object>} Job details
   */
  getJobById: (id) => apiFetch(`/jobs/${id}`).then(r => r.json()),
};
