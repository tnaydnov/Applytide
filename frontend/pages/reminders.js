import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { Card, Button, Badge, Input, Select, Modal } from "../components/ui";
import { useToast } from "../lib/toast";
import api from "../lib/api";
import {
  checkGoogleConnection,
  createReminder as createGoogleReminder,
  getReminders as getGoogleReminders,
  getGoogleCalendarEvents,
  deleteReminder as deleteCalendarReminder,
  importGoogleEventAsReminder,
  getReminderNotes,
  addReminderNote,
  updateReminder,                // <-- needed by Save Notes
  updateReminderNote,            // <-- inline edit a note
  deleteReminderNote,
} from "../services/googleCalendar";

// Helper functions (moved outside of component)
function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function generateMonthCalendarCells(currentDate, reminders, googleEvents) {
  const cells = [];
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const startingDay = firstDay.getDay(); // 0 = Sunday

  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Days from previous month
  for (let i = 0; i < startingDay; i++) {
    const date = new Date(year, month, 1 - (startingDay - i));
    cells.push(createCalendarCell(date, today, reminders, googleEvents));
  }

  // Days of current month
  for (let i = 1; i <= totalDays; i++) {
    const date = new Date(year, month, i);
    cells.push(createCalendarCell(date, today, reminders, googleEvents, true));
  }

  // Fill remaining cells with days from next month
  const totalCellCount = Math.ceil((startingDay + totalDays) / 7) * 7;
  const remainingDays = totalCellCount - cells.length;

  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(year, month + 1, i);
    cells.push(createCalendarCell(date, today, reminders, googleEvents));
  }

  return cells;
}

function createCalendarCell(date, today, reminders, googleEvents, isCurrentMonth = false) {
  return {
    date,
    isCurrentMonth,
    isToday: date.toDateString() === today.toDateString(),
    reminders: reminders.filter(r => new Date(r.scheduled_at).toDateString() === date.toDateString()),
    events: googleEvents.filter(e => {
      const eventDate = new Date(e.start.dateTime || e.start.date);
      return eventDate.toDateString() === date.toDateString();
    }),
    hasInterview: reminders.some(r =>
      new Date(r.scheduled_at).toDateString() === date.toDateString() &&
      r.name.toLowerCase().includes('interview')
    )
  };
}

function escapeICSText(text) {
  if (!text) return '';
  return text.replace(/[\\,;]/g, '\\$&').replace(/\n/g, '\\n');
}

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (typeof window !== 'undefined') return window.location.origin;
  return process.env.NODE_ENV === 'production' ? 'https://applytide.com' : 'http://localhost:3000';
}

function openGoogleCreateWithTemplate({ title, description, startISO, endISO, timezone = 'UTC', location, appUrl }) {
  const fmt = (s) => (s || '').replace(/[\n\r]/g, ' ').trim();
  const toGDate = (iso) => new Date(iso).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: fmt(title),
    details: fmt(`${description || ''}${appUrl ? `\n\nApplytide: ${appUrl}` : ''}`),
    dates: `${toGDate(startISO)}/${toGDate(endISO)}`,
    ctz: timezone,
  });
  if (location) params.set('location', fmt(location));

  window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank', 'noopener');
}

function normalizeApplications(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.results)) return res.results;
  if (Array.isArray(res?.items)) return res.items;
  return [];
}


export default function RemindersPage() {
  const router = useRouter();
  const toast = useToast();
  const calendarRef = useRef(null);

  // State
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState([]);
  const [applications, setApplications] = useState([]);
  const [filteredReminders, setFilteredReminders] = useState([]);
  const [filter, setFilter] = useState("upcoming"); // upcoming, overdue, all
  const [sortBy, setSortBy] = useState("scheduled_at");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newReminder, setNewReminder] = useState({
    application_id: "",
    title: "",
    description: "",
    due_date: "",   // ISO string with timezone
    type: "Follow-up",
    add_meet_link: false,
  });
  const [emailNotify, setEmailNotify] = useState(true); // default on
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [calendarView, setCalendarView] = useState("month"); // "day", "week", "month"
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [googleEvents, setGoogleEvents] = useState([]);
  const [showCustomType, setShowCustomType] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(null); // { kind:'reminder'|'gcal', data: {...} }
  const [activeTab, setActiveTab] = useState('events'); // 'events' | 'calendar' | 'import'
  const [googleEventIds, setGoogleEventIds] = useState(new Set());
  const [reminderNotes, setReminderNotes] = useState([]);  // timeline for active reminder
  const [newReminderNote, setNewReminderNote] = useState(""); // input
  const [newNote, setNewNote] = useState("");
  const [loadingApplicationDetail, setLoadingApplicationDetail] = useState(false);



  // Effects

  // 1. Load reminders and applications on mount
  useEffect(() => {
    loadReminders();
  }, []);

  // 2. Filter and sort reminders when dependencies change
  useEffect(() => {
    filterAndSortReminders();
  }, [reminders, filter, sortBy, applications]);

  // 3. Load Google Calendar events when view changes
  useEffect(() => {
    if (isGoogleConnected && (activeTab === "calendar" || activeTab === "import")) {
      loadGoogleCalendarEvents();
    }
  }, [isGoogleConnected, selectedDate, calendarView, activeTab, reminders]);

  // 4. Suppress WebSocket connection errors
  useEffect(() => {
    const originalConsoleError = console.error;
    console.error = (...args) => {
      if (args[0] && typeof args[0] === 'string' &&
        (args[0].includes('WebSocket connection to') ||
          args[0].includes('/api/ws/updates'))) {
        return; // Suppress the WebSocket error
      }
      originalConsoleError.apply(console, args);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  useEffect(() => {
    async function loadNotesIfReminder() {
      if (isDetailsOpen && activeItem?.kind === 'reminder' && activeItem?.data?.id) {
        try {
          const notes = await getReminderNotes(activeItem.data.id);
          setReminderNotes(Array.isArray(notes) ? notes : []);
        } catch (e) {
          console.error(e);
          setReminderNotes([]);
        }
      } else {
        setReminderNotes([]);
      }
    }
    loadNotesIfReminder();
  }, [isDetailsOpen, activeItem]);

  useEffect(() => {
    setShowCustomType(newReminder.type === "Custom");
    // If custom type chosen, gently hint the title
    if (newReminder.type === "Custom" && newReminder.customType && !newReminder.title) {
      setNewReminder((nr) => ({ ...nr, title: nr.customType }));
    }
  }, [newReminder.type, newReminder.customType]);

  // Core Data Loading Functions

  const findAppById = (apps, id) => apps.find(a => String(a.id) === String(id));

  // Load reminders and check Google connection
  async function loadReminders() {
    setLoading(true);
    try {
      // Check if connected to Google Calendar
      const connected = await checkGoogleConnection();
      setIsGoogleConnected(connected);
      // Get applications
      const apps = await api.getApplicationCards();
      console.log("Application cards:", apps.length, apps);
      setApplications(Array.isArray(apps) ? apps : []);

      // Fetch real reminders from your reminders API
      const r = await getGoogleReminders();
      setReminders(Array.isArray(r) ? r.map(x => ({
        ...x,
        // normalize to fields calendar UI expects
        name: x.title,
        scheduled_at: x.due_date,
        notes: x.description || "",
        description: x.description || "",
        application_id: String(x.application_id || ""),
      })) : []);

      const ids = new Set(
        (Array.isArray(r) ? r : [])
          .map(x => x.google_event_id)
          .filter(Boolean)
      );
      setGoogleEventIds(ids);

    } catch (err) {
      console.error("Failed to load data:", err);

      // More specific error handling
      if (err.status && err.status >= 400) {
        toast.error(`Failed to load reminders: ${err.message || 'API Error'}`);
      } else if (err.message && !err.message.includes('not an array')) {
        toast.error(`Failed to load reminders: ${err.message}`);
      } else {
        toast.error("Failed to load reminders");
      }

      // Set empty arrays on error
      setApplications([]);
      setReminders([]);
    } finally {
      setLoading(false);
    }
  }

  // Load Google Calendar events based on current view
  async function loadGoogleCalendarEvents() {
    if (!isGoogleConnected) return;

    try {
      const startDate = new Date(selectedDate);
      const endDate = new Date(selectedDate);

      if (calendarView === "day") {
        // Just this day
        endDate.setHours(23, 59, 59, 999);
      } else if (calendarView === "week") {
        // Start from Sunday of current week
        startDate.setDate(startDate.getDate() - startDate.getDay());
        // End on Saturday
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
      } else { // month view
        startDate.setDate(1); // First day of month
        endDate.setMonth(endDate.getMonth() + 1, 0); // Last day of month
        endDate.setHours(23, 59, 59, 999);
      }

      const events = await getGoogleCalendarEvents({
        time_min: startDate.toISOString(),
        time_max: endDate.toISOString(),
        max_results: 100
      });

      const list = Array.isArray(events) ? events : [];

      // split events
      const applytideEvents = list.filter(
        (e) => e?.extendedProperties?.private?.applytide === "1"
      );
      const externalEvents = list.filter(
        (e) => e?.extendedProperties?.private?.applytide !== "1"
      );

      // remove events already imported (match by Google event id)
      const extById = externalEvents.filter((e) => !googleEventIds.has(e.id));

      // fallback dedupe for purely external events
      const extFuzzy = extById.filter((e) => {
        const eStart = new Date(e.start?.dateTime || e.start?.date);
        const eTitle = (e.summary || "").trim().toLowerCase();
        return !reminders.some((r) => {
          const rStart = new Date(r.scheduled_at);
          const minutes = Math.abs((eStart - rStart) / 60000);
          const rTitle = (r.name || "").trim().toLowerCase();
          return minutes <= 10 && rTitle === eTitle;
        });
      });

      setGoogleEvents(extFuzzy);
    } catch (err) {
      console.error("Failed to load Google Calendar events:", err);
      setGoogleEvents([]);
    }
  }

  // helpers
  function isApplytideEvent(e) {
    return e?.extendedProperties?.private?.applytide === "1";
  }
  function reminderFromApplytideEvent(e) {
    const rid = e?.extendedProperties?.private?.reminder_id;
    if (!rid) return null;
    return reminders.find((r) => String(r.id) === String(rid))
      || reminders.find((r) => String(r.google_event_id) === String(e.id)) || null;
  }

  // Filter and sort reminders based on selected options
  function filterAndSortReminders() {
    let filtered = [...reminders];
    const now = new Date();

    // Apply filter
    if (filter === "upcoming") {
      filtered = filtered.filter(r => new Date(r.scheduled_at) >= now);
    } else if (filter === "overdue") {
      filtered = filtered.filter(r => new Date(r.scheduled_at) < now);
    }

    // Sort by selected criteria
    filtered.sort((a, b) => {
      if (sortBy === "scheduled_at") {
        return new Date(a.scheduled_at) - new Date(b.scheduled_at);
      } else if (sortBy === "created_at") {
        return new Date(b.created_at) - new Date(a.created_at);
      } else if (sortBy === "company") {
        const appA = findAppById(applications, a.application_id);
        const appB = findAppById(applications, b.application_id);
        const companyA = appA?.job?.company_name || "";
        const companyB = appB?.job?.company_name || "";
        return companyA.localeCompare(companyB);
      }
      return 0;
    });

    setFilteredReminders(filtered);
  }

  // Reminder Actions

  // Create a new reminder
  async function createReminder() {
    try {
      if (!newReminder.application_id || !newReminder.title || !newReminder.due_date) {
        toast.error("Please fill in all required fields");
        return;
      }

      setIsSubmitting(true);

      // Optional: fold “type” into the title (“Follow-up: ACME”)
      const finalTitle =
        (() => {
          const baseType =
            newReminder.type === "Custom" && newReminder.customType
              ? newReminder.customType
              : newReminder.type;
          if (baseType && !newReminder.title.toLowerCase().includes(baseType.toLowerCase())) {
            return `${baseType}: ${newReminder.title}`;
          }
          return newReminder.title;
        })();

      const payload = {
        application_id: String(newReminder.application_id),
        title: finalTitle,
        description: newReminder.description || "",
        // backend expects an RFC3339 timestamp; send ISO with timezone
        due_date: new Date(newReminder.due_date).toISOString(),
        email_notify: !!emailNotify,
        add_meet_link: !!newReminder.add_meet_link,
        timezone_str: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      };
      await createGoogleReminder(payload);

      toast.success("Reminder created successfully");

      // Reset the form
      setNewReminder({ application_id: "", title: "", description: "", due_date: "", type: "Follow-up" });
      setEmailNotify(true); // reset email notify

      // Reload reminders instead of manually adding to the array
      await loadReminders();
      setShowCreateModal(false);
    } catch (error) {
      toast.error("Failed to create reminder");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Delete a reminder
  async function deleteReminder(reminderId) {
    if (!confirm("Delete this reminder?")) return;
    try {
      await deleteCalendarReminder(reminderId);
      await loadReminders();
      await loadGoogleCalendarEvents();
      toast.success("Reminder deleted");
    } catch (err) {
      console.error("Failed to delete reminder:", err);
      toast.error("Failed to delete reminder");
    }
  }

  async function uploadRecording(activeItem, file) {
    if (!file) return;
    const appId = activeItem?.data?.application_id;
    if (!appId) { toast.error("Link this to an application first"); return; }
    try {
      const form = new FormData();
      form.append('file', file);
      await api.uploadApplicationAttachment(appId, form); // make sure api.uploadApplicationAttachment exists
      toast.success('Uploaded');
    } catch (e) {
      console.error(e);
      toast.error('Upload failed');
    }
  }

  function startRecording() {
    toast.info("Recording UI coming soon");
  }


  // Calendar Export Functions

  // Export reminders to calendar file
  function exportToCalendar(format = "ics") {
    try {
      if (filteredReminders.length === 0) {
        toast.error("No reminders to export");
        return;
      }

      let content = "";

      if (format === "ics") {
        content = generateICSContent(filteredReminders);
        downloadFile(content, "applytide-reminders.ics", "text/calendar");
      } else if (format === "json") {
        content = JSON.stringify(filteredReminders, null, 2);
        downloadFile(content, "applytide-reminders.json", "application/json");
      }
    } catch (error) {
      console.error("Export calendar error:", error);
      toast.error("Failed to export calendar");
    }
  }

  async function goToApplication(appId) {
    if (!appId) {
      toast({
        title: "Missing application ID",
        description: "This reminder is not linked to an application.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Close the reminder modal and open the Pipeline drawer for this app
    setIsDetailsOpen(false);
    router.push(
      { pathname: "/pipeline", query: { app: appId } },
      undefined,
      { shallow: true }
    );
  }

  // Export only upcoming reminders to calendar file
  function exportUpcomingOnly() {
    try {
      const upcomingReminders = reminders.filter(r => new Date(r.scheduled_at) >= new Date());
      if (upcomingReminders.length === 0) {
        toast.error("No upcoming reminders to export");
        return;
      }

      const content = generateICSContent(upcomingReminders);
      downloadFile(content, "applytide-upcoming-reminders.ics", "text/calendar");
    } catch (error) {
      console.error("Export calendar error:", error);
      toast.error("Failed to export upcoming reminders");
    }
  }

  // Helper Functions

  // Generate ICS calendar file content
  function generateICSContent(reminders) {
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    let ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Applytide//Reminders//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Applytide Reminders',
      'X-WR-TIMEZONE:UTC',
      'X-WR-CALDESC:Job search reminders and interviews from Applytide'
    ];

    reminders.forEach(reminder => {
      const app = findAppById(applications, reminder.application_id);
      const company = app?.job?.company_name || 'Unknown Company';
      const position = app?.job?.title || 'Unknown Position';
      const location = app?.job?.location || '';

      const startDate = new Date(reminder.scheduled_at);
      const endDate = new Date(startDate.getTime() + 30 * 60000); // 30 minutes later

      const start = startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const end = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      // Determine priority and category
      let priority = '3'; // Default medium
      let category = 'JOB SEARCH';

      const reminderType = reminder.name.toLowerCase();
      if (reminderType.includes('interview')) {
        priority = '1'; // High priority
        category = 'INTERVIEW';
      } else if (reminderType.includes('deadline')) {
        priority = '2'; // Medium-high priority
        category = 'DEADLINE';
      } else if (reminderType.includes('follow')) {
        category = 'FOLLOW-UP';
      }

      ics = ics.concat([
        'BEGIN:VEVENT',
        `UID:applytide-reminder-${reminder.id}`,
        `DTSTAMP:${now}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${escapeICSText(`${reminder.name} - ${company}`)}`,
        `DESCRIPTION:${escapeICSText(`Job: ${position}\\n\\nNotes: ${reminder.notes || 'No notes'}\\n\\nApplytide`)}`,
        location ? `LOCATION:${escapeICSText(location)}` : '',
        `URL:${getBaseUrl()}/applications/${reminder.application_id}`,
        `CATEGORIES:${category}`,
        `PRIORITY:${priority}`,
        'STATUS:CONFIRMED',
        'TRANSP:OPAQUE',
        'BEGIN:VALARM',
        'TRIGGER:-PT15M',
        'ACTION:DISPLAY',
        'DESCRIPTION:Applytide Reminder: 15 minutes until your reminder',
        'END:VALARM',
        'BEGIN:VALARM',
        'TRIGGER:-PT1H',
        'ACTION:EMAIL',
        'DESCRIPTION:Applytide Reminder: 1 hour until your reminder',
        'SUMMARY:Upcoming Applytide Reminder',
        'END:VALARM',
        'END:VEVENT'
      ]);
    });

    ics.push('END:VCALENDAR');
    return ics.join('\r\n');
  }

  // Download a file to the user's device
  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`${filename} downloaded successfully!`);
  }

  async function saveReminderNotes() {
    try {
      if (activeItem?.kind !== 'reminder') return;
      const { id, description } = activeItem.data;   // << use description
      await updateReminder(id, { description: description || "" });
      toast.success("Notes saved");
      await loadReminders();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save notes");
    }
  }

  // Get human-readable time until a date
  function getTimeUntil(dateString) {
    const now = new Date();
    const target = new Date(dateString);
    const diffMs = target - now;

    if (diffMs < 0) {
      // More detailed overdue information
      const overdue = Math.abs(diffMs);
      const days = Math.floor(overdue / (1000 * 60 * 60 * 24));
      const hours = Math.floor((overdue % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (days > 0) return `${days} day${days > 1 ? 's' : ''} overdue`;
      if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} overdue`;
      return "Overdue";
    }

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `in ${days} day${days === 1 ? '' : 's'}`;
    if (hours > 0) return `in ${hours} hour${hours === 1 ? '' : 's'}`;
    if (minutes > 0) return `in ${minutes} minute${minutes === 1 ? '' : 's'}`;
    return "now";
  }

  // Get color class based on reminder type
  function getReminderTypeColor(name) {
    const type = name.toLowerCase();
    if (type.includes('interview')) return 'bg-purple-100 text-purple-800';
    if (type.includes('follow')) return 'bg-blue-100 text-blue-800';
    if (type.includes('deadline')) return 'bg-red-100 text-red-800';
    if (type.includes('call') || type.includes('phone')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  }

  // Calculate reminder statistics
  const stats = {
    total: reminders.length,
    upcoming: reminders.filter(r => new Date(r.scheduled_at) >= new Date()).length,
    overdue: reminders.filter(r => new Date(r.scheduled_at) < new Date()).length,
    thisWeek: reminders.filter(r => {
      const date = new Date(r.scheduled_at);
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return date >= now && date <= weekFromNow;
    }).length
  };

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-400 mx-auto"></div>
          <p className="text-slate-400">Loading reminders...</p>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-3xl font-bold text-slate-200">
                <svg className="w-8 h-8 inline mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Events
              </h1>
              <p className="text-slate-400 mt-1">Manage your job search schedule and export to calendar apps</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => exportToCalendar("ics")}
                  variant="outline"
                  disabled={filteredReminders.length === 0}
                  size="sm"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Export Calendar
                </Button>
                <Button
                  onClick={() => exportUpcomingOnly()}
                  variant="outline"
                  disabled={stats.upcoming === 0}
                  size="sm"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Export Upcoming
                </Button>
              </div>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Reminder
              </Button>
            </div>
          </div>
          {/* Stats Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border-blue-500/30 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-300">Total Reminders</p>
                  <p className="text-2xl font-bold text-blue-400">{stats.total}</p>
                </div>
                <div className="text-3xl">
                  <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border-green-500/30 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-300">Upcoming</p>
                  <p className="text-2xl font-bold text-green-400">{stats.upcoming}</p>
                </div>
                <div className="text-3xl">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-r from-red-900/20 to-rose-900/20 border-red-500/30 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-300">Overdue</p>
                  <p className="text-2xl font-bold text-red-400">{stats.overdue}</p>
                </div>
                <div className="text-3xl">
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-r from-purple-900/20 to-violet-900/20 border-purple-500/30 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-300">This Week</p>
                  <p className="text-2xl font-bold text-purple-400">{stats.thisWeek}</p>
                </div>
                <div className="text-3xl">
                  <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </Card>
          </div>

          {/* View toggle */}
          <div className="flex justify-center mb-6">
            <div className="bg-slate-800/80 p-1 rounded-lg inline-flex">
              <button
                className={`px-4 py-2 rounded-md ${activeTab === "events" ? "bg-indigo-600 text-white" : "text-slate-300"}`}
                onClick={() => setActiveTab("events")}
              >
                My Events
              </button>
              <button
                className={`px-4 py-2 rounded-md ${activeTab === "calendar" ? "bg-indigo-600 text-white" : "text-slate-300"}`}
                onClick={() => setActiveTab("calendar")}
              >
                Calendar
              </button>
              {isGoogleConnected && (
                <button
                  className={`px-4 py-2 rounded-md ${activeTab === "import" ? "bg-indigo-600 text-white" : "text-slate-300"}`}
                  onClick={() => setActiveTab("import")}
                >
                  Import from Google
                </button>
              )}
            </div>
          </div>


          {/* Google Calendar Connection Notice */}
          {!isGoogleConnected && activeTab === "calendar" && (
            <div className="glass-card glass-cyan mb-4">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-slate-300">
                    <span className="font-medium">Connect Google Calendar</span> to sync your reminders automatically
                  </p>
                  <p className="text-slate-400 text-sm">Add reminders to your calendar and get notifications</p>
                </div>
                <Button
                  onClick={() => window.location.href = '/api/auth/google/login'}
                  size="sm"
                  className="ml-4 bg-indigo-600 hover:bg-indigo-700"
                >
                  Connect Google
                </Button>
              </div>
            </div>
          )}

          {/* Calendar View */}
          {activeTab === "calendar" && (
            <div className="glass-card glass-cyan p-4 mb-6">
              {/* Calendar header */}
              <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                <div className="flex items-center">
                  <h3 className="text-2xl font-semibold text-slate-200">
                    {calendarView === "month" && selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    {calendarView === "week" && `Week of ${new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() - selectedDate.getDay()).toLocaleDateString()}`}
                    {calendarView === "day" && selectedDate.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </h3>

                  <div className="flex ml-4">
                    <button
                      className="p-1.5 rounded-full hover:bg-slate-700/50"
                      onClick={() => {
                        const newDate = new Date(selectedDate);
                        if (calendarView === "day") {
                          newDate.setDate(newDate.getDate() - 1);
                        } else if (calendarView === "week") {
                          newDate.setDate(newDate.getDate() - 7);
                        } else {
                          newDate.setMonth(newDate.getMonth() - 1);
                        }
                        setSelectedDate(newDate);
                      }}
                    >
                      <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>

                    <button
                      className="p-1.5 rounded-full hover:bg-slate-700/50 ml-1"
                      onClick={() => setSelectedDate(new Date())}
                    >
                      <span className="text-sm text-slate-300">Today</span>
                    </button>

                    <button
                      className="p-1.5 rounded-full hover:bg-slate-700/50 ml-1"
                      onClick={() => {
                        const newDate = new Date(selectedDate);
                        if (calendarView === "day") {
                          newDate.setDate(newDate.getDate() + 1);
                        } else if (calendarView === "week") {
                          newDate.setDate(newDate.getDate() + 7);
                        } else {
                          newDate.setMonth(newDate.getMonth() + 1);
                        }
                        setSelectedDate(newDate);
                      }}
                    >
                      <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <div className="bg-slate-800/70 rounded-lg flex p-1">
                    <button
                      className={`px-3 py-1 rounded-md text-sm ${calendarView === 'day' ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}
                      onClick={() => setCalendarView('day')}
                    >
                      Day
                    </button>
                    <button
                      className={`px-3 py-1 rounded-md text-sm ${calendarView === 'week' ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}
                      onClick={() => setCalendarView('week')}
                    >
                      Week
                    </button>
                    <button
                      className={`px-3 py-1 rounded-md text-sm ${calendarView === 'month' ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}
                      onClick={() => setCalendarView('month')}
                    >
                      Month
                    </button>
                  </div>

                  <Button
                    onClick={() => setShowCreateModal(true)}
                    size="sm"
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add
                  </Button>
                </div>
              </div>
              {/* Month View Calendar */}
              {calendarView === "month" && (
                <div className="calendar-container overflow-x-auto -mx-4 px-4">
                  {/* Days of week header */}
                  <div className="grid grid-cols-7 text-center text-xs text-slate-400 mb-1 min-w-[560px] sm:min-w-0">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div key={day} className="py-1">{day}</div>
                    ))}
                  </div>

                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1 min-w-[560px] sm:min-w-0" ref={calendarRef}>
                    {generateMonthCalendarCells(selectedDate, reminders, googleEvents).map((cell, idx) => (
                      <div
                        key={idx}
                        className={`min-h-[100px] rounded-md p-1 border 
                          ${cell.isCurrentMonth
                            ? 'bg-slate-800/50 border-slate-700/50'
                            : 'bg-slate-900/30 border-slate-800/30 text-slate-500'
                          }
                          ${cell.isToday ? 'ring-1 ring-indigo-500' : ''}
                          calendar-day-cell transition-colors duration-200 break-words
                        `}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-xs md:text-sm font-medium p-1 rounded-full w-5 h-5 flex items-center justify-center
                            ${cell.isToday ? 'bg-indigo-600 text-white' : ''}
                          `}>
                            {cell.date.getDate()}
                          </span>
                          {cell.hasInterview && (
                            <span className="bg-purple-600/30 text-purple-300 text-[0.65rem] px-1 rounded">
                              Interview
                            </span>
                          )}
                        </div>

                        <div className="space-y-1">
                          {cell.reminders.slice(0, 3).map((reminder) => (
                            <div
                              key={reminder.id}
                              className="text-xs p-1 rounded bg-indigo-900/70 border-l-2 border-indigo-500/80 text-white truncate cursor-pointer calendar-event glow-reminder"
                              onClick={() => { setActiveItem({ kind: 'reminder', data: reminder }); setIsDetailsOpen(true); }}
                            >
                              {formatTime(reminder.scheduled_at)} {reminder.name}
                            </div>
                          ))}

                          {cell.events.slice(0, 2).map((event, idx) => (
                            <div
                              key={`g-${idx}`}
                              className="text-xs p-1 rounded bg-slate-700/60 border-l-2 border-slate-500 text-slate-200 truncate calendar-event"
                              title={event.summary}
                              onClick={() => {
                                if (isApplytideEvent(event)) {
                                  const r = reminderFromApplytideEvent(event);
                                  if (r) { setActiveItem({ kind: 'reminder', data: r }); }
                                  else { setActiveItem({ kind: 'google_applytide', data: event }); } // fallback
                                } else {
                                  setActiveItem({ kind: 'google_external', data: event });
                                }
                                setIsDetailsOpen(true);
                              }}
                            >
                              {event.start.dateTime ? formatTime(event.start.dateTime) : ''} {event.summary}
                            </div>
                          ))}

                          {(cell.reminders.length + cell.events.length) > 5 && (
                            <div className="text-xs text-slate-400 pl-1">
                              +{(cell.reminders.length + cell.events.length) - 5} more
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Week View */}
              {calendarView === "week" && (
                <div className="calendar-container overflow-x-auto -mx-4 px-4">
                  <div className="grid grid-cols-8 gap-1 min-w-[720px] sm:min-w-0">
                    {/* Time column */}
                    <div className="pr-2 hidden xs:block w-[56px]">
                      {Array.from({ length: 24 }).map((_, hour) => (
                        <div key={hour} className="h-14 text-xs text-right pr-2 text-slate-500">
                          {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                        </div>
                      ))}
                    </div>

                    {/* Day columns */}
                    {Array.from({ length: 7 }).map((_, dayOffset) => {
                      const day = new Date(selectedDate);
                      day.setDate(day.getDate() - day.getDay() + dayOffset);
                      const isToday = new Date().toDateString() === day.toDateString();

                      const dayReminders = reminders.filter(r => {
                        const reminderDate = new Date(r.scheduled_at);
                        return reminderDate.toDateString() === day.toDateString();
                      });

                      const dayEvents = googleEvents.filter(e => {
                        const eventDate = new Date(e.start.dateTime || e.start.date);
                        return eventDate.toDateString() === day.toDateString();
                      });

                      return (
                        <div key={dayOffset} className={`relative ${isToday ? 'bg-indigo-900/10 rounded-md' : ''}`}>
                          {/* Day header */}
                          <div className={`text-center py-1 text-sm ${isToday ? 'text-indigo-400' : 'text-slate-400'}`}>
                            <div>{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                            <div className={`text-xs ${isToday ? 'bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center mx-auto' : ''}`}>
                              {day.getDate()}
                            </div>
                          </div>

                          {/* Hour cells */}
                          <div className="relative">
                            {Array.from({ length: 24 }).map((_, hour) => (
                              <div
                                key={hour}
                                className="h-14 border-t border-slate-700/50 relative"
                              />
                            ))}

                            {/* Events */}
                            {dayReminders.map((reminder) => {
                              const startDate = new Date(reminder.scheduled_at);
                              const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
                              const top = (startMinutes / 60) * 56; // 14px per hour * 4 quarter hours

                              return (
                                <div
                                  key={reminder.id}
                                  className="absolute left-0 right-0 mx-1 p-1 rounded bg-indigo-900/80 border-l-2 border-indigo-500 text-white text-xs overflow-hidden calendar-event"
                                  style={{ top: `${top}px`, height: '50px' }}
                                  onClick={() => { setActiveItem({ kind: 'reminder', data: reminder }); setIsDetailsOpen(true); }}
                                >
                                  <div className="font-medium truncate">{formatTime(reminder.scheduled_at)}</div>
                                  <div className="truncate">{reminder.name}</div>
                                </div>
                              );
                            })}

                            {/* Google Calendar events */}
                            {dayEvents.map((event, idx) => {
                              if (!event.start.dateTime) return null;

                              const startDate = new Date(event.start.dateTime);
                              const endDate = new Date(event.end.dateTime);

                              const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
                              const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();

                              const durationMinutes = endMinutes - startMinutes;
                              const top = (startMinutes / 60) * 56; // 14px per hour * 4 quarter hours
                              const height = Math.max((durationMinutes / 60) * 56, 30); // Minimum height of 30px

                              return (
                                <div
                                  key={`g-${idx}`}
                                  className="absolute left-0 right-0 mx-1 p-1 rounded bg-purple-900/80 border-l-2 border-purple-500 text-white text-xs overflow-hidden calendar-event"
                                  style={{ top: `${top}px`, height: `${height}px` }}
                                  title={event.summary}
                                  onClick={() => {
                                    if (isApplytideEvent(event)) {
                                      const r = reminderFromApplytideEvent(event);
                                      if (r) { setActiveItem({ kind: 'reminder', data: r }); }
                                      else { setActiveItem({ kind: 'google_applytide', data: event }); } // fallback
                                    } else {
                                      setActiveItem({ kind: 'google_external', data: event });
                                    }
                                    setIsDetailsOpen(true);
                                  }}
                                >
                                  <div className="font-medium truncate">{formatTime(event.start.dateTime)}</div>
                                  <div className="truncate">{event.summary}</div>
                                </div>
                              );
                            })}

                            {/* Current time indicator */}
                            {isToday && (
                              <div
                                className="time-indicator"
                                style={{
                                  top: `${(new Date().getHours() * 60 + new Date().getMinutes()) / 60 * 56}px`
                                }}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Day View */}
              {calendarView === "day" && (
                <div className="calendar-container">
                  <div className="grid grid-cols-[80px_1fr] gap-4">
                    {/* Time column */}
                    <div>
                      {Array.from({ length: 24 }).map((_, hour) => (
                        <div key={hour} className="h-16 text-sm text-right pr-2 text-slate-400">
                          {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                        </div>
                      ))}
                    </div>

                    {/* Day column */}
                    <div className="relative">
                      {Array.from({ length: 24 }).map((_, hour) => (
                        <div
                          key={hour}
                          className="h-16 border-t border-slate-700/50 relative"
                        />
                      ))}

                      {/* Events */}
                      {reminders
                        .filter(reminder => new Date(reminder.scheduled_at).toDateString() === selectedDate.toDateString())
                        .map((reminder) => {
                          const startDate = new Date(reminder.scheduled_at);
                          const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
                          const top = (startMinutes / 60) * 64; // 16px per hour * 4 quarter hours
                          const app = findAppById(applications, reminder.application_id);

                          return (
                            <div
                              key={reminder.id}
                              className="absolute left-0 right-6 ml-2 p-2 rounded bg-indigo-900/80 border-l-2 border-indigo-500 text-white text-sm shadow-lg calendar-event"
                              style={{ top: `${top}px`, minHeight: '60px' }}
                              onClick={() => { setActiveItem({ kind: 'reminder', data: reminder }); setIsDetailsOpen(true); }}
                            >
                              <div className="font-medium">{formatTime(reminder.scheduled_at)} - {reminder.name}</div>
                              <div className="text-slate-300 text-xs mt-1">
                                {app?.job?.company_name || "Unknown company"} - {app?.job?.title || "Unknown position"}
                              </div>
                              {reminder.notes && (
                                <div className="text-slate-300 text-xs mt-1 line-clamp-1">
                                  {reminder.notes}
                                </div>
                              )}
                            </div>
                          );
                        })}

                      {/* Google Calendar events */}
                      {googleEvents
                        .filter(event => {
                          if (!event.start.dateTime) return false;
                          const eventDate = new Date(event.start.dateTime);
                          return eventDate.toDateString() === selectedDate.toDateString();
                        })
                        .map((event, idx) => {
                          const startDate = new Date(event.start.dateTime);
                          const endDate = new Date(event.end.dateTime);

                          const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
                          const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();

                          const durationMinutes = endMinutes - startMinutes;
                          const top = (startMinutes / 60) * 64; // 16px per hour * 4 quarter hours
                          const height = Math.max((durationMinutes / 60) * 64, 40); // Minimum height of 40px

                          return (
                            <div
                              key={`g-${idx}`}
                              className="absolute left-0 right-6 ml-2 p-2 rounded bg-purple-900/80 border-l-2 border-purple-500 text-white text-sm shadow-lg calendar-event"
                              style={{ top: `${top}px`, minHeight: `${height}px` }}
                              title={event.summary}
                              onClick={() => {
                                if (isApplytideEvent(event)) {
                                  const r = reminderFromApplytideEvent(event);
                                  if (r) { setActiveItem({ kind: 'reminder', data: r }); }
                                  else { setActiveItem({ kind: 'google_applytide', data: event }); } // fallback
                                } else {
                                  setActiveItem({ kind: 'google_external', data: event });
                                }
                                setIsDetailsOpen(true);
                              }}
                            >
                              <div className="font-medium">{formatTime(event.start.dateTime)} - {event.summary}</div>
                              {event.description && (
                                <div className="text-slate-300 text-xs mt-1 line-clamp-1">
                                  {event.description}
                                </div>
                              )}
                              {event.location && (
                                <div className="text-slate-300 text-xs mt-1">
                                  📍 {event.location}
                                </div>
                              )}
                            </div>
                          );
                        })}

                      {/* Current time indicator */}
                      {selectedDate.toDateString() === new Date().toDateString() && (
                        <div
                          className="time-indicator"
                          style={{
                            top: `${(new Date().getHours() * 60 + new Date().getMinutes()) / 60 * 64}px`
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* List View */}
          {activeTab === "events" && (
            <div className="glass-card glass-cyan p-4">
              {/* Filter controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center space-x-4">
                  <div>
                    <label className="text-sm text-slate-400 block mb-1">Filter</label>
                    <Select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      options={[
                        { value: "all", label: "All Reminders" },
                        { value: "upcoming", label: "Upcoming" },
                        { value: "overdue", label: "Overdue" }
                      ]}
                      className="bg-slate-800 border-slate-700 text-slate-200 w-40"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-slate-400 block mb-1">Sort By</label>
                    <Select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      options={[
                        { value: "scheduled_at", label: "Date & Time" },
                        { value: "created_at", label: "Recently Created" },
                        { value: "company", label: "Company" }
                      ]}
                      className="bg-slate-800 border-slate-700 text-slate-200 w-40"
                    />
                  </div>
                </div>

                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Reminder
                </Button>
              </div>

              {/* Reminders list */}
              {filteredReminders.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-slate-700 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-slate-400 mt-2 text-lg">No reminders found</h3>
                  <p className="text-slate-500 mt-1">Create a new reminder to get started</p>
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 bg-slate-700 hover:bg-slate-600"
                  >
                    Create Reminder
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredReminders.map((reminder) => {
                    const app = findAppById(applications, reminder.application_id);
                    const reminderDate = new Date(reminder.scheduled_at);
                    const isPast = reminderDate < new Date();

                    return (
                      <div
                        key={reminder.id}
                        className={`p-4 rounded-lg transition-all duration-200 hover:scale-[1.01] cursor-pointer
                          ${isPast
                            ? 'bg-red-900/20 border border-red-900/30'
                            : 'bg-slate-800/70 border border-slate-700/70 hover:border-indigo-500/50'
                          }
                        `}
                        onClick={() => { setActiveItem({ kind: 'reminder', data: reminder }); setIsDetailsOpen(true); }}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center mb-1">
                              <Badge className={getReminderTypeColor(reminder.name)}>
                                {reminder.name}
                              </Badge>

                              <span className={`text-sm ml-3 
                                ${isPast ? 'text-red-400' : 'text-slate-400'}
                              `}>
                                {reminderDate.toLocaleString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                                {isPast ? ' (overdue)' : ` (${getTimeUntil(reminder.scheduled_at)})`}
                              </span>
                            </div>

                            <div className="text-lg text-slate-200 font-medium">
                              {app?.job?.company_name || "Unknown company"}
                              <span className="mx-2 text-slate-500">•</span>
                              <span className="text-slate-400 font-normal">{app?.job?.title || "Unknown position"}</span>
                            </div>

                            {reminder.notes && (
                              <div className="mt-2 text-sm text-slate-400">
                                {reminder.notes}
                              </div>
                            )}
                          </div>

                          <div className="flex space-x-1">
                            <button
                              className="p-1.5 rounded-full hover:bg-slate-700/70 text-slate-400 hover:text-slate-200"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveItem({ kind: 'reminder', data: reminder }); setIsDetailsOpen(true);
                              }}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              className="p-1.5 rounded-full hover:bg-red-900/50 text-slate-400 hover:text-red-400"
                              onClick={(e) => { e.stopPropagation(); deleteReminder(reminder.id); }}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "import" && (
            <div className="glass-card glass-cyan p-4 space-y-3">
              {googleEvents.length === 0 ? (
                <div className="text-slate-400 text-sm">No Google events in range. Switch month/week/day to refresh.</div>
              ) : googleEvents.map(evt => (
                <div key={evt.id} className="p-3 rounded bg-slate-800/70 border border-slate-700/70 flex items-center justify-between">
                  <div>
                    <div className="text-slate-200 text-sm font-medium">{evt.summary || 'Untitled'}</div>
                    <div className="text-slate-400 text-xs">
                      {evt.start?.dateTime ? new Date(evt.start.dateTime).toLocaleString() : evt.start?.date}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="bg-slate-800 border border-slate-700 rounded text-slate-200 text-sm p-1"
                      onChange={(e) => evt._linkAppId = e.target.value}
                      defaultValue=""
                    >
                      <option value="">Link to application (optional)</option>
                      {applications.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.job?.company_name} — {a.job?.title}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          await importGoogleEventAsReminder({ google_event_id: evt.id, application_id: evt._linkAppId || null });
                          toast.success('Imported to My Events');
                          await loadReminders();
                          await loadGoogleCalendarEvents();
                        } catch (e) {
                          console.error(e);
                          toast.error('Import failed');
                        }
                      }}
                    >
                      Import
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} title={
        activeItem?.kind === 'reminder' ? 'Reminder'
          : activeItem?.kind === 'google_external' ? 'Import Google Event'
            : 'Applytide Calendar Event'
      }>
        {activeItem && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-slate-200">
                  {activeItem.kind === 'reminder' ? activeItem.data.name : activeItem.data.summary}
                </div>
                <div className="text-slate-400 text-sm">
                  {formatTime(activeItem.kind === 'reminder' ? activeItem.data.scheduled_at : (activeItem.data.start.dateTime || activeItem.data.start.date))}
                </div>
              </div>
              {activeItem.kind === 'reminder' && (
                <Badge className="bg-indigo-600/20 text-indigo-300 border border-indigo-500/40">Applytide Reminder</Badge>
              )}
              {activeItem.kind === 'reminder' && activeItem.data.meet_url && (
                <div className="text-sm text-slate-300">
                  Meet: <a className="text-indigo-400 underline" href={activeItem.data.meet_url} target="_blank" rel="noreferrer">Join</a>
                  <Button variant="outline" className="ml-2" onClick={() => { navigator.clipboard.writeText(activeItem.data.meet_url); toast.success("Link copied"); }}>Copy</Button>
                </div>
              )}
              {activeItem.kind === 'google' && (
                <Badge className="bg-purple-600/20 text-purple-300 border border-purple-500/40">Google Event</Badge>
              )}
            </div>

            {/* Notes (reminder only) */}
            {activeItem.kind === 'reminder' && (
              <div className="space-y-3">
                {/* Optional: keep the single description field if you want */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Description</label>
                  <textarea
                    className="w-full rounded-md bg-slate-800 border-slate-700 text-slate-200"
                    rows={3}
                    value={activeItem.data.description || activeItem.data.notes || ""}
                    onChange={(e) =>
                      setActiveItem((r) => ({ ...r, data: { ...r.data, description: e.target.value } }))
                    }
                    onBlur={async (e) => {
                      const desc = e.target.value || "";
                      try {
                        await updateReminder(activeItem.data.id, { description: desc });
                        // keep UI in sync without a reload
                        setReminders(prev =>
                          prev.map(r => r.id === activeItem.data.id ? { ...r, description: desc, notes: desc } : r)
                        );
                        setActiveItem(cur => ({ ...cur, data: { ...cur.data, description: desc } }));
                        toast.success("Description saved");
                      } catch (err) {
                        console.error(err);
                        toast.error("Failed to save description");
                      }
                    }}
                    placeholder="General description for this reminder…"
                  />

                </div>

                {/* Organized notes */}
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-slate-300 font-medium">Notes</h4>
                    <span className="text-xs text-slate-500">{reminderNotes.length} total</span>
                  </div>

                  {/* Add note */}
                  <div className="mt-2 flex items-start gap-2">
                    <textarea
                      className="flex-1 rounded-md bg-slate-800 border-slate-700 text-slate-200"
                      rows={2}
                      value={newReminderNote}
                      onChange={(e) => setNewReminderNote(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                          e.preventDefault();
                          document.getElementById("add-note-btn")?.click();
                        }
                      }}
                      placeholder="Add a note…"
                    />
                    <Button id="add-note-btn"
                      onClick={async () => {
                        const body = (newReminderNote || "").trim();
                        if (!body) return;
                        try {
                          await addReminderNote(activeItem.data.id, body);
                          setNewReminderNote("");
                          const notes = await getReminderNotes(activeItem.data.id);
                          setReminderNotes(Array.isArray(notes) ? notes : []);
                          toast.success("Note added");
                        } catch (e) {
                          console.error(e);
                          toast.error("Failed to add note");
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>

                  {/* Timeline */}
                  <div className="mt-3 space-y-2 max-h-60 overflow-auto pr-1">
                    {reminderNotes.length === 0 ? (
                      <div className="text-sm text-slate-500">No notes yet.</div>
                    ) : reminderNotes.map((n) => (
                      <div key={n.id} className="p-2 rounded-md bg-slate-800/70 border border-slate-700/60">
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <div className="text-xs text-slate-400">
                              {new Date(n.created_at).toLocaleString()}
                            </div>
                            <textarea
                              className="mt-1 w-full rounded-md bg-slate-900/60 border border-slate-700 text-slate-200"
                              defaultValue={n.body}
                              rows={2}
                              onBlur={async (e) => {
                                const body = e.target.value.trim();
                                try {
                                  const updated = await updateReminderNote(n.id, body);
                                  setReminderNotes((prev) => prev.map((x) => (x.id === n.id ? updated : x)));
                                } catch (err) {
                                  console.error(err);
                                  toast.error("Failed to update note");
                                }
                              }}
                            />
                          </div>
                          <Button
                            variant="outline"
                            onClick={async () => {
                              try {
                                await deleteReminderNote(n.id);
                                setReminderNotes((prev) => prev.filter((x) => x.id !== n.id));
                              } catch (err) {
                                console.error(err);
                                toast.error("Failed to delete note");
                              }
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2">
              {(activeItem.kind === 'reminder') && !!activeItem.data.application_id && (
                <Button
                  onClick={() => goToApplication(activeItem?.data?.application_id)}
                  isDisabled={!activeItem?.data?.application_id || loadingApplicationDetail}
                  colorScheme="blue"
                  size="sm"
                >
                  {loadingApplicationDetail ? "Loading..." : "Open Application"}
                </Button>
              )}
              {(activeItem.kind === 'reminder') && (
                <Button onClick={() => deleteReminder(activeItem.data.id)} variant="outline" className="hover:bg-red-900/40">Delete</Button>
              )}
              {/* External Google event = import-only */}
              {activeItem.kind === 'google_external' && (
                <div className="flex items-center gap-2">
                  <select
                    className="bg-slate-800 border border-slate-700 rounded text-slate-200 text-sm p-1"
                    onChange={(e) => activeItem.data._linkAppId = e.target.value}
                    defaultValue=""
                  >
                    <option value="">Link to application (optional)</option>
                    {applications.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.job?.company_name} — {a.job?.title}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" onClick={async () => {
                    try {
                      await importGoogleEventAsReminder({ google_event_id: activeItem.data.id, application_id: activeItem.data._linkAppId || null });
                      toast.success('Imported to My Events');
                      await loadReminders();
                      await loadGoogleCalendarEvents();
                      setIsDetailsOpen(false);
                    } catch (e) {
                      console.error(e); toast.error('Import failed');
                    }
                  }}>Import</Button>
                </div>
              )}

              {/* Optional: for Applytide Google event fallback, let user jump to Google */}
              {activeItem.kind === 'google_applytide' && activeItem.data.htmlLink && (
                <Button variant="outline" onClick={() => window.open(activeItem.data.htmlLink, '_blank', 'noopener')}>
                  Open in Google Calendar
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>


      {/* Create Reminder Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Reminder"
      >
        <form onSubmit={(e) => { e.preventDefault(); createReminder(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Application
            </label>
            {applications.length === 0 && (
              <p className="mt-2 text-xs text-slate-400">
                No applications found. <a href="/jobs" className="text-indigo-400 underline">Add a job</a> first and come back.
              </p>
            )}
            <Select
              value={newReminder.application_id}
              onChange={(e) =>
                setNewReminder({ ...newReminder, application_id: e.target.value })
              }
              className="bg-slate-800 border-slate-700 text-slate-200 w-full"
              required
            >
              <option value="">Select an application</option>
              {applications.map((app) => {
                const id = String(app.id || app.application_id || app._id || "");
                const company =
                  app.job?.company_name ?? app.company_name ?? app.company ?? "Unknown";
                const role = app.job?.title ?? app.title ?? app.position ?? "Unknown position";
                return (
                  <option key={id} value={id}>
                    {company} — {role}
                  </option>
                );
              })}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Reminder Type
            </label>
            <Select
              value={newReminder.type}
              onChange={(e) => setNewReminder({ ...newReminder, type: e.target.value })}
              className="bg-slate-800 border-slate-700 text-slate-200 w-full"
              required
            >
              <option value="">Select type...</option>
              <option value="Follow-up">Follow-up</option>
              <option value="Interview">Interview</option>
              <option value="Phone Screen">Phone Screen</option>
              <option value="Tech Interview">Tech Interview</option>
              <option value="Final Round">Final Round</option>
              <option value="Deadline">Application Deadline</option>
              <option value="Networking Call">Networking Call</option>
              <option value="Custom">Custom</option>
            </Select>
          </div>

          {showCustomType && (
            <div className="mt-3">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Custom Reminder Type
              </label>
              <Input
                type="text"
                value={newReminder.customType || ''}
                onChange={(e) => setNewReminder({ ...newReminder, customType: e.target.value })}
                placeholder="Enter custom reminder type"
                className="bg-slate-800 border-slate-700 text-slate-200"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
            <Input
              type="text"
              value={newReminder.title}
              onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
              placeholder="e.g., Follow-up with ACME"
              className="bg-slate-800 border-slate-700 text-slate-200"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Date & Time
            </label>
            <Input
              type="datetime-local"
              value={newReminder.due_date}
              onChange={(e) => setNewReminder({ ...newReminder, due_date: e.target.value })}
              className="bg-slate-800 border-slate-700 text-slate-200"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={newReminder.description}
              onChange={(e) => setNewReminder({ ...newReminder, description: e.target.value })}
              placeholder="Add any additional notes or details"
              className="w-full rounded-md bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-indigo-500"
              rows={3}
            />
          </div>

          {/* Non-Google users: email reminder toggle (also visible to Google users if they want emails) */}
          <div className="mt-3 flex items-center gap-2">
            <input
              id="emailNotify"
              type="checkbox"
              className="h-4 w-4"
              checked={emailNotify}
              onChange={(e) => setEmailNotify(e.target.checked)}
            />
            <label htmlFor="emailNotify" className="text-slate-300 text-sm">
              Email me a reminder
              <span className="text-slate-400"> (15 minutes before)</span>
            </label>
          </div>
          {isGoogleConnected && (
            <div className="mt-2 flex items-center gap-2">
              <input
                id="addMeet"
                type="checkbox"
                className="h-4 w-4"
                checked={!!newReminder.add_meet_link}
                onChange={(e) => setNewReminder({ ...newReminder, add_meet_link: e.target.checked })}
              />
              <label htmlFor="addMeet" className="text-slate-300 text-sm">Create a Google Meet link</label>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isSubmitting ? 'Creating...' : 'Create Reminder'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}