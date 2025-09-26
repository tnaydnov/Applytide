/**
 * Small, framework-agnostic formatting helpers used across the analytics UI.
 * These functions are resilient to null/undefined/NaN values and return
 * sensible fallbacks so components can stay clean.
 */

// --------------------------- Guards & Helpers -------------------------------

const isNil = (v) => v === null || v === undefined || Number.isNaN(v);

// Avoid printing "-0"
const cleanZero = (n) => (Object.is(n, -0) ? 0 : n);

// Simple classnames combiner
export const cn = (...parts) =>
  parts
    .flat()
    .filter(Boolean)
    .join(" ");

// ------------------------------ Numbers -------------------------------------

/**
 * Format a plain number with grouping.
 */
export function formatNumber(value, { minimumFractionDigits = 0, maximumFractionDigits = 0, locale = "en-US" } = {}) {
  if (isNil(value)) return "—";
  try {
    return new Intl.NumberFormat(locale, { minimumFractionDigits, maximumFractionDigits }).format(cleanZero(Number(value)));
  } catch {
    return String(value);
  }
}

/**
 * Format a percentage (expects 0-100 by default).
 * Set `assumeFraction: true` if your input is 0..1 and should be multiplied by 100.
 */
export function formatPercent(
  value,
  { digits = 0, assumeFraction = false, locale = "en-US" } = {}
) {
  if (isNil(value)) return "—";
  const n = Number(value);
  const pct = assumeFraction ? n * 100 : n;
  try {
    return `${new Intl.NumberFormat(locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(cleanZero(pct))}%`;
  } catch {
    return `${cleanZero(pct)}%`;
  }
}

/**
 * Format a change delta in percent with arrow and sign metadata.
 * Returns an object so callers can choose what to show.
 *
 * Example:
 *   const d = deltaPercent(-3.2)
 *   d.arrow => "↘"
 *   d.className => "text-red-400"
 *   d.label => "↘ 3.2%"
 */
export function deltaPercent(value, { digits = 0, locale = "en-US" } = {}) {
  if (isNil(value)) {
    return {
      sign: 0,
      arrow: "→",
      className: "text-slate-400",
      abs: 0,
      label: "—",
      raw: value,
    };
  }

  const n = Number(value);
  const sign = n === 0 ? 0 : n > 0 ? 1 : -1;
  const arrow = sign > 0 ? "↗" : sign < 0 ? "↘" : "→";
  const className = sign > 0 ? "text-green-400" : sign < 0 ? "text-red-400" : "text-slate-400";
  const abs = Math.abs(n);
  const absText = formatPercent(abs, { digits, locale });
  return {
    sign,
    arrow,
    className,
    abs,
    label: `${arrow} ${absText}`,
    raw: n,
  };
}

/**
 * Format currency with Intl API.
 */
export function formatCurrency(
  value,
  { currency = "USD", minimumFractionDigits = 0, maximumFractionDigits = 0, compact = false, locale = "en-US" } = {}
) {
  if (isNil(value)) return "—";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: compact ? "compact" : "standard",
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(cleanZero(Number(value)));
  } catch {
    const n = Number(value).toFixed(Math.max(minimumFractionDigits, 0));
    return `${currency} ${n}`;
  }
}

/**
 * Format "X days" (or "—")
 */
export function formatDays(value) {
  if (isNil(value)) return "—";
  const n = Math.round(Number(value));
  return `${n} day${Math.abs(n) === 1 ? "" : "s"}`;
}

// ------------------------------- Dates --------------------------------------

export function formatDate(value, { locale = "en-US", options } = {}) {
  if (isNil(value)) return "—";
  try {
    const d = value instanceof Date ? value : new Date(value);
    return d.toLocaleDateString(
      locale,
      options || { year: "numeric", month: "long", day: "numeric" }
    );
  } catch {
    return String(value);
  }
}

// ------------------------------ Data utils ----------------------------------

/**
 * Ensure a bar-like dataset is normalized to { label, value } objects.
 */
export function normalizeBarData(data, { labelKey = "label", valueKey = "value" } = {}) {
  if (!Array.isArray(data)) return [];
  return data
    .map((d) => {
      if (typeof d === "number") return { label: String(d), value: d };
      if (typeof d === "string") return { label: d, value: 0 };
      if (d && typeof d === "object") {
        return { label: String(d[labelKey] ?? d.name ?? ""), value: Number(d[valueKey] ?? d.value ?? 0) };
      }
      return null;
    })
    .filter(Boolean);
}

export function sumBy(arr, key = "value") {
  if (!Array.isArray(arr)) return 0;
  return arr.reduce((acc, item) => acc + Number(item?.[key] ?? 0), 0);
}

export function percent(part, total, { digits = 0 } = {}) {
  if (isNil(part) || isNil(total) || total === 0) return 0;
  const n = (Number(part) / Number(total)) * 100;
  const f = Number.isFinite(n) ? n : 0;
  const p = Math.max(0, Math.min(100, f));
  return Number(p.toFixed(digits));
}

/**
 * Safe array: ensures you always get an array.
 */
export function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

// --------------------------- Presentation bits ------------------------------

/**
 * Background/text helpers for "glass" KPI deltas.
 */
export function deltaClasses(value) {
  const meta = deltaPercent(value);
  return {
    text: meta.className,
    bg:
      meta.sign > 0
        ? "bg-green-900/20 border-green-700/30"
        : meta.sign < 0
        ? "bg-red-900/20 border-red-700/30"
        : "bg-slate-800/40 border-slate-600/30",
  };
}

/**
 * Human-friendly fallback for arbitrary unknown values.
 */
export function fallback(value, alt = "—") {
  return isNil(value) || value === "" ? alt : value;
}

export default {
  cn,
  formatNumber,
  formatPercent,
  deltaPercent,
  formatCurrency,
  formatDays,
  formatDate,
  normalizeBarData,
  sumBy,
  percent,
  safeArray,
  deltaClasses,
  fallback,
};
