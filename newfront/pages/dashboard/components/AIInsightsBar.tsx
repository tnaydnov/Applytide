/**
 * AIInsightsBar Component
 * Displays AI-generated insights with color-coded types
 */

import { motion } from 'motion/react';
import { Sparkles, ArrowRight, AlertCircle, CheckCircle2, Lightbulb } from 'lucide-react';
import type { AIInsight } from '../../../features/dashboard/api';

interface AIInsightsBarProps {
  insights: AIInsight[];
  onNavigate: (path: string) => void;
  isRTL?: boolean;
}

const getInsightStyle = (type: AIInsight['type']) => {
  switch (type) {
    case 'warning':
      return {
        bg: 'bg-gradient-to-br from-amber-500/10 to-orange-500/10',
        border: 'border-amber-500/30',
        icon: 'text-amber-400',
        IconComponent: AlertCircle,
      };
    case 'success':
      return {
        bg: 'bg-gradient-to-br from-emerald-500/10 to-green-500/10',
        border: 'border-emerald-500/30',
        icon: 'text-emerald-400',
        IconComponent: CheckCircle2,
      };
    case 'tip':
      return {
        bg: 'bg-gradient-to-br from-blue-500/10 to-cyan-500/10',
        border: 'border-blue-500/30',
        icon: 'text-blue-400',
        IconComponent: Lightbulb,
      };
    default:
      return {
        bg: 'bg-gradient-to-br from-[#9F5F80]/10 to-[#383e4e]/10',
        border: 'border-[#9F5F80]/30',
        icon: 'text-[#9F5F80]',
        IconComponent: Sparkles,
      };
  }
};

export function AIInsightsBar({ insights, onNavigate, isRTL = false }: AIInsightsBarProps) {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="mb-8" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-[#9F5F80]" />
        <span className="text-sm font-semibold text-[#383e4e] dark:text-white">
          {isRTL ? 'תובנות AI' : 'AI Insights'}
        </span>
      </div>

      {/* Insights Grid */}
      <div className="space-y-3">
        {insights.map((insight, idx) => {
          const style = getInsightStyle(insight.type);
          const Icon = style.IconComponent;

          return (
            <motion.div
              key={`insight-${insight.type}-${idx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.3 }}
              onClick={() => insight.action && onNavigate(insight.action)}
              onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && insight.action) { e.preventDefault(); onNavigate(insight.action); } }}
              role={insight.action ? 'button' : undefined}
              tabIndex={insight.action ? 0 : undefined}
              className={`
                ${style.bg} ${style.border} 
                border backdrop-blur-sm rounded-xl p-4 
                flex items-center justify-between gap-4
                transition-all duration-200
                ${insight.action ? 'cursor-pointer hover:scale-[1.02] group' : ''}
              `}
            >
              <div className="flex items-center gap-3 flex-1">
                {/* Icon */}
                <div className={`${style.icon} p-2 rounded-lg bg-white/10 dark:bg-black/10`}>
                  <Icon className="h-5 w-5" />
                </div>

                {/* Text */}
                <p className="text-[#383e4e] dark:text-white text-sm font-medium leading-relaxed">
                  {insight.text}
                </p>
              </div>

              {/* Arrow (if clickable) */}
              {insight.action && (
                <ArrowRight 
                  className={`
                    h-5 w-5 text-[#6c757d] flex-shrink-0
                    group-hover:text-[#9F5F80] 
                    transition-all duration-200
                    ${isRTL ? 'group-hover:-translate-x-1 rotate-180' : 'group-hover:translate-x-1'}
                  `}
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default AIInsightsBar;
