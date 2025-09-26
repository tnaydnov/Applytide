import { cn, deltaPercent, fallback } from "../utils/formatters";

/**
 * Reusable KPI card for the analytics dashboard.
 *
 * Props:
 * - title: string
 * - value: string | number (already formatted or raw)
 * - delta: number | null | undefined (positive/negative % change vs previous period)
 * - icon: ReactNode | string (emoji is fine)
 * - helpText: string (optional small caption under the value)
 * - loading: boolean (optional – renders a skeleton)
 * - className: string (optional extra classes for the outer card)
 * - valueClassName: string (optional extra classes for the value text)
 */
export default function KPICard({
  title,
  value,
  delta,
  change, 
  icon,
  helpText,
  loading = false,
  className,
  valueClassName,
}) {
  const d = deltaPercent(delta ?? change, { digits: 0 });

  if (loading) {
    return (
      <div className={cn("glass-card glass-cyan p-4 overflow-visible", className)}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-3 w-28 rounded bg-slate-700/60" />
            <div className="mt-3 h-7 w-20 rounded bg-slate-600/60" />
            <div className="mt-2 h-3 w-24 rounded bg-slate-700/50" />
          </div>
          <div className="ml-4 h-8 w-8 rounded-lg bg-slate-700/50" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("glass-card glass-cyan p-4 overflow-visible", className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-400">{fallback(title)}</p>

          <div className="mt-1 flex items-baseline gap-2">
            <p className={cn("text-2xl font-bold text-slate-200", valueClassName)}>
              {fallback(value)}
            </p>

            {/* Delta pill */}
            <span
              className={cn(
                "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium border",
                d.sign > 0
                  ? "bg-green-900/20 text-green-400 border-green-700/30"
                  : d.sign < 0
                  ? "bg-red-900/20 text-red-400 border-red-700/30"
                  : "bg-slate-800/40 text-slate-300 border-slate-600/30"
              )}
              title="Change vs last period"
            >
              {d.label}
            </span>
          </div>

          {helpText ? (
            <p className="mt-1 text-xs text-slate-500">{helpText}</p>
          ) : null}
        </div>

        {/* Icon */}
        <div
          className="ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-600/40 bg-slate-800/40 text-slate-300"
          aria-hidden="true"
        >
          <span className="text-lg leading-none">
            {typeof icon === "string" ? icon : icon}
          </span>
        </div>
      </div>
    </div>
  );
}
