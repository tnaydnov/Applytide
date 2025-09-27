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

export function BarChart({ data, height = 400, className = "", barWidth }) {
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

  // Constant horizontal padding so every chart "starts" at the same x.
  const PAD_X = 16;            // 16px left/right
  
  // Calculate longest label to determine needed space
  const longestLabel = items.reduce((longest, item) => {
    const label = String(item.label ?? "");
    return label.length > longest.length ? label : longest;
  }, "");

  // Much more generous bar widths - prioritize readability over fitting everything
  const bw = barWidth ?? 60; // Fixed wider width - let it scroll if needed

  // No rotation - we have enough space now
  const shouldRotate = false;
  
  // More space for multi-line text
  const maxLabelChars = Math.max(...items.map(item => String(item.label ?? "").length));
  const estimatedLines = Math.max(...items.map(item => {
    const label = String(item.label ?? "");
    // Estimate how many lines this label will need (assuming ~8 chars per line)
    return Math.ceil(label.length / 8);
  }));
  const GUTTER_BOTTOM = Math.max(60, estimatedLines * 16 + 40); // 16px per line + padding

  // Height available for columns (minus the bottom gutter)
  const innerHeight = Math.max(2, height - GUTTER_BOTTOM);

  return (
    <div className={`relative w-full min-w-0 ${className}`} style={{ height }} role="img" aria-label="Bar chart">
      {/* Scroll only horizontally when needed; bottom gutter is fixed so labels never clip */}
      <div
        className="absolute inset-0"
        style={{ left: PAD_X, right: PAD_X }}
      >
        <div className="h-full overflow-x-auto overflow-y-hidden">
          <div className="flex items-end gap-4 sm:gap-6 w-max min-w-full" style={{ height: `${height - PAD_X}px` }}>
            {items.map((item, index) => {
              const ratio = clamp01(values[index] / m);
              const barH = Math.max(4, Math.floor(ratio * innerHeight)); // Ensure minimum visible height
              const labelText = String(item.label ?? "");
              
              // Smart text wrapping - preserve whole words, only break if absolutely necessary
              const smartWrap = (text, maxWidth) => {
                const words = text.split(/\s+/);
                if (words.length === 1) {
                  // Single word - check if it fits, if not break intelligently
                  if (text.length <= 10) {
                    return [text];
                  }
                  // For very long single words, break at natural points
                  const breakPoints = text.match(/.{1,10}/g) || [text];
                  return breakPoints;
                }
                // Multiple words - try to fit 2 words per line if possible
                const lines = [];
                for (let i = 0; i < words.length; i += 2) {
                  if (i + 1 < words.length) {
                    const twoWords = words[i] + ' ' + words[i + 1];
                    if (twoWords.length <= 12) {
                      lines.push(twoWords);
                    } else {
                      lines.push(words[i]);
                      lines.push(words[i + 1]);
                    }
                  } else {
                    lines.push(words[i]);
                  }
                }
                return lines;
              };

              const textLines = smartWrap(labelText, bw);

              // Calculate available space for bars (total height minus labels area)
              const labelsHeight = GUTTER_BOTTOM - 8; // Leave some margin
              const availableBarHeight = height - labelsHeight - 20; // 20px for padding
              const maxBarHeight = Math.max(20, availableBarHeight); // Minimum space for bars
              
              // Recalculate bar height to fit within available space
              const constrainedBarH = Math.max(4, Math.min(barH, maxBarHeight));

              return (
                <div key={index} className="flex flex-col items-center justify-end" style={{ width: bw, minWidth: bw, height: `${height - 16}px` }}>
                  
                  {/* The actual bar - positioned at bottom */}
                  <div
                    className="rounded-t w-full"
                    style={{
                      height: constrainedBarH,
                      backgroundColor: palette[index % palette.length],
                      minHeight: '4px', // Ensure it's always visible
                      marginBottom: '8px'
                    }}
                    title={`${item.label ?? ""}: ${values[index]}`}
                  />
                  
                  {/* Fixed baseline area for labels and values */}
                  <div className="flex flex-col items-center" style={{ width: bw, height: labelsHeight }}>
                    <div
                      className="text-[10px] sm:text-xs text-slate-400 select-none text-center leading-tight flex-1 flex flex-col justify-center"
                      title={labelText}
                      style={{ 
                        width: bw - 4, // Slight padding from edges
                      }}
                    >
                      {textLines.map((line, i) => (
                        <div key={i} className="text-center">
                          {line}
                        </div>
                      ))}
                    </div>
                    <span className="text-[9px] sm:text-[10px] text-slate-500 mt-1">
                      {values[index]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
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
    <div className={`w-full ${className}`} style={{ minHeight: height }} role="img" aria-label="Pie chart">
      <div className="flex flex-col sm:flex-row items-center justify-center h-full gap-4 sm:gap-6 p-3 sm:p-4">
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
    <div className={`w-full ${className}`} style={{ minHeight: height }} role="img" aria-label="Donut chart">
      <div className="flex flex-col sm:flex-row items-center justify-center h-full gap-4 sm:gap-6 p-3 sm:p-4">
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
