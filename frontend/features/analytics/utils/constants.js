// ---- Time Range Options ----------------------------------------------------
export const TIME_RANGE_OPTIONS = Object.freeze([
  { value: "1m", label: "Last Month" },
  { value: "3m", label: "Last 3 Months" },
  { value: "6m", label: "Last 6 Months" },
  { value: "1y", label: "Last Year" },
  { value: "all", label: "All Time" },
]);

export const DEFAULT_TIME_RANGE = "6m";

// ---- Metric Categories (tabs) ----------------------------------------------
export const METRIC_CATEGORIES = Object.freeze([
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "applications", label: "Applications", icon: "📝" },
  { id: "interviews", label: "Interviews", icon: "🎯" },
  { id: "companies", label: "Companies", icon: "🏢" },
  { id: "sources", label: "Sources", icon: "🧭" },
  { id: "habits", label: "Habits", icon: "🔥" },        // consistency + timing
  { id: "experiments", label: "Experiments", icon: "🧪" },
  { id: "timeline", label: "Timeline", icon: "⏱️" }
]);

export const DEFAULT_METRIC = "overview";

// ---- Charts ----------------------------------------------------------------
export const CHART_COLORS = Object.freeze({
  categorical: [
    "#3B82F6", // blue-500
    "#10B981", // emerald-500
    "#F59E0B", // amber-500
    "#EF4444", // red-500
    "#8B5CF6", // violet-500
    "#F97316", // orange-500
    "#06B6D4", // cyan-500
    "#A3E635", // lime-400
  ],
  positive: "#10B981",
  negative: "#EF4444",
});

export const KPI_DELTA_LABEL = "vs last period";
