/**
 * useAnalyticsUnlock Hook
 * Check if user has unlocked analytics feature
 */

import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api/core';
import { logger } from '../lib/logger';

interface AnalyticsUnlockStatus {
  isUnlocked: boolean;
  applicationCount: number;
  accountAgeDays: number;
  requiredApplications: number;
  requiredDays: number;
  message: string;
}

export function useAnalyticsUnlock(): AnalyticsUnlockStatus {
  const [status, setStatus] = useState<AnalyticsUnlockStatus>({
    isUnlocked: false,
    applicationCount: 0,
    accountAgeDays: 0,
    requiredApplications: 5,
    requiredDays: 14,
    message: 'Loading...',
  });

  useEffect(() => {
    checkUnlockStatus();
  }, []);

  const checkUnlockStatus = async () => {
    try {
      // Get application count
      const appsRes = await apiFetch('/applications');
      const applications = await appsRes.json();
      const applicationCount = Array.isArray(applications) ? applications.length : 0;

      // Get account age (from user profile)
      const profileRes = await apiFetch('/profile/');
      const profile = await profileRes.json();
      const createdAt = new Date(profile.created_at);
      const now = new Date();
      const accountAgeDays = Math.floor(
        (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check unlock criteria
      const requiredApplications = 5;
      const requiredDays = 14;
      const isUnlocked = applicationCount >= requiredApplications || accountAgeDays >= requiredDays;

      // Generate message
      let message = '';
      if (isUnlocked) {
        message = 'Analytics unlocked! 🎉';
      } else if (applicationCount < requiredApplications && accountAgeDays < requiredDays) {
        const appsNeeded = requiredApplications - applicationCount;
        const daysNeeded = requiredDays - accountAgeDays;
        message = `Track ${appsNeeded} more application${appsNeeded > 1 ? 's' : ''} or wait ${daysNeeded} more day${daysNeeded > 1 ? 's' : ''} to unlock analytics`;
      } else if (applicationCount < requiredApplications) {
        const appsNeeded = requiredApplications - applicationCount;
        message = `Track ${appsNeeded} more application${appsNeeded > 1 ? 's' : ''} to unlock analytics`;
      } else {
        const daysNeeded = requiredDays - accountAgeDays;
        message = `Wait ${daysNeeded} more day${daysNeeded > 1 ? 's' : ''} to unlock analytics`;
      }

      setStatus({
        isUnlocked,
        applicationCount,
        accountAgeDays,
        requiredApplications,
        requiredDays,
        message,
      });
    } catch (error) {
      logger.error('Failed to check analytics unlock status:', error);
      // Default to unlocked on error to not block users
      setStatus({
        isUnlocked: true,
        applicationCount: 0,
        accountAgeDays: 0,
        requiredApplications: 5,
        requiredDays: 14,
        message: 'Analytics available',
      });
    }
  };

  return status;
}
