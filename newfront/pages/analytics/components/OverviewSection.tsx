/**
 * OverviewSection Component
 * Overview analytics with KPIs and summary charts
 */

import {
  FileText,
  MessageSquare,
  Users,
  Award,
  Clock,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { KPICard } from "./KPICard";
import type { AnalyticsOverview } from "../../../features/analytics/api";
import { translateWeek, translateStatus } from "../utils/translations";

interface OverviewSectionProps {
  data: AnalyticsOverview;
  isRTL?: boolean;
  isPremium?: boolean;
}

const COLORS = [
  "#9F5F80",
  "#383e4e",
  "#b6bac5",
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
];

export function OverviewSection({
  data,
  isRTL = false,
  isPremium: _isPremium = true,
}: OverviewSectionProps) {
  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-[#6c757d] dark:text-[#b6bac5]">
          {isRTL ? "טוען נתונים..." : "Loading data..."}
        </p>
      </div>
    );
  }

  // Translate data for charts
  const translatedWeeklyTrend = (data.weeklyTrend || []).map(item => ({
    ...item,
    week: translateWeek(item.week, isRTL)
  }));

  const translatedStatusBreakdown = (data.statusBreakdown || []).map(item => ({
    ...item,
    status: translateStatus(item.status, isRTL),
    name: translateStatus(item.status, isRTL)
  }));

  return (
    <div
      className="space-y-4 sm:space-y-6 lg:space-y-8 w-full overflow-x-hidden"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 w-full" data-tour="kpi-cards">
        <KPICard
          title={isRTL ? 'סה"כ בקשות' : "Total Applications"}
          value={data.totalApplications || 0}
          icon={FileText}
          color="#9F5F80"
          delay={0}
          isRTL={isRTL}
        />
        <KPICard
          title={isRTL ? "שיעור תגובה" : "Response Rate"}
          value={data.responseRate || 0}
          suffix="%"
          change={5}
          icon={MessageSquare}
          color="#3b82f6"
          delay={0.1}
          isRTL={isRTL}
        />
        <KPICard
          title={isRTL ? "שיעור ראיונות" : "Interview Rate"}
          value={data.interviewRate || 0}
          suffix="%"
          change={12}
          icon={Users}
          color="#8b5cf6"
          delay={0.2}
          isRTL={isRTL}
        />
        <KPICard
          title={isRTL ? "שיעור הצעות" : "Offer Rate"}
          value={data.offerRate || 0}
          suffix="%"
          change={-3}
          icon={Award}
          color="#10b981"
          delay={0.3}
          isRTL={isRTL}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 w-full">
        {/* Weekly Trend Chart */}
        <div className="bg-white dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-lg lg:rounded-xl p-3 sm:p-4 lg:p-6 w-full min-w-0" data-tour="weekly-trend">
          <h3 className={`font-bold text-sm sm:text-base lg:text-lg text-[#383e4e] dark:text-white mb-2 sm:mb-3 lg:mb-4 ${isRTL ? 'text-right' : ''}`}>
            {isRTL ? "מגמה שבועית" : "Weekly Trend"}
          </h3>
          <div className="w-full overflow-hidden">
            <ResponsiveContainer width="100%" height={200} className="sm:h-[250px]">
              <LineChart data={translatedWeeklyTrend}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#b6bac5"
                  opacity={0.2}
                />
                <XAxis 
                  dataKey="week" 
                  stroke="#6c757d" 
                  tick={{ fontSize: 11 }}
                  className="sm:text-xs"
                />
                <YAxis 
                  stroke="#6c757d" 
                  tick={{ fontSize: 11 }}
                  className="sm:text-xs"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #b6bac5",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line
                  type="monotone"
                  dataKey="applications"
                  name={isRTL ? "בקשות" : "Applications"}
                  stroke="#9F5F80"
                  strokeWidth={2}
                  dot={{ fill: "#9F5F80", r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="responses"
                  name={isRTL ? "תגובות" : "Responses"}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Breakdown Pie Chart */}
        <div className="bg-white dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-lg lg:rounded-xl p-3 sm:p-4 lg:p-6 w-full min-w-0" data-tour="status-breakdown">
          <h3 className={`font-bold text-sm sm:text-base lg:text-lg text-[#383e4e] dark:text-white mb-2 sm:mb-3 lg:mb-4 ${isRTL ? 'text-right' : ''}`}>
            {isRTL ? "התפלגות לפי סטטוס" : "Status Breakdown"}
          </h3>
          <div className="w-full overflow-hidden">
            <ResponsiveContainer width="100%" height={200} className="sm:h-[250px]">
              <PieChart>
                <Pie
                  data={translatedStatusBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) =>
                    `${name} (${percentage}%)`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {(data.statusBreakdown || []).map(
                    (_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ),
                  )}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Companies */}
      <div className="bg-white dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-lg lg:rounded-xl p-3 sm:p-4 lg:p-6 w-full min-w-0" data-tour="top-companies-overview">
        <h3 className={`font-bold text-sm sm:text-base lg:text-lg text-[#383e4e] dark:text-white mb-2 sm:mb-3 lg:mb-4 ${isRTL ? 'text-right' : ''}`}>
          {isRTL ? "חברות מובילות" : "Top Companies"}
        </h3>
        <div className="w-full overflow-hidden">
          <ResponsiveContainer width="100%" height={200} className="sm:h-[250px]">
            <BarChart data={data.topCompanies || []}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#b6bac5"
                opacity={0.2}
              />
              <XAxis 
                dataKey="name" 
                stroke="#6c757d" 
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                stroke="#6c757d"
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #b6bac5",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar
                dataKey="count"
                name={isRTL ? "בקשות" : "Applications"}
                fill="#9F5F80"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 w-full">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-700 rounded-lg lg:rounded-xl p-4 lg:p-6" data-tour="avg-response-time-card">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <div className={isRTL ? 'text-right' : ''}>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                {isRTL
                  ? "זמן תגובה ממוצע"
                  : "Avg Response Time"}
              </p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                {data.avgResponseTime || 0}{" "}
                {isRTL ? "ימים" : "days"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-700 rounded-lg lg:rounded-xl p-4 lg:p-6" data-tour="unique-companies-card">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            <div className={isRTL ? 'text-right' : ''}>
              <p className="text-sm text-purple-800 dark:text-purple-300">
                {isRTL ? "חברות ייחודיות" : "Unique Companies"}
              </p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-200">
                {(data.topCompanies || []).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-700 rounded-lg lg:rounded-xl p-4 lg:p-6" data-tour="offers-received-card">
          <div className="flex items-center gap-3 mb-2">
            <Award className="h-8 w-8 text-green-600 dark:text-green-400" />
            <div className={isRTL ? 'text-right' : ''}>
              <p className="text-sm text-green-800 dark:text-green-300">
                {isRTL ? "הצעות שהתקבלו" : "Offers Received"}
              </p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-200">
                {Math.round(
                  (data.totalApplications || 0) *
                    ((data.offerRate || 0) / 100),
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OverviewSection;