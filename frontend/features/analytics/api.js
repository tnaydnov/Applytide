/**
 * @fileoverview Analytics API endpoints
 * Extracted from lib/api.js during refactoring
 */

import { apiFetch, API_BASE } from '../../lib/api/core';

/**
 * Analytics API endpoints
 */
export const analyticsApi = {
  /**
   * Get analytics data
   * @param {string} timeRange - Time range ('6m', '1y', etc.)
   * @returns {Promise<Object>} Analytics data
   */
  getAnalytics: (timeRange = "6m") => apiFetch(`/analytics?range=${timeRange}`).then((r) => r.json()),

  /**
   * Export analytics as PDF
   * @param {string} timeRange - Time range ('6m', '1y', etc.)
   * @returns {Promise<void>} Triggers browser download
   */
  exportAnalyticsPDF: async (timeRange = "6m") => {
    const response = await fetch(`${API_BASE}/analytics/export/pdf?range=${timeRange}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error(await response.text());

    const blob = await response.blob();
    const cd = response.headers.get("content-disposition") || "";
    let filename = `analytics-report-${timeRange}.pdf`;

    const starMatch = cd.match(/filename\*\s*=\s*[^']+''([^;]+)/i);
    const quoted = cd.match(/filename\s*=\s*"([^"]+)"/i);
    const unquoted = cd.match(/filename\s*=\s*([^;]+)/i);
    if (starMatch) filename = decodeURIComponent(starMatch[1]);
    else if (quoted) filename = quoted[1];
    else if (unquoted) filename = unquoted[1].trim();

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Export analytics as CSV
   * @param {string} timeRange - Time range ('6m', '1y', etc.)
   * @returns {Promise<void>} Triggers browser download
   */
  exportAnalyticsCSV: async (timeRange = "6m") => {
    const response = await fetch(`${API_BASE}/analytics/export/csv?range=${timeRange}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error(await response.text());

    const blob = await response.blob();
    const cd = response.headers.get("content-disposition") || "";
    let filename = `analytics-data-${timeRange}.csv`;

    const starMatch = cd.match(/filename\*\s*=\s*[^']+''([^;]+)/i);
    const quoted = cd.match(/filename\s*=\s*"([^"]+)"/i);
    const unquoted = cd.match(/filename\s*=\s*([^;]+)/i);
    if (starMatch) filename = decodeURIComponent(starMatch[1]);
    else if (quoted) filename = quoted[1];
    else if (unquoted) filename = unquoted[1].trim();

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Get dashboard metrics
   * @returns {Promise<Object>} Dashboard metrics
   */
  getMetrics: () => apiFetch("/dashboard/metrics").then((r) => r.json()),

  /**
   * Get dashboard AI insights
   * @returns {Promise<Object>} Dashboard insights with weekly goal
   */
  getDashboardInsights: () => apiFetch("/dashboard/insights").then((r) => r.json()),
};
