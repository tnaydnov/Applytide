/**
 * CompaniesSection Component  
 * Company analytics and insights
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { AnalyticsCompanies } from '../../../features/analytics/api';

interface CompaniesSectionProps {
  data: AnalyticsCompanies;
  isRTL?: boolean;
  isPremium?: boolean;
}

export function CompaniesSection({ data, isRTL = false }: CompaniesSectionProps) {
  return (
    <div className="bg-white dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-lg lg:rounded-xl p-4 lg:p-6" dir={isRTL ? 'rtl' : 'ltr'} data-tour="top-companies">
      <h3 className={`font-bold text-base lg:text-lg text-[#383e4e] dark:text-white mb-3 lg:mb-4 ${isRTL ? 'text-right' : ''}`}>
        {isRTL ? 'חברות מובילות' : 'Top Companies'}
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data?.topCompanies || []}>
          <CartesianGrid strokeDasharray="3 3" stroke="#b6bac5" opacity={0.2} />
          <XAxis dataKey="name" stroke="#6c757d" tick={{ fontSize: 12 }} />
          <YAxis stroke="#6c757d" tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="applications" fill="#9F5F80" radius={[8, 8, 0, 0]} />
          <Bar dataKey="responses" fill="#3b82f6" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default CompaniesSection;