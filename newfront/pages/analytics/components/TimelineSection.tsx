/**
 * TimelineSection Component
 * Timeline and milestone analytics
 */

import { Clock } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { AnalyticsTimeline } from "../../../features/analytics/api";
import { createDateTickFormatter } from "../utils/chartFormatters";

interface TimelineSectionProps {
  data: AnalyticsTimeline;
  isRTL?: boolean;
  isPremium?: boolean;
}

export function TimelineSection({
  data,
  isRTL = false,
}: TimelineSectionProps) {
  const allDates = (data?.applicationTimeline || []).map(
    (d) => d.date,
  );
  const dateFormatter = createDateTickFormatter(
    allDates,
    isRTL,
  );

  return (
    <div className="space-y-6 lg:space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg lg:rounded-xl p-4 lg:p-6" data-tour="time-to-response-card">
          <Clock className="h-7 w-7 lg:h-8 lg:w-8 text-blue-600 dark:text-blue-400 mb-2" />
          <p className={`text-xs lg:text-sm text-blue-800 dark:text-blue-300 ${isRTL ? 'text-right' : ''}`}>
            {isRTL ? "זמן לתגובה" : "Time to Response"}
          </p>
          <p className={`text-xl lg:text-2xl font-bold text-blue-900 dark:text-blue-200 ${isRTL ? 'text-right' : ''}`}>
            {data?.averageTimeToResponse || 0}{" "}
            {isRTL ? "ימים" : "days"}
          </p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg lg:rounded-xl p-4 lg:p-6" data-tour="time-to-interview-card">
          <Clock className="h-7 w-7 lg:h-8 lg:w-8 text-purple-600 dark:text-purple-400 mb-2" />
          <p className={`text-xs lg:text-sm text-purple-800 dark:text-purple-300 ${isRTL ? 'text-right' : ''}`}>
            {isRTL ? "זמן לראיון" : "Time to Interview"}
          </p>
          <p className={`text-xl lg:text-2xl font-bold text-purple-900 dark:text-purple-200 ${isRTL ? 'text-right' : ''}`}>
            {data?.averageTimeToInterview || 0}{" "}
            {isRTL ? "ימים" : "days"}
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg lg:rounded-xl p-4 lg:p-6" data-tour="time-to-offer-card">
          <Clock className="h-7 w-7 lg:h-8 lg:w-8 text-green-600 dark:text-green-400 mb-2" />
          <p className={`text-xs lg:text-sm text-green-800 dark:text-green-300 ${isRTL ? 'text-right' : ''}`}>
            {isRTL ? "זמן להצעה" : "Time to Offer"}
          </p>
          <p className={`text-xl lg:text-2xl font-bold text-green-900 dark:text-green-200 ${isRTL ? 'text-right' : ''}`}>
            {data?.averageTimeToOffer || 0}{" "}
            {isRTL ? "ימים" : "days"}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-lg lg:rounded-xl p-4 lg:p-6" data-tour="timeline-chart">
        <h3 className={`font-bold text-base lg:text-lg mb-3 lg:mb-4 ${isRTL ? 'text-right' : ''}`}>
          {isRTL ? "ציר זמן" : "Timeline"}
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data?.applicationTimeline || []}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#b6bac5"
              opacity={0.2}
            />
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
            <YAxis
              stroke="#6c757d"
              allowDecimals={false}
              tick={{ fontSize: 12 }}
            />
            <Tooltip labelFormatter={dateFormatter} />
            <Legend />
            <Line
              type="monotone"
              dataKey="applications"
              stroke="#9F5F80"
              strokeWidth={2}
              dot={{ r: 3 }}
              name={isRTL ? "מועמדויות" : "Applications"}
            />
            <Line
              type="monotone"
              dataKey="interviews"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3 }}
              name={isRTL ? "ראיונות" : "Interviews"}
            />
            <Line
              type="monotone"
              dataKey="offers"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3 }}
              name={isRTL ? "הצעות" : "Offers"}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default TimelineSection;