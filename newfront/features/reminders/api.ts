/**
 * Reminders API Module
 * Handles reminder and calendar management
 * 
 * Backend routes: /api/calendars/reminders/* and /api/calendars/google/*
 */

import { apiFetch } from '../../lib/api/core';

// Types
export type ReminderType = 'interview' | 'follow_up' | 'deadline' | 'networking' | 'research' | 'other';

export interface Reminder {
  id?: number | string;
  title: string;
  description?: string;
  // Backend field
  due_date: string;
  // Derived frontend-friendly fields
  date: string;
  time?: string;
  type: ReminderType;
  application_id?: number | string;
  company_name?: string;
  job_title?: string;
  location?: string;
  notes?: string;
  notification_sent?: boolean;
  google_event_id?: string;
  created_at?: string;
  updated_at?: string;
  imported_from_google?: boolean;
  is_google_external?: boolean;
  meet_link?: string;
  meet_url?: string;
  event_type?: string;
  email_notifications_enabled?: boolean;
  ai_prep_tips_enabled?: boolean;
  notification_schedule?: NotificationSchedule | null;
  ai_prep_tips_generated?: string | null;
  ai_prep_tips_generated_at?: string | null;
}

/** Notification schedule configuration */
export interface NotificationSchedule {
  frequency: 'daily' | 'specific' | 'relative' | 'recurring';
  days_before?: number;
  time?: string;
  reminder_date?: string | null;
  reminder_time?: string;
  amount?: number;
  unit?: string;
  sent?: boolean;
  datetime?: string;
}

/** Payload for creating a new reminder */
export interface CreateReminderPayload {
  title: string;
  due_date: string;
  application_id?: string;
  event_type?: string;
  description?: string;
  create_google_event?: boolean;
  add_meet_link?: boolean;
  ai_prep_tips_enabled?: boolean;
  email_notifications_enabled?: boolean;
  notification_schedule?: NotificationSchedule | null;
  timezone_str?: string;
  user_timezone?: string;
}

/**
 * Normalize backend reminder response to frontend-friendly shape.
 * Backend returns due_date (ISO datetime), event_type, no completed field.
 * Frontend expects date, time, type.
 */
function normalizeReminder(raw: Partial<Reminder> & Record<string, unknown>): Reminder {
  const dueDate = raw.due_date ? new Date(raw.due_date) : null;
  const resolvedType = raw.event_type || raw.type || 'other';
  return {
    ...raw,
    title: raw.title ?? '',
    due_date: raw.due_date || '',
    date: dueDate ? dueDate.toISOString().split('T')[0] : raw.date || '',
    time: dueDate
      ? `${String(dueDate.getHours()).padStart(2, '0')}:${String(dueDate.getMinutes()).padStart(2, '0')}`
      : raw.time || '',
    type: resolvedType as ReminderType,
    meet_link: raw.meet_url || raw.meet_link || '',
    email_notifications_enabled: raw.email_notifications_enabled ?? false,
    ai_prep_tips_enabled: raw.ai_prep_tips_enabled ?? false,
    notification_schedule: raw.notification_schedule ?? null,
    ai_prep_tips_generated: raw.ai_prep_tips_generated ?? null,
    ai_prep_tips_generated_at: raw.ai_prep_tips_generated_at ?? null,
  };
}

export interface ReminderNote {
  id: number;
  reminder_id: number;
  body: string;
  created_at: string;
  updated_at?: string;
}

export interface RemindersListResponse {
  reminders: Reminder[];
  total: number;
}

// API Functions
export const remindersApi = {
  /**
   * Get all reminders
   */
  async getReminders(): Promise<Reminder[]> {
    const response = await apiFetch('/calendars/reminders');
    const data = await response.json();
    const items = Array.isArray(data) ? data : data?.reminders || data?.items || [];
    return items.map(normalizeReminder);
  },

  /**
   * Create a new reminder
   */
  async createReminder(data: CreateReminderPayload): Promise<Reminder> {
    const response = await apiFetch('/calendars/reminders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
      throw new Error(err.detail || 'Failed to create reminder');
    }
    const raw = await response.json();
    return normalizeReminder(raw);
  },

  /**
   * Update a reminder (PATCH)
   */
  async updateReminder(id: number | string, data: Partial<Reminder>): Promise<Reminder> {
    const response = await apiFetch(`/calendars/reminders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update reminder');
    const raw = await response.json();
    return normalizeReminder(raw);
  },

  /**
   * Delete a reminder
   */
  async deleteReminder(id: number | string): Promise<void> {
    const response = await apiFetch(`/calendars/reminders/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete reminder');
  },



  // =========================================================================
  // Reminder Notes
  // =========================================================================

  /**
   * List notes for a reminder
   */
  async getNotes(reminderId: number): Promise<ReminderNote[]> {
    const response = await apiFetch(`/calendars/reminders/${reminderId}/notes`);
    if (!response.ok) throw new Error('Failed to load notes');
    return response.json();
  },

  /**
   * Add a note to a reminder
   */
  async addNote(reminderId: number, body: string): Promise<ReminderNote> {
    const response = await apiFetch(`/calendars/reminders/${reminderId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
    if (!response.ok) throw new Error('Failed to add note');
    return response.json();
  },

  /**
   * Update a reminder note
   */
  async updateNote(noteId: number, body: string): Promise<ReminderNote> {
    const response = await apiFetch(`/calendars/reminder-notes/${noteId}`, {
      method: 'PUT',
      body: JSON.stringify({ body }),
    });
    if (!response.ok) throw new Error('Failed to update note');
    return response.json();
  },

  /**
   * Delete a reminder note
   */
  async deleteNote(noteId: number): Promise<void> {
    await apiFetch(`/calendars/reminder-notes/${noteId}`, { method: 'DELETE' });
  },

  // =========================================================================
  // Google Calendar Integration
  // =========================================================================

  /**
   * Check Google Calendar connection status
   */
  async checkGoogleConnection(): Promise<boolean> {
    try {
      const response = await apiFetch('/calendars/google/check-connection');
      const data = await response.json();
      return data.connected === true;
    } catch {
      return false;
    }
  },

  /**
   * Get Google Calendar events
   */
  async getGoogleCalendarEvents(params?: Record<string, string>): Promise<unknown[]> {
    try {
      const qs = new URLSearchParams(params || {}).toString();
      const response = await apiFetch(`/calendars/google/events${qs ? `?${qs}` : ''}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  /**
   * Import a Google Calendar event as a reminder
   */
  async importGoogleEvent(data: { google_event_id: string; application_id?: number }): Promise<Reminder> {
    const response = await apiFetch('/calendars/reminders/import-google-event', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to import event');
    return response.json();
  },

  /**
   * Export all reminders as an ICS calendar file (client-side generation)
   */
  async exportICS(): Promise<Blob> {
    const reminders = await remindersApi.getReminders();
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ApplyTide//Reminders//EN',
      'CALSCALE:GREGORIAN',
    ];

    for (const r of reminders) {
      const dtStart = (r.date || '').replace(/[-:]/g, '').replace('T', 'T').split('.')[0];
      const uid = `reminder-${r.id ?? crypto.randomUUID()}@applytide`;
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uid}`);
      lines.push(`DTSTART:${dtStart.length === 8 ? dtStart : dtStart + (r.time ? '' : '')}`);
      lines.push(`SUMMARY:${(r.title || '').replace(/\n/g, '\\n')}`);
      if (r.description) lines.push(`DESCRIPTION:${r.description.replace(/\n/g, '\\n')}`);
      if (r.location) lines.push(`LOCATION:${r.location}`);
      lines.push(`STATUS:CONFIRMED`);
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  },

  /**
   * Disconnect Google Calendar integration
   * Backend: POST /calendars/google/disconnect
   */
  async disconnectGoogle(): Promise<void> {
    const response = await apiFetch('/calendars/google/disconnect', { method: 'POST' });
    if (!response.ok) throw new Error('Failed to disconnect Google Calendar');
  },

  /**
   * Sync with Google Calendar - fetches events and imports new ones as reminders
   */
  async syncGoogleCalendar(): Promise<{ imported: number }> {
    const events = await remindersApi.getGoogleCalendarEvents();
    const reminders = await remindersApi.getReminders();
    const existingGoogleIds = new Set(
      reminders
        .filter((r) => r.google_event_id)
        .map((r) => r.google_event_id)
    );

    let imported = 0;
    for (const event of events) {
      const evt = event as Record<string, unknown>;
      const googleId = (evt.id || evt.google_event_id) as string | undefined;
      if (googleId && !existingGoogleIds.has(googleId)) {
        try {
          await remindersApi.importGoogleEvent({ google_event_id: googleId });
          imported++;
        } catch {
          // skip individual event import errors
        }
      }
    }
    return { imported };
  },
};