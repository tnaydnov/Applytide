export default function StatsDashboard({ stats = {} }) {
  const items = [
    { key: "total", label: "TOTAL" },
    { key: "upcoming", label: "UPCOMING" },
    { key: "overdue", label: "OVERDUE" },
    { key: "thisWeek", label: "THIS WEEK" },
  ];

  return (
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((it) => (
        <div
          key={it.key}
          className="glass-card p-4 ring-1 ring-white/10"
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">
            {it.label}
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-100">
            {stats[it.key] ?? 0}
          </div>
        </div>
      ))}
    </div>
  );
}
