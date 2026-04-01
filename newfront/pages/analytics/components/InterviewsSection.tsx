/**
 * InterviewsSection Component
 * Interview analytics and metrics
 */

import { Users, CheckCircle, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { AnalyticsInterviews } from '../../../features/analytics/api';
import { translateStage } from '../utils/translations';

interface InterviewsSectionProps {
  data: AnalyticsInterviews;
  isRTL?: boolean;
  isPremium?: boolean;
}

const COLORS = ['#9F5F80', '#3b82f6', '#8b5cf6', '#10b981'];

export function InterviewsSection({ data, isRTL = false }: InterviewsSectionProps) {
  // Translate data
  const translatedInterviewsByStage = (data?.interviewsByStage || []).map(item => ({
    ...item,
    stage: translateStage(item.stage, isRTL),
  }));

  return (
    <div className="space-y-6 lg:space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg lg:rounded-xl p-4 lg:p-6" data-tour="total-interviews-card">
          <Users className="h-7 w-7 lg:h-8 lg:w-8 text-blue-600 dark:text-blue-400 mb-2" />
          <p className={`text-xs lg:text-sm text-blue-800 dark:text-blue-300 ${isRTL ? 'text-right' : ''}`}>{isRTL ? 'סה"כ ראיונות' : 'Total Interviews'}</p>
          <p className={`text-2xl lg:text-3xl font-bold text-blue-900 dark:text-blue-200 ${isRTL ? 'text-right' : ''}`}>{data?.totalInterviews || 0}</p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg lg:rounded-xl p-4 lg:p-6" data-tour="scheduled-interviews-card">
          <Calendar className="h-7 w-7 lg:h-8 lg:w-8 text-purple-600 dark:text-purple-400 mb-2" />
          <p className={`text-xs lg:text-sm text-purple-800 dark:text-purple-300 ${isRTL ? 'text-right' : ''}`}>{isRTL ? 'מתוזמנים' : 'Scheduled'}</p>
          <p className={`text-2xl lg:text-3xl font-bold text-purple-900 dark:text-purple-200 ${isRTL ? 'text-right' : ''}`}>{data?.interviewsScheduled || 0}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg lg:rounded-xl p-4 lg:p-6" data-tour="success-rate-card">
          <CheckCircle className="h-7 w-7 lg:h-8 lg:w-8 text-green-600 dark:text-green-400 mb-2" />
          <p className={`text-xs lg:text-sm text-green-800 dark:text-green-300 ${isRTL ? 'text-right' : ''}`}>{isRTL ? 'שיעור הצלחה' : 'Success Rate'}</p>
          <p className={`text-2xl lg:text-3xl font-bold text-green-900 dark:text-green-200 ${isRTL ? 'text-right' : ''}`}>{data?.successRate || 0}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
        <div className="bg-white dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-lg lg:rounded-xl p-4 lg:p-6" data-tour="interviews-by-stage">
          <h3 className={`font-bold text-base lg:text-lg mb-3 lg:mb-4 ${isRTL ? 'text-right' : ''}`}>{isRTL ? 'לפי שלב' : 'By Stage'}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={translatedInterviewsByStage} cx="50%" cy="50%" outerRadius={100} dataKey="count" label>
                {(data?.interviewsByStage || []).map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-lg lg:rounded-xl p-4 lg:p-6" data-tour="interviews-by-company">
          <h3 className={`font-bold text-base lg:text-lg mb-3 lg:mb-4 ${isRTL ? 'text-right' : ''}`}>{isRTL ? 'לפי חברה' : 'By Company'}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data?.interviewsByCompany || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#b6bac5" opacity={0.2} />
              <XAxis dataKey="company" stroke="#6c757d" tick={{ fontSize: 12 }} />
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

export default InterviewsSection;