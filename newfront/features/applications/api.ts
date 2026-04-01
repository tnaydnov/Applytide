/**
 * Applications API endpoints
 * Handles job applications, stages, notes, and tracking
 */

import { apiFetch } from '../../lib/api/core';

// ============================================================================
// Types
// ============================================================================

export type ApplicationStatus =
  | 'Applied'
  | 'Phone Screen'
  | 'HR Round'
  | 'Tech'
  | 'Tech Interview 1'
  | 'Tech Interview 2'
  | 'System Design'
  | 'Coding Challenge'
  | 'Take Home Assignment'
  | 'Case Study'
  | 'Presentation'
  | 'Culture Fit'
  | 'Team Match'
  | 'Founder Chat'
  | 'Bar Raiser'
  | 'Partner Interview'
  | 'Final Round'
  | 'On-site'
  | 'Reference Check'
  | 'Background Check'
  | 'Offer'
  | 'Negotiation'
  | 'Accepted'
  | 'Rejected'
  | 'Withdrawn';

export interface Application {
  id: number | string;
  user_id?: number;
  job_id?: number;
  company_name: string;
  job_title: string;
  status: ApplicationStatus;
  applied_date?: string;
  notes?: string;
  archived: boolean;
  is_archived?: boolean;
  location?: string;
  source?: string;
  source_url?: string;
  resume_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ApplicationStage {
  id: number;
  application_id: number;
  stage_type: string;
  stage_date: string;
  notes?: string;
  created_at: string;
}

export interface ApplicationNote {
  id: number;
  application_id: number;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface CreateApplicationPayload {
  job_id: string;
  resume_id?: string;
  status?: ApplicationStatus;
  source?: string;
}

export interface UpdateApplicationPayload {
  company_name?: string;
  job_title?: string;
  status?: ApplicationStatus;
  applied_date?: string;
  notes?: string;
  archived?: boolean;
  [key: string]: unknown;
}

export interface CreateStagePayload {
  stage_type: string;
  stage_date: string;
  notes?: string;
}

export interface Attachment {
  id: string;
  application_id: string;
  filename: string;
  file_size: number;
  content_type: string;
  document_type: string | null;
  created_at: string;
}

// ============================================================================
// Applications API
// ============================================================================

export const applicationsApi = {
  /**
   * Create a new application
   */
  createApplication: (payload: CreateApplicationPayload): Promise<Application> =>
    apiFetch('/applications', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).then((r) => r.json()),

  /**
   * Get all applications
   */
  getAllApplications: (showArchived: boolean = false): Promise<Application[]> => {
    const params = showArchived ? '?show_archived=true' : '';
    return apiFetch(`/applications${params}`)
      .then((r) => r.json())
      .then((data) => {
        // Backend returns PaginatedResponse with { items: [...] }
        if (Array.isArray(data)) return data;
        if (data?.items) return data.items;
        return [];
      });
  },

  /**
   * Get applications with stages (for pipeline)
   * Backend returns nested { job: { title, company_name, ... } } — flatten for frontend
   */
  getApplicationsWithStages: (showArchived: boolean = false): Promise<Application[]> => {
    interface RawAppItem {
      id?: number | string;
      status?: string;
      source?: string;
      is_archived?: boolean;
      archived?: boolean;
      resume_id?: string;
      created_at?: string;
      updated_at?: string;
      job_title?: string;
      company_name?: string;
      location?: string;
      source_url?: string;
      notes?: string;
      applied_date?: string;
      job?: { title?: string; company_name?: string; location?: string; source_url?: string };
      stages?: unknown[];
      [key: string]: unknown;
    }
    const params = showArchived ? '?show_archived=true' : '';
    return apiFetch(`/applications/with-stages${params}`)
      .then((r) => r.json())
      .then((items: RawAppItem[]) =>
        (items || []).map((item) => ({
          ...item,
          job_title: item.job?.title ?? item.job_title ?? '',
          company_name: item.job?.company_name ?? item.company_name ?? '',
          location: item.job?.location ?? item.location ?? '',
          source_url: item.job?.source_url ?? item.source_url ?? '',
          archived: item.is_archived ?? item.archived ?? false,
          stages: item.stages ?? [],
        } as Application))
      );
  },

  /**
   * Get application details
   */
  getApplicationDetail: (id: number | string): Promise<Application> =>
    apiFetch(`/applications/${id}/detail`).then((r) => r.json()),

  /**
   * Update application
   */
  updateApplication: (id: number | string, payload: UpdateApplicationPayload): Promise<Application> =>
    apiFetch(`/applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }).then((r) => r.json()),

  /**
   * Move application to different status
   */
  moveApplication: (id: number | string, status: ApplicationStatus): Promise<Application> =>
    apiFetch(`/applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }).then((r) => r.json()),

  /**
   * Delete application
   */
  deleteApplication: (id: number | string): Promise<void> =>
    apiFetch(`/applications/${id}`, { method: 'DELETE' }).then(() => {}),

  /**
   * Toggle archive status
   */
  toggleArchive: (id: number | string): Promise<Application> =>
    apiFetch(`/applications/${id}/archive`, { method: 'PUT' }).then((r) => r.json()),

  /**
   * Add stage to application
   */
  addStage: (id: number | string, payload: CreateStagePayload): Promise<ApplicationStage> =>
    apiFetch(`/applications/${id}/stages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }).then((r) => r.json()),

  /**
   * Get application stages
   */
  getStages: (id: number | string): Promise<ApplicationStage[]> =>
    apiFetch(`/applications/${id}/stages`).then((r) => r.json()),

  /**
   * Delete a stage
   */
  deleteStage: (applicationId: number | string, stageId: number): Promise<void> =>
    apiFetch(`/applications/${applicationId}/stages/${stageId}`, {
      method: 'DELETE',
    }).then(() => {}),

  /**
   * Add note to application
   */
  addNote: (id: number | string, body: string): Promise<ApplicationNote> =>
    apiFetch(`/applications/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }).then((r) => r.json()),

  /**
   * Get application notes
   */
  getNotes: (id: number | string): Promise<ApplicationNote[]> =>
    apiFetch(`/applications/${id}/notes`).then((r) => r.json()),

  /**
   * Get used statuses
   */
  getUsedStatuses: (): Promise<ApplicationStatus[]> =>
    apiFetch('/applications/statuses').then((r) => r.json()),

  /**
   * Upload attachment to application
   */
  uploadAttachment: async (appId: number | string, formData: FormData): Promise<Attachment> => {
    const r = await apiFetch(`/applications/${appId}/attachments`, {
      method: 'POST',
      body: formData,
    });
    if (!r.ok) throw new Error('Upload failed');
    return r.json();
  },

  /**
   * Attach existing document from library to application
   */
  attachFromDocument: async (
    appId: number | string,
    documentId: number | string,
    documentType: string = 'other'
  ): Promise<Attachment> => {
    const r = await apiFetch(`/applications/${appId}/attachments/from-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_id: String(documentId), document_type: documentType }),
    });
    if (!r.ok) throw new Error('Failed to attach document');
    return r.json();
  },

  /**
   * List all attachments for an application
   */
  listAttachments: async (appId: number | string): Promise<Attachment[]> => {
    const r = await apiFetch(`/applications/${appId}/attachments`);
    if (!r.ok) return [];
    return r.json();
  },

  /**
   * Delete an attachment
   */
  deleteAttachment: async (appId: number | string, attachmentId: string): Promise<void> => {
    const r = await apiFetch(`/applications/${appId}/attachments/${attachmentId}`, {
      method: 'DELETE',
    });
    if (!r.ok) throw new Error('Failed to delete attachment');
  },

  /**
   * Get download URL for attachment
   */
  getAttachmentDownloadUrl: (appId: number | string, attachmentId: string): string =>
    `/api/v1/applications/${appId}/attachments/${attachmentId}/download`,
};
