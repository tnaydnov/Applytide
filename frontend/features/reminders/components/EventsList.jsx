import { useMemo } from "react";
import { Button, Badge } from "../../../components/ui";
import { getTimeUntil, formatTime } from "../utils/date";
import { getReminderTypeColor, findAppById } from "../utils/reminders";

export default function EventsList({
  reminders = [],
  applications = [],
  filter,
  setFilter,
  sortBy,
  setSortBy,
  onSelect,      // show details modal
  onDelete,      // delete reminder
}) {
  const companies = useMemo(
    () =>
      new Map(applications.map((a) => [String(a.id), a?.job?.company_name || ""])),
    [applications]
  );

  return (
    <div className="mt-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {["upcoming", "overdue", "all"].map((k) => (
            <button
              key={k}
              className={`px-3 py-1 rounded-full text-sm border ${
                filter === k
                  ? "bg-violet-500/20 border-violet-400/30 text-violet-200"
                  : "bg-white/5 border-white/10 text-slate-200 hover:bg-white/10"
              }`}
              onClick={() => setFilter?.(k)}
              type="button"
            >
              {k[0].toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-300">Sort by</label>
          <select
            className="input-glass input-cyan text-sm"
            value={sortBy}
            onChange={(e) => setSortBy?.(e.target.value)}
          >
            <option value="scheduled_at">Date</option>
            <option value="created_at">Created</option>
            <option value="company">Company</option>
          </select>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-white/10 rounded-xl ring-1 ring-white/10 bg-white/[0.03]">
        {reminders.length === 0 && (
          <li className="p-6 text-center text-slate-400">No reminders.</li>
        )}
        {reminders.map((r) => {
          const app = findAppById(applications, r.application_id);
          return (
            <li key={r.id} className="flex items-start justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge size="sm" className={getReminderTypeColor(r.name)}>{r.name}</Badge>
                  <span className="truncate font-medium text-slate-100">
                    {app?.job?.company_name || companies.get(String(r.application_id)) || "Unknown"}
                  </span>
                </div>
                <div className="mt-1 text-sm text-slate-300">{app?.job?.title}</div>
                {r.description ? (
                  <p className="mt-2 line-clamp-2 text-sm text-slate-200">{r.description}</p>
                ) : null}
              </div>

              <div className="flex-shrink-0 text-right">
                <div className="text-sm font-medium text-slate-100">
                  {new Date(r.scheduled_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  • {formatTime(r.scheduled_at)}
                </div>
                <div className="text-xs text-slate-400">{getTimeUntil(r.scheduled_at)}</div>

                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => onSelect?.(r)}>
                    Details
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => onDelete?.(r.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
