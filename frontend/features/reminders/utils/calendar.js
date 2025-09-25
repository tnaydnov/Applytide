/**
 * Safely turn various Google event start structures into a Date (or null).
 * Supports all-day events (start.date) and timed events (start.dateTime).
 */
export function eventStartToDate(event) {
  try {
    const raw =
      event?.start?.dateTime ??
      event?.start?.date ??
      null;
    if (!raw) return null;
    // date-only strings should be treated as local midnight
    // new Date('2025-09-25') is fine; keep as-is.
    const d = new Date(raw);
    return Number.isFinite(d?.getTime()) ? d : null;
  } catch {
    return null;
  }
}

/**
 * Returns true if a Google event is tagged as created by Applytide.
 * This matches how we set extendedProperties.private.applytide = "1".
 */
export function isApplytideEvent(event) {
  return event?.extendedProperties?.private?.applytide === "1";
}

/**
 * Given an Applytide-tagged Google event, find the corresponding reminder
 * from the provided reminders list. Matches by explicit reminder_id first,
 * then falls back to google_event_id if available.
 */
export function reminderFromApplytideEvent(event, reminders = []) {
  if (!event || !Array.isArray(reminders)) return null;

  const rid = event?.extendedProperties?.private?.reminder_id;
  const byRid = rid
    ? reminders.find(r => String(r.id) === String(rid))
    : null;
  if (byRid) return byRid;

  const byGid = event?.id
    ? reminders.find(r => String(r.google_event_id) === String(event.id))
    : null;
  return byGid || null;
}

/**
 * Build the cells for a month grid. Each cell:
 * {
 *   date: Date,
 *   isCurrentMonth: boolean,
 *   isToday: boolean,
 *   reminders: Reminder[],
 *   events: GoogleEvent[],
 *   hasInterview: boolean
 * }
 */
export function generateMonthCalendarCells(currentDate, reminders = [], googleEvents = []) {
  const safeDate = (d) => (d instanceof Date ? d : new Date(d));
  const base = safeDate(currentDate);
  if (!Number.isFinite(base?.getTime())) {
    throw new Error("generateMonthCalendarCells: invalid currentDate");
  }

  const cells = [];
  const year = base.getFullYear();
  const month = base.getMonth();

  const firstDay = new Date(year, month, 1);
  const startingDay = firstDay.getDay(); // 0 = Sun

  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Leading days (previous month)
  for (let i = 0; i < startingDay; i++) {
    const date = new Date(year, month, 1 - (startingDay - i));
    cells.push(createCalendarCell(date, today, reminders, googleEvents, false));
  }

  // Current month days
  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month, day);
    cells.push(createCalendarCell(date, today, reminders, googleEvents, true));
  }

  // Trailing days (next month) to fill whole weeks
  const totalCellCount = Math.ceil((startingDay + totalDays) / 7) * 7;
  const remaining = totalCellCount - cells.length;
  for (let i = 1; i <= remaining; i++) {
    const date = new Date(year, month + 1, i);
    cells.push(createCalendarCell(date, today, reminders, googleEvents, false));
  }

  return cells;
}

/**
 * Internal: creates a single calendar cell object.
 * Exported for testing / reuse in day/week renderers if needed.
 */
export function createCalendarCell(date, today, reminders = [], googleEvents = [], isCurrentMonth = false) {
  const sameDay = (a, b) => {
    const ad = new Date(a); const bd = new Date(b);
    return ad.toDateString() === bd.toDateString();
  };

  const dateAtMidnight = new Date(date);
  dateAtMidnight.setHours(0, 0, 0, 0);

  const remindersForDay = (Array.isArray(reminders) ? reminders : []).filter(r => {
    const when = r?.scheduled_at ? new Date(r.scheduled_at) : null;
    return when && sameDay(when, dateAtMidnight);
  });

  const eventsForDay = (Array.isArray(googleEvents) ? googleEvents : []).filter(e => {
    const when = eventStartToDate(e);
    return when && sameDay(when, dateAtMidnight);
  });

  const hasInterview = remindersForDay.some(r =>
    String(r?.name || "").toLowerCase().includes("interview")
  );

  return {
    date: new Date(dateAtMidnight),
    isCurrentMonth: !!isCurrentMonth,
    isToday: today && sameDay(today, dateAtMidnight),
    reminders: remindersForDay,
    events: eventsForDay,
    hasInterview,
  };
}
