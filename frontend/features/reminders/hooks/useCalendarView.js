import { useCallback, useEffect, useMemo, useState } from "react";
import { getGoogleCalendarEvents } from "../../../services/googleCalendar";
import {
  monthRange,
  weekRange,
  startOfDay,
  endOfDay,
  safeDate,
} from "../utils/date";

/**
 * Manages calendar view state (day|week|month), selected date,
 * and windowed fetching of Google Calendar events with de-dupe
 * against imported reminders.
 *
 * @param {Object} options
 *  - isGoogleConnected: boolean
 *  - googleEventIds: Set<string|number> of already imported Google event ids
 *  - reminders: Reminder[] (used for fuzzy dedupe)
 *  - shouldFetch: boolean (e.g. activeTab is "calendar" or "import")
 */
export default function useCalendarView({
  isGoogleConnected = false,
  googleEventIds,
  reminders,
  shouldFetch = false,
} = {}) {
  const [calendarView, setCalendarView] = useState("month"); // "day" | "week" | "month"
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [googleEvents, setGoogleEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const ids = useMemo(
    () => new Set([...(googleEventIds || [])].map(String)),
    [googleEventIds]
  );

  const computeWindow = useCallback(() => {
    const base = safeDate(selectedDate) || new Date();
    if (calendarView === "day") {
      return [startOfDay(base), endOfDay(base)];
    }
    if (calendarView === "week") {
      return weekRange(base);
    }
    // month
    return monthRange(base);
  }, [selectedDate, calendarView]);

  const refreshGoogleEvents = useCallback(async () => {
    if (!isGoogleConnected || !shouldFetch) {
      setGoogleEvents([]);
      return;
    }

    const [start, end] = computeWindow();

    try {
      setLoadingEvents(true);
      const events = await getGoogleCalendarEvents({
        time_min: start?.toISOString(),
        time_max: end?.toISOString(),
        max_results: 100,
      });

      const list = Array.isArray(events) ? events : [];

      // External (non-Applytide) events only
      const external = list.filter(
        (e) => e?.extendedProperties?.private?.applytide !== "1"
      );

      // Remove events already imported (by Google event id)
      const extById = external.filter(
        (e) => e?.id && !ids.has(String(e.id))
      );

      // Fuzzy dedupe vs reminders: same title & within 10 minutes
      const extFuzzy = extById.filter((e) => {
        const startRaw = e?.start?.dateTime ?? e?.start?.date;
        if (!startRaw) return true;
        const eStart = new Date(startRaw);
        const eTitle = String(e?.summary || "").trim().toLowerCase();

        if (!Array.isArray(reminders)) return true;

        return !reminders.some((r) => {
          const rStart = safeDate(r?.scheduled_at);
          if (!rStart) return false;
          const minutes = Math.abs((eStart.getTime() - rStart.getTime()) / 60000);
          const rTitle = String(r?.name || "").trim().toLowerCase();
          return minutes <= 10 && rTitle === eTitle;
        });
      });

      setGoogleEvents(extFuzzy);
    } catch (err) {
      console.error("Failed to load Google Calendar events:", err);
      setGoogleEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }, [isGoogleConnected, shouldFetch, computeWindow, ids, reminders]);

  useEffect(() => {
    refreshGoogleEvents();
  }, [refreshGoogleEvents]);

  // Navigation helpers
  const goToday = useCallback(() => setSelectedDate(new Date()), []);
  const goPrev = useCallback(() => {
    const d = safeDate(selectedDate) || new Date();
    const n = new Date(d);
    if (calendarView === "day") n.setDate(n.getDate() - 1);
    else if (calendarView === "week") n.setDate(n.getDate() - 7);
    else n.setMonth(n.getMonth() - 1);
    setSelectedDate(n);
  }, [selectedDate, calendarView]);

  const goNext = useCallback(() => {
    const d = safeDate(selectedDate) || new Date();
    const n = new Date(d);
    if (calendarView === "day") n.setDate(n.getDate() + 1);
    else if (calendarView === "week") n.setDate(n.getDate() + 7);
    else n.setMonth(n.getMonth() + 1);
    setSelectedDate(n);
  }, [selectedDate, calendarView]);

  return {
    calendarView,
    setCalendarView,
    selectedDate,
    setSelectedDate,

    googleEvents,
    loadingEvents,
    refreshGoogleEvents,

    goToday,
    goPrev,
    goNext,
  };
}
