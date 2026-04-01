/**
 * KPICard Component
 * Display key performance indicator
 */

import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  color?: string;
  suffix?: string;
  delay?: number;
  isRTL?: boolean;
}

export function KPICard({
  title,
  value,
  change,
  icon: Icon,
  color = '#9F5F80',
  suffix = '',
  delay = 0,
  isRTL = false,
}: KPICardProps) {
  const getTrendIcon = () => {
    if (change === undefined || change === 0) return Minus;
    return change > 0 ? TrendingUp : TrendingDown;
  };

  const getTrendColor = () => {
    if (change === undefined || change === 0) return 'text-gray-500';
    return change > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  };

  const TrendIcon = getTrendIcon();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="
        bg-white dark:bg-[#383e4e]/50 
        border border-[#b6bac5]/20 
        rounded-lg lg:rounded-xl p-3 sm:p-4 lg:p-6 
        hover:border-[#9F5F80]/50 
        hover:shadow-lg
        transition-all duration-200
        relative overflow-hidden
      "
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Background Icon */}
      <div
        className="absolute top-0 right-0 opacity-5 transform translate-x-4 -translate-y-4"
        style={{ color }}
      >
        <Icon className="h-20 sm:h-24 lg:h-32 w-20 sm:w-24 lg:w-32" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
          <div
            className="p-1.5 sm:p-2 lg:p-3 rounded-lg"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" style={{ color }} />
          </div>

          {change !== undefined && (
            <div className={`flex items-center gap-0.5 sm:gap-1 ${getTrendColor()}`}>
              <TrendIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-[10px] sm:text-xs lg:text-sm font-semibold">
                {Math.abs(change)}%
              </span>
            </div>
          )}
        </div>

        {/* Title */}
        <p className={`text-[10px] sm:text-xs lg:text-sm text-[#6c757d] dark:text-[#b6bac5] mb-1 lg:mb-2 ${isRTL ? 'text-right' : ''} line-clamp-2`}>
          {title}
        </p>

        {/* Value */}
        <p className={`text-lg sm:text-2xl lg:text-3xl font-bold text-[#383e4e] dark:text-white ${isRTL ? 'text-right' : ''}`}>
          {value}{suffix}
        </p>
      </div>
    </motion.div>
  );
}

export default KPICard;