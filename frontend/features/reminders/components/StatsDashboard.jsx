export default function StatsDashboard({
  stats = { total: 0, upcoming: 0, overdue: 0, thisWeek: 0 },
}) {
  const items = [
    { label: "Total", value: stats.total },
    { label: "Upcoming", value: stats.upcoming },
    { label: "Overdue", value: stats.overdue },
    { label: "This week", value: stats.thisWeek },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
      {items.map((it) => (
        <div key={it.label} className="rounded-lg border bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">{it.label}</div>
          <div className="text-2xl font-semibold text-gray-900">{it.value}</div>
        </div>
      ))}
    </div>
  );
}
