/**
 * Utility functions for tracking onboarding progress
 */

import { safeSetItem, safeGetItem, safeRemoveItem } from '../lib/storage';

export const markChecklistItemComplete = (itemKey: string) => {
  safeSetItem(itemKey, 'true');
};

export const isChecklistItemComplete = (itemKey: string): boolean => {
  return safeGetItem(itemKey) === 'true';
};

export const resetOnboarding = () => {
  // Welcome and Tutorial
  safeRemoveItem('welcomeShown');
  safeRemoveItem('tutorialCompleted');
  safeRemoveItem('tutorialSkipped');
  
  // Old keys (for backwards compatibility)
  safeRemoveItem('tourCompleted');
  safeRemoveItem('tourSkipped');
  safeRemoveItem('dismissedHelp');
  
  // Checklist items
  safeRemoveItem('hasUploadedResume');
  safeRemoveItem('hasSavedJob');
  safeRemoveItem('hasGeneratedCoverLetter');
  safeRemoveItem('hasTrackedApplication');
  safeRemoveItem('hasSetReminder');
  safeRemoveItem('hasViewedAnalytics');
};

// Checklist item keys
export const ChecklistItems = {
  UPLOADED_RESUME: 'hasUploadedResume',
  SAVED_JOB: 'hasSavedJob',
  GENERATED_COVER_LETTER: 'hasGeneratedCoverLetter',
  TRACKED_APPLICATION: 'hasTrackedApplication',
  SET_REMINDER: 'hasSetReminder',
  VIEWED_ANALYTICS: 'hasViewedAnalytics',
} as const;
