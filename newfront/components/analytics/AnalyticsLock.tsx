/**
 * AnalyticsLock Component
 * Shows when analytics is locked and how to unlock it
 */

import { motion } from 'motion/react';
import { Lock, TrendingUp, Target, Calendar } from 'lucide-react';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import { useAnalyticsUnlock } from '../../hooks/useAnalyticsUnlock';
import { useLanguage } from '../../contexts/LanguageContext';

export function AnalyticsLock() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { applicationCount, requiredApplications, accountAgeDays, requiredDays, message } =
    useAnalyticsUnlock();

  const appsProgress = (applicationCount / requiredApplications) * 100;
  const daysProgress = (accountAgeDays / requiredDays) * 100;

  return (
    <div className="min-h-[600px] flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full"
      >
        {/* Lock Icon */}
        <div className="flex justify-center mb-8">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3,
            }}
            className="h-32 w-32 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(159, 95, 128, 0.2) 0%, rgba(56, 62, 78, 0.2) 100%)',
              border: '2px solid rgba(159, 95, 128, 0.3)',
            }}
          >
            <Lock className="h-16 w-16 text-[#9F5F80]" />
          </motion.div>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-bold text-center text-[#383e4e] dark:text-white mb-4">
          {t('Analytics Locked', 'אנליטיקס נעול')} 🔒
        </h2>

        {/* Description */}
        <p className="text-center text-[#6c757d] dark:text-[#b6bac5] mb-8 text-lg">
          {message}
        </p>

        {/* Unlock Requirements */}
        <div
          className="rounded-2xl p-6 mb-8"
          style={{
            background: 'linear-gradient(135deg, rgba(159, 95, 128, 0.1) 0%, rgba(56, 62, 78, 0.1) 100%)',
            border: '1px solid rgba(159, 95, 128, 0.2)',
          }}
        >
          <h3 className="text-xl font-semibold text-[#383e4e] dark:text-white mb-6 text-center">
            {t('Unlock Requirements', 'דרישות לביטול נעילה')}
          </h3>

          <div className="space-y-6">
            {/* Applications Progress */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-[#9F5F80]" />
                  <span className="font-medium text-[#383e4e] dark:text-white">
                    {t('Track Applications', 'עקוב אחר בקשות')}
                  </span>
                </div>
                <span className="text-sm text-[#6c757d] dark:text-[#b6bac5]">
                  {applicationCount}/{requiredApplications}
                </span>
              </div>
              <div className="h-3 bg-white/50 dark:bg-[#383e4e]/50 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#9F5F80] to-[#383e4e]"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(appsProgress, 100)}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
              <p className="text-xs text-[#6c757d] dark:text-[#b6bac5] mt-2">
                {applicationCount >= requiredApplications
                  ? '✅ ' + t('Complete!', 'הושלם!')
                  : `${requiredApplications - applicationCount} ${t('more needed', 'עוד נדרשים')}`}
              </p>
            </div>

            {/* Days Active Progress */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-[#9F5F80]" />
                  <span className="font-medium text-[#383e4e] dark:text-white">
                    {t('Active Days', 'ימים פעילים')}
                  </span>
                </div>
                <span className="text-sm text-[#6c757d] dark:text-[#b6bac5]">
                  {accountAgeDays}/{requiredDays}
                </span>
              </div>
              <div className="h-3 bg-white/50 dark:bg-[#383e4e]/50 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#9F5F80] to-[#383e4e]"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(daysProgress, 100)}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                />
              </div>
              <p className="text-xs text-[#6c757d] dark:text-[#b6bac5] mt-2">
                {accountAgeDays >= requiredDays
                  ? '✅ ' + t('Complete!', 'הושלם!')
                  : `${requiredDays - accountAgeDays} ${t('more days needed', 'עוד ימים נדרשים')}`}
              </p>
            </div>
          </div>

          <p className="text-center text-sm text-[#6c757d] dark:text-[#b6bac5] mt-6 italic">
            {t('Complete either requirement to unlock analytics', 'השלם אחת מהדרישות כדי לפתוח אנליטיקס')}
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => navigate('/jobs')}
            className="min-w-[200px]"
            style={{
              background: 'linear-gradient(135deg, #9F5F80 0%, #383e4e 100%)',
            }}
          >
            <Target className="h-5 w-5 mr-2" />
            {t('Add Jobs', 'הוסף משרות')}
          </Button>
          <Button
            onClick={() => navigate('/pipeline')}
            variant="outline"
            className="min-w-[200px]"
          >
            <TrendingUp className="h-5 w-5 mr-2" />
            {t('Track Applications', 'עקוב אחר בקשות')}
          </Button>
        </div>

        {/* Help Text */}
        <p className="text-center text-sm text-[#6c757d] dark:text-[#b6bac5] mt-8">
          💡 {t('Analytics helps you understand your job search patterns and improve your success rate', 'אנליטיקס עוזר לך להבין את דפוסי חיפוש העבודה שלך ולשפר את שיעור ההצלחה')}
        </p>
      </motion.div>
    </div>
  );
}

export default AnalyticsLock;
