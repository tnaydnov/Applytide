/**
 * Dashboard API endpoints
 * Handles metrics, insights, and dashboard-specific data
 */

import { apiFetch } from '../../lib/api/core';

// ============================================================================
// Types
// ============================================================================

export interface DashboardMetrics {
  total_jobs: number;
  total_resumes: number;
  total_applications: number;
  applications_by_status: Record<string, number>;
  /** Computed client-side from applications_by_status */
  this_week_applications?: number;
  interviews?: number;
  offers?: number;
  response_rate?: number;
}

export interface AIInsight {
  type: 'warning' | 'success' | 'info' | 'tip';
  text: string;
  action?: string;
  priority?: number;
}

export interface DashboardInsights {
  weekly_goal: number;
  insights: AIInsight[];
  suggestions?: string[];
}

export interface ApplicationCard {
  id: string;
  status: string;
  job: {
    id: string;
    title: string;
    company_name?: string;
  };
  resume_id?: string;
  source?: string;
  is_archived: boolean;
  archived_at?: string;
  created_at: string;
  updated_at?: string;
  /** Computed convenience getters */
  job_title?: string;
  company_name?: string;
}

// ============================================================================
// Dashboard API
// ============================================================================

/** Enrich raw metrics with computed convenience fields */
function enrichMetrics(raw: Partial<DashboardMetrics> & Record<string, unknown>): DashboardMetrics {
  const byStatus = raw.applications_by_status || {};
  const totalApps = raw.total_applications ?? 0;
  return {
    total_jobs: 0,
    total_resumes: 0,
    total_applications: 0,
    applications_by_status: {},
    ...raw,
    interviews: (byStatus['Interview'] || 0) + (byStatus['interview'] || 0),
    offers: (byStatus['Offer'] || 0) + (byStatus['offer'] || 0),
    response_rate: totalApps > 0
      ? Math.round(
          ((Object.values(byStatus) as number[]).reduce((s, v) => s + v, 0) -
            (byStatus['Applied'] || 0) - (byStatus['applied'] || 0)) /
            totalApps *
            100
        )
      : 0,
  };
}

/** Flatten ApplicationCard so job_title/company_name are top-level */
function flattenCard(card: Partial<ApplicationCard> & Record<string, unknown>): ApplicationCard {
  return {
    id: '',
    status: '',
    job: { id: '', title: '' },
    is_archived: false,
    created_at: '',
    ...card,
    job_title: card.job?.title || card.job_title || '',
    company_name: card.job?.company_name || card.company_name || '',
  };
}

export const dashboardApi = {
  /**
   * Get dashboard metrics
   */
  getMetrics: (): Promise<DashboardMetrics> =>
    apiFetch('/dashboard/metrics')
      .then((r) => r.json())
      .then(enrichMetrics),

  /**
   * Get AI-generated insights
   */
  getInsights: (): Promise<DashboardInsights> =>
    apiFetch('/dashboard/insights').then((r) => r.json()),

  /**
   * Get recent application cards
   */
  getApplicationCards: (status?: string, showArchived = false): Promise<ApplicationCard[]> => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (showArchived) params.set('show_archived', 'true');
    const qs = params.toString();
    return apiFetch(`/applications/cards${qs ? '?' + qs : ''}`)
      .then((r) => r.json())
      .then((cards: Array<Partial<ApplicationCard> & Record<string, unknown>>) => cards.map(flattenCard));
  },

  /**
   * Get weekly goal preference
   */
  getWeeklyGoal: (): Promise<number> =>
    apiFetch('/preferences/weekly_goal')
      .then((r) => r.json())
      .then((data) => data?.preference_value?.value ?? 5)
      .catch(() => 5),

  /**
   * Update weekly goal preference (upsert)
   */
  updateWeeklyGoal: (goal: number): Promise<void> =>
    apiFetch('/preferences', {
      method: 'POST',
      body: JSON.stringify({
        preference_key: 'weekly_goal',
        preference_value: { value: goal },
      }),
    }).then(() => {}),
};
