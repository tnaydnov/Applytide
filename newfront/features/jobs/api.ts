/**
 * Jobs API endpoints
 * Handles job listings, scraping, and job management
 */

import { apiFetch } from '../../lib/api/core';

// ============================================================================
// Types
// ============================================================================

export interface Job {
  id: number | string;
  title: string;
  company_name?: string;
  location?: string;
  description?: string;
  requirements?: string[];
  skills?: string[];
  remote_type?: string;
  job_type?: string;
  source_url?: string;
  job_url?: string;
  salary_range?: string;
  application_deadline?: string;
  created_at?: string;
  is_archived?: boolean;
  [key: string]: unknown;
}

export interface JobPayload {
  title: string;
  company_name: string;
  location?: string;
  description?: string;
  requirements?: string[];
  skills?: string[];
  remote_type?: string;
  job_type?: string;
  source_url?: string;
  [key: string]: unknown;
}

export interface JobsListParams {
  page?: number;
  page_size?: number;
  search?: string;
  location?: string;
  remote_type?: string;
  sort?: string;
  archived?: boolean;
  sort_by?: 'newest' | 'oldest';
}

export interface JobsListResponse {
  items: Job[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// ============================================================================
// Jobs API
// ============================================================================

export const jobsApi = {
  /**
   * List all jobs with pagination and filters
   */
  listJobs: (params: JobsListParams = {}): Promise<JobsListResponse> => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', String(params.page));
    if (params.page_size) queryParams.append('page_size', String(params.page_size));
    if (params.search) queryParams.append('q', params.search);
    if (params.location) queryParams.append('location', params.location);
    if (params.remote_type) queryParams.append('remote_type', params.remote_type);
    if (params.sort) queryParams.append('sort', params.sort);
    if (params.archived) queryParams.append('show_archived', String(params.archived));
    if (params.sort_by) {
      // Convert sort_by presets to sort+order params
      if (params.sort_by === 'newest') {
        queryParams.append('sort', 'created_at');
        queryParams.append('order', 'desc');
      } else if (params.sort_by === 'oldest') {
        queryParams.append('sort', 'created_at');
        queryParams.append('order', 'asc');
      }
    }

    return apiFetch(`/jobs?${queryParams.toString()}`).then((r) => r.json());
  },

  /**
   * Get single job by ID
   */
  getJobById: (id: number | string): Promise<Job> =>
    apiFetch(`/jobs/${id}`).then((r) => r.json()),

  /**
   * Create manual job entry
   */
  createManualJob: (payload: JobPayload): Promise<Job> =>
    apiFetch('/jobs/manual', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).then((r) => r.json()),

  /**
   * Update existing job
   */
  updateJob: (jobId: number | string, payload: Partial<JobPayload>): Promise<Job> =>
    apiFetch(`/jobs/${jobId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }).then((r) => r.json()),

  /**
   * Delete a job
   */
  deleteJob: (jobId: number | string): Promise<void> =>
    apiFetch(`/jobs/${jobId}`, { method: 'DELETE' }).then(() => {}),

  /**
   * Archive a job
   */
  archiveJob: (jobId: number | string): Promise<Job> =>
    apiFetch(`/jobs/${jobId}/archive`, { method: 'POST' }).then((r) => r.json()),

  /**
   * Unarchive a job
   */
  unarchiveJob: (jobId: number | string): Promise<Job> =>
    apiFetch(`/jobs/${jobId}/unarchive`, { method: 'POST' }).then((r) => r.json()),

  /**
   * Extract/scrape job from URL using AI
   * Uses /ai/extract endpoint - returns { job: { ... } }
   */
  scrapeJob: async (url: string): Promise<Job> => {
    const response = await apiFetch('/ai/extract', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
    const data = await response.json();
    return data.job ?? data;
  },

  /**
   * Get search suggestions
   */
  getSearchSuggestions: (query: string): Promise<string[]> =>
    apiFetch(`/jobs/suggestions?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((data) => data.suggestions || [])
      .catch(() => []),
};