/**
 * MetricsGrid Component
 * Displays 4 key metrics: This Week, Active Pipeline, Response Rate, Offers
 */

import React from "react";
import { motion } from "motion/react";
import {
  Target,
  Briefcase,
  TrendingUp,
  Award,
} from "lucide-react";

interface MetricsGridProps {
  thisWeekApps: number;
  weeklyGoal: number;
  weeklyProgress: number;
  inProgressCount: number;
  responseRate: number;
  offerCount: number;
  isRTL?: boolean;
}

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string | number;
  subtitle?: string;
  progress?: number;
  isRTL?: boolean;
  delay?: number;
}

function MetricCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  subtitle,
  progress,
  isRTL = false,
  delay = 0,
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="
        bg-white dark:bg-[#383e4e]/50 
        border border-[#b6bac5]/20 
        rounded-xl p-6 
        hover:border-[#9F5F80]/50 
        hover:shadow-lg
        transition-all duration-200
        group
      "
    >
      {/* Top Row: Icon + Value */}
      <div
        className="flex items-center justify-between mb-4"
        dir={isRTL ? "rtl" : "ltr"}
      >
        {/* Icon */}
        <div
          className={`p-3 rounded-lg ${iconBg} border ${iconColor.replace("text-", "border-")}/30`}
        >
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>

        {/* Value */}
        <span className="text-3xl font-bold text-[#383e4e] dark:text-white">
          {value}
        </span>
      </div>

      {/* Label */}
      <h3 className="text-[#6c757d] dark:text-[#b6bac5] text-sm font-medium mb-3">
        {label}
      </h3>

      {/* Progress Bar (if applicable) */}
      {progress !== undefined && (
        <div className="space-y-2">
          <div className="w-full bg-[#b6bac5]/20 rounded-full h-2 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{
                delay: delay + 0.3,
                duration: 0.8,
                ease: "easeOut",
              }}
              className="h-full bg-gradient-to-r from-[#9F5F80] to-[#383e4e] rounded-full"
            />
          </div>
          {subtitle && (
            <p className="text-xs text-[#6c757d] dark:text-[#b6bac5]">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Subtitle (without progress) */}
      {progress === undefined && subtitle && (
        <p className="text-xs text-[#6c757d] dark:text-[#b6bac5]">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}

export function MetricsGrid({
  thisWeekApps,
  weeklyGoal,
  weeklyProgress,
  inProgressCount,
  responseRate,
  offerCount,
  isRTL = false,
}: MetricsGridProps) {
  const metrics = [
    {
      icon: Target,
      iconBg:
        "bg-gradient-to-br from-blue-500/20 to-cyan-500/20",
      iconColor: "text-blue-400",
      label: isRTL ? "השבוע" : "This Week",
      value: `${thisWeekApps}/${weeklyGoal}`,
      progress: weeklyProgress,
      subtitle:
        thisWeekApps >= weeklyGoal
          ? isRTL
            ? "🎉 יעד הושג!"
            : "🎉 Goal reached!"
          : isRTL
            ? `עוד ${weeklyGoal - thisWeekApps} ליעד`
            : `${weeklyGoal - thisWeekApps} more to goal`,
    },
    {
      icon: Briefcase,
      iconBg:
        "bg-gradient-to-br from-purple-500/20 to-pink-500/20",
      iconColor: "text-purple-400",
      label: isRTL ? "מועמדויות פעילות" : "Active Pipeline",
      value: inProgressCount,
      subtitle: isRTL
        ? "מועמדויות בתהליך"
        : "Applications in progress",
    },
    {
      icon: TrendingUp,
      iconBg:
        "bg-gradient-to-br from-emerald-500/20 to-green-500/20",
      iconColor: "text-emerald-400",
      label: isRTL ? "שיעור תגובה" : "Response Rate",
      value: `${responseRate}%`,
      subtitle: isRTL ? "חברות מגיבות" : "Companies responding",
    },
    {
      icon: Award,
      iconBg:
        "bg-gradient-to-br from-amber-500/20 to-orange-500/20",
      iconColor: "text-amber-400",
      label: isRTL ? "הצעות" : "Offers",
      value: offerCount,
      subtitle: isRTL
        ? "הצעות עבודה שהתקבלו"
        : "Job offers received",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metrics.map((metric, idx) => (
        <MetricCard
          key={metric.label}
          {...metric}
          isRTL={isRTL}
          delay={idx * 0.1}
        />
      ))}
    </div>
  );
}

export default MetricsGrid;