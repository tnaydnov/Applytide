import { generateMonthCalendarCells } from "../../utils/calendar";
import { getReminderTypeColor } from "../../utils/reminders";

export default function MonthGrid({ date, reminders = [], events = [], onSelectItem }) {
  const cells = generateMonthCalendarCells(date, reminders, events);

  return (
    <div className="mt-3 grid grid-cols-7 gap-px rounded-lg border bg-gray-200">
      {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
        <div key={d} className="bg-white p-2 text-xs font-medium text-gray-500">{d}</div>
      ))}
      {cells.map((c, i) => (
        <div
          key={i}
          className={`bg-white h-40 p-2 overflow-hidden ${c.isCurrentMonth ? "" : "bg-gray-50 text-gray-400"}`}
        >
          <div className={`text-xs ${c.isToday ? "font-semibold text-blue-600" : "text-gray-700"}`}>
            {c.date.getDate()}
            {c.hasInterview && <span className="ml-1 inline-block h-2 w-2 rounded-full bg-purple-500 align-middle" />}
          </div>

          <div className="mt-1 space-y-1">
            {c.reminders.slice(0,3).map((r) => (
              <button
                key={`r-${r.id}`}
                type="button"
                className={`w-full text-left truncate rounded px-1 py-0.5 text-[11px] ${getReminderTypeColor(r.name)}`}
                onClick={() => onSelectItem?.({ type: "reminder", data: r })}
                title={r.name}
              >
                {r.name}
              </button>
            ))}
            {c.events.slice(0,3).map((e) => (
              <button
                key={`e-${e.id}`}
                type="button"
                className="w-full text-left truncate rounded px-1 py-0.5 text-[11px] bg-blue-100 text-blue-800"
                onClick={() => onSelectItem?.({ type: "google", data: e })}
                title={e.summary || e.title || "Event"}
              >
                {e.summary || e.title || "Event"}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
