import { addMinutes, safeDate } from "./date";
import { findAppById } from "./reminders";

/** Escape characters per RFC5545 (\, ;, , and newlines). */
export function escapeICSText(text) {
  if (!text) return "";
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\r?\n/g, "\\n");
}

/** Best-effort base URL detection (env → window → sensible default). */
export function getBaseUrl() {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  // Last resort fallback for SSR/build-time contexts.
  const isProd =
    typeof process !== "undefined" && process.env?.NODE_ENV === "production";
  return isProd ? "https://applytide.com" : "http://localhost:3000";
}

/** Format date as UTC `YYYYMMDDTHHMMSSZ` (required by ICS). */
function formatICSDateUTC(input) {
  const d = safeDate(input);
  if (!d) return "";
  // Always in UTC for ICS compliance.
  const iso = new Date(d.getTime()).toISOString(); // 2025-01-01T12:34:56.789Z
  return iso.replace(/[-:]/g, "").split(".")[0] + "Z"; // 20250101T123456Z
}

/**
 * Build a complete .ics payload from reminders.
 *
 * @param {Array} reminders  UI-shaped reminders ({ id, name, scheduled_at, notes/description, application_id, ... })
 * @param {Array} applications  application list (used to enrich title/description/location)
 * @param {Object} options
 *   - durationMinutes (default 30)
 *   - calendarName (default "Applytide Reminders")
 *   - productId (default "-//Applytide//Reminders//EN")
 */
export function generateICSContent(
  reminders = [],
  applications = [],
  options = {}
) {
  const {
    durationMinutes = 30,
    calendarName = "Applytide Reminders",
    productId = "-//Applytide//Reminders//EN",
  } = options;

  const nowStamp = formatICSDateUTC(new Date());

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${productId}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeICSText(calendarName)}`,
    "X-WR-TIMEZONE:UTC",
    "X-WR-CALDESC:Job search reminders and interviews from Applytide",
  ];

  for (const reminder of reminders || []) {
    const startDate = safeDate(reminder?.scheduled_at);
    if (!startDate) continue;

    const endDate = addMinutes(startDate, durationMinutes) || startDate;

    const app = findAppById(applications, reminder?.application_id);
    const company = app?.job?.company_name || "Unknown Company";
    const position = app?.job?.title || "Unknown Position";
    const location = app?.job?.location || "";

    // Priority/category rules to match current behavior.
    let priority = "3"; // default medium
    let category = "JOB SEARCH";
    const typeStr = String(reminder?.name || "").toLowerCase();
    if (typeStr.includes("interview")) {
      priority = "1"; // high
      category = "INTERVIEW";
    } else if (typeStr.includes("deadline")) {
      priority = "2"; // medium-high
      category = "DEADLINE";
    } else if (typeStr.includes("follow")) {
      category = "FOLLOW-UP";
    }

    const summary = `${reminder?.name || "Reminder"} - ${company}`;
    const description =
      `Job: ${position}\\n\\n` +
      `Notes: ${escapeICSText(reminder?.notes || reminder?.description || "No notes")}\\n\\n` +
      "Applytide";

    const url = `${getBaseUrl()}/applications/${reminder?.application_id}`;

    lines.push(
      "BEGIN:VEVENT",
      `UID:applytide-reminder-${String(reminder?.id ?? Math.random())
        .replace(/[^a-zA-Z0-9_-]/g, "")
        .slice(0, 64)}`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART:${formatICSDateUTC(startDate)}`,
      `DTEND:${formatICSDateUTC(endDate)}`,
      `SUMMARY:${escapeICSText(summary)}`,
      `DESCRIPTION:${description}`,
      location ? `LOCATION:${escapeICSText(location)}` : "",
      `URL:${escapeICSText(url)}`,
      `CATEGORIES:${escapeICSText(category)}`,
      `PRIORITY:${priority}`,
      "STATUS:CONFIRMED",
      "TRANSP:OPAQUE",
      // 15-minute popup
      "BEGIN:VALARM",
      "TRIGGER:-PT15M",
      "ACTION:DISPLAY",
      "DESCRIPTION:Applytide Reminder: 15 minutes until your reminder",
      "END:VALARM",
      // 1-hour email
      "BEGIN:VALARM",
      "TRIGGER:-PT1H",
      "ACTION:EMAIL",
      "DESCRIPTION:Applytide Reminder: 1 hour until your reminder",
      "SUMMARY:Upcoming Applytide Reminder",
      "END:VALARM",
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  // ICS wants CRLF line endings.
  return lines.filter(Boolean).join("\r\n");
}

/**
 * Trigger a client-side download. No-op during SSR.
 */
export function downloadFile(content, filename, mimeType = "text/calendar") {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "applytide-reminders.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(url);
  }
}
