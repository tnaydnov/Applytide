/**
 * Pipeline Interactive Hover Guide - GRANULAR + MOBILE COMPATIBLE
 * Highlights individual UI components using data-tour attributes
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useIsMobile } from '../../../hooks/useIsMobile';
import type { ViewMode } from '../PipelinePage';

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
  viewMode?: 'kanban' | 'cards' | 'both';
  mobileHide?: boolean; // Hide on mobile screens
}

interface PipelineAnnotationsProps {
  isActive: boolean;
  onClose: () => void;
  isRTL: boolean;
  viewMode: ViewMode;
}

const getAnnotations = (viewMode: ViewMode, isMobile: boolean): Annotation[] => {
  const commonAnnotations: Annotation[] = [
    // Top Navigation - Individual Components
    {
      id: 'hamburger-menu',
      selector: '[data-tour="hamburger-menu"]',
      title: { en: 'Menu', he: 'תפריט' },
      description: {
        en: 'Open sidebar to navigate between pages',
        he: 'פתח את הסרגל הצדדי לניווט בין עמודים',
      },
      color: '#9F5F80',
      priority: 1,
      viewMode: 'both',
    },
    {
      id: 'logo-brand',
      selector: '[data-tour="logo-brand"]',
      title: { en: 'Logo', he: 'לוגו' },
      description: {
        en: 'Click to return to dashboard',
        he: 'לחץ לחזרה למסך הראשי',
      },
      color: '#9F5F80',
      priority: 2,
      viewMode: 'both',
    },
    {
      id: 'language-selector',
      selector: '[data-tour="language-selector"]',
      title: { en: 'Language', he: 'שפה' },
      description: {
        en: 'Switch between English and Hebrew',
        he: 'החלף בין עברית לאנגלית',
      },
      color: '#3B82F6',
      priority: 3,
      viewMode: 'both',
    },
    {
      id: 'user-menu',
      selector: '[data-tour="user-menu"]',
      title: { en: 'Profile', he: 'פרופיל' },
      description: {
        en: 'Access your profile and settings',
        he: 'גש לפרופיל והגדרות',
      },
      color: '#8B5CF6',
      priority: 4,
      viewMode: 'both',
    },

    // Page Header
    {
      id: 'page-title',
      selector: '[data-tour="page-title"]',
      title: { en: 'My Pipeline', he: 'הפייפליין שלי' },
      description: {
        en: 'Track and manage all your job applications',
        he: 'עקוב ונהל את כל מועמדויות העבודה שלך',
      },
      color: '#9F5F80',
      priority: 5,
      viewMode: 'both',
    },

    // Action Buttons - Individual
    {
      id: 'advanced-filters-btn',
      selector: '[data-tour="advanced-filters-btn"]',
      title: { en: 'Advanced Filters', he: 'מסננים מתקדמים' },
      description: {
        en: 'Filter by date range, documents, and companies',
        he: 'סנן לפי טווח תאריכים, מסמכים וחברות',
      },
      color: '#8B5CF6',
      priority: 6,
      viewMode: 'both',
    },
    {
      id: 'export-btn',
      selector: '[data-tour="export-btn"]',
      title: { en: 'Export', he: 'ייצוא' },
      description: {
        en: 'Download applications as CSV or JSON',
        he: 'הורד מועמדויות כ-CSV או JSON',
      },
      color: '#10B981',
      priority: 7,
      viewMode: 'both',
    },
    {
      id: 'view-toggle',
      selector: '[data-tour="view-toggle"]',
      title: { en: 'View Toggle', he: 'החלפת תצוגה' },
      description: {
        en: 'Switch between Kanban and Cards view',
        he: 'החלף בין תצוגת Kanban לכרטיסים',
      },
      color: '#F59E0B',
      priority: 8,
      viewMode: 'both',
    },
    {
      id: 'customize-btn',
      selector: '[data-tour="customize-btn"]',
      title: { en: 'Customize', he: 'התאמה אישית' },
      description: {
        en: 'Add, edit, or remove pipeline stages',
        he: 'הוסף, ערוך או הסר שלבי פייפליין',
      },
      color: '#EC4899',
      priority: 9,
      viewMode: 'both',
    },
    {
      id: 'add-application-btn',
      selector: '[data-tour="add-application-btn"]',
      title: { en: 'Add Application', he: 'הוסף מועמדות' },
      description: {
        en: 'Quick add a new job application',
        he: 'הוסף מועמדות חדשה במהירות',
      },
      color: '#9F5F80',
      priority: 10,
      viewMode: 'both',
    },

    // Individual Stat Cards
    {
      id: 'stat-total',
      selector: '[data-tour="stat-total"]',
      title: { en: 'Total Applications', he: 'סה״כ הגשות' },
      description: {
        en: 'Total number of job applications you\'ve submitted',
        he: 'מספר כולל של מועמדויות שהגשת',
      },
      color: '#3B82F6',
      priority: 11,
      viewMode: 'both',
    },
    {
      id: 'stat-active',
      selector: '[data-tour="stat-active"]',
      title: { en: 'Active Applications', he: 'הגשות פעילות' },
      description: {
        en: 'Applications currently in progress (not rejected or completed)',
        he: 'מועמדויות בתהליך (לא נדחו או הושלמו)',
      },
      color: '#8B5CF6',
      priority: 12,
      viewMode: 'both',
    },
    {
      id: 'stat-week',
      selector: '[data-tour="stat-week"]',
      title: { en: 'This Week', he: 'השבוע' },
      description: {
        en: 'New applications submitted in the last 7 days',
        he: 'מועמדויות חדשות שהוגשו ב-7 הימים האחרונים',
      },
      color: '#10B981',
      priority: 13,
      viewMode: 'both',
    },
    {
      id: 'stat-interviews',
      selector: '[data-tour="stat-interviews"]',
      title: { en: 'Interviews', he: 'ראיונות' },
      description: {
        en: 'Applications that reached interview stage',
        he: 'מועמדויות שהגיעו לשלב ראיון',
      },
      color: '#F59E0B',
      priority: 14,
      viewMode: 'both',
    },
    {
      id: 'stat-success',
      selector: '[data-tour="stat-success"]',
      title: { en: 'Success Rate', he: 'שיעור הצלחה' },
      description: {
        en: 'Percentage of applications that resulted in offers',
        he: 'אחוז המועמדויות שהובילו להצעות עבודה',
      },
      color: '#10B981',
      priority: 15,
      viewMode: 'both',
    },
    {
      id: 'stat-response',
      selector: '[data-tour="stat-response"]',
      title: { en: 'Response Rate', he: 'שיעור מענה' },
      description: {
        en: 'Percentage of applications that received a response',
        he: 'אחוז המועמדויות שקיבלו מענה',
      },
      color: '#6366F1',
      priority: 16,
      viewMode: 'both',
    },

    // Status Breakdown
    {
      id: 'status-breakdown',
      selector: '[data-tour="status-breakdown"]',
      title: { en: 'Status Breakdown', he: 'פירוט סטטוסים' },
      description: {
        en: 'Visual breakdown showing application count by status',
        he: 'פירוט ויזואלי המציג ספירת מועמדויות לפי סטטוס',
      },
      color: '#10B981',
      priority: 17,
      viewMode: 'both',
    },

    // Filter & Sort
    {
      id: 'filter-sort-section',
      selector: '[data-tour="filter-sort-section"]',
      title: { en: 'Filter & Sort', he: 'סינון ומיון' },
      description: {
        en: 'Search, filter by status, sort, and toggle archived applications',
        he: 'חפש, סנן לפי סטטוס, מיין והצג מועמדויות מאורכ��ת',
      },
      color: '#F59E0B',
      priority: 18,
      viewMode: 'both',
    },
  ];

  const kanbanAnnotations: Annotation[] = [
    {
      id: 'kanban-board',
      selector: '[data-tour="kanban-board"]',
      title: { en: 'Kanban Board', he: 'לוח Kanban' },
      description: {
        en: 'Drag and drop applications between columns to update status',
        he: 'גרור ושחרר מועמדויות בין עמודות לעדכון סטטוס',
      },
      color: '#3B82F6',
      priority: 19,
      viewMode: 'kanban',
    },
  ];

  const cardsAnnotations: Annotation[] = [
    {
      id: 'cards-grid',
      selector: '[data-tour="cards-grid"]',
      title: { en: 'Applications Grid', he: 'רשת מועמדויות' },
      description: {
        en: 'All applications in a clean grid - click any card for details',
        he: 'כל המועמדויות ברשת נקייה - לחץ על כרטיס לפרטים',
      },
      color: '#3B82F6',
      priority: 19,
      viewMode: 'cards',
    },
  ];

  const allAnnotations = viewMode === 'kanban'
    ? [...commonAnnotations, ...kanbanAnnotations]
    : [...commonAnnotations, ...cardsAnnotations];

  return allAnnotations.filter(
    (a) => (a.viewMode === 'both' || a.viewMode === viewMode) && (!isMobile || !a.mobileHide)
  );
};

export function PipelineAnnotations({
  isActive,
  onClose,
  isRTL,
  viewMode,
}: PipelineAnnotationsProps) {
  const [elementPositions, setElementPositions] = useState<Map<string, DOMRect>>(new Map());
  const [hoveredAnnotation, setHoveredAnnotation] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const borderRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const frameIdRef = useRef<number>();

  const annotations = getAnnotations(viewMode, isMobile);

  const updatePositions = () => {
    if (!isActive) return;

    const positions = new Map<string, DOMRect>();
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    annotations.forEach((annotation) => {
      try {
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
      } catch (e) {
        // Skip invalid selectors silently
      }
    });

    setElementPositions(positions);
  };

  useEffect(() => {
    if (isActive) {
      // Delay slightly to ensure DOM is ready
      const timeoutId = setTimeout(() => {
        requestAnimationFrame(() => {
          updatePositions();
        });
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isActive, viewMode]);

  useEffect(() => {
    if (!isActive) return;

    const animate = () => {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      annotations.forEach((annotation) => {
        try {
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
        } catch (e) {
          // Skip invalid selectors silently
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
            {/* Backdrop Blur */}
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
                      : 'Hover over elements to learn about them'}
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

            {/* Annotations */}
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
                                left: isRTL ? 'auto' : `${rect.right + 16}px`,
                                right: isRTL ? `${window.innerWidth - rect.left + 16}px` : 'auto',
                                top: `${rect.top + rect.height / 2}px`,
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