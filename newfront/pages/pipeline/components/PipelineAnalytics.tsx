/**
 * PipelineAnalytics Component
 * Displays key metrics and analytics for the pipeline
 */

import React from 'react';
import { motion } from 'motion/react';
import { BarChart3, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react';
import type { Application } from '../../../features/applications/api';
import { getStatusById } from '../constants/statuses';

interface PipelineAnalyticsProps {
  applications: Application[];
  isRTL?: boolean;
}

interface KPIData {
  label: { en: string; he: string };
  value: number | string;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  color: string;
  dataTour: string;
}

export function PipelineAnalytics({ applications, isRTL = false }: PipelineAnalyticsProps) {
  // Calculate metrics
  const totalApplications = applications.length;
  const activeApplications = applications.filter(
    (app) =>
      app.status !== 'Rejected' &&
      app.status !== 'Accepted' &&
      app.status !== 'Withdrawn' &&
      !app.archived
  ).length;

  // Calculate this week's applications
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const thisWeekApplications = applications.filter((app) => {
    const appDate = new Date(app.created_at || app.applied_date || '');
    return appDate >= oneWeekAgo;
  }).length;

  // Calculate success rate (offers / total)
  const offers = applications.filter(
    (app) => app.status === 'Offer' || app.status === 'Accepted'
  ).length;
  const successRate = totalApplications > 0 ? ((offers / totalApplications) * 100).toFixed(1) : '0';

  // Calculate response rate (non-applied status / total)
  const responses = applications.filter(
    (app) => app.status !== 'Applied' && app.status !== 'Rejected'
  ).length;
  const responseRate =
    totalApplications > 0 ? ((responses / totalApplications) * 100).toFixed(1) : '0';

  // Calculate interviews
  const interviews = applications.filter(
    (app) =>
      app.status === 'Phone Screen' ||
      app.status === 'HR Round' ||
      app.status === 'Tech' ||
      app.status === 'Tech Interview 1' ||
      app.status === 'Tech Interview 2' ||
      app.status === 'On-site'
  ).length;

  // Build KPI data
  const kpis: KPIData[] = [
    {
      label: { en: 'Total Applications', he: 'סה״כ הגשות' },
      value: totalApplications,
      change: thisWeekApplications,
      trend: thisWeekApplications > 0 ? 'up' : 'neutral',
      icon: <BarChart3 className="h-5 w-5" />,
      color: '#3b82f6',
      dataTour: 'stat-total',
    },
    {
      label: { en: 'Active', he: 'הגשות פעילות' },
      value: activeApplications,
      icon: <Clock className="h-5 w-5" />,
      color: '#8b5cf6',
      dataTour: 'stat-active',
    },
    {
      label: { en: 'This Week', he: 'הגשות השבוע' },
      value: thisWeekApplications,
      trend: thisWeekApplications >= 3 ? 'up' : thisWeekApplications >= 1 ? 'neutral' : 'down',
      icon: <BarChart3 className="h-5 w-5" />,
      color: '#10b981',
      dataTour: 'stat-week',
    },
    {
      label: { en: 'Interviews', he: 'מועמדויות בשלב ראיון' },
      value: interviews,
      icon: <BarChart3 className="h-5 w-5" />,
      color: '#f59e0b',
      dataTour: 'stat-interviews',
    },
    {
      label: { en: 'Success Rate', he: 'שיעור הצלחה' },
      value: `${successRate}%`,
      icon: <CheckCircle className="h-5 w-5" />,
      color: '#10b981',
      dataTour: 'stat-success',
    },
    {
      label: { en: 'Response Rate', he: 'שיעור מענה' },
      value: `${responseRate}%`,
      icon: <BarChart3 className="h-5 w-5" />,
      color: '#6366f1',
      dataTour: 'stat-response',
    },
  ];

  return (
    <div className="mb-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi, index) => (
          <motion.div
            key={kpi.dataTour}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="relative group"
            data-tour={kpi.dataTour}
          >
            {/* Gradient border effect */}
            <div
              className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity blur"
              style={{
                background: `linear-gradient(135deg, ${kpi.color}40, ${kpi.color}20)`,
              }}
            />

            {/* Card content */}
            <div className="relative bg-white dark:bg-[#383e4e] rounded-xl p-4 border border-[#b6bac5]/20 hover:border-[#9F5F80]/30 transition-all">
              {/* Icon with color */}
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                style={{ backgroundColor: `${kpi.color}20`, color: kpi.color }}
              >
                {kpi.icon}
              </div>

              {/* Label */}
              <div className={`text-xs text-[#6c757d] dark:text-[#b6bac5] mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {isRTL ? kpi.label.he : kpi.label.en}
              </div>

              {/* Value */}
              <div className={`flex items-baseline gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                <span className="text-2xl font-bold text-[#383e4e] dark:text-white">
                  {kpi.value}
                </span>

                {/* Trend indicator */}
                {kpi.trend && (
                  <span
                    className={`flex items-center text-xs font-medium ${
                      kpi.trend === 'up'
                        ? 'text-green-600 dark:text-green-400'
                        : kpi.trend === 'down'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-[#6c757d] dark:text-[#b6bac5]'
                    }`}
                  >
                    {kpi.trend === 'up' && <TrendingUp className="h-3 w-3 mr-0.5" />}
                    {kpi.trend === 'down' && <XCircle className="h-3 w-3 mr-0.5" />}
                    {kpi.change !== undefined && kpi.change > 0 && `+${kpi.change}`}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Status breakdown - compact */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-4 bg-white dark:bg-[#383e4e] rounded-xl p-4 border border-[#b6bac5]/20"
        data-tour="status-breakdown"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#383e4e] dark:text-white">
            {isRTL ? 'התפלגות לפי סטטוס' : 'Status Breakdown'}
          </h3>
        </div>

        <div className="flex flex-wrap gap-3">
          {getStatusBreakdown(applications).map((stat) => (
            <div
              key={stat.status}
              className="flex items-center gap-2 px-3 py-2 bg-[#b6bac5]/10 dark:bg-[#383e4e]/50 rounded-lg"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: stat.color }}
              />
              <span className="text-sm text-[#383e4e] dark:text-white font-medium">
                {isRTL ? stat.labelHe : stat.labelEn}
              </span>
              <span className="text-sm text-[#6c757d] dark:text-[#b6bac5]">
                ({stat.count})
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// Helper function to get status breakdown
function getStatusBreakdown(applications: Application[]) {
  const statusMap = new Map<string, { count: number; color: string; labelEn: string; labelHe: string }>();

  applications.forEach((app) => {
    if (app.archived) return;

    const status = app.status || 'applied';
    const existing = statusMap.get(status);
    
    // Use centralized status configuration
    const statusConfig = getStatusById(status);
    const config = statusConfig 
      ? { color: statusConfig.color, labelEn: statusConfig.name, labelHe: statusConfig.nameHe }
      : { color: '#6b7280', labelEn: status, labelHe: status };

    if (existing) {
      existing.count++;
    } else {
      statusMap.set(status, { count: 1, ...config });
    }
  });

  return Array.from(statusMap.entries())
    .map(([status, data]) => ({ status, ...data }))
    .sort((a, b) => b.count - a.count);
}

export default PipelineAnalytics;