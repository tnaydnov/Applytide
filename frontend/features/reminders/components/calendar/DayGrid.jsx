import { isSameDay, safeDate } from "../utils/date";
import { getReminderTypeColor } from "../utils/reminders";

export default function DayGrid({ date, reminders = [], events = [], onSelectItem }) {
  const rs = reminders.filter((r) => isSameDay(r.scheduled_at, date));
  const es = events.filter((e) => {
    const raw = e?.start?.dateTime ?? e?.start?.date;
    return raw && isSameDay(safeDate(raw), date);
  });

  return (
    <div className="mt-3 rounded-lg border bg-white p-3">
      <div className="text-sm text-gray-700">
        {date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
      </div>
      <div className="mt-3 space-y-2">
        {rs.map((r) => (
          <button
            key={`r-${r.id}`}
            type="button"
            className={`w-full text-left truncate rounded px-2 py-1 ${getReminderTypeColor(r.name)}`}
            onClick={() => onSelectItem?.({ type: "reminder", data: r })}
          >
            {r.name}
          </button>
        ))}
        {es.map((e) => (
          <button
            key={`e-${e.id}`}
            type="button"
            className="w-full text-left truncate rounded px-2 py-1 bg-blue-100 text-blue-800"
            onClick={() => onSelectItem?.({ type: "google", data: e })}
          >
            {e.summary || e.title || "Event"}
          </button>
        ))}
        {rs.length === 0 && es.length === 0 && (
          <div className="text-gray-500 text-sm">No items today.</div>
        )}
      </div>
    </div>
  );
}
