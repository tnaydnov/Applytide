/**
 * Analytics Translation Utilities
 * Translates chart data labels to Hebrew
 */

// Day name translations
export const dayTranslations: Record<string, string> = {
  'Monday': 'יום שני',
  'Tuesday': 'יום שלישי',
  'Wednesday': 'יום רביעי',
  'Thursday': 'יום חמישי',
  'Friday': 'יום שישי',
  'Saturday': 'שבת',
  'Sunday': 'יום ראשון',
  'Mon': 'שני',
  'Tue': 'שלישי',
  'Wed': 'רביעי',
  'Thu': 'חמישי',
  'Fri': 'שישי',
  'Sat': 'שבת',
  'Sun': 'ראשון',
};

// Status translations
export const statusTranslations: Record<string, string> = {
  'Applied': 'הוגש',
  'Under Review': 'בבדיקה',
  'Interviewing': 'בראיון',
  'Rejected': 'נדחה',
  'Offer': 'הצעה',
  'Accepted': 'התקבל',
  'Declined': 'סורב',
  'Withdrawn': 'נמשך',
};

// Source translations
export const sourceTranslations: Record<string, string> = {
  'LinkedIn': 'לינקדאין',
  'Company Website': 'אתר החברה',
  'Referral': 'המלצה',
  'Job Board': 'לוח משרות',
  'Recruiter': 'מגייס',
  'Other': 'אחר',
};

// Interview stage translations
export const stageTranslations: Record<string, string> = {
  'Phone Screen': 'סינון טלפוני',
  'Technical': 'טכני',
  'Behavioral': 'התנהגותי',
  'Final': 'סופי',
  'HR': 'משאבי אנוש',
  'Panel': 'פאנל',
};

// Legend translations
export const legendTranslations: Record<string, string> = {
  'applications': 'מועמדויות',
  'interviews': 'ראיונות',
  'offers': 'הצעות',
  'responses': 'תגובות',
  'Applications': 'מועמדויות',
  'Interviews': 'ראיונות',
  'Offers': 'הצעות',
  'Responses': 'תגובות',
};

/**
 * Translate a week label (e.g., "Week 5" -> "שבוע 5")
 */
export function translateWeek(week: string, isRTL: boolean): string {
  if (!isRTL) return week;
  
  const match = week.match(/Week (\d+)/i);
  if (match) {
    return `שבוע ${match[1]}`;
  }
  return week;
}

/**
 * Translate day name
 */
export function translateDay(day: string, isRTL: boolean): string {
  if (!isRTL) return day;
  return dayTranslations[day] || day;
}

/**
 * Translate status
 */
export function translateStatus(status: string, isRTL: boolean): string {
  if (!isRTL) return status;
  return statusTranslations[status] || status;
}

/**
 * Translate source
 */
export function translateSource(source: string, isRTL: boolean): string {
  if (!isRTL) return source;
  return sourceTranslations[source] || source;
}

/**
 * Translate stage
 */
export function translateStage(stage: string, isRTL: boolean): string {
  if (!isRTL) return stage;
  return stageTranslations[stage] || stage;
}

/**
 * Translate legend label
 */
export function translateLegend(label: string, isRTL: boolean): string {
  if (!isRTL) return label;
  return legendTranslations[label] || label;
}

/**
 * Translate the best day to apply
 */
export function translateBestDay(day: string, isRTL: boolean): string {
  if (!isRTL) return day;
  return dayTranslations[day] || day;
}

/**
 * Transform chart data array with translations
 */
export function translateChartData<T extends Record<string, unknown>>(
  data: T[],
  keyMap: Record<string, (value: unknown, isRTL: boolean) => unknown>,
  isRTL: boolean
): T[] {
  if (!isRTL) return data;
  
  return data.map(item => {
    const translated: Record<string, unknown> = { ...item };
    Object.keys(keyMap).forEach(key => {
      if (key in translated) {
        translated[key] = keyMap[key](translated[key], isRTL);
      }
    });
    return translated as T;
  });
}
