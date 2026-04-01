/**
 * ActivityLogSection Component
 * User activity timeline
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Activity, FileText, Users, Briefcase, Calendar, Settings } from 'lucide-react';
import { profileApi, type ActivityLog } from '../../../features/profile/api';
import { logger } from '../../../lib/logger';

interface ActivityLogSectionProps {
  isRTL?: boolean;
}

const getActivityIcon = (type: string) => {
  const icons = {
    application: Briefcase,
    document: FileText,
    interview: Users,
    reminder: Calendar,
    settings: Settings,
  };
  return icons[type as keyof typeof icons] || Activity;
};

const getActivityColor = (type: string) => {
  const colors = {
    application: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20',
    document: 'text-purple-600 bg-purple-100 dark:bg-purple-900/20',
    interview: 'text-green-600 bg-green-100 dark:bg-green-900/20',
    reminder: 'text-amber-600 bg-amber-100 dark:bg-amber-900/20',
    settings: 'text-gray-600 bg-gray-100 dark:bg-gray-900/20',
  };
  return colors[type as keyof typeof colors] || colors.settings;
};

export function ActivityLogSection({ isRTL = false }: ActivityLogSectionProps) {
  const [loading, setLoading] = useState(true);
  const [activityLog, setActivityLog] = useState<ActivityLog | null>(null);

  useEffect(() => {
    loadActivity();
  }, []);

  const loadActivity = async () => {
    try {
      const data = await profileApi.getActivityLog({ page: 1, limit: 20 });
      setActivityLog(data);
    } catch (error) {
      logger.error('Failed to load activity log:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-[#6c757d] dark:text-[#b6bac5]">
          {isRTL ? 'טוען פעילות...' : 'Loading activity...'}
        </p>
      </div>
    );
  }

  if (!activityLog || activityLog.activities.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-xl p-12 text-center"
      >
        <Activity className="h-16 w-16 text-[#b6bac5] mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-[#383e4e] dark:text-white mb-2">
          {isRTL ? 'אין פעילות עדיין' : 'No Activity Yet'}
        </h3>
        <p className="text-[#6c757d] dark:text-[#b6bac5]">
          {isRTL
            ? 'הפעילות שלך תוצג כאן'
            : 'Your activity will appear here'}
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-xl p-6"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <h3 className="text-lg font-bold text-[#383e4e] dark:text-white mb-6">
        {isRTL ? 'פעילות אחרונה' : 'Recent Activity'}
      </h3>

      <div className="space-y-4">
        {activityLog.activities.map((activity, index) => {
          const Icon = getActivityIcon(activity.type);
          const colorClass = getActivityColor(activity.type);
          const date = new Date(activity.created_at);

          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex gap-4 p-4 hover:bg-gray-50 dark:hover:bg-[#383e4e]/30 rounded-lg transition-colors"
            >
              <div className={`p-3 rounded-lg ${colorClass} flex-shrink-0`}>
                <Icon className="h-5 w-5" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[#383e4e] dark:text-white font-medium">
                  {activity.description}
                </p>
                <p className="text-sm text-[#6c757d] dark:text-[#b6bac5] mt-1">
                  {date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {activityLog.total > activityLog.activities.length && (
        <div className="mt-6 text-center">
          <button className="text-[#9F5F80] hover:underline font-medium">
            {isRTL ? 'טען עוד' : 'Load More'}
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default ActivityLogSection;
