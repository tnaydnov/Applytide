import { METRIC_CATEGORIES } from "../utils/constants";
import { cn } from "../utils/formatters";
import { PremiumBadge } from "../../../components/PremiumFeature";

/**
 * Small local icon renderer that mirrors the original inline-SVG look
 * while accepting plain emoji fallback for unknown icons.
 */
const renderIcon = (iconType) => {
  switch (iconType) {
    case "📊":
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case "📝":
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      );
    case "🎯":
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case "🏢":
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      );
    case "⏱️":
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "✅":
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M5 13l4 4L19 7" />
        </svg>
      );
    default:
      return <span className="text-sm">{iconType}</span>;
  }
};

/**
 * CategoryTabs
 * Props:
 * - selected: string (active category id)
 * - onSelect: (id: string) => void
 * - categories: array of { id, label, icon } (optional; defaults to metricCategories)
 * - className: string (optional)
 * - isPremium: boolean (optional; for premium feature gating)
 * - onPremiumRequired: (feature: string) => void (optional; callback when premium is required)
 */
export default function CategoryTabs({
  selected,
  onSelect,
  categories = METRIC_CATEGORIES,
  className,
  isPremium = false,
  onPremiumRequired,
}) {
  return (
    <div className={cn("mb-8 -mx-4 sm:mx-0", className)}>
      <div
        role="tablist"
        aria-label="Analytics categories"
        className="flex gap-2 overflow-x-auto no-scrollbar px-4 sm:px-0 whitespace-nowrap snap-x"
      >
        {categories.map((cat) => {
          const active = selected === cat.id;
          const isPremiumFeature = cat.id === "companies";
          const isLocked = isPremiumFeature && !isPremium;
          
          return (
            <button
              key={cat.id}
              role="tab"
              aria-selected={active}
              aria-controls={`panel-${cat.id}`}
              onClick={() => {
                if (isLocked) {
                  onPremiumRequired?.("Company Analysis");
                } else {
                  onSelect?.(cat.id);
                }
              }}
              className={cn(
                "flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors border backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/60",
                active
                  ? "bg-indigo-900/50 text-indigo-300 border-indigo-500/50"
                  : "bg-slate-800/30 text-slate-300 border-slate-600 hover:bg-slate-700/50",
                isLocked && "opacity-75"
              )}
            >
              <span className="mr-2 inline-flex items-center justify-center">
                {renderIcon(cat.icon)}
              </span>
              {cat.label}
              {isPremiumFeature && (
                <span className="ml-2">
                  <PremiumBadge size="xs" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
