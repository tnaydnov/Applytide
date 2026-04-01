/**
 * ProfileStats Component
 * Profile completion and activity stats
 */

import { motion } from 'motion/react';
import { 
  Target, 
  Award,
  CheckCircle2,
  Circle
} from 'lucide-react';
import type { UserProfile } from '../../../features/profile/api';

interface ProfileStatsProps {
  profile: UserProfile;
  isRTL?: boolean;
}

export function ProfileStats({ profile, isRTL = false }: ProfileStatsProps) {
  // Calculate profile completion
  const calculateCompletion = () => {
    const fields = [
      profile.first_name,
      profile.last_name,
      profile.phone,
      profile.location,
      profile.bio,
      profile.avatar_url,
      profile.linkedin_url || profile.github_url || profile.portfolio_url,
    ];
    
    const completed = fields.filter(Boolean).length;
    const total = fields.length;
    const percentage = Math.round((completed / total) * 100);
    
    return { completed, total, percentage };
  };

  const completion = calculateCompletion();

  const getCompletionColor = () => {
    if (completion.percentage >= 80) return { from: '#10b981', to: '#059669', text: 'text-green-600' };
    if (completion.percentage >= 50) return { from: '#f59e0b', to: '#d97706', text: 'text-orange-600' };
    return { from: '#ef4444', to: '#dc2626', text: 'text-red-600' };
  };

  const completionColor = getCompletionColor();

  const getMissingFields = () => {
    const missing = [];
    if (!profile.first_name || !profile.last_name) missing.push(isRTL ? 'שם מלא' : 'Full name');
    if (!profile.phone) missing.push(isRTL ? 'טלפון' : 'Phone');
    if (!profile.location) missing.push(isRTL ? 'מיקום' : 'Location');
    if (!profile.bio) missing.push(isRTL ? 'ביוגרפיה' : 'Bio');
    if (!profile.avatar_url) missing.push(isRTL ? 'תמונת פרופיל' : 'Profile photo');
    if (!profile.linkedin_url && !profile.github_url && !profile.portfolio_url) {
      missing.push(isRTL ? 'קישורים חברתיים' : 'Social links');
    }
    return missing;
  };

  const missingFields = getMissingFields();

  return (
    <div className="space-y-4">
      {/* Profile Completion */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-2xl p-6"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className={`flex items-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
          <div className="p-2 rounded-xl bg-gradient-to-br from-[#9F5F80] to-[#383e4e]">
            <Target className="h-5 w-5 text-white" />
          </div>
          <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
            <h3 className="font-bold text-[#383e4e] dark:text-white">
              {isRTL ? 'השלמת פרופיל' : 'Profile Completion'}
            </h3>
            <p className="text-xs text-[#6c757d] dark:text-[#b6bac5]">
              {completion.completed} {isRTL ? 'מתוך' : 'of'} {completion.total} {isRTL ? 'שדות' : 'fields'}
            </p>
          </div>
        </div>

        {/* Progress Circle */}
        <div className="relative w-32 h-32 mx-auto mb-4">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background Circle */}
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-gray-200 dark:text-[#383e4e]"
            />
            {/* Progress Circle */}
            <motion.circle
              cx="64"
              cy="64"
              r="56"
              stroke="url(#gradient)"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 56}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 56 }}
              animate={{ 
                strokeDashoffset: 2 * Math.PI * 56 * (1 - completion.percentage / 100) 
              }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={completionColor.from} />
                <stop offset="100%" stopColor={completionColor.to} />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Percentage Text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
              className="text-center"
            >
              <div className={`text-3xl font-bold ${completionColor.text}`}>
                {completion.percentage}%
              </div>
              <div className="text-xs text-[#6c757d] dark:text-[#b6bac5]">
                {isRTL ? 'הושלם' : 'Complete'}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Missing Fields */}
        {missingFields.length > 0 && (
          <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-200 dark:border-orange-800/30">
            <p className={`text-sm font-medium text-orange-900 dark:text-orange-300 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
              {isRTL ? 'שדות חסרים:' : 'Missing fields:'}
            </p>
            <div className="space-y-1">
              {missingFields.map((field, index) => (
                <motion.div
                  key={field}
                  initial={{ opacity: 0, x: isRTL ? 10 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className={`flex items-center gap-2 text-sm text-orange-700 dark:text-orange-400 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <Circle className="h-2 w-2 fill-current" />
                  {field}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {completion.percentage === 100 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-4 p-4 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-200 dark:border-green-800/30"
          >
            <div className={`flex items-center gap-2 text-green-700 dark:text-green-400 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <CheckCircle2 className="h-5 w-5" />
              <span className={`text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                {isRTL ? '🎉 פרופיל מושלם!' : '🎉 Profile Complete!'}
              </span>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Quick Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-2 gap-4"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Account Status */}
        <div className="bg-white dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-xl p-4">
          <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-1.5 rounded-lg bg-blue-500/10">
              <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-xs text-[#6c757d] dark:text-[#b6bac5]">
              {isRTL ? 'סטטוס' : 'Status'}
            </span>
          </div>
          <p className={`font-bold text-[#383e4e] dark:text-white ${isRTL ? 'text-right' : ''}`}>
            {profile.email_verified 
              ? (isRTL ? 'מאומת' : 'Verified')
              : (isRTL ? 'לא מאומת' : 'Unverified')}
          </p>
        </div>

        {/* Tier Badge */}
        <div className="bg-white dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-xl p-4">
          <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-1.5 rounded-lg bg-purple-500/10">
              <Award className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-xs text-[#6c757d] dark:text-[#b6bac5]">
              {isRTL ? 'מנוי' : 'Plan'}
            </span>
          </div>
          <p className={`font-bold text-[#383e4e] dark:text-white capitalize ${isRTL ? 'text-right' : ''}`}>
            {profile.subscription_tier}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default ProfileStats;