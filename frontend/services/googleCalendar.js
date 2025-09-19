// filepath: c:\Users\PC\OneDrive\Desktop\Applytide\frontend\services\googleCalendar.js
import { apiFetch } from '../lib/api';


export const listReminderNotes = (rid) => apiFetch(`/calendars/reminders/${rid}/notes`).then(r=>r.json());
export const createReminderNote = (rid, body) => apiFetch(`/calendars/reminders/${rid}/notes`, {method:'POST', body: JSON.stringify({ body })}).then(r=>r.json());
export const updateReminderNote = (noteId, body) => apiFetch(`/calendars/reminder-notes/${noteId}`, {method:'PUT', body: JSON.stringify({ body })}).then(r=>r.json());
export const deleteReminderNote = (noteId) => apiFetch(`/calendars/reminder-notes/${noteId}`, {method:'DELETE'});

export const checkGoogleConnection = async () => {
  try {
    const r = await apiFetch("/calendars/google/check-connection");
    const data = await r.json();
    return data.connected === true;
  } catch (error) {
    console.error("Error checking Google connection:", error);
    return false;
  }
};

export const createReminder = async (reminderData) => {
  const r = await apiFetch('/calendars/reminders', {
    method: 'POST',
    body: JSON.stringify(reminderData),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: `HTTP ${r.status}` }));
    throw new Error(err.detail || 'Failed to create reminder');
  }
  return r.json();
};


export const getReminderNotes = async (reminderId) => {
  const r = await apiFetch(`/calendars/reminders/${reminderId}/notes`);
  if (!r.ok) throw new Error('Failed to load notes');
  return r.json();
};

export const addReminderNote = async (reminderId, body) => {
  const r = await apiFetch(`/calendars/reminders/${reminderId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
  if (!r.ok) throw new Error('Failed to add note');
  return r.json();
};

export const updateReminder = async (id, patch) => {
  const r = await apiFetch(`/calendars/reminders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error('Failed to update reminder');
  return r.json();
};

export const getReminders = async () => {
  try {
    const r = await apiFetch('/calendars/reminders');
    return r.json();
  } catch (error) {
    console.error('Error fetching reminders:', error);
    throw error;
  }
};

export const getGoogleCalendarEvents = async (params) => {
  try {
    const qs = new URLSearchParams(params || {}).toString();
    const r = await apiFetch(`/calendars/google/events${qs ? `?${qs}` : ''}`);
    const data = await r.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching Google Calendar events:", error);
    return [];
  }
};

export const deleteReminder = async (id) => {
  const r = await apiFetch(`/calendars/reminders/${id}`, { method: 'DELETE' });
  if (!r.ok) throw new Error('Failed to delete reminder');
  return true;
};


export const importGoogleEventAsReminder = async ({ google_event_id, application_id }) => {
  const r = await apiFetch('/calendars/reminders/import-google-event', {
    method: 'POST',
    body: JSON.stringify({ google_event_id, application_id }),
  });
  if (!r.ok) throw new Error('Failed to import event');
  return r.json();
};

// optional: create google event directly (used server-side already)
export const createGoogleEventDirect = async (payload) => {
  // if you expose a direct endpoint, wire here; currently we create during reminder create
  return null;
};