/**
 * SourcesSection Component
 * Job source analytics
 */

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import type { AnalyticsSources } from "../../../features/analytics/api";
import { translateSource, translateLegend } from "../utils/translations";

interface SourcesSectionProps {
  data: AnalyticsSources;
  isRTL?: boolean;
  isPremium?: boolean;
}

const COLORS = [
  "#9F5F80",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
];

export function SourcesSection({
  data,
  isRTL = false,
}: SourcesSectionProps) {
  // Translate data
  const translatedSourceBreakdown = (data?.sourceBreakdown || []).map(item => ({
    ...item,
    source: translateSource(item.source, isRTL),
  }));

  const translatedSourceComparison = (data?.sourceComparison || []).map(item => ({
    ...item,
    source: translateSource(item.source, isRTL),
  }));

  return (
    <div className="space-y-6 lg:space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
        <div className="bg-white dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-lg lg:rounded-xl p-4 lg:p-6" data-tour="source-breakdown">
          <h3 className={`font-bold text-base lg:text-lg mb-3 lg:mb-4 ${isRTL ? 'text-right' : ''}`}>
            {isRTL ? "התפלגות לפי מקורות" : "Source Breakdown"}
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={translatedSourceBreakdown}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="count"
                label
              >
                {(translatedSourceBreakdown).map(
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

        <div className="bg-white dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-lg lg:rounded-xl p-4 lg:p-6" data-tour="source-performance">
          <h3 className={`font-bold text-base lg:text-lg mb-3 lg:mb-4 ${isRTL ? 'text-right' : ''}`}>
            {isRTL ? "ביצועי מקורות" : "Source Performance"}
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={translatedSourceComparison}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#b6bac5"
                opacity={0.2}
              />
              <XAxis
                dataKey="source"
                stroke="#6c757d"
                tick={{ fontSize: 12 }}
              />
              <YAxis stroke="#6c757d" tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend formatter={(value) => translateLegend(value, isRTL)} />
              <Bar
                dataKey="applications"
                name={isRTL ? "מועמדויות" : "applications"}
                fill="#9F5F80"
                radius={[8, 8, 0, 0]}
              />
              <Bar
                dataKey="interviews"
                name={isRTL ? "ראיונות" : "interviews"}
                fill="#3b82f6"
                radius={[8, 8, 0, 0]}
              />
              <Bar
                dataKey="offers"
                name={isRTL ? "הצעות" : "offers"}
                fill="#10b981"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default SourcesSection;