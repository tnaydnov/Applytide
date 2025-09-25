import { isSameDay, weekRange, safeDate, addMinutes } from "../../utils/date";
import { getReminderTypeColor } from "../../utils/reminders";

const MINUTE_PX = 0.5;               // 1440 * 0.5 = 720px tall
const DAY_HEIGHT = 1440 * MINUTE_PX; // total column height

function toEventBlocks({ reminders = [], events = [] }, day) {
  const blocks = [];

  // Reminders -> 30m blocks
  for (const r of reminders) {
    const d = safeDate(r.scheduled_at);
    if (!d || !isSameDay(d, day)) continue;
    const end = addMinutes(d, 30) || d;
    blocks.push({
      id: `r-${r.id}`,
      title: r.name,
      start: d,
      end,
      type: "reminder",
      classes: getReminderTypeColor(r.name),
    });
  }

  // Google events
  for (const e of events) {
    const startRaw = e?.start?.dateTime ?? e?.start?.date;
    if (!startRaw) continue;
    const start = safeDate(startRaw);
    if (!start || !isSameDay(start, day)) continue;

    const endRaw = e?.end?.dateTime ?? e?.end?.date ?? start;
    const end = safeDate(endRaw) || addMinutes(start, 30) || start;

    const isAllDay = !e?.start?.dateTime && !!e?.start?.date; // date-only
    blocks.push({
      id: `g-${e.id}`,
      title: e.summary || e.title || "Event",
      start,
      end,
      allDay: isAllDay,
      type: "google",
      classes: "bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/30",
      raw: e,
    });
  }

  return blocks;
}

function TopFor(date) {
  const mins = date.getHours() * 60 + date.getMinutes();
  return mins * MINUTE_PX;
}
function HeightFor(start, end) {
  const dur = Math.max(15, Math.round((end - start) / 60000)); // min 15m
  return dur * MINUTE_PX;
}

export default function WeekGrid({ date, reminders = [], events = [], onSelectItem }) {
  const [start] = weekRange(date);
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-white/10">
      {/* Header row */}
      <div className="grid grid-cols-8 bg-white/[0.04] text-[11px] uppercase tracking-wide text-slate-300">
        <div className="px-2 py-2">Time</div>
        {days.map((d) => (
          <div key={d.toISOString()} className="px-2 py-2">
            {d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="grid grid-cols-8">
        {/* Hours rail */}
        <div className="relative bg-slate-900/40">
          <div className="relative h-[720px]">
            {Array.from({ length: 24 }).map((_, h) => (
              <div key={h} className="absolute left-0 right-0 border-t border-white/5" style={{ top: h * 60 * MINUTE_PX }}>
                <div className="absolute -top-2 left-2 text-[11px] text-slate-400">
                  {new Date(0, 0, 0, h).toLocaleTimeString([], { hour: "numeric" })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Day columns */}
        {days.map((d) => {
          const blocks = toEventBlocks({ reminders, events }, d);
          const allDay = blocks.filter((b) => b.allDay);
          const timed  = blocks.filter((b) => !b.allDay);

          return (
            <div key={d.toISOString()} className="relative bg-slate-900/40">
              {/* All-day strip */}
              <div className="border-b border-white/10 bg-white/[0.03] p-1 min-h-[36px]">
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

              {/* Timed grid */}
              <div className="relative h-[720px]">
                {/* hour lines */}
                {Array.from({ length: 24 }).map((_, h) => (
                  <div key={h} className="absolute left-0 right-0 border-t border-white/5" style={{ top: h * 60 * MINUTE_PX }} />
                ))}

                {/* events */}
                {timed.map((b) => {
                  const top = TopFor(b.start);
                  const height = HeightFor(b.start, b.end);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      className={`absolute left-1 right-1 overflow-hidden rounded px-2 py-1 text-[12px] ${b.classes}`}
                      style={{ top, height }}
                      onClick={() => onSelectItem?.({ type: b.type, data: b.raw || { id: b.id, name: b.title, scheduled_at: b.start } })}
                      title={b.title}
                    >
                      {b.title}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
