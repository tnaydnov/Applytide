export default function StatsDashboard({ stats = {} }) {
  const items = [
    { key: "total",     label: "TOTAL",      tone: "slate",  emoji: "📦" },
    { key: "upcoming",  label: "UPCOMING",   tone: "violet", emoji: "⏱️" },
    { key: "overdue",   label: "OVERDUE",    tone: "rose",   emoji: "⚠️" },
    { key: "thisWeek",  label: "THIS WEEK",  tone: "sky",    emoji: "📅" },
  ];

  const toneCls = {
    slate:  "bg-white/[0.04] ring-1 ring-white/10 hover:bg-white/[0.06]",
    violet: "bg-violet-500/10 ring-1 ring-violet-400/30 hover:bg-violet-500/15",
    rose:   "bg-rose-500/10 ring-1 ring-rose-400/30 hover:bg-rose-500/15",
    sky:    "bg-sky-500/10 ring-1 ring-sky-400/30 hover:bg-sky-500/15",
  };

  return (
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((it) => (
        <div
          key={it.key}
          className={`rounded-xl p-4 transition ${toneCls[it.tone]}`}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-300/80 flex items-center gap-1">
            <span>{it.emoji}</span>{it.label}
          </div>
          <div className="mt-1 text-3xl font-bold text-slate-100">
            {stats[it.key] ?? 0}
          </div>
          {/* Tiny helper for orientation */}
          {it.key === "upcoming" && (
            <div className="mt-1 text-xs text-slate-300/80">
              Upcoming = reminders in the future
            </div>
          )}
          {it.key === "overdue" && (
            <div className="mt-1 text-xs text-slate-300/80">
              Overdue = past due date
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
