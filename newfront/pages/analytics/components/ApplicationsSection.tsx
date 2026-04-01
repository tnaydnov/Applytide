/**
 * ApplicationsSection Component
 * Detailed application analytics
 */

import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { AnalyticsApplications } from '../../../features/analytics/api';
import { createDateTickFormatter } from '../utils/chartFormatters';
import { translateDay, translateStatus } from '../utils/translations';

interface ApplicationsSectionProps {
  data: AnalyticsApplications;
  isRTL?: boolean;
  isPremium?: boolean;
}

const COLORS = ['#9F5F80', '#383e4e', '#3b82f6', '#8b5cf6', '#10b981'];

export function ApplicationsSection({ data, isRTL = false, isPremium: _isPremium = true }: ApplicationsSectionProps) {
  if (!data) return null;

  const allDates = (data.dailyApplications || []).map(d => d.date);
  const dateFormatter = createDateTickFormatter(allDates, isRTL);

  // Translate data
  const translatedStatusDistribution = (data.statusDistribution || []).map(item => ({
    ...item,
    status: translateStatus(item.status, isRTL),
  }));

  const translatedApplicationsByDay = (data.applicationsByDay || []).map(item => ({
    ...item,
    day: translateDay(item.day, isRTL),
  }));

  return (
    <div className="space-y-6 lg:space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Daily Applications Trend */}
      <div className="bg-white dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-lg lg:rounded-xl p-4 lg:p-6" data-tour="daily-trend">
        <h3 className={`font-bold text-base lg:text-lg text-[#383e4e] dark:text-white mb-3 lg:mb-4 ${isRTL ? 'text-right' : ''}`}>
          {isRTL ? 'מגמה יומית' : 'Daily Applications Trend'}
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data.dailyApplications || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#b6bac5" opacity={0.2} />
            <XAxis 
              dataKey="date" 
              stroke="#6c757d" 
              tickFormatter={dateFormatter}
              angle={-45}
              textAnchor="end"
              height={80}
              interval="preserveStartEnd"
              tick={{ fontSize: 12 }}
            />
            <YAxis stroke="#6c757d" allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip labelFormatter={dateFormatter} />
            <Line type="monotone" dataKey="count" stroke="#9F5F80" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
        <div className="bg-white dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-lg lg:rounded-xl p-4 lg:p-6" data-tour="status-distribution">
          <h3 className={`font-bold text-base lg:text-lg text-[#383e4e] dark:text-white mb-3 lg:mb-4 ${isRTL ? 'text-right' : ''}`}>
            {isRTL ? 'התפלגות סטטוס' : 'Status Distribution'}
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={translatedStatusDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ status, count }) => `${status}: ${count}`}
                outerRadius={100}
                dataKey="count"
              >
                {(data.statusDistribution || []).map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Applications by Day of Week */}
        <div className="bg-white dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-lg lg:rounded-xl p-4 lg:p-6" data-tour="applications-by-day">
          <h3 className={`font-bold text-base lg:text-lg text-[#383e4e] dark:text-white mb-3 lg:mb-4 ${isRTL ? 'text-right' : ''}`}>
            {isRTL ? 'לפי יום בשבוע' : 'By Day of Week'}
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={translatedApplicationsByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#b6bac5" opacity={0.2} />
              <XAxis dataKey="day" stroke="#6c757d" tick={{ fontSize: 12 }} />
              <YAxis stroke="#6c757d" tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#9F5F80" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default ApplicationsSection;