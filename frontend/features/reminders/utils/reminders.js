import { addDays, safeDate } from "./date";

/**
 * Robustly find an application from multiple possible id fields and types.
 */
export function findAppById(applications = [], id) {
    if (!id || !Array.isArray(applications)) return undefined;
    const needle = String(id);
    return applications.find((a) => {
        const candidate =
            a?.id ??
            a?.application_id ??
            a?._id ??
            (a && typeof a === "object" && "toString" in a ? a.toString() : null);
        return String(candidate) === needle;
    });
}

/**
 * Normalize different app list shapes into a flat array.
 */
export function normalizeApplications(res) {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.results)) return res.results;
    if (Array.isArray(res?.items)) return res.items;
    return [];
}

/**
 * Normalize reminders returned from the reminders API into the UI shape.
 * (Mirrors the mapping used in the old reminders page.)
 */
export function normalizeReminders(apiReminders = []) {
    if (!Array.isArray(apiReminders)) return [];
    return apiReminders.map((x) => ({
        ...x,
        name: x.title,                                // display title
        scheduled_at: x.due_date,                     // when
        notes: x.description || "",
        description: x.description || "",
        application_id: String(x.application_id || ""),
    }));
}

/**
 * Filters by "all" | "upcoming" | "overdue".
 */
export function filterReminders(reminders = [], filter = "upcoming") {
    const now = new Date();
    if (filter === "all") return [...reminders];
    if (filter === "overdue") {
        return (reminders || []).filter((r) => {
            const d = safeDate(r?.scheduled_at);
            return d && d < now;
        });
    }
    // upcoming (default)
    return (reminders || []).filter((r) => {
        const d = safeDate(r?.scheduled_at);
        return d && d >= now;
    });
}

/**
 * Sort by "scheduled_at" | "created_at" | "company".
 */
export function sortReminders(reminders = [], sortBy = "scheduled_at", applications = []) {
    const list = [...(reminders || [])];

    if (sortBy === "scheduled_at") {
        list.sort((a, b) => {
            const da = safeDate(a?.scheduled_at)?.getTime() ?? 0;
            const db = safeDate(b?.scheduled_at)?.getTime() ?? 0;
            return da - db;
        });
        return list;
    }

    if (sortBy === "created_at") {
        list.sort((a, b) => {
            const da = safeDate(a?.created_at)?.getTime() ?? 0;
            const db = safeDate(b?.created_at)?.getTime() ?? 0;
            return db - da; // recent first
        });
        return list;
    }

    if (sortBy === "company") {
        list.sort((a, b) => {
            const appA = findAppById(applications, a?.application_id);
            const appB = findAppById(applications, b?.application_id);
            const cA = appA?.job?.company_name || "";
            const cB = appB?.job?.company_name || "";
            return cA.localeCompare(cB);
        });
        return list;
    }

    return list;
}

/**
 * Compute dashboard stats used at the top of the page.
 * - total
 * - upcoming (>= now)
 * - overdue (< now)
 * - thisWeek (within next 7 days, inclusive)
 */
export function computeStats(reminders = []) {
    const now = new Date();
    const weekFromNow = addDays(now, 7);

    const total = reminders.length;
    let upcoming = 0;
    let overdue = 0;
    let thisWeek = 0;

    for (const r of reminders) {
        const d = safeDate(r?.scheduled_at);
        if (!d) continue;

        if (d >= now) {
            upcoming++;
            if (weekFromNow && d <= weekFromNow) thisWeek++;
        } else {
            overdue++;
        }
    }

    return { total, upcoming, overdue, thisWeek };
}

/**
 * Badge/background coloring based on reminder name/type.
 * (Kept compatible with the existing UI classes.)
 */
export function getReminderTypeColor(name = "") {
    const type = String(name).toLowerCase();
    if (type.includes("interview")) return "bg-purple-100 text-purple-800";
    if (type.includes("follow")) return "bg-blue-100 text-blue-800";
    if (type.includes("deadline")) return "bg-red-100 text-red-800";
    if (type.includes("call") || type.includes("phone")) return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-800";
}
