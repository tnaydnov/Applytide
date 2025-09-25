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
      new Map(
        applications.map((a) => [String(a.id), a?.job?.company_name || ""])
      ),
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
                filter === k ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white text-gray-700"
              }`}
              onClick={() => setFilter?.(k)}
              type="button"
            >
              {k[0].toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Sort by</label>
          <select
            className="border rounded-md px-2 py-1 text-sm"
            value={sortBy}
            onChange={(e) => setSortBy?.(e.target.value)}
          >
            <option value="scheduled_at">Date</option>
            <option value="created_at">Created</option>
            <option value="company">Company</option>
          </select>
        </div>
      </div>

      <ul className="mt-4 divide-y rounded-lg border bg-white">
        {reminders.length === 0 && (
          <li className="p-6 text-center text-gray-500">No reminders.</li>
        )}
        {reminders.map((r) => {
          const app = findAppById(applications, r.application_id);
          return (
            <li key={r.id} className="p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge size="sm" className={getReminderTypeColor(r.name)}>{r.name}</Badge>
                  <span className="font-medium text-gray-900 truncate">
                    {app?.job?.company_name || companies.get(String(r.application_id)) || "Unknown"}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {app?.job?.title}
                </div>
                {r.description ? (
                  <p className="mt-2 text-sm text-gray-700 line-clamp-2">{r.description}</p>
                ) : null}
              </div>

              <div className="flex-shrink-0 text-right">
                <div className="text-sm font-medium text-gray-900">
                  {new Date(r.scheduled_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  • {formatTime(r.scheduled_at)}
                </div>
                <div className="text-xs text-gray-500">{getTimeUntil(r.scheduled_at)}</div>

                <div className="flex justify-end gap-2 mt-3">
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
