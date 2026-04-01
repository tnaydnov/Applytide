/**
 * QuickActionsGrid Component
 * Displays 4 quick action cards for common tasks
 */

import React from "react";
import { motion } from "motion/react";
import {
  Zap,
  Briefcase,
  FileText,
  Bell,
  BarChart3,
} from "lucide-react";

interface QuickActionsGridProps {
  onNavigate: (path: string) => void;
  isRTL?: boolean;
}

interface ActionCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  description: string;
  gradientFrom: string;
  gradientTo: string;
  borderColor: string;
  onClick: () => void;
  isRTL?: boolean;
  delay?: number;
}

function ActionCard({
  icon: Icon,
  title,
  subtitle,
  description,
  gradientFrom,
  gradientTo,
  borderColor,
  onClick,
  isRTL = false,
  delay = 0,
}: ActionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      role="button"
      tabIndex={0}
      className={`
        bg-gradient-to-br ${gradientFrom} ${gradientTo}
        backdrop-blur-sm border ${borderColor}
        rounded-xl p-6
        cursor-pointer group
        hover:scale-[1.03]
        transition-all duration-200
        hover:shadow-xl
      `}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Icon */}
      <Icon className="h-10 w-10 text-white mb-4 group-hover:scale-110 transition-transform duration-200" />

      {/* Title */}
      <h3 className="text-white font-bold text-lg mb-1">
        {title}
      </h3>

      {/* Subtitle */}
      <p className="text-white/80 text-xs mb-2 font-medium">
        {subtitle}
      </p>

      {/* Description */}
      <p className="text-white/90 text-sm leading-relaxed">
        {description}
      </p>
    </motion.div>
  );
}

export function QuickActionsGrid({
  onNavigate,
  isRTL = false,
}: QuickActionsGridProps) {
  const actions = [
    {
      icon: Briefcase,
      title: isRTL ? "עקבו אחר משרות" : "Track Your Jobs",
      subtitle: isRTL
        ? "ארגנו משרות שמורות"
        : "Organize saved jobs",
      description: isRTL
        ? "נהלו ועקבו אחר הזדמנויות עבודה"
        : "Manage and track job opportunities",
      gradientFrom: "from-blue-500/80",
      gradientTo: "to-cyan-500/80",
      borderColor: "border-blue-500/30",
      path: "/job-search",
    },
    {
      icon: FileText,
      title: isRTL ? "צרו מכתב נלווה" : "Generate Cover Letter",
      subtitle: isRTL
        ? "כתיבה מבוססת AI"
        : "AI-powered writing",
      description: isRTL
        ? "צרו מכתבים נלווים מותאמים"
        : "Create tailored cover letters",
      gradientFrom: "from-purple-500/80",
      gradientTo: "to-pink-500/80",
      borderColor: "border-purple-500/30",
      path: "/documents",
    },
    {
      icon: Bell,
      title: isRTL ? "מעקבים חכמים" : "Smart Follow-ups",
      subtitle: isRTL
        ? "אל תפספסו דדליין"
        : "Never miss a deadline",
      description: isRTL
        ? "הגדירו תזכורות חכמות"
        : "Set intelligent reminders",
      gradientFrom: "from-emerald-500/80",
      gradientTo: "to-green-500/80",
      borderColor: "border-emerald-500/30",
      path: "/reminders",
    },
    {
      icon: BarChart3,
      title: isRTL ? "תובנות ביצועים" : "Performance Insights",
      subtitle: isRTL
        ? "עקבו אחר התקדמות"
        : "Track your progress",
      description: isRTL
        ? "ניתוח נתונים מפורט ומגמות"
        : "Detailed analytics & trends",
      gradientFrom: "from-amber-500/80",
      gradientTo: "to-orange-500/80",
      borderColor: "border-amber-500/30",
      path: "/analytics",
    },
  ];

  return (
    <div className="mb-8" data-tutorial="quick-actions">
      {/* Header */}
      <div
        className="flex items-center gap-2 mb-6"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <Zap className="h-6 w-6 text-[#9F5F80]" />
        <h2 className="text-xl font-bold text-[#383e4e] dark:text-white">
          {isRTL ? "פעולות מהירות" : "Quick Actions"}
        </h2>
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {actions.map((action, idx) => (
          <ActionCard
            key={action.path}
            {...action}
            onClick={() => onNavigate(action.path)}
            isRTL={isRTL}
            delay={idx * 0.1}
          />
        ))}
      </div>
    </div>
  );
}

export default QuickActionsGrid;