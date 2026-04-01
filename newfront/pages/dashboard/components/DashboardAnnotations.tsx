/**
 * Dashboard Interactive Hover Guide - FULL VERSION
 * Matches PageAnnotations with backdrop blur, glowing borders, and tooltips
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useIsMobile } from '../../../hooks/useIsMobile';

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

interface DashboardAnnotationsProps {
  isActive: boolean;
  onClose: () => void;
  isRTL: boolean;
}

const annotations: Annotation[] = [
  {
    id: 'hamburger-menu',
    selector: '.header-menu-button',
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
    selector: '.header-logo-button',
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
    selector: '.fixed.top-4.right-4 > div:first-child',
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
    selector: '.header-user-menu',
    title: { en: 'Profile', he: 'פרופיל' },
    description: {
      en: 'Access your account settings and preferences',
      he: 'גישה להגדרות החשבון וההעדפות שלך',
    },
    color: '#10B981',
    priority: 4,
  },
  {
    id: 'greeting',
    selector: 'h1',
    title: { en: 'Personal Greeting', he: 'ברכה אישית' },
    description: {
      en: 'Dynamic greeting that changes based on time of day',
      he: 'ברכה דינמית שמשתנה לפי שעות היום',
    },
    color: '#9F5F80',
    priority: 5,
  },
  {
    id: 'page-tour-button',
    selector: 'button.border-\\[\\#9F5F80\\]\\/30',
    title: { en: 'Page Tour', he: 'סיור בעמוד' },
    description: {
      en: 'Activate interactive guide to explore all dashboard features',
      he: 'הפעל מדריך אינטראקטיבי לסיור בכל הפיצ\'רים',
    },
    color: '#A855F7',
    priority: 6,
  },
  {
    id: 'weekly-goal',
    selector: '.lg\\:w-\\[320px\\].bg-\\[\\#9F5F80\\]',
    title: { en: 'Weekly Goal', he: 'יעד שבועי' },
    description: {
      en: 'Set and track your weekly application goals with progress visualization',
      he: 'הגדר ועקוב אחר יעדי המועמדויות השבועיים שלך',
    },
    color: '#EC4899',
    priority: 7,
  },
  {
    id: 'stat-job-offers',
    selector: '[data-tour="stat-job-offers"]',
    title: { en: 'Job Offers', he: 'הצעות עבודה' },
    description: {
      en: 'Total number of job offers you\'ve received - click to view details in Pipeline',
      he: 'מספר כולל של הצעות עבודה שקיבלת - לחץ לצפייה בפרטים בפייפליין',
    },
    color: '#10B981',
    priority: 8,
  },
  {
    id: 'stat-response-rate',
    selector: '[data-tour="stat-response-rate"]',
    title: { en: 'Response Rate', he: 'שיעור תגובה' },
    description: {
      en: 'Percentage of applications that received a response - click to view analytics',
      he: 'אחוז המועמדויות שקיבלו מענה - לחץ לצפייה בניתוחים',
    },
    color: '#A855F7',
    priority: 9,
  },
  {
    id: 'stat-interviews',
    selector: '[data-tour="stat-interviews"]',
    title: { en: 'Interviews', he: 'ראיונות' },
    description: {
      en: 'Applications that reached interview stage - click to manage reminders',
      he: 'מועמדויות שהגיעו לשלב ראיון - לחץ לניהול תזכורות',
    },
    color: '#F97316',
    priority: 10,
  },
  {
    id: 'stat-total-applications',
    selector: '[data-tour="stat-total-applications"]',
    title: { en: 'Total Applications', he: 'סה״כ מועמדויות' },
    description: {
      en: 'Total number of job applications submitted - click to view pipeline',
      he: 'מספר כולל של מועמדויות שהוגשו - לחץ לצפייה בפייפליין',
    },
    color: '#3B82F6',
    priority: 11,
  },
  {
    id: 'recent-activity',
    selector: '.xl\\:grid-cols-2 > div:first-child',
    title: { en: 'Recent Activity', he: 'פעילות אחרונה' },
    description: {
      en: 'Latest updates: applications sent, responses received, and interviews scheduled',
      he: 'עדכונים אחרונים: מועמדויות שנשלחו, תגובות שהתקבלו וראיונות שתוזمون',
    },
    color: '#F59E0B',
    priority: 12,
  },
  {
    id: 'upcoming-events',
    selector: '.xl\\:grid-cols-2 > div:last-child',
    title: { en: 'Upcoming Events', he: 'אירועים קרובים' },
    description: {
      en: 'Scheduled interviews, follow-ups, and important deadlines',
      he: 'ראיונות מתוכננים, מעקבים ותאריכי יעד חשובים',
    },
    color: '#3B82F6',
    priority: 13,
  },
  {
    id: 'quick-actions',
    selector: '.md\\:grid-cols-3',
    title: { en: 'Quick Actions', he: 'פעולות מהירות' },
    description: {
      en: 'Fast access to upload resume, find jobs, and track applications',
      he: 'גישה מהירה להעלאת קורות חיים, מציאת משרות ומעקב אחר מועמדויות',
    },
    color: '#A855F7',
    priority: 14,
  },
  {
    id: 'ai-insights',
    selector: '.fixed.bottom-20',
    title: { en: 'AI Insights', he: 'תובנות AI' },
    description: {
      en: 'Personalized AI-powered recommendations to improve your job search',
      he: 'המלצות מבוססות AI לשיפור חיפוש העבודה שלך',
    },
    color: '#EC4899',
    priority: 15,
  },
];

export function DashboardAnnotations({
  isActive,
  onClose,
  isRTL,
}: DashboardAnnotationsProps) {
  const [elementPositions, setElementPositions] = useState<Map<string, DOMRect>>(new Map());
  const [hoveredAnnotation, setHoveredAnnotation] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const borderRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const frameIdRef = useRef<number>();

  // Filter out AI insights (tour UI component)
  const filteredAnnotations = annotations.filter(a => a.id !== 'ai-insights');

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
  }, [isActive]);

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
  }, [isActive, isRTL, filteredAnnotations]);

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