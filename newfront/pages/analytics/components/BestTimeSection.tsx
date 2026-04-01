/**
 * BestTimeSection Component
 * Optimal time analytics for applications
 */

import { Sun, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { AnalyticsBestTime } from '../../../features/analytics/api';
import { translateBestDay, translateDay } from '../utils/translations';

interface BestTimeSectionProps {
  data: AnalyticsBestTime;
  isRTL?: boolean;
  isPremium?: boolean;
}

export function BestTimeSection({ data, isRTL = false }: BestTimeSectionProps) {
  // Translate data
  const translatedResponseRateByDay = (data?.responseRateByDay || []).map(item => ({
    ...item,
    day: translateDay(item.day, isRTL),
  }));

  return (
    <div className="space-y-6 lg:space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border border-amber-200 dark:border-amber-700 rounded-lg lg:rounded-xl p-6 lg:p-8" data-tour="best-day-card">
          <Sun className="h-10 w-10 lg:h-12 lg:w-12 text-amber-600 dark:text-amber-400 mb-3 lg:mb-4" />
          <p className={`text-xs lg:text-sm text-amber-800 dark:text-amber-300 mb-2 ${isRTL ? 'text-right' : ''}`}>{isRTL ? 'יום מיטבי' : 'Best Day to Apply'}</p>
          <p className={`text-2xl lg:text-3xl font-bold text-amber-900 dark:text-amber-200 ${isRTL ? 'text-right' : ''}`}>{translateBestDay(data?.bestDayToApply || 'Tuesday', isRTL)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-700 rounded-lg lg:rounded-xl p-6 lg:p-8" data-tour="best-time-card">
          <Award className="h-10 w-10 lg:h-12 lg:w-12 text-purple-600 dark:text-purple-400 mb-3 lg:mb-4" />
          <p className={`text-xs lg:text-sm text-purple-800 dark:text-purple-300 mb-2 ${isRTL ? 'text-right' : ''}`}>{isRTL ? 'שעה מיטבית' : 'Best Time to Apply'}</p>
          <p className={`text-2xl lg:text-3xl font-bold text-purple-900 dark:text-purple-200 ${isRTL ? 'text-right' : ''}`}>{data?.bestTimeToApply || '10:00 AM'}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-lg lg:rounded-xl p-4 lg:p-6" data-tour="response-rate-by-day">
        <h3 className={`font-bold text-base lg:text-lg mb-3 lg:mb-4 ${isRTL ? 'text-right' : ''}`}>{isRTL ? 'שיעור תגובה לפי יום' : 'Response Rate by Day'}</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={translatedResponseRateByDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="#b6bac5" opacity={0.2} />
            <XAxis dataKey="day" stroke="#6c757d" tick={{ fontSize: 12 }} />
            <YAxis stroke="#6c757d" tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="rate" fill="#9F5F80" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default BestTimeSection;