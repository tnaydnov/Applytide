/* ------------------------------ Utilities ------------------------------ */

const palette = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
  "#8B5CF6", "#F97316", "#22D3EE", "#84CC16",
];

const toArray = (d) => (Array.isArray(d) ? d : []);
const clamp01 = (n) => (isFinite(n) ? Math.max(0, Math.min(1, n)) : 0);
const safeNumber = (n) => (isFinite(Number(n)) ? Number(n) : 0);
const sum = (v) => v.reduce((a, x) => a + safeNumber(x), 0);
const max = (v) => Math.max(1, ...v.map(safeNumber)); // avoid /0

/** Build a single conic-gradient for pie/donut accuracy & perf */
function buildConicGradient(data) {
  const items = toArray(data);
  const total = Math.max(1, sum(items.map((d) => Math.max(0, safeNumber(d.value)))));
  let current = 0;
  const segments = items.map((d, i) => {
    const angle = (Math.max(0, safeNumber(d.value)) / total) * 360;
    const from = current;
    const to = current + angle;
    current = to;
    return `${palette[i % palette.length]} ${from}deg ${to}deg`;
  });
  if (segments.length === 0) segments.push(`#334155 0deg 360deg`); // slate-700
  return `conic-gradient(${segments.join(", ")})`;
}

/* ------------------------------ Components ------------------------------ */

export function BarChart({ data, height = 400, className = "", barWidth, rotateLabelsOnMobile = true }) {
  const items = toArray(data);
  const values = items.map((d) => Math.max(0, safeNumber(d.value)));
  const m = max(values);

  if (items.length === 0 || sum(values) === 0) {
    return (
      <div className={`w-full flex items-center justify-center rounded-lg ${className}`} style={{ height }} role="img" aria-label="Bar chart with no data">
        <div className="text-center text-slate-400">
          <div className="text-3xl mb-2">📊</div>
          <div>No data</div>
        </div>
      </div>
    );
  }

  // Adaptive bar width (narrower as categories increase)
  const bw = barWidth ?? (items.length > 36 ? 12 : items.length > 28 ? 16 : items.length > 18 ? 20 : 28);

  return (
    <div className={`w-full min-w-0 ${className}`} style={{ height }} role="img" aria-label="Bar chart">
      {/* horizontal scroll if needed */}
      <div className="h-full overflow-x-auto overscroll-x-contain no-scrollbar">
        <div className="flex items-end h-full gap-2 sm:gap-3 p-3 sm:p-4 w-max min-w-full">
          {items.map((item, index) => {
            const ratio = clamp01(values[index] / m);
            const barH = Math.max(2, Math.floor(ratio * (height - 64))); // leave room for labels

            return (
              <div key={index} className="flex flex-col items-center" style={{ width: bw }}>
                <div
                  className="rounded-t w-full"
                  style={{ height: `${barH}px`, backgroundColor: palette[index % palette.length] }}
                  title={`${item.label ?? ""}: ${values[index]}`}
                />
                {/* label */}
                <span
                  className={[
                    "mt-1 sm:mt-2 leading-tight text-[9px] sm:text-xs text-slate-400 truncate",
                    rotateLabelsOnMobile ? "-rotate-45 origin-top-right sm:rotate-0" : "",
                  ].join(" ")}
                  title={item.label}
                  style={{ maxWidth: bw * 2 }}
                >
                  {item.label}
                </span>
                {/* value (hide on mobile to reduce crowding) */}
                <span className="hidden sm:block text-[11px] text-slate-500">{values[index]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function LineChart({ data, height = 400, className = "" }) {
  const count = toArray(data).length;
  return (
    <div className={`w-full rounded-lg flex items-center justify-center ${className}`} style={{ height }} role="img" aria-label="Line chart (placeholder)">
      <div className="text-center text-slate-400">
        <div className="text-4xl mb-2">📈</div>
        <div>Line Chart</div>
        <div className="text-sm">{count} data point{count === 1 ? "" : "s"}</div>
      </div>
    </div>
  );
}

export function PieChart({ data, height = 400, className = "" }) {
  const items = toArray(data);
  const total = Math.max(1, sum(items.map((d) => Math.max(0, safeNumber(d.value)))));

  return (
    <div className={`w-full ${className}`} style={{ height }} role="img" aria-label="Pie chart">
      <div className="flex items-center justify-center h-full gap-4 sm:gap-6 p-3 sm:p-4">
        <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full border border-slate-700" style={{ background: buildConicGradient(items) }} />
        <div className="grid grid-cols-2 sm:block gap-x-4 gap-y-1.5">
          {items.length === 0 ? (
            <div className="text-slate-400 col-span-2">No data</div>
          ) : (
            items.map((item, index) => {
              const value = Math.max(0, safeNumber(item.value));
              return (
                <div key={index} className="flex items-center gap-2 text-xs sm:text-sm">
                  <span className="w-3.5 h-3.5 rounded" style={{ backgroundColor: palette[index % palette.length] }} />
                  <span className="text-slate-300 truncate">{item.label}</span>
                  <span className="ml-auto text-slate-500">{value} ({Math.round((value / total) * 100)}%)</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export function DonutChart({ data, height = 400, className = "" }) {
  const items = toArray(data);
  const total = Math.max(1, sum(items.map((d) => Math.max(0, safeNumber(d.value)))));

  return (
    <div className={`w-full ${className}`} style={{ height }} role="img" aria-label="Donut chart">
      <div className="flex items-center justify-center h-full gap-4 sm:gap-6 p-3 sm:p-4">
        <div className="relative">
          <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full border border-slate-700" style={{ background: buildConicGradient(items) }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
              <div className="text-center">
                <div className="text-lg sm:text-xl font-semibold text-slate-200">{total}</div>
                <div className="text-[10px] sm:text-xs text-slate-400">Total</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:block gap-x-4 gap-y-1.5">
          {items.length === 0 ? (
            <div className="text-slate-400 col-span-2">No data</div>
          ) : (
            items.map((item, index) => {
              const value = Math.max(0, safeNumber(item.value));
              return (
                <div key={index} className="flex items-center gap-2 text-xs sm:text-sm">
                  <span className="w-3.5 h-3.5 rounded" style={{ backgroundColor: palette[index % palette.length] }} />
                  <span className="text-slate-300 truncate">{item.label}</span>
                  <span className="ml-auto text-slate-500">{value} ({Math.round((value / total) * 100)}%)</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export function AreaChart({ data, height = 400, className = "" }) {
  const count = toArray(data).length;
  return (
    <div className={`w-full rounded-lg flex items-center justify-center ${className}`} style={{ height }} role="img" aria-label="Area chart (placeholder)">
      <div className="text-center text-slate-400">
        <div className="text-4xl mb-2">📉</div>
        <div>Area Chart</div>
        <div className="text-sm">{count} data point{count === 1 ? "" : "s"}</div>
      </div>
    </div>
  );
}

export default { BarChart, LineChart, PieChart, DonutChart, AreaChart };
