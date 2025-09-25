import { safeDate, addMinutes } from "../../utils/date";
import { getReminderTypeColor } from "../../utils/reminders";

const MINUTE_PX = 0.5;
const HEIGHT = 1440 * MINUTE_PX;

function toBlocks({ date, reminders = [], events = [] }) {
  const sameDay = (a, b) => a?.toDateString?.() === b?.toDateString?.();

  const list = [];

  for (const r of reminders) {
    const d = safeDate(r.scheduled_at);
    if (!d || !sameDay(d, date)) continue;
    list.push({
      id: `r-${r.id}`,
      title: r.name,
      start: d,
      end: addMinutes(d, 30) || d,
      type: "reminder",
      classes: getReminderTypeColor(r.name),
      raw: r,
    });
  }

  for (const e of events) {
    const startRaw = e?.start?.dateTime ?? e?.start?.date;
    if (!startRaw) continue;
    const start = safeDate(startRaw);
    if (!start || !sameDay(start, date)) continue;

    const endRaw = e?.end?.dateTime ?? e?.end?.date ?? start;
    const end = safeDate(endRaw) || addMinutes(start, 30) || start;
    const isAllDay = !e?.start?.dateTime && !!e?.start?.date;

    list.push({
      id: `g-${e.id}`,
      title: e.summary || e.title || "Event",
      start, end,
      allDay: isAllDay,
      type: "google",
      classes: "bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/30",
      raw: e,
    });
  }

  return list;
}
const topFor = (d) => (d.getHours() * 60 + d.getMinutes()) * MINUTE_PX;
const heightFor = (a, b) => Math.max(15, Math.round((b - a) / 60000)) * MINUTE_PX;

export default function DayGrid({ date, reminders = [], events = [], onSelectItem }) {
  const blocks = toBlocks({ date, reminders, events });
  const allDay = blocks.filter((b) => b.allDay);
  const timed  = blocks.filter((b) => !b.allDay);

  return (
    <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-white/10">
      <div className="bg-white/[0.04] px-3 py-2 text-sm text-slate-200">
        {date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
      </div>

      {/* All-day strip */}
      <div className="border-b border-white/10 bg-white/[0.03] p-2 min-h-[36px]">
        {allDay.map((b) => (
          <button
            key={b.id}
            type="button"
            className={`mr-1 mb-1 inline-block truncate rounded px-2 py-0.5 text-[12px] ${b.type === "reminder" ? b.classes : "bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/30"}`}
            onClick={() => onSelectItem?.({ type: b.type, data: b.raw || { id: b.id, name: b.title, scheduled_at: b.start } })}
            title={b.title}
          >
            {b.title}
          </button>
        ))}
      </div>

      <div className="relative bg-slate-900/40">
        {/* hour lines + labels */}
        <div className="relative h-[720px]">
          {Array.from({ length: 24 }).map((_, h) => (
            <div key={h} className="absolute left-0 right-0 border-t border-white/5" style={{ top: h * 60 * MINUTE_PX }}>
              <div className="absolute -top-2 left-2 text-[11px] text-slate-400">
                {new Date(0, 0, 0, h).toLocaleTimeString([], { hour: "numeric" })}
              </div>
            </div>
          ))}

          {/* events */}
          {timed.map((b) => (
            <button
              key={b.id}
              type="button"
              className={`absolute left-24 right-2 overflow-hidden rounded px-2 py-1 text-[12px] ${b.classes}`}
              style={{ top: topFor(b.start), height: heightFor(b.start, b.end) }}
              onClick={() => onSelectItem?.({ type: b.type, data: b.raw || { id: b.id, name: b.title, scheduled_at: b.start } })}
              title={b.title}
            >
              {b.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
