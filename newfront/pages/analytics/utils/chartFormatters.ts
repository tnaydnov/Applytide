/**
 * Chart Formatting Utilities
 * Consistent date and number formatting for all analytics charts
 */

/**
 * Format date for chart X-axis
 * Shows: MMM DD (for same year) or MMM DD, YYYY (for different years)
 */
export const formatChartDate = (dateStr: string, isRTL: boolean = false): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const showYear = date.getFullYear() !== now.getFullYear();
  
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    ...(showYear && { year: 'numeric' }),
  };
  
  return date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', options);
};

/**
 * Format date for chart X-axis with conditional year
 * Automatically shows year if data spans multiple years
 */
export const formatChartDateSmart = (
  dateStr: string,
  allDates: string[],
  isRTL: boolean = false
): string => {
  const date = new Date(dateStr);
  const years = new Set(allDates.map(d => new Date(d).getFullYear()));
  const showYear = years.size > 1;
  
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    ...(showYear && { year: 'numeric' }),
  };
  
  return date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', options);
};

/**
 * Custom tick formatter for recharts
 */
export const createDateTickFormatter = (allDates: string[], isRTL: boolean = false) => {
  return (value: string) => formatChartDateSmart(value, allDates, isRTL);
};

/**
 * Format number with locale-specific separators
 */
export const formatNumber = (num: number, isRTL: boolean = false): string => {
  return num.toLocaleString(isRTL ? 'he-IL' : 'en-US');
};

/**
 * Format percentage
 */
export const formatPercentage = (num: number): string => {
  return `${num.toFixed(1)}%`;
};
