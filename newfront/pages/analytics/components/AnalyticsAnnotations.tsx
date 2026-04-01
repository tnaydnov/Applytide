/**
 * Analytics Interactive Hover Guide
 * Matches PageAnnotations with exact design from other pages
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { createPortal } from 'react-dom';
import type { AnalyticsCategory } from '../AnalyticsPage';

interface Annotation {
  id: string;
  selector: string;
  title: {
    en: string;
    he: string;
  };
  description: {
    en: string;
    he: string;
  };
  color: string;
  priority: number;
  categories?: AnalyticsCategory[];
}

interface AnalyticsAnnotationsProps {
  isActive: boolean;
  onClose: () => void;
  isRTL: boolean;
  activeCategory: AnalyticsCategory;
}

const annotations: Annotation[] = [
  // Global UI Elements
  {
    id: 'hamburger-menu',
    selector: '[data-tour="hamburger-menu"]',
    title: { en: 'Menu', he: 'תפריט' },
    description: {
      en: 'Toggle sidebar navigation to access all app sections',
      he: 'פתח את תפריט הניווט לגישה לכל חלקי האפליקציה',
    },
    color: '#6366F1',
    priority: 1,
  },
  {
    id: 'logo',
    selector: '[data-tour="logo-brand"]',
    title: { en: 'Applytide Logo', he: 'לוגו Applytide' },
    description: {
      en: 'Click to return to dashboard home',
      he: 'לחץ כדי לחזור לדף הבית',
    },
    color: '#8B5CF6',
    priority: 2,
  },
  {
    id: 'language-selector',
    selector: '[data-tour="language-selector"]',
    title: { en: 'Language', he: 'שפה' },
    description: {
      en: 'Switch between English and Hebrew',
      he: 'החלף בין אנגלית לעברית',
    },
    color: '#06B6D4',
    priority: 3,
  },
  {
    id: 'user-menu',
    selector: '[data-tour="user-menu"]',
    title: { en: 'Profile', he: 'פרופיל' },
    description: {
      en: 'Access your account settings and preferences',
      he: 'גישה להגדרות החשבון וההעדפות שלך',
    },
    color: '#10B981',
    priority: 4,
  },
  
  // Page Header & Controls
  {
    id: 'page-header',
    selector: '[data-tour="page-header"]',
    title: { en: 'Analytics Dashboard', he: 'לוח בקרת אנליטיקס' },
    description: {
      en: 'Comprehensive analytics and insights for your entire job search journey',
      he: 'ניתוח נתונים ותובנות מקיפים למסע חיפוש העבודה שלך',
    },
    color: '#9F5F80',
    priority: 5,
  },
  {
    id: 'demo-mode',
    selector: '[data-tour="demo-mode"]',
    title: { en: 'Demo Mode', he: 'מצב הדגמה' },
    description: {
      en: 'Explore analytics with 127 sample applications to see all features in action',
      he: 'חקור אנליטיקס עם 127 מועמדויות לדוגמה כדי לראות את כל הפיצ\'רים בפעולה',
    },
    color: '#F59E0B',
    priority: 6,
  },
  {
    id: 'date-range',
    selector: '[data-tour="date-range"]',
    title: { en: 'Date Range Filter', he: 'סינון טווח תאריכים' },
    description: {
      en: 'Select custom date ranges to analyze specific periods - last 7 days, 30 days, or custom range',
      he: 'בחר טווחי תאריכים מותאמים אישית לניתוח תקופות ספציפיות - 7 ימים אחרונים, 30 ימים או טווח מותאם',
    },
    color: '#8B5CF6',
    priority: 7,
  },
  {
    id: 'export-data',
    selector: '[data-tour="export-data"]',
    title: { en: 'Export Analytics', he: 'ייצוא אנליטיקס' },
    description: {
      en: 'Download your complete analytics data as PDF/CSV for offline analysis and record keeping',
      he: 'הורד את נתוני האנליטיקס המלאים שלך כ-PDF/CSV לניתוח אופליין ושמירת רשומות',
    },
    color: '#10B981',
    priority: 8,
  },

  // Category Tabs - Individual highlights for each tab
  {
    id: 'tab-overview',
    selector: '[data-tour="category-tabs"] button:nth-child(1)',
    title: { en: 'Overview Tab', he: 'טאב סקירה' },
    description: {
      en: 'High-level metrics: total applications, response rate, interview rate, offer rate, and weekly trends',
      he: 'מדדים כלליים: סך מועמדויות, שיעור תגובה, שיעור ראיונות, שיעור הצעות ומגמות שבועיות',
    },
    color: '#EC4899',
    priority: 9,
  },
  {
    id: 'tab-applications',
    selector: '[data-tour="category-tabs"] button:nth-child(2)',
    title: { en: 'Applications Tab', he: 'טאב מועמדויות' },
    description: {
      en: 'Deep dive into application data: daily trends, status distribution, and submission patterns by day of week',
      he: 'התעמקות בנתוני מועמדויות: מגמות יומיות, התפלגות סטטוסים ודפוסי שליחה לפי יום בשבוע',
    },
    color: '#3B82F6',
    priority: 10,
  },
  {
    id: 'tab-companies',
    selector: '[data-tour="category-tabs"] button:nth-child(3)',
    title: { en: 'Companies Tab', he: 'טאב חברות' },
    description: {
      en: 'Company-specific analytics: top companies applied to, response rates by company, and success metrics',
      he: 'אנליטיקס ספציפי לחברות: חברות מובילות שהגעת אליהן, שיעורי תגובה לפי חברה ומדדי הצלחה',
    },
    color: '#8B5CF6',
    priority: 11,
  },
  {
    id: 'tab-timeline',
    selector: '[data-tour="category-tabs"] button:nth-child(4)',
    title: { en: 'Timeline Tab', he: 'טאב ציר זמן' },
    description: {
      en: 'Chronological view: application timeline, monthly patterns, key milestones in your job search journey',
      he: 'תצוגה כרונולוגית: ציר זמן מועמדויות, דפוסים חודשיים ואבני דרך מרכזיות במסע חיפוש העבודה',
    },
    color: '#10B981',
    priority: 12,
  },
  {
    id: 'tab-best-time',
    selector: '[data-tour="category-tabs"] button:nth-child(5)',
    title: { en: 'Best Time Tab', he: 'טאב זמן מיטבי' },
    description: {
      en: 'Timing optimization: best days and hours to apply, response rate correlation with submission time',
      he: 'אופטימיזציה של תזמון: ימים ושעות מיטביים להגשה, מתאם שיעור תגובה עם זמן שליחה',
    },
    color: '#F59E0B',
    priority: 13,
  },
  {
    id: 'tab-sources',
    selector: '[data-tour="category-tabs"] button:nth-child(6)',
    title: { en: 'Sources Tab', he: 'טאב מקורות' },
    description: {
      en: 'Platform analytics: job source distribution, response rates by platform, quality score per source',
      he: 'אנליטיקס פלטפורמות: התפלגות מקורות משרות, שיעורי תגובה לפי פלטפורמה, ציון איכות למקור',
    },
    color: '#EC4899',
    priority: 14,
  },
  {
    id: 'tab-interviews',
    selector: '[data-tour="category-tabs"] button:nth-child(7)',
    title: { en: 'Interviews Tab', he: 'טאב ראיונות' },
    description: {
      en: 'Interview performance: conversion funnel, interview types breakdown, success rates by stage',
      he: 'ביצועי ראיונות: משprech המרה, פילוח סוגי ראיונות, שיעורי הצלחה לפי שלב',
    },
    color: '#9F5F80',
    priority: 15,
  },

  // Overview Tab - KPIs
  {
    id: 'total-applications-kpi',
    selector: '[data-tour="kpi-cards"] > div:nth-child(1)',
    title: { en: 'Total Applications', he: 'סך המועמדויות' },
    description: {
      en: 'Total number of job applications submitted - tracks your overall job search activity and volume',
      he: 'מספר כולל של מועמדויות העבודה שנשלחו - עוקב אחר פעילות ונח חיפוש העבודה הכוללת',
    },
    color: '#9F5F80',
    priority: 16,
    categories: ['overview'],
  },
  {
    id: 'response-rate-kpi',
    selector: '[data-tour="kpi-cards"] > div:nth-child(2)',
    title: { en: 'Response Rate', he: 'שיעור תגובה' },
    description: {
      en: 'Percentage of applications that received any response - higher is better, aim for 20%+ industry standard',
      he: 'אחוז המועמדויות שקיבלו כל תגובה - גבוה יותר זה טוב יותר, שאף ל-20%+ כתקן בתעשייה',
    },
    color: '#3B82F6',
    priority: 17,
    categories: ['overview'],
  },
  {
    id: 'interview-rate-kpi',
    selector: '[data-tour="kpi-cards"] > div:nth-child(3)',
    title: { en: 'Interview Rate', he: 'שיעור ראיונות' },
    description: {
      en: 'Percentage of applications that led to interviews - measures how compelling your CV and cover letters are',
      he: 'אחוז המועמדויות שהובילו לראיונות - מודד כמה משכנעים קורות החיים ומכתבי המקדים שלך',
    },
    color: '#8B5CF6',
    priority: 18,
    categories: ['overview'],
  },
  {
    id: 'offer-rate-kpi',
    selector: '[data-tour="kpi-cards"] > div:nth-child(4)',
    title: { en: 'Offer Rate', he: 'שיעור הצעות' },
    description: {
      en: 'Percentage of interviews that resulted in job offers - directly measures your interview performance',
      he: 'אחוז הראיונות שהביאו להצעות עבודה - מודד ישירות את ביצועי הראיונות שלך',
    },
    color: '#10B981',
    priority: 19,
    categories: ['overview'],
  },

  // Overview Tab - Charts
  {
    id: 'weekly-trend',
    selector: '[data-tour="weekly-trend"]',
    title: { en: 'Weekly Application Trend', he: 'מגמת מועמדויות שבועית' },
    description: {
      en: 'Line chart showing application volume over weeks - spot patterns, maintain consistency, identify productive periods',
      he: 'גרף קווי המציג נפח מועמדויות לאורך שבועות - זהה דפוסים, שמור על עקביות, זהה תקופות פרודוקטיביות',
    },
    color: '#3B82F6',
    priority: 20,
    categories: ['overview'],
  },
  {
    id: 'status-breakdown',
    selector: '[data-tour="status-breakdown"]',
    title: { en: 'Status Breakdown', he: 'פילוח סטטוסים' },
    description: {
      en: 'Pie chart of application statuses: Applied, In Progress, Interview Scheduled, Offer Received, Rejected',
      he: 'תרשים עוגה של סטטוסי מועמדויות: הוגש, בתהליך, ראיון מתוכנן, הצעה התקבלה, נדחה',
    },
    color: '#8B5CF6',
    priority: 21,
    categories: ['overview'],
  },
  {
    id: 'top-companies-overview',
    selector: '[data-tour="top-companies-overview"]',
    title: { en: 'Top Companies', he: 'חברות מובילות' },
    description: {
      en: 'Bar chart showing companies with most applications - identify where you\'re focusing your efforts',
      he: 'גרף עמודות המציג חברות עם הכי הרבה מועמדויות - זהה איפה אתה ממקד את המאמצים שלך',
    },
    color: '#EC4899',
    priority: 22,
    categories: ['overview'],
  },
  {
    id: 'avg-response-time-card',
    selector: '[data-tour="avg-response-time-card"]',
    title: { en: 'Average Response Time', he: 'זמן תגובה ממוצע' },
    description: {
      en: 'Average days from application to first response - helps set realistic expectations (typically 7-14 days)',
      he: 'ימים ממוצעים ממועמדות לתגובה ראשונה - עוזר להגדיר ציפיות ריאליות (בדרך כלל 7-14 ימים)',
    },
    color: '#3B82F6',
    priority: 23,
    categories: ['overview'],
  },
  {
    id: 'unique-companies-card',
    selector: '[data-tour="unique-companies-card"]',
    title: { en: 'Unique Companies', he: 'חברות ייחודיות' },
    description: {
      en: 'Number of distinct companies you\'ve applied to - diversification indicates broad search strategy',
      he: 'מספר החברות השונות שהגעת אליהן - פיזור מצביע על אסטרטגיית חיפוש רחבה',
    },
    color: '#8B5CF6',
    priority: 24,
    categories: ['overview'],
  },
  {
    id: 'offers-received-card',
    selector: '[data-tour="offers-received-card"]',
    title: { en: 'Offers Received', he: 'הצעות שהתקבלו' },
    description: {
      en: 'Total job offers received - the ultimate success metric of your entire job search effort',
      he: 'סך הצעות העבודה שהתקבלו - מדד ההצלחה האולטימטיבי של כל מאמץ חיפוש העבודה',
    },
    color: '#10B981',
    priority: 25,
    categories: ['overview'],
  },

  // Applications Tab
  {
    id: 'daily-trend',
    selector: '[data-tour="daily-trend"]',
    title: { en: 'Daily Application Trend', he: 'מגמה יומית' },
    description: {
      en: 'Line chart tracking daily submissions - identify your most productive days and maintain application momentum',
      he: 'גרף קווי העוקב אחר שליחות יומיות - זהה את הימים הפרודוקטיביים ביותר ושמור על מומנטום מועמדויות',
    },
    color: '#9F5F80',
    priority: 26,
    categories: ['applications'],
  },
  {
    id: 'status-distribution-apps',
    selector: '[data-tour="status-distribution"]',
    title: { en: 'Status Distribution', he: 'התפלגות סטטוסים' },
    description: {
      en: 'Pie chart showing where your applications currently stand - visualize conversion through your pipeline',
      he: 'תרשים עוגה המציג איפה המועמדויות שלך נמצאות כעת - הצג את ההמרה דרך הפייפליין שלך',
    },
    color: '#3B82F6',
    priority: 27,
    categories: ['applications'],
  },
  {
    id: 'applications-by-day',
    selector: '[data-tour="applications-by-day"]',
    title: { en: 'By Day of Week', he: 'לפי יום בשבוע' },
    description: {
      en: 'Bar chart of application volume by weekday - optimize your schedule by applying on your most successful days',
      he: 'גרף עמודות של נפח מועמדויות לפי יום - מטב את לוח הזמינו על ידי הגשה בימים המוצלחים ביותר',
    },
    color: '#8B5CF6',
    priority: 28,
    categories: ['applications'],
  },

  // Companies Tab
  {
    id: 'top-companies',
    selector: '[data-tour="top-companies"]',
    title: { en: 'Top Companies', he: 'חברות מובילות' },
    description: {
      en: 'Bar chart showing companies with most applications and their response rates - focus on responsive employers',
      he: 'גרף עמודות המציג חברות עם הכי הרבה מועמדויות ושיעורי התגובה שלהן - התמקד במעסיקים רספונסיביים',
    },
    color: '#EC4899',
    priority: 29,
    categories: ['companies'],
  },

  // Timeline Tab - Individual KPI Cards
  {
    id: 'time-to-response-card',
    selector: '[data-tour="time-to-response-card"]',
    title: { en: 'Time to Response', he: 'זמן לתגובה' },
    description: {
      en: 'Average days from application submission to first employer response - industry average is 7-14 days',
      he: 'ימים ממוצעים מהגשת מועמדות לתגובה ראשונה מהמעסיק - הממוצע בתעשייה הוא 7-14 ימים',
    },
    color: '#3B82F6',
    priority: 30,
    categories: ['timeline'],
  },
  {
    id: 'time-to-interview-card',
    selector: '[data-tour="time-to-interview-card"]',
    title: { en: 'Time to Interview', he: 'זמן לראיון' },
    description: {
      en: 'Average days from application to interview invitation - track your pipeline velocity and conversion speed',
      he: 'ימים ממוצעים ממועמדות להזמנה לראיון - עקוב אחר מהירות הפייפליין ומהירות ההמרה שלך',
    },
    color: '#8B5CF6',
    priority: 31,
    categories: ['timeline'],
  },
  {
    id: 'time-to-offer-card',
    selector: '[data-tour="time-to-offer-card"]',
    title: { en: 'Time to Offer', he: 'זמן להצעה' },
    description: {
      en: 'Average days from application to job offer - complete hiring cycle duration from start to finish',
      he: 'ימים ממוצעים ממועמדות להצעת עבודה - משך מחזור הגיוס המלא מהתחלה לסוף',
    },
    color: '#10B981',
    priority: 32,
    categories: ['timeline'],
  },
  {
    id: 'timeline-chart',
    selector: '[data-tour="timeline-chart"]',
    title: { en: 'Timeline Visualization', he: 'ויזואליזציית ציר זמן' },
    description: {
      en: 'Chronological view of your job search: applications, interviews, and offers plotted over time - identify gaps and patterns',
      he: 'תצוגה כרונולוגית של חיפוש העבודה: מועמדויות, ראיונות והצעות על ציר זמן - זהה פערים ודפוסים',
    },
    color: '#9F5F80',
    priority: 33,
    categories: ['timeline'],
  },

  // Best Time Tab
  {
    id: 'best-day-card',
    selector: '[data-tour="best-day-card"]',
    title: { en: 'Best Day to Apply', he: 'יום מיטבי להגשה' },
    description: {
      en: 'Data shows which day of the week yields highest response rates - typically Tuesday-Wednesday work best',
      he: 'הנתונים מראים באיזה יום בשבוע מתקבלים שיעורי תגובה גבוהים ביותר - בדרך כלל יום ג׳-ד׳ הכי טובים',
    },
    color: '#F59E0B',
    priority: 34,
    categories: ['best-time'],
  },
  {
    id: 'best-time-card',
    selector: '[data-tour="best-time-card"]',
    title: { en: 'Best Time to Apply', he: 'שעה מיטבית להגשה' },
    description: {
      en: 'Optimal hour of day to submit applications - morning hours (8-10 AM) typically perform best',
      he: 'שעה אופטימלית ביום להגשת מועמדות - שעות הבוקר (8-10) בדרך כלל עובדות הכי טוב',
    },
    color: '#8B5CF6',
    priority: 35,
    categories: ['best-time'],
  },
  {
    id: 'response-rate-by-day',
    selector: '[data-tour="response-rate-by-day"]',
    title: { en: 'Response Rate by Day', he: 'שיעור תגובה לפי יום' },
    description: {
      en: 'Bar chart showing response rates for each day of the week - use this to optimize your application schedule',
      he: 'גרף עמודות המציג שיעורי תגובה לכל יום בשבוע - השתמש בזה כדי לבצע אופטימיזציה ללוח הזמנים שלך',
    },
    color: '#9F5F80',
    priority: 36,
    categories: ['best-time'],
  },

  // Sources Tab
  {
    id: 'source-breakdown',
    selector: '[data-tour="source-breakdown"]',
    title: { en: 'Source Breakdown', he: 'פילוח מקורות' },
    description: {
      en: 'Pie chart showing distribution of applications across job platforms - LinkedIn, Indeed, company sites, referrals, etc.',
      he: 'תרשים עוגה המציג התפלגות מועמדויות על פני פלטפורמות משרות - לינקדאין, אינדיד, אתרי חברה, הפניות וכו׳',
    },
    color: '#3B82F6',
    priority: 37,
    categories: ['sources'],
  },
  {
    id: 'source-performance',
    selector: '[data-tour="source-performance"]',
    title: { en: 'Source Performance', he: 'ביצועי מקורות' },
    description: {
      en: 'Compare platform effectiveness: applications vs interviews vs offers per source - double down on what works',
      he: 'השווה יעילות פלטפורמות: מועמדויות מול ראיונות מול הצעות לפי מקור - הכפל מאמצים במה שעובד',
    },
    color: '#10B981',
    priority: 38,
    categories: ['sources'],
  },

  // Interviews Tab - Individual KPI Cards
  {
    id: 'total-interviews-card',
    selector: '[data-tour="total-interviews-card"]',
    title: { en: 'Total Interviews', he: 'סה"כ ראיונות' },
    description: {
      en: 'Total number of interviews conducted across all applications - measures your application-to-interview conversion',
      he: 'מספר כולל של ראיונות שנערכו על פני כל המועמדויות - מודד את ההמרה ממועמדות לראיון',
    },
    color: '#3B82F6',
    priority: 39,
    categories: ['interviews'],
  },
  {
    id: 'scheduled-interviews-card',
    selector: '[data-tour="scheduled-interviews-card"]',
    title: { en: 'Scheduled Interviews', he: 'ראיונות מתוזמנים' },
    description: {
      en: 'Upcoming interviews on your calendar - actively prepare for these critical opportunities',
      he: 'ראיונות עתידיים בלוח השנה שלך - התכונן באופן אקטיבי להזדמנויות קריטיות אלו',
    },
    color: '#8B5CF6',
    priority: 40,
    categories: ['interviews'],
  },
  {
    id: 'success-rate-card',
    selector: '[data-tour="success-rate-card"]',
    title: { en: 'Interview Success Rate', he: 'שיעור הצלחה בראיונות' },
    description: {
      en: 'Percentage of interviews that resulted in offers - directly measures your interview performance quality',
      he: 'אחוז הראיונות שהביאו להצעות - מודד ישירות את איכות ביצועי הראיונות שלך',
    },
    color: '#10B981',
    priority: 41,
    categories: ['interviews'],
  },
  {
    id: 'interviews-by-stage',
    selector: '[data-tour="interviews-by-stage"]',
    title: { en: 'Interviews by Stage', he: 'ראיונות לפי שלב' },
    description: {
      en: 'Pie chart breakdown: phone screen, technical, behavioral, final round - see where candidates typically drop off',
      he: 'פילוח תרשים עוגה: סינון טלפוני, טכני, התנהגותי, סיבוב אחרון - ראה איפה מועמדים בדרך כלל נושרים',
    },
    color: '#8B5CF6',
    priority: 42,
    categories: ['interviews'],
  },
  {
    id: 'interviews-by-company',
    selector: '[data-tour="interviews-by-company"]',
    title: { en: 'Interviews by Company', he: 'ראיונות לפי חברה' },
    description: {
      en: 'Bar chart showing which companies are interviewing you most - track your progress with specific employers',
      he: 'גרף עמודות המציג אילו חברות מראיינות אותך הכי הרבה - עקוב אחר ההתקדמות שלך עם מעסיקים ספציפיים',
    },
    color: '#EC4899',
    priority: 43,
    categories: ['interviews'],
  },

  // OLD - Keeping for backward compatibility
  {
    id: 'timeline-kpi-cards',
    selector: '[data-tour="timeline-kpi-cards"]',
    title: { en: 'Timeline Metrics', he: 'מדדי ציר זמן' },
    description: {
      en: '3 critical time metrics: Time to Response, Time to Interview, Time to Offer - understand your hiring pipeline velocity',
      he: '3 מדדי זמן קריטיים: זמן לתגובה, זמן לראיון, זמן להצעה - הבן את מהירות הפייפליין שלך',
    },
    color: '#3B82F6',
    priority: 29,
    categories: ['timeline'],
  },
];

export function AnalyticsAnnotations({
  isActive,
  onClose,
  isRTL,
  activeCategory,
}: AnalyticsAnnotationsProps) {
  const [elementPositions, setElementPositions] = useState<Map<string, DOMRect>>(new Map());
  const [hoveredAnnotation, setHoveredAnnotation] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const borderRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const frameIdRef = useRef<number>();

  // Filter annotations based on active category
  const filteredAnnotations = annotations.filter(a => {
    // Always show general annotations (no category restriction)
    if (!a.categories) return true;
    // Show category-specific annotations
    return a.categories.includes(activeCategory);
  });

  // Initial positions
  const updatePositions = () => {
    if (!isActive) return;

    const positions = new Map<string, DOMRect>();
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    filteredAnnotations.forEach((annotation) => {
      const element = document.querySelector(annotation.selector);
      if (element) {
        const rect = element.getBoundingClientRect();
        if (isRTL && scrollbarWidth > 0) {
          const adjustedRect = {
            ...rect.toJSON(),
            left: rect.left - scrollbarWidth,
            right: rect.right - scrollbarWidth,
            x: rect.x - scrollbarWidth,
          } as DOMRect;
          positions.set(annotation.id, adjustedRect);
        } else {
          positions.set(annotation.id, rect);
        }
      }
    });

    setElementPositions(positions);
  };

  // Initial setup
  useEffect(() => {
    if (!isActive) return;
    const timerId = setTimeout(() => {
      updatePositions();
    }, 100);
    return () => clearTimeout(timerId);
  }, [isActive, activeCategory]);

  // Continuous RAF loop for smooth scroll
  useEffect(() => {
    if (!isActive) return;

    const animate = () => {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      filteredAnnotations.forEach((annotation) => {
        const element = document.querySelector(annotation.selector);
        const borderEl = borderRefs.current.get(annotation.id);

        if (element && borderEl) {
          const rect = element.getBoundingClientRect();

          let left = rect.left;
          if (isRTL && scrollbarWidth > 0) {
            left -= scrollbarWidth;
          }

          borderEl.style.left = `${left}px`;
          borderEl.style.top = `${rect.top}px`;
          borderEl.style.width = `${rect.width}px`;
          borderEl.style.height = `${rect.height}px`;
        }
      });

      frameIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    window.addEventListener('resize', updatePositions);

    return () => {
      window.removeEventListener('resize', updatePositions);
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
    };
  }, [isActive, isRTL, activeCategory, filteredAnnotations]);

  if (!isActive) return null;

  const isElementVisible = (rect: DOMRect): boolean => {
    if (isMobile) {
      return rect.width > 0 && rect.height > 0;
    }
    return (
      rect.top < window.innerHeight &&
      rect.bottom > 0 &&
      rect.left < window.innerWidth &&
      rect.right > 0
    );
  };

  const content = (
    <>
      <AnimatePresence>
        {isActive && (
          <>
            {/* Backdrop Blur - Using Portal to render directly on body */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[200]"
              onClick={onClose}
            />

            {/* Bottom Instructions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-20 md:bottom-6 left-1/2 transform -translate-x-1/2 z-[250] pointer-events-none px-4"
            >
              <div className="bg-[#383e4e] text-white px-4 md:px-6 py-3 md:py-4 rounded-2xl shadow-2xl border-2 border-[#9F5F80]/50 flex items-center gap-2 md:gap-3">
                <Sparkles className="h-4 md:h-5 w-4 md:w-5 text-[#9F5F80] flex-shrink-0" />
                <p className="text-xs md:text-sm font-medium">
                  {isRTL
                    ? isMobile 
                      ? 'גע באלמנטים ללמידה'
                      : 'גרור מעל האלמנטים כדי ללמוד עליהם'
                    : isMobile
                      ? 'Tap elements to learn'
                      : 'Hover over highlighted elements to see explanations'}
                </p>
              </div>
            </motion.div>

            {/* Exit Button */}
            <div className="fixed bottom-4 md:bottom-6 right-4 md:right-6 z-[250]">
              <Button
                onClick={onClose}
                size={isMobile ? 'default' : 'lg'}
                className="bg-[#9F5F80] hover:bg-[#8a5270] text-white shadow-xl rounded-full px-4 md:px-6 py-2 md:py-3 flex items-center gap-2"
              >
                <X className="h-4 md:h-5 w-4 md:w-5" />
                <span className="text-sm md:text-base">{isRTL ? 'סגור' : 'Exit'}</span>
              </Button>
            </div>

            {/* Annotations */}
            {filteredAnnotations.map((annotation, index) => {
              const rect = elementPositions.get(annotation.id);
              if (!rect || !isElementVisible(rect)) return null;

              const isHovered = hoveredAnnotation === annotation.id;

              return (
                <React.Fragment key={annotation.id}>
                  {/* Highlighted Border + Number Badge */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.03 }}
                    className="fixed pointer-events-auto cursor-pointer"
                    style={{
                      left: `${rect.left}px`,
                      top: `${rect.top}px`,
                      width: `${rect.width}px`,
                      height: `${rect.height}px`,
                      zIndex: 220 + index,
                      outline: isMobile ? `2px solid ${annotation.color}` : `3px solid ${annotation.color}`,
                      outlineOffset: isMobile ? '-2px' : '-3px',
                      borderRadius: isMobile ? '8px' : '12px',
                      boxShadow: `0 0 0 2px rgba(0,0,0,0.1), 0 0 ${isMobile ? '12px' : '20px'} ${annotation.color}40`,
                    }}
                    onMouseEnter={() => !isMobile && setHoveredAnnotation(annotation.id)}
                    onMouseLeave={() => !isMobile && setHoveredAnnotation(null)}
                    onClick={() => isMobile && setHoveredAnnotation(isHovered ? null : annotation.id)}
                    ref={(el) => {
                      if (el) borderRefs.current.set(annotation.id, el);
                    }}
                  >
                    {/* Number Badge */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.03 + 0.1, type: 'spring', stiffness: 300 }}
                      className={`absolute ${isMobile ? '-top-2 w-6 h-6' : '-top-3 w-8 h-8'} rounded-full flex items-center justify-center text-white font-bold shadow-lg ${
                        isRTL ? (isMobile ? '-right-2' : '-right-3') : (isMobile ? '-left-2' : '-left-3')
                      }`}
                      style={{
                        backgroundColor: annotation.color,
                        fontSize: isMobile ? '11px' : '14px',
                      }}
                    >
                      {index + 1}
                    </motion.div>

                    {/* Pulse effect when hovered */}
                    {isHovered && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.3, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="absolute inset-0 rounded-xl"
                        style={{
                          backgroundColor: annotation.color,
                        }}
                      />
                    )}
                  </motion.div>

                  {/* Tooltip on hover/tap */}
                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className="fixed pointer-events-none z-[250]"
                        style={
                          isMobile
                            ? {
                                left: '16px',
                                right: '16px',
                                width: 'auto',
                                maxWidth: 'calc(100vw - 32px)',
                                ...(rect.top > window.innerHeight / 2
                                  ? {
                                      bottom: `${window.innerHeight - rect.top + 8}px`,
                                      top: 'auto',
                                    }
                                  : {
                                      top: `${rect.bottom + 8}px`,
                                      bottom: 'auto',
                                    }),
                              }
                            : {
                                left: `${Math.min(rect.right + 16, window.innerWidth - 300)}px`,
                                top: `${Math.max(80, Math.min(rect.top + rect.height / 2, window.innerHeight - 150))}px`,
                                transform: 'translateY(-50%)',
                                maxWidth: '280px',
                              }
                        }
                      >
                        <div
                          className="rounded-2xl p-3 md:p-4 shadow-2xl border-2"
                          style={{
                            backgroundColor: 'rgba(56, 62, 78, 0.98)',
                            borderColor: annotation.color,
                          }}
                        >
                          {/* Title */}
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
                              style={{ backgroundColor: annotation.color }}
                            >
                              {index + 1}
                            </div>
                            <h3
                              className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-white`}
                              style={{ direction: isRTL ? 'rtl' : 'ltr' }}
                            >
                              {annotation.title[isRTL ? 'he' : 'en']}
                            </h3>
                          </div>

                          {/* Description */}
                          <p
                            className={`${isMobile ? 'text-xs' : 'text-sm'} text-white/80`}
                            style={{ direction: isRTL ? 'rtl' : 'ltr' }}
                          >
                            {annotation.description[isRTL ? 'he' : 'en']}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              );
            })}
          </>
        )}
      </AnimatePresence>
    </>
  );

  return createPortal(content, document.body);
}