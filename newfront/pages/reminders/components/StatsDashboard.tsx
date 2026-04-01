/**
 * StatsDashboard Component
 * Display reminder statistics
 */

import { motion } from 'motion/react';
import { Calendar, Clock, AlertCircle } from 'lucide-react';

interface StatsDashboardProps {
  todayCount: number;
  upcomingCount: number;
  overdueCount: number;
  isRTL?: boolean;
}

export function StatsDashboard({
  todayCount,
  upcomingCount,
  overdueCount,
  isRTL = false,
}: StatsDashboardProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Today */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-[#383e4e] border border-blue-200 dark:border-blue-800/30 rounded-xl p-4 sm:p-6 shadow-md hover:shadow-lg transition-shadow"
        data-tour="stat-today"
      >
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div>
            <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 mb-1 sm:mb-2">
              {isRTL ? 'היום' : 'Today'}
            </p>
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-900 dark:text-blue-300">
              {todayCount}
            </p>
          </div>
          <Calendar className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600 dark:text-blue-400" />
        </div>
      </motion.div>

      {/* Upcoming */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-[#383e4e] border border-green-200 dark:border-green-800/30 rounded-xl p-4 sm:p-6 shadow-md hover:shadow-lg transition-shadow"
        data-tour="stat-upcoming"
      >
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div>
            <p className="text-xs sm:text-sm font-medium text-green-600 dark:text-green-400 mb-1 sm:mb-2">
              {isRTL ? 'קרובים' : 'Upcoming'}
            </p>
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-900 dark:text-green-300">
              {upcomingCount}
            </p>
          </div>
          <Clock className="h-8 w-8 sm:h-10 sm:w-10 text-green-600 dark:text-green-400" />
        </div>
      </motion.div>

      {/* Overdue */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-red-50 to-white dark:from-red-900/20 dark:to-[#383e4e] border border-red-200 dark:border-red-800/30 rounded-xl p-4 sm:p-6 shadow-md hover:shadow-lg transition-shadow"
        data-tour="stat-overdue"
      >
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div>
            <p className="text-xs sm:text-sm font-medium text-red-600 dark:text-red-400 mb-1 sm:mb-2">
              {isRTL ? 'באיחור' : 'Overdue'}
            </p>
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-red-900 dark:text-red-300">
              {overdueCount}
            </p>
          </div>
          <AlertCircle className="h-8 w-8 sm:h-10 sm:w-10 text-red-600 dark:text-red-400" />
        </div>
      </motion.div>
    </div>
  );
}

export default StatsDashboard;