/**
 * Safe date parsing. Returns a Date or null.
 */
export function safeDate(value) {
  try {
    const d = value instanceof Date ? value : new Date(value);
    return Number.isFinite(d?.getTime()) ? d : null;
  } catch {
    return null;
  }
}

/**
 * Format a time like "3:45 PM" (matches the old page behavior).
 */
export function formatTime(input, locale = "en-US", opts) {
  const d = safeDate(input);
  if (!d) return "";
  return d.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
    ...(opts || {}),
  });
}

/**
 * Human-readable relative time used in the list view (keeps prior semantics).
 * - Past => "X days overdue" / "X hours overdue" / "Overdue"
 * - Future => "in X days/hours/minutes" / "now"
 */
export function getTimeUntil(target, now = new Date()) {
  const t = safeDate(target);
  if (!t) return "";

  const diffMs = t.getTime() - now.getTime();

  if (diffMs < 0) {
    const overdue = Math.abs(diffMs);
    const days = Math.floor(overdue / (1000 * 60 * 60 * 24));
    const hours = Math.floor((overdue % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days} day${days > 1 ? "s" : ""} overdue`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} overdue`;
    return "Overdue";
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `in ${days} day${days === 1 ? "" : "s"}`;
  if (hours > 0) return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  if (minutes > 0) return `in ${minutes} minute${minutes === 1 ? "" : "s"}`;
  return "now";
}

/** Start-of-day (local). */
export function startOfDay(input) {
  const d = safeDate(input);
  if (!d) return null;
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}

/** End-of-day (local). */
export function endOfDay(input) {
  const d = safeDate(input);
  if (!d) return null;
  const n = new Date(d);
  n.setHours(23, 59, 59, 999);
  return n;
}

/** Returns [startOfWeek(Sun), endOfWeek(Sat)] for the given date. */
export function weekRange(input) {
  const d = safeDate(input) ?? new Date();
  const start = startOfDay(new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay()));
  const end = endOfDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6));
  return [start, end];
}

/** Returns [firstOfMonthStart, lastOfMonthEnd] for the given date. */
export function monthRange(input) {
  const d = safeDate(input) ?? new Date();
  const first = startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
  const last = endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  return [first, last];
}

/** Same-day comparator (local). */
export function isSameDay(a, b) {
  const ad = safeDate(a);
  const bd = safeDate(b);
  if (!ad || !bd) return false;
  return ad.toDateString() === bd.toDateString();
}

/** Add minutes (returns a new Date). */
export function addMinutes(date, minutes) {
  const d = safeDate(date);
  if (!d || !Number.isFinite(minutes)) return null;
  return new Date(d.getTime() + minutes * 60000);
}

/** Add days (returns a new Date). */
export function addDays(date, days) {
  const d = safeDate(date);
  if (!d || !Number.isFinite(days)) return null;
  const n = new Date(d);
  n.setDate(n.getDate() + days);
  return n;
}

/** ISO helper used for ICS/export or API payloads. */
export function toISODateTime(input) {
  const d = safeDate(input);
  return d ? d.toISOString() : "";
}
