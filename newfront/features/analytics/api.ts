/**
 * Analytics API Module
 * Handles analytics data fetching and processing
 */

import { apiFetch } from '../../lib/api/core';

// Types
export interface AnalyticsOverview {
  totalApplications: number;
  responseRate: number;
  interviewRate: number;
  offerRate: number;
  avgResponseTime: number;
  topCompanies: Array<{ name: string; count: number }>;
  statusBreakdown: Array<{ status: string; count: number; percentage: number }>;
  weeklyTrend: Array<{ week: string; applications: number; responses: number }>;
}

export interface AnalyticsApplications {
  dailyApplications: Array<{ date: string; count: number }>;
  weeklyApplications: Array<{ week: string; count: number }>;
  monthlyApplications: Array<{ month: string; count: number }>;
  statusDistribution: Array<{ status: string; count: number; color: string }>;
  applicationsByDay: Array<{ day: string; count: number }>;
  applicationsByHour: Array<{ hour: number; count: number }>;
}

export interface AnalyticsCompanies {
  topCompanies: Array<{ name: string; applications: number; responses: number; responseRate: number }>;
  companiesByIndustry: Array<{ industry: string; count: number }>;
  companiesBySize: Array<{ size: string; count: number }>;
  responseRateByCompany: Array<{ company: string; rate: number }>;
}

export interface AnalyticsTimeline {
  milestones: Array<{ date: string; event: string; type: string }>;
  applicationTimeline: Array<{ date: string; applications: number; interviews: number; offers: number }>;
  averageTimeToResponse: number;
  averageTimeToInterview: number;
  averageTimeToOffer: number;
}

export interface AnalyticsBestTime {
  bestDayToApply: string;
  bestTimeToApply: string;
  responseRateByDay: Array<{ day: string; rate: number }>;
  responseRateByHour: Array<{ hour: number; rate: number }>;
  heatmapData: Array<{ day: string; hour: number; responses: number }>;
}

export interface AnalyticsSources {
  sourceBreakdown: Array<{ source: string; count: number; responseRate: number }>;
  bestPerformingSource: string;
  sourceComparison: Array<{ source: string; applications: number; interviews: number; offers: number }>;
}

export interface AnalyticsInterviews {
  totalInterviews: number;
  interviewsScheduled: number;
  interviewsCompleted: number;
  successRate: number;
  interviewsByStage: Array<{ stage: string; count: number }>;
  interviewsByCompany: Array<{ company: string; count: number }>;
  averageInterviewsPerApplication: number;
}

export interface AnalyticsExpectations {
  averageSalary: number;
  salaryRange: { min: number; max: number };
  salaryDistribution: Array<{ range: string; count: number }>;
  topBenefits: Array<{ benefit: string; count: number }>;
  workArrangement: Array<{ type: string; count: number }>;
}

export interface AnalyticsData {
  overview: AnalyticsOverview;
  applications: AnalyticsApplications;
  companies: AnalyticsCompanies;
  timeline: AnalyticsTimeline;
  bestTime: AnalyticsBestTime;
  sources: AnalyticsSources;
  interviews: AnalyticsInterviews;
  expectations: AnalyticsExpectations;
}

// Valid time range presets the backend accepts
export type TimeRange = '1m' | '3m' | '6m' | '1y' | 'all';

// API Functions
export const analyticsApi = {
  /**
   * Get comprehensive analytics data
   * Backend uses preset range strings, not date ranges
   */
  async getAnalytics(timeRange: TimeRange = '6m'): Promise<AnalyticsData> {
    const response = await apiFetch(`/analytics?range=${timeRange}`);
    if (!response.ok) {
      throw new Error(`Analytics request failed: ${response.status}`);
    }
    return response.json();
  },

  /**
   * Export analytics as PDF (triggers browser download)
   */
  async exportPDF(timeRange: TimeRange = '6m'): Promise<void> {
    const response = await apiFetch(`/analytics/export/pdf?range=${timeRange}`);
    if (!response.ok) throw new Error(await response.text());

    const blob = await response.blob();
    const cd = response.headers.get('content-disposition') || '';
    let filename = `analytics-report-${timeRange}.pdf`;

    const starMatch = cd.match(/filename\*\s*=\s*[^']+''([^;]+)/i);
    const quoted = cd.match(/filename\s*=\s*"([^"]+)"/i);
    const unquoted = cd.match(/filename\s*=\s*([^;]+)/i);
    if (starMatch) filename = decodeURIComponent(starMatch[1]);
    else if (quoted) filename = quoted[1];
    else if (unquoted) filename = unquoted[1].trim();

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Export analytics as CSV (triggers browser download)
   */
  async exportCSV(timeRange: TimeRange = '6m'): Promise<void> {
    const response = await apiFetch(`/analytics/export/csv?range=${timeRange}`);
    if (!response.ok) throw new Error(await response.text());

    const blob = await response.blob();
    const cd = response.headers.get('content-disposition') || '';
    let filename = `analytics-data-${timeRange}.csv`;

    const starMatch = cd.match(/filename\*\s*=\s*[^']+''([^;]+)/i);
    const quoted = cd.match(/filename\s*=\s*"([^"]+)"/i);
    const unquoted = cd.match(/filename\s*=\s*([^;]+)/i);
    if (starMatch) filename = decodeURIComponent(starMatch[1]);
    else if (quoted) filename = quoted[1];
    else if (unquoted) filename = unquoted[1].trim();

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Get demo analytics data (same structure, loaded from API with fallback)
   */
  async getDemoAnalytics(): Promise<AnalyticsData> {
    return analyticsApi.getAnalytics('all');
  },
};
