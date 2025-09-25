import { generateMonthCalendarCells } from "../../utils/calendar";
import { getReminderTypeColor } from "../../utils/reminders";

export default function MonthGrid({ date, reminders = [], events = [], onSelectItem }) {
  const cells = generateMonthCalendarCells(date, reminders, events);

  return (
    <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-white/10">
      <div className="grid grid-cols-7 bg-white/[0.04] text-[11px] uppercase tracking-wide text-slate-300">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
          <div key={d} className="px-2 py-2">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-white/10">
        {cells.map((c, i) => (
          <div
            key={i}
            className={`min-h-[140px] bg-slate-900/40 p-2 ${c.isCurrentMonth ? "" : "opacity-60"}`}
          >
            <div className={`text-xs ${c.isToday ? "text-violet-200 font-semibold" : "text-slate-300"}`}>
              {c.date.getDate()}
              {c.hasInterview && (
                <span className="ml-1 inline-block h-2 w-2 rounded-full bg-fuchsia-400 align-middle shadow-[0_0_0_2px_rgba(250,204,255,.35)]" />
              )}
            </div>

            <div className="mt-1 space-y-1">
              {c.reminders.slice(0,3).map((r) => (
                <button
                  key={`r-${r.id}`}
                  type="button"
                  className={`w-full truncate rounded px-1 py-0.5 text-[11px] ${getReminderTypeColor(r.name)}`}
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
                  className="w-full text-left truncate rounded px-1 py-0.5 text-[11px] bg-sky-500/15 text-sky-100 ring-1 ring-sky-400/30 hover:bg-sky-500/20"
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
    </div>
  );
}
