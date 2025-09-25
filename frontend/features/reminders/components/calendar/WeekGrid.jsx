import { isSameDay, weekRange, safeDate } from "../utils/date";
import { getReminderTypeColor } from "../utils/reminders";

export default function WeekGrid({ date, reminders = [], events = [], onSelectItem }) {
  const [start, end] = weekRange(date);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  return (
    <div className="mt-3 grid grid-cols-7 gap-px rounded-lg border bg-gray-200">
      {days.map((d) => {
        const rs = reminders.filter((r) => isSameDay(r.scheduled_at, d));
        const es = events.filter((e) => {
          const raw = e?.start?.dateTime ?? e?.start?.date;
          return raw && isSameDay(safeDate(raw), d);
        });
        return (
          <div key={d.toISOString()} className="bg-white min-h-[200px] p-2">
            <div className="text-xs text-gray-700">
              {d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </div>
            <div className="mt-1 space-y-1">
              {rs.map((r) => (
                <button
                  key={`r-${r.id}`}
                  type="button"
                  className={`w-full text-left truncate rounded px-1 py-0.5 text-[11px] ${getReminderTypeColor(r.name)}`}
                  onClick={() => onSelectItem?.({ type: "reminder", data: r })}
                >
                  {r.name}
                </button>
              ))}
              {es.map((e) => (
                <button
                  key={`e-${e.id}`}
                  type="button"
                  className="w-full text-left truncate rounded px-1 py-0.5 text-[11px] bg-blue-100 text-blue-800"
                  onClick={() => onSelectItem?.({ type: "google", data: e })}
                >
                  {e.summary || e.title || "Event"}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
