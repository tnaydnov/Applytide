import { startOfDay, endOfDay, isSameDay, safeDate } from "../../utils/date";
import { eventStartToDate } from "../../utils/calendar";
import { getReminderTypeColor } from "../../utils/reminders";

const HOUR_PX = 48;

export default function DayGrid({ date, reminders = [], events = [], onSelectItem }) {
  const day = safeDate(date) || new Date();
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);
  const ratio = HOUR_PX / 60;

  const clampToDay = (s, e) => {
    const S = Math.max(s.getTime(), dayStart.getTime());
    const E = Math.min((e?.getTime?.() ?? S + 60 * 60000), dayEnd.getTime());
    return [new Date(S), new Date(Math.max(E, S + 15 * 60000))];
  };

  const rBlocks = (reminders || [])
    .map((r) => {
      const s = safeDate(r?.scheduled_at);
      if (!s || !isSameDay(s, day)) return null;
      const [cs, ce] = clampToDay(s, new Date(s.getTime() + 60 * 60000));
      return {
        id: `r-${r.id}`,
        top: (cs.getTime() - dayStart.getTime()) / 60000 * ratio,
        height: Math.max(22, (ce.getTime() - cs.getTime()) / 60000 * ratio),
        title: r.name,
        variant: getReminderTypeColor(r.name) || "bg-violet-500/20 text-violet-100 ring-violet-400/40",
        onClick: () => onSelectItem?.({ type: "reminder", data: r }),
      };
    })
    .filter(Boolean);

  const eBlocks = (events || [])
    .map((e) => {
      const s = eventStartToDate(e);
      if (!s || !isSameDay(s, day)) return null;
      const rawEnd = safeDate(e?.end?.dateTime ?? e?.end?.date) || new Date(s.getTime() + 60 * 60000);
      const [cs, ce] = clampToDay(s, rawEnd);
      return {
        id: `g-${e.id}`,
        top: (cs.getTime() - dayStart.getTime()) / 60000 * ratio,
        height: Math.max(22, (ce.getTime() - cs.getTime()) / 60000 * ratio),
        title: e.summary || e.title || "Event",
        variant: "bg-sky-500/15 text-sky-100 ring-sky-400/30",
        onClick: () => onSelectItem?.({ type: "google", data: e }),
      };
    })
    .filter(Boolean);

  const blocks = [...rBlocks, ...eBlocks];

  return (
    <div className="mt-4 rounded-xl ring-1 ring-white/10 overflow-hidden bg-white/[0.02]">
      <div className="px-3 py-2 text-sm text-slate-200 bg-white/[0.04]">
        {day.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
      </div>

      <div className="grid grid-cols-[80px_1fr]" style={{ height: HOUR_PX * 24 }}>
        {/* hour column */}
        <div className="relative">
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="h-12 border-t border-white/5 text-[11px] text-slate-500 px-2">
              {h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
            </div>
          ))}
        </div>

        {/* events column */}
        <div className="relative border-l border-white/5">
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="absolute left-0 right-0 border-t border-white/[0.06]" style={{ top: h * HOUR_PX }} />
          ))}

          {blocks.map((b) => (
            <button
              key={b.id}
              type="button"
              title={b.title}
              onClick={b.onClick}
              className={`absolute left-1 right-1 rounded-md px-2 py-1 text-xs truncate ring-1 hover:brightness-110 ${b.variant}`}
              style={{ top: b.top, height: b.height }}
            >
              {b.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
