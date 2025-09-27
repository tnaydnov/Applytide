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
  const pick = (obj, keys, def) => {
    for (const k of keys) {
      if (obj && obj[k] != null) return obj[k];
    }
    return def;
  };

  const r = raw || {};
  const ov = r.overview || {};
  const ap = r.applications || {};
  const iv = r.interviews || {};
  const co = r.companies || {};
  const tl = r.timeline || {};
  const ac = r.activity || {};
  const so = r.sources || {};
  const ex = r.experiments || {};
  const bt = r.bestTime || {};
  const expt = r.expectations || {};

  return {
    overview: {
      totalApplications: safe(ov.totalApplications, 0),
      applicationsChange: safe(ov.applicationsChange, 0),
      interviewRate: safe(ov.interviewRate, 0),
      interviewRateChange: safe(ov.interviewRateChange, 0),
      offerRate: safe(ov.offerRate, 0),
      offerRateChange: safe(ov.offerRateChange, 0),
      avgResponseTime: safe(ov.avgResponseTime, 0),
      responseTimeChange: safe(ov.responseTimeChange, 0),
      statusDistribution: safe(ov.statusDistribution, []),
      applicationsOverTime: safe(ov.applicationsOverTime, []),
      funnel: safe(ov.funnel, []),
    },

    applications: {
      statusBreakdown: safe(pick(ap, ["statusBreakdown"], [])),
      monthlyData: safe(pick(ap, ["monthlyData", "applicationsByMonth"], [])),
      jobTitles: safe(pick(ap, ["jobTitles", "topJobTitles"], [])),
      totalApplications: safe(ap.totalApplications, 0),
      successRate: safe(ap.successRate, 0),
      avgResponseTime: safe(ap.avgResponseTime, 0),
      uniqueCompanies: safe(pick(ap, ["uniqueCompanies"], 0)),
    },

    interviews: {
      typeBreakdown: safe(pick(iv, ["typeBreakdown", "interviewTypeBreakdown"], [])),
      successByType: safe(pick(iv, ["successByType"], [])),
      totalInterviews: safe(iv.totalInterviews, 0),
      successRate: safe(iv.successRate, 0),
      avgInterviewsPerApp: safe(iv.avgInterviewsPerApp, 0),
      conversionRate: safe(pick(iv, ["conversionRate","interviewConversionRate"], 0)),
      performanceOverTime: safe(pick(iv, ["performanceOverTime"], [])),
      interviewOutcomes: safe(pick(iv, ["interviewOutcomes"], [])),
    },

    companies: {
      topCompanies: safe(co.topCompanies, []),
      sizeDistribution: safe(pick(co, ["sizeDistribution","companySizeDistribution"], [])),
      successBySize: safe(co.successBySize, []),
      totalCompanies: safe(co.totalCompanies, 0),
      avgSuccessRate: safe(co.avgSuccessRate, 0),
      responseRate: safe(co.responseRate, 0),
      avgApplicationsPerCompany: safe(co.avgApplicationsPerCompany, 0),
    },

    timeline: {
      stageDurations: safe(pick(tl, ["stageDurations","stageTransitions"], [])),
      timelineTrends: safe(pick(tl, ["timelineTrends","weeklyApplicationTrends"], [])),
      bottlenecks: safe(tl.bottlenecks, []),
      avgProcessDuration: safe(tl.avgProcessDuration, 0),
      avgResponseTime: safe(tl.avgResponseTime, 0),
      avgInterviewTime: safe(tl.avgInterviewTime, 0),
      avgDecisionTime: safe(tl.avgDecisionTime, 0),
      totalProcesses: safe(tl.totalProcesses, 0),
    },

    activity: {
      activityByDay: safe(ac.activityByDay, []),
      streak: safe(ac.streak, { current: 0, best: 0 }),
    },

    sources: {
      breakdown: safe(so.breakdown, []),
      interviewRateBySource: safe(so.interviewRateBySource, []),
      offerRateBySource: safe(so.offerRateBySource, []),
      topSources: safe(so.topSources, []),
    },

    experiments: {
      resumeVersions: safe(ex.resumeVersions, []),
      coverLetterImpact: safe(ex.coverLetterImpact, null),
    },

    bestTime: {
      byWeekday: safe(bt.byWeekday, []),
      byHour: safe(bt.byHour, []),
      bestWindowText: safe(bt.bestWindowText, ""),
    },

    expectations: {
      medians: safe(expt.medians, {}),
      p75: safe(expt.p75, {}),
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
