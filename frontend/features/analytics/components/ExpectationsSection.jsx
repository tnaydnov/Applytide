import KPICard from "./KPICard";

/**
 * ExpectationsSection
 * Time-to-event medians; shows realistic wait windows to set expectations.
 *
 * Expects analytics.expectations:
 * - medians: { response: number, interview: number, decision: number } // days
 * - p75: { response: number, interview: number, decision: number } // optional
 */
export default function ExpectationsSection({ analytics }) {
  const ex = analytics?.expectations || {};
  const med = ex?.medians || {};
  const p75 = ex?.p75 || {};

  if (!med?.response && !med?.interview && !med?.decision) return null;

  const cards = [
    { title: "Median to First Response", value: `${med.response ?? "—"} days`, change: 0, icon: "📨" },
    { title: "Median to Interview", value: `${med.interview ?? "—"} days`, change: 0, icon: "🎯" },
    { title: "Median to Decision", value: `${med.decision ?? "—"} days`, change: 0, icon: "✅" },
  ];

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((c, i) => (
          <KPICard key={i} title={c.title} value={c.value} icon={c.icon} />
        ))}
      </div>
      {p75?.response || p75?.interview || p75?.decision ? (
        <p className="text-xs text-slate-500">
          75th percentile wait: response {p75.response ?? "—"}d · interview {p75.interview ?? "—"}d · decision {p75.decision ?? "—"}d.
          Use the 75th to pick smart follow-up times.
        </p>
      ) : null}
    </section>
  );
}
