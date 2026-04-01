/**
 * DashboardSidebar Component
 * Right sidebar with weekly progress, tools, and motivation
 */

import React from "react";
import { motion } from "motion/react";
import {
  Target,
  Sparkles,
  FileText,
  Bell,
  BarChart3,
} from "lucide-react";

interface DashboardSidebarProps {
  thisWeekApps: number;
  weeklyGoal: number;
  weeklyProgress: number;
  totalApps: number;
  inProgressCount: number;
  responseRate: number;
  onNavigate: (path: string) => void;
  isRTL?: boolean;
}

interface ToolButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  onClick: () => void;
  isRTL?: boolean;
}

function ToolButton({
  icon: Icon,
  label,
  description,
  onClick,
  isRTL = false,
}: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      className="
        w-full flex items-center gap-3 p-3 
        rounded-lg 
        bg-white/50 dark:bg-[#383e4e]/30 
        border border-[#b6bac5]/20 
        hover:border-[#9F5F80]/50 
        hover:bg-white dark:hover:bg-[#383e4e]/50
        transition-all duration-200 
        group text-left
      "
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="p-2 rounded-lg bg-[#9F5F80]/10 group-hover:bg-[#9F5F80]/20 transition-colors">
        <Icon className="h-5 w-5 text-[#9F5F80]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[#383e4e] dark:text-white text-sm">
          {label}
        </p>
        <p className="text-xs text-[#6c757d] dark:text-[#b6bac5] truncate">
          {description}
        </p>
      </div>
    </button>
  );
}

const getMotivationMessage = (
  totalApps: number,
  responseRate: number,
  inProgressCount: number,
  isRTL: boolean,
): string => {
  if (isRTL) {
    if (totalApps === 0)
      return "התחילו את המסע שלכם! כל הצלחה מתחילה בצעד הראשון 🚀";
    if (responseRate > 70)
      return "עבודה מצוינת! אחוז התגובה שלכם מרשים במיוחד 🌟";
    if (inProgressCount > 5)
      return "אתם בדרך הנכונה - תמשיכו בקצב הזה 💪";
    if (totalApps > 20)
      return "מרשים! אתם משקיעים מאמצים רציניים 👏";
    return "אל תעצרו! כל בקשה מקרבת אתכם למטרה 🎯";
  }

  if (totalApps === 0)
    return "Start your journey! Every success begins with a first step 🚀";
  if (responseRate > 70)
    return "Excellent work! Your response rate is impressive 🌟";
  if (inProgressCount > 5)
    return "You're on the right track! Keep it up 💪";
  if (totalApps > 20)
    return "Impressive! You're putting in great effort 👏";
  return "Keep going! Each application brings you closer to your goal 🎯";
};

export function DashboardSidebar({
  thisWeekApps,
  weeklyGoal,
  weeklyProgress,
  totalApps,
  inProgressCount,
  responseRate,
  onNavigate,
  isRTL = false,
}: DashboardSidebarProps) {
  const tools = [
    {
      icon: FileText,
      label: isRTL ? "מסמכים" : "Documents",
      description: isRTL
        ? "ניהול קו״ח ומכתבים נלווים"
        : "Manage resumes & cover letters",
      path: "/documents",
    },
    {
      icon: Bell,
      label: isRTL ? "תזכורות" : "Reminders",
      description: isRTL
        ? "תזכורות למעקב"
        : "Follow-up notifications",
      path: "/reminders",
    },
    {
      icon: BarChart3,
      label: isRTL ? "ניתוח נתונים" : "Analytics",
      description: isRTL
        ? "עקבו אחר הביצועים שלכם"
        : "Track your performance",
      path: "/analytics",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Weekly Progress Card */}
      <motion.div
        initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="
          bg-white dark:bg-[#383e4e]/50 
          border border-[#b6bac5]/20 
          rounded-xl p-6
          hover:border-[#9F5F80]/30
          transition-all duration-200
        "
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 mb-6"
          dir={isRTL ? "rtl" : "ltr"}
        >
          <Target className="h-5 w-5 text-[#9F5F80]" />
          <h3 className="font-bold text-[#383e4e] dark:text-white">
            {isRTL ? "התקדמות שבועית" : "Weekly Progress"}
          </h3>
        </div>

        {/* Big Number */}
        <div className="text-center mb-6">
          <div className="text-5xl font-bold text-[#383e4e] dark:text-white mb-2">
            {thisWeekApps}
            <span className="text-2xl text-[#6c757d] dark:text-[#b6bac5]">
              /{weeklyGoal}
            </span>
          </div>
          <p className="text-sm text-[#6c757d] dark:text-[#b6bac5]">
            {isRTL
              ? "מועמדויות השבוע"
              : "Applications this week"}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#b6bac5]/20 rounded-full h-3 overflow-hidden mb-6">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${weeklyProgress}%` }}
            transition={{
              delay: 0.3,
              duration: 0.8,
              ease: "easeOut",
            }}
            className="
              h-full 
              bg-gradient-to-r from-[#9F5F80] via-[#383e4e] to-[#9F5F80] 
              bg-[length:200%_100%]
              rounded-full
              animate-shimmer
            "
            style={{
              animation: "shimmer 3s ease-in-out infinite",
            }}
          />
        </div>

        {/* Stats */}
        <div
          className="space-y-3 pt-4 border-t border-[#b6bac5]/20"
          dir={isRTL ? "rtl" : "ltr"}
        >
          <div className="flex justify-between text-sm">
            <span className="text-[#6c757d] dark:text-[#b6bac5]">
              {isRTL ? 'סה"כ מועמדויות' : "Total Applications"}
            </span>
            <span className="font-semibold text-[#383e4e] dark:text-white">
              {totalApps}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#6c757d] dark:text-[#b6bac5]">
              {isRTL ? "פעיל" : "Active"}
            </span>
            <span className="font-semibold text-[#383e4e] dark:text-white">
              {inProgressCount}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#6c757d] dark:text-[#b6bac5]">
              {isRTL ? "שיעור תגובה" : "Response Rate"}
            </span>
            <span className="font-semibold text-[#383e4e] dark:text-white">
              {responseRate}%
            </span>
          </div>
        </div>
      </motion.div>

      {/* Smart Tools */}
      <motion.div
        initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="
          bg-white dark:bg-[#383e4e]/50 
          border border-[#b6bac5]/20 
          rounded-xl p-6
        "
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 mb-4"
          dir={isRTL ? "rtl" : "ltr"}
        >
          <Sparkles className="h-5 w-5 text-[#9F5F80]" />
          <h3 className="font-bold text-[#383e4e] dark:text-white">
            {isRTL ? "כלים חכמים" : "Smart Tools"}
          </h3>
        </div>

        {/* Tools List */}
        <div className="space-y-3">
          {tools.map((tool) => (
            <ToolButton
              key={tool.path}
              {...tool}
              onClick={() => onNavigate(tool.path)}
              isRTL={isRTL}
            />
          ))}
        </div>
      </motion.div>

      {/* Motivation Box */}
      <motion.div
        initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="
          bg-gradient-to-br from-[#9F5F80]/10 to-[#383e4e]/10
          border border-[#9F5F80]/30
          rounded-xl p-6
        "
      >
        <div
          className="flex items-start gap-3"
          dir={isRTL ? "rtl" : "ltr"}
        >
          <div className="p-2 rounded-lg bg-[#9F5F80]/20 border border-[#9F5F80]/30">
            <Sparkles className="h-5 w-5 text-[#9F5F80]" />
          </div>
          <div>
            <h4 className="font-semibold text-[#383e4e] dark:text-white mb-1">
              {isRTL ? "המשיכו!" : "Keep Going!"}
            </h4>
            <p className="text-sm text-[#6c757d] dark:text-[#b6bac5] leading-relaxed">
              {getMotivationMessage(
                totalApps,
                responseRate,
                inProgressCount,
                isRTL,
              )}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default DashboardSidebar;