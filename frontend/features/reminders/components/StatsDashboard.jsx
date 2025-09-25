/**
 * The four stat cards row: TOTAL, UPCOMING, OVERDUE, THIS WEEK
 * Props: { stats: { total, upcoming, overdue, thisWeek } }
 */
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
          className="rounded-md bg-white p-4 shadow ring-1 ring-black/5"
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            {it.label}
          </div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">
            {stats[it.key] ?? 0}
          </div>
        </div>
      ))}
    </div>
  );
}
