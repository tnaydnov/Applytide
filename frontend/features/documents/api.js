/**
 * @fileoverview Documents API endpoints
 * Extracted from lib/api.js during refactoring
 */

import { apiFetch, API_BASE } from '../api/core';
import { toQuery } from '../api/utils';

/**
 * Documents API endpoints
 */
export const documentsApi = {
  /**
   * List documents with optional filters
   * @param {Object} params - Query parameters (document_type, page, page_size)
   * @returns {Promise<Object>} Document list response
   */
  getDocuments: (params) => {
    const qs = toQuery(params);
    const base = "/documents/";
    return apiFetch(`${base}${qs ? `?${qs}` : ""}`).then(r => r.json());
  },

  /**
   * Get resumes (convenience method using getDocuments)
   * @returns {Promise<Array>} List of resume documents
   */
  getResumes: async () => {
    const r = await apiFetch(`/documents/?document_type=resume&page=1&page_size=200`);
    const data = await r.json();
    return Array.isArray(data?.documents) ? data.documents : [];
  },

  /**
   * List resumes in label format (for dropdowns/selects)
   * @returns {Promise<Array>} Resumes with id and label
   */
  listResumes: async () => {
    const res = await documentsApi.getResumes();
    const docs = Array.isArray(res?.documents) ? res.documents
      : Array.isArray(res) ? res
        : Array.isArray(res?.items) ? res.items
          : [];
    return docs.map(d => ({
      id: d.id,
      label: d.name || d.label || d.filename || 'Resume'
    }));
  },

  /**
   * Get a single document by ID
   * @param {number} id - Document ID
   * @returns {Promise<Object>} Document details
   */
  getDocument: (id) => apiFetch(`/documents/${id}`).then((r) => r.json()),

  /**
   * Upload a new document
   * @param {Object} options - Upload options
   * @param {File} options.file - File to upload
   * @param {string} options.document_type - Type: 'resume'|'cover_letter'|etc.
   * @param {string} options.name - Optional document name
   * @param {Object} options.metadata - Optional metadata
   * @returns {Promise<Object>} Uploaded document
   */
  uploadDocument: ({ file, document_type, name, metadata }) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("document_type", document_type);
    if (name) formData.append("name", name);
    if (metadata) formData.append("metadata", JSON.stringify(metadata));

    return fetch(`${API_BASE}/documents/upload`, {
      method: "POST",
      credentials: 'include',
      body: formData,
    }).then(async (r) => {
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    });
  },

  /**
   * Delete a document
   * @param {number} id - Document ID
   * @returns {Promise<Response>} Delete response
   */
  deleteDocument: (id) => apiFetch(`/documents/${id}`, { method: "DELETE" }),

  /**
   * Download a document
   * @param {number} id - Document ID
   * @returns {Promise<void>} Triggers browser download
   */
  downloadDocument: async (id) => {
    const response = await fetch(`${API_BASE}/documents/${id}/download`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error(await response.text());

    const cd = response.headers.get("content-disposition") || "";
    let filename = "document";

    const starMatch = cd.match(/filename\*\s*=\s*([^']+)''([^;]+)/i);
    if (starMatch) {
      try {
        filename = decodeURIComponent(starMatch[2]);
      } catch {
        filename = starMatch[2];
      }
    } else {
      const quoted = cd.match(/filename\s*=\s*"([^"]+)"/i);
      if (quoted) {
        filename = quoted[1];
      } else {
        const unquoted = cd.match(/filename\s*=\s*([^;]+)/i);
        if (unquoted) filename = unquoted[1].trim();
      }
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Preview a document in new tab
   * @param {number} id - Document ID
   * @returns {Promise<boolean>} Success status
   */
  previewDocument: async (id) => {
    const resp = await fetch(`${API_BASE}/documents/${id}/preview`, {
      credentials: 'include',
    });
    if (!resp.ok) throw new Error(await resp.text());
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return true;
  },

  /**
   * Optimize document content
   * @param {Object} payload - Optimization parameters
   * @returns {Promise<Object>} Optimized document
   */
  optimizeDocument: (payload) =>
    apiFetch(`/documents/optimize`, { method: "POST", body: JSON.stringify(payload) }).then((r) => r.json()),

  /**
   * Set document status
   * @param {number} id - Document ID
   * @param {string} new_status - New status value
   * @returns {Promise<Object>} Updated document
   */
  setDocumentStatus: (id, new_status) =>
    apiFetch(`/documents/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ new_status }),
    }).then(r => r.json()),

  /**
   * Analyze document (with optional job context)
   * @param {number} documentId - Document ID
   * @param {Object} options - Analysis options
   * @param {number} options.jobId - Optional job ID for context
   * @returns {Promise<Object>} Analysis results
   */
  analyzeDocument: (documentId, { jobId } = {}) =>
    apiFetch(
      `/documents/${documentId}/analyze` +
      (jobId ? `?job_id=${encodeURIComponent(jobId)}` : "") +
      (jobId ? "&" : "?") + "use_ai=true",
      { method: "POST" }
    ).then((r) => r.json()),

  /**
   * Attach existing document to application
   * @param {number} appId - Application ID
   * @param {number} documentId - Document ID
   * @returns {Promise<Object>} Attachment response
   */
  attachExistingDocument: (appId, documentId) =>
    apiFetch(`/applications/${appId}/attachments/from-document`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document_id: String(documentId) })
    }).then(r => r.json()),

  /**
   * Get document templates
   * @param {Object} params - Filter parameters (category, document_type)
   * @returns {Promise<Array>} List of templates
   */
  getDocumentTemplates: (params) => {
    const qs = toQuery(params);
    return apiFetch(`/documents/templates/${qs ? `?${qs}` : ""}`).then((r) => r.json());
  },

  /**
   * Generate cover letter
   * @param {Object} payload - Generation parameters
   * @returns {Promise<string|Object>} Generated cover letter text or data
   */
  generateCoverLetter: async (payload) => {
    const response = await apiFetch("/documents/cover-letter/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Extract the actual cover letter text from various possible response formats
    let coverLetterText = '';

    if (typeof data === 'string') {
      // Direct string response
      coverLetterText = data;
    } else if (data?.content) {
      // { content: "..." } format
      coverLetterText = data.content;
    } else if (data?.text) {
      // { text: "..." } format
      coverLetterText = data.text;
    } else if (data?.choices && data.choices[0]?.message?.content) {
      // OpenAI API format
      coverLetterText = data.choices[0].message.content;
    } else if (data?.assistant) {
      // Format from your OpenAI log
      coverLetterText = data.assistant;
    } else if (data?.output) {
      // Another common format
      coverLetterText = data.output;
    }

    // If we still don't have text, return the whole object and let component handle it
    return coverLetterText || data;
  },
};
