/**
 * CategoryTabs Component
 * Navigation tabs for analytics categories
 */

import { motion } from "motion/react";
import {
  BarChart3,
  FileText,
  Building2,
  Clock,
  Sun,
  Globe,
  Users,
} from "lucide-react";
import type { AnalyticsCategory } from "../AnalyticsPage";

interface CategoryTabsProps {
  activeCategory: AnalyticsCategory;
  onChange: (category: AnalyticsCategory) => void;
  isRTL?: boolean;
}

const categories = [
  {
    id: "overview" as AnalyticsCategory,
    label: { en: "Overview", he: "סקירה" },
    icon: BarChart3,
  },
  {
    id: "applications" as AnalyticsCategory,
    label: { en: "Applications", he: "מועמדויות" },
    icon: FileText,
  },
  {
    id: "companies" as AnalyticsCategory,
    label: { en: "Companies", he: "חברות" },
    icon: Building2,
  },
  {
    id: "timeline" as AnalyticsCategory,
    label: { en: "Timeline", he: "ציר זמן" },
    icon: Clock,
  },
  {
    id: "best-time" as AnalyticsCategory,
    label: { en: "Best Time", he: "זמן מיטבי" },
    icon: Sun,
  },
  {
    id: "sources" as AnalyticsCategory,
    label: { en: "Sources", he: "מקורות" },
    icon: Globe,
  },
  {
    id: "interviews" as AnalyticsCategory,
    label: { en: "Interviews", he: "ראיונות" },
    icon: Users,
  },
];

export function CategoryTabs({
  activeCategory,
  onChange,
  isRTL = false,
}: CategoryTabsProps) {
  return (
    <div
      className="mb-4 sm:mb-6 lg:mb-8 overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="flex gap-1.5 sm:gap-2 min-w-max pb-2">
        {categories.map((category) => {
          const Icon = category.icon;
          const isActive = activeCategory === category.id;

          return (
            <button
              key={category.id}
              onClick={() => onChange(category.id)}
              className={`
                relative px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 lg:py-2.5 rounded-lg font-medium transition-colors duration-200
                flex items-center gap-1.5 sm:gap-2 whitespace-nowrap text-xs sm:text-sm
                ${
                  isActive
                    ? "text-white"
                    : "text-[#6c757d] dark:text-[#b6bac5] hover:text-[#383e4e] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#383e4e]/50"
                }
              `}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-gradient-to-r from-[#9F5F80] to-[#383e4e] rounded-lg"
                  transition={{
                    type: "spring",
                    bounce: 0.15,
                    duration: 0.5,
                  }}
                  style={{ willChange: "transform" }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="hidden lg:inline">
                  {category.label[isRTL ? "he" : "en"]}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default CategoryTabs;