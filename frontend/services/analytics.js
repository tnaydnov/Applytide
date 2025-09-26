// frontend/services/analytics.js

/**
 * Thin service layer for Analytics-related API calls.
 * It prefers your existing ../lib/api helpers if available,
 * and gracefully falls back to direct fetch() calls.
 */

import api from "../lib/api";

/** Internal: fetch wrapper that throws on non-2xx */
async function _jsonFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Get analytics data for a given time range.
 * @param {("1m"|"3m"|"6m"|"1y"|"all")} range
 */
export async function fetchAnalytics(range = "6m") {
  if (api?.getAnalytics) {
    // Use existing lib/api helper if present
    return api.getAnalytics(range);
  }
  // Fallback to REST endpoint
  return _jsonFetch(`/api/analytics?range=${encodeURIComponent(range)}`);
}

// Alias to match older imports (if you used api.getAnalytics before)
export const getAnalytics = fetchAnalytics;

/**
 * Export analytics as CSV.
 * @param {("1m"|"3m"|"6m"|"1y"|"all")} range
 */
export async function exportAnalyticsCSV(range = "6m") {
  if (api?.exportAnalyticsCSV) {
    return api.exportAnalyticsCSV(range);
  }
  // Fallback: trigger a file download URL endpoint
  // Expecting the server to return a file; here we just hit the URL to start download.
  const url = `/api/analytics/export/csv?range=${encodeURIComponent(range)}`;
  const link = document.createElement("a");
  link.href = url;
  link.download = ""; // let server filename win
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export analytics as PDF.
 * @param {("1m"|"3m"|"6m"|"1y"|"all")} range
 */
export async function exportAnalyticsPDF(range = "6m") {
  if (api?.exportAnalyticsPDF) {
    return api.exportAnalyticsPDF(range);
  }
  const url = `/api/analytics/export/pdf?range=${encodeURIComponent(range)}`;
  const link = document.createElement("a");
  link.href = url;
  link.download = ""; // let server filename win
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Optionally expose a convenience helper that normalizes empty fields.
 * Call this if you want guaranteed shapes in the UI components.
 */
export function normalizeAnalytics(raw) {
  const safe = (v, d) => (v == null ? d : v);

  return {
    overview: {
      totalApplications: safe(raw?.overview?.totalApplications, 0),
      applicationsChange: safe(raw?.overview?.applicationsChange, 0),
      interviewRate: safe(raw?.overview?.interviewRate, 0),
      interviewRateChange: safe(raw?.overview?.interviewRateChange, 0),
      offerRate: safe(raw?.overview?.offerRate, 0),
      offerRateChange: safe(raw?.overview?.offerRateChange, 0),
      avgResponseTime: safe(raw?.overview?.avgResponseTime, 0),
      responseTimeChange: safe(raw?.overview?.responseTimeChange, 0),
      statusDistribution: safe(raw?.overview?.statusDistribution, []),
      applicationsOverTime: safe(raw?.overview?.applicationsOverTime, []),
      funnel: safe(raw?.overview?.funnel, []),
    },
    applications: {
      statusBreakdown: safe(raw?.applications?.statusBreakdown, []),
      monthlyData: safe(raw?.applications?.monthlyData, []),
      jobTitles: safe(raw?.applications?.jobTitles, []),
      totalApplications: safe(raw?.applications?.totalApplications, 0),
      successRate: safe(raw?.applications?.successRate, 0),
      avgResponseTime: safe(raw?.applications?.avgResponseTime, 0),
    },
    interviews: {
      typeBreakdown: safe(raw?.interviews?.typeBreakdown, []),
      successByType: safe(raw?.interviews?.successByType, []),
      totalInterviews: safe(raw?.interviews?.totalInterviews, 0),
      successRate: safe(raw?.interviews?.successRate, 0),
      avgInterviewsPerApp: safe(raw?.interviews?.avgInterviewsPerApp, 0),
      conversionRate: safe(raw?.interviews?.conversionRate, 0),
      performanceOverTime: safe(raw?.interviews?.performanceOverTime, []),
    },
    companies: {
      topCompanies: safe(raw?.companies?.topCompanies, []),
      sizeDistribution: safe(raw?.companies?.sizeDistribution, []),
      successBySize: safe(raw?.companies?.successBySize, []),
      totalCompanies: safe(raw?.companies?.totalCompanies, 0),
      avgSuccessRate: safe(raw?.companies?.avgSuccessRate, 0),
      responseRate: safe(raw?.companies?.responseRate, 0),
    },
    timeline: {
      stageDurations: safe(raw?.timeline?.stageDurations, []),
      timelineTrends: safe(raw?.timeline?.timelineTrends, []),
      bottlenecks: safe(raw?.timeline?.bottlenecks, []),
      avgProcessDuration: safe(raw?.timeline?.avgProcessDuration, 0),
      avgResponseTime: safe(raw?.timeline?.avgResponseTime, 0),
      avgInterviewTime: safe(raw?.timeline?.avgInterviewTime, 0),
      avgDecisionTime: safe(raw?.timeline?.avgDecisionTime, 0),
    },
    salary: {
      avgSalaryOffered: safe(raw?.salary?.avgSalaryOffered, 0),
      salaryRange: safe(raw?.salary?.salaryRange, { min: 0, max: 0 }),
      salaryRangeDistribution: safe(raw?.salary?.salaryRangeDistribution, []),
      salaryByTitle: safe(raw?.salary?.salaryByTitle, []),
    },
  };
}

export default {
  fetchAnalytics,
  getAnalytics: fetchAnalytics,
  exportAnalyticsCSV,
  exportAnalyticsPDF,
  normalizeAnalytics,
};
