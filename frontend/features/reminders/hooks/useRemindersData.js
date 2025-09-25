import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../../lib/api";
import {
  checkGoogleConnection,
  getReminders as fetchRemindersAPI,
  createReminder as createReminderAPI,
  deleteReminder as deleteReminderAPI,
} from "../../../services/googleCalendar";
import {
  computeStats,
  filterReminders,
  sortReminders,
  normalizeApplications,
  normalizeReminders,
} from "../utils/reminders";

/**
 * Central data hook for the Reminders page.
 * - Loads reminders & applications
 * - Checks Google Calendar connection
 * - Handles filtering/sorting, stats
 * - Exposes create/delete actions and a refresh()
 *
 * @param {Object} opts
 *   - toast: optional { success(msg), error(msg), info(msg) }
 */
export default function useRemindersData(opts = {}) {
  const toast = opts.toast;

  const [loading, setLoading] = useState(true);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);

  const [reminders, setReminders] = useState([]);
  const [applications, setApplications] = useState([]);

  const [filter, setFilter] = useState("upcoming"); // "upcoming" | "overdue" | "all"
  const [sortBy, setSortBy] = useState("scheduled_at"); // "scheduled_at" | "created_at" | "company"

  /** Refresh everything (connection, apps, reminders). */
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // 1) Google connection
      const connected = await checkGoogleConnection().catch(() => false);
      setIsGoogleConnected(!!connected);

      // 2) Applications
      //    Keep a wide safety net for shapes; normalize into a flat array
      const appsRaw = await api
        .getApplicationCards()
        .catch((e) => {
          console.error("getApplicationCards failed:", e);
          return [];
        });
      const apps = normalizeApplications(appsRaw);
      setApplications(Array.isArray(apps) ? apps : []);

      // 3) Reminders
      const r = await fetchRemindersAPI().catch((e) => {
        console.error("getReminders failed:", e);
        return [];
      });
      const normalized = normalizeReminders(Array.isArray(r) ? r : []);
      setReminders(normalized);
    } catch (err) {
      console.error("refresh() failed:", err);
      setApplications([]);
      setReminders([]);
      toast?.error?.("Failed to load reminders");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Derived: google event ids set (used to de-dupe import list). */
  const googleEventIds = useMemo(() => {
    return new Set(
      (reminders || [])
        .map((x) => x?.google_event_id)
        .filter(Boolean)
        .map(String)
    );
  }, [reminders]);

  /** Filter + sort pipeline. */
  const filteredReminders = useMemo(() => {
    const filtered = filterReminders(reminders || [], filter);
    return sortReminders(filtered, sortBy, applications);
  }, [reminders, filter, sortBy, applications]);

  /** Dashboard stats */
  const stats = useMemo(() => computeStats(reminders || []), [reminders]);

  /**
   * Create a new reminder via API then refresh.
   * Accepts the raw form object from the modal:
   * {
   *   application_id (required),
   *   title (required),
   *   description,
   *   due_date (required, local or ISO),
   *   type, customType,
   *   add_meet_link (bool),
   *   email_notify (bool)
   * }
   * Mirrors original behavior of prefixing the title with type/customType if not present.
   */
  const createReminder = useCallback(
    async (form) => {
      try {
        const appId = String(form?.application_id || "");
        const titleRaw = String(form?.title || "").trim();
        const dueRaw = form?.due_date;

        if (!appId || !titleRaw || !dueRaw) {
          toast?.error?.("Please fill in all required fields");
          return;
        }

        // Fold “type” into the title (e.g., "Follow-up: ACME") if not already present
        const baseType =
          form?.type === "Custom" && form?.customType
            ? String(form.customType)
            : String(form?.type || "");
        const finalTitle =
          baseType && !titleRaw.toLowerCase().includes(baseType.toLowerCase())
            ? `${baseType}: ${titleRaw}`
            : titleRaw;

        const payload = {
          application_id: appId,
          title: finalTitle,
          description: String(form?.description || ""),
          due_date: new Date(dueRaw).toISOString(), // RFC3339
          email_notify: !!form?.email_notify, // default handled in caller
          add_meet_link: !!form?.add_meet_link,
          timezone_str:
            (typeof Intl !== "undefined" &&
              Intl.DateTimeFormat().resolvedOptions().timeZone) ||
            "UTC",
        };

        await createReminderAPI(payload);
        toast?.success?.("Reminder created successfully");
        await refresh();
        return true;
      } catch (err) {
        console.error("createReminder failed:", err);
        toast?.error?.("Failed to create reminder");
        return false;
      }
    },
    [refresh, toast]
  );

  /** Delete a reminder by id, then refresh. */
  const deleteReminder = useCallback(
    async (reminderId) => {
      try {
        if (!reminderId) return false;
        await deleteReminderAPI(reminderId);
        toast?.success?.("Reminder deleted");
        await refresh();
        return true;
      } catch (err) {
        console.error("deleteReminder failed:", err);
        toast?.error?.("Failed to delete reminder");
        return false;
      }
    },
    [refresh, toast]
  );

  return {
    // loading & connectivity
    loading,
    isGoogleConnected,

    // data
    reminders,
    applications,
    googleEventIds,

    // filter/sort & results
    filter,
    setFilter,
    sortBy,
    setSortBy,
    filteredReminders,

    // stats
    stats,

    // actions
    refresh,
    createReminder,
    deleteReminder,

    // internal setter (rarely needed outside; exposed for advanced cases)
    setReminders,
  };
}
