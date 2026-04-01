/**
 * Reminders Interactive Hover Guide - Mobile + Desktop Responsive
 * COMPREHENSIVE: All page elements included
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useIsMobile } from '../../../hooks/useIsMobile';
import type { ViewMode } from '../RemindersPage';

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
}

interface RemindersAnnotationsProps {
  isActive: boolean;
  onClose: () => void;
  isRTL: boolean;
  viewMode: ViewMode;
}

const baseAnnotations: Annotation[] = [
  // Navigation & Header Elements
  {
    id: 'hamburger-menu',
    selector: '[data-tour="hamburger-menu"]',
    title: { en: 'Menu', he: 'תפריט' },
    description: {
      en: 'Open the navigation menu to access all pages',
      he: 'פתח את תפריט הניווט לגישה לכל העמודים',
    },
    color: '#6B7280',
    priority: 1,
  },
  {
    id: 'logo-brand',
    selector: '[data-tour="logo-brand"]',
    title: { en: 'Applytide Logo', he: 'לוגו Applytide' },
    description: {
      en: 'Click to return to the dashboard homepage',
      he: 'לחץ לחזרה לעמוד הבית',
    },
    color: '#9F5F80',
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
    color: '#3B82F6',
    priority: 3,
  },
  {
    id: 'user-menu',
    selector: '[data-tour="user-menu"]',
    title: { en: 'Profile', he: 'פרופיל' },
    description: {
      en: 'Access your profile, settings, and logout',
      he: 'גישה לפרופיל, הגדרות והתנתקות',
    },
    color: '#8B5CF6',
    priority: 4,
  },

  // Page Header & Actions
  {
    id: 'page-header',
    selector: '[data-tour="page-header"]',
    title: { en: 'Reminders Header', he: 'כותרת תזכורות' },
    description: {
      en: 'Page title and description - manage interviews, follow-ups, and reminders',
      he: 'כותרת העמוד ותיאור - נהל ראיונות, מעקבים ותזכורות',
    },
    color: '#9F5F80',
    priority: 5,
  },
  {
    id: 'google-calendar-sync',
    selector: '[data-tour="google-calendar-sync"]',
    title: { en: 'Google Calendar', he: 'Google Calendar' },
    description: {
      en: 'Sync your reminders with Google Calendar for universal access',
      he: 'סנכרן תזכורות עם Google Calendar לגישה אוניברסלית',
    },
    color: '#4285F4',
    priority: 6,
  },
  {
    id: 'export-ics',
    selector: '[data-tour="export-ics"]',
    title: { en: 'Export ICS', he: 'ייצוא ICS' },
    description: {
      en: 'Download your reminders as an ICS file to import into any calendar app',
      he: 'הורד תזכורות כקובץ ICS לייבוא לכל אפליקציית יומן',
    },
    color: '#10B981',
    priority: 7,
  },
  {
    id: 'refresh',
    selector: '[data-tour="refresh"]',
    title: { en: 'Refresh', he: 'רענן' },
    description: {
      en: 'Reload reminders from the server',
      he: 'טען מחדש תזכורות מהשרת',
    },
    color: '#6B7280',
    priority: 8,
  },
  {
    id: 'new-reminder',
    selector: '[data-tour="new-reminder"]',
    title: { en: 'New Reminder', he: 'תזכורת חדשה' },
    description: {
      en: 'Create a new reminder for interviews, deadlines, or follow-ups',
      he: 'צור תזכורת חדשה לראיונות, תאריכי יעד או מעקבים',
    },
    color: '#9F5F80',
    priority: 9,
  },

  // Stats Cards
  {
    id: 'stat-today',
    selector: '[data-tour="stat-today"]',
    title: { en: 'Today\'s Reminders', he: 'תזכורות להיום' },
    description: {
      en: 'Number of reminders scheduled for today',
      he: 'מספר התזכורות המתוזמנות להיום',
    },
    color: '#3B82F6',
    priority: 10,
  },
  {
    id: 'stat-upcoming',
    selector: '[data-tour="stat-upcoming"]',
    title: { en: 'Upcoming Reminders', he: 'תזכורות קרובות' },
    description: {
      en: 'All future reminders after today',
      he: 'כל התזכורות העתידיות אחרי היום',
    },
    color: '#10B981',
    priority: 11,
  },
  {
    id: 'stat-overdue',
    selector: '[data-tour="stat-overdue"]',
    title: { en: 'Overdue Reminders', he: 'תזכורות באיחור' },
    description: {
      en: 'Past reminders that haven\'t been completed - take action on these',
      he: 'תזכורות עבר שטרם הושלמו - טפל בהן בהקדם',
    },
    color: '#EF4444',
    priority: 12,
  },

  // View Controls
  {
    id: 'view-mode-toggle',
    selector: '[data-tour="view-mode-toggle"]',
    title: { en: 'View Mode', he: 'מצב תצוגה' },
    description: {
      en: 'Switch between Calendar view (visual timeline) and List view (chronological list)',
      he: 'החלף בין תצוגת יומן (ציר זמן ויזואלי) לתצוגת רשימה (רשימה כרונולוגית)',
    },
    color: '#8B5CF6',
    priority: 13,
  },
  {
    id: 'calendar-view-tabs',
    selector: '[data-tour="calendar-view-tabs"]',
    title: { en: 'Calendar Views', he: 'תצוגות יומן' },
    description: {
      en: 'Choose between Month, Week, or Day view for different planning perspectives',
      he: 'בחר בין תצוגת חודש, שבוע או יום לפרספקטיבות תכנון שונות',
    },
    color: '#F59E0B',
    priority: 14,
  },

  // Calendar & Cards (shown based on view mode)
  {
    id: 'calendar-grid',
    selector: '[data-tour="calendar-grid"]',
    title: { en: 'Calendar Grid', he: 'רשת יומן' },
    description: {
      en: 'Visual calendar showing all your reminders - click any date to create a new reminder',
      he: 'יומן ויזואלי המציג את כל התזכורות שלך - לחץ על כל תאריך ליצירת תזכורת חדשה',
    },
    color: '#3B82F6',
    priority: 15,
  },
  {
    id: 'reminder-cards',
    selector: '[data-tour="reminder-cards"]',
    title: { en: 'Reminder Cards', he: 'כרטיסי תזכורות' },
    description: {
      en: 'Your reminders displayed as cards - click to view details or edit',
      he: 'התזכורות שלך מוצגות ככרטיסים - לחץ לצפייה בפרטים או עריכה',
    },
    color: '#10B981',
    priority: 16,
  },
];

export function RemindersAnnotations({
  isActive,
  onClose,
  isRTL,
  viewMode,
}: RemindersAnnotationsProps) {
  const [elementPositions, setElementPositions] = useState<Map<string, DOMRect>>(new Map());
  const [hoveredAnnotation, setHoveredAnnotation] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const borderRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const frameIdRef = useRef<number>();

  // Filter annotations based on view mode
  const annotations = baseAnnotations.filter((annotation) => {
    // Only show calendar-view-tabs in calendar mode
    if (annotation.id === 'calendar-view-tabs') return viewMode === 'calendar';
    return true;
  });

  const updatePositions = () => {
    if (!isActive) return;

    const positions = new Map<string, DOMRect>();
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    annotations.forEach((annotation) => {
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

  useEffect(() => {
    if (isActive) {
      requestAnimationFrame(() => {
        updatePositions();
      });
    }
  }, [isActive, viewMode]);

  useEffect(() => {
    if (!isActive) return;

    const animate = () => {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      annotations.forEach((annotation) => {
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
  }, [isActive, isRTL, viewMode, annotations]);

  if (!isActive) return null;

  const isElementVisible = (rect: DOMRect): boolean => {
    // On mobile, be more lenient with visibility - show elements even if partially off-screen
    if (isMobile) {
      // Element exists and has dimensions
      return rect.width > 0 && rect.height > 0;
    }
    
    // On desktop, only show elements in viewport
    return (
      rect.top < window.innerHeight &&
      rect.bottom > 0 &&
      rect.left < window.innerWidth &&
      rect.right > 0
    );
  };

  return (
    <>
      <AnimatePresence>
        {isActive && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[200]"
              onClick={onClose}
            />

            {/* Bottom Instructions - Mobile Responsive */}
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

            {/* Exit Button - Mobile Responsive */}
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

            {annotations.map((annotation, index) => {
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
                    transition={{ delay: index * 0.05 }}
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
                      transition={{ delay: index * 0.05 + 0.1, type: 'spring', stiffness: 300 }}
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
                                // Mobile: Center horizontally, position vertically based on available space
                                left: '16px',
                                right: '16px',
                                width: 'auto',
                                maxWidth: 'calc(100vw - 32px)',
                                ...(rect.top > window.innerHeight / 2
                                  ? {
                                      // Element in bottom half - show tooltip above
                                      bottom: `${window.innerHeight - rect.top + 8}px`,
                                      top: 'auto',
                                    }
                                  : {
                                      // Element in top half - show tooltip below
                                      top: `${rect.bottom + 8}px`,
                                      bottom: 'auto',
                                    }),
                              }
                            : {
                                // Desktop: Side positioning
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
}