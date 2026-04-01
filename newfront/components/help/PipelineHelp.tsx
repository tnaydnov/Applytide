/**
 * Premium Pipeline Help & Guide
 * Comprehensive guide for managing the application pipeline
 */

import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Columns,
  LayoutGrid,
  MousePointerClick,
  Settings,
  Filter,
  Download,
  CheckSquare,
  TrendingUp,
  ChevronRight,
  BookOpen,
  Lightbulb,
  CheckCircle2,
  BarChart3,
  Archive,
  Sparkles,
  Zap,
  Target,
  Eye,
} from 'lucide-react';
import { Button } from '../ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface PipelineHelpProps {
  isRTL: boolean;
  onShowVisualGuide?: () => void;
}

export function PipelineHelp({ isRTL, onShowVisualGuide }: PipelineHelpProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleShowVisualGuide = () => {
    setIsOpen(false);
    timeoutRef.current = setTimeout(() => {
      if (onShowVisualGuide) {
        onShowVisualGuide();
      }
    }, 300);
  };

  const content = {
    en: {
      title: 'Pipeline Guide',
      subtitle: 'Master your application pipeline management',
      tabs: {
        overview: 'Overview',
        features: 'Features',
        tips: 'Tips & Tricks',
        shortcuts: 'Quick Actions',
      },
      sections: {
        kanban: {
          title: 'Kanban Board View',
          description: 'Visualize your applications across different stages of the hiring process.',
          features: [
            'Click cards to view full application details',
            'Each column represents a stage in your application journey',
            'Cards show company, position, and time since application',
            'Responsive grid layout adapts to any screen size',
          ],
          tip: 'Click any card to open the application details modal. This keeps your pipeline organized and easy to navigate.',
        },
        grid: {
          title: 'Grid View',
          description: 'See all your applications in a compact, filterable grid layout.',
          features: [
            'View more applications at once',
            'Sort by date, company, or status',
            'Apply advanced filters to find specific applications',
            'Select multiple applications for batch actions',
          ],
        },
        stages: {
          title: 'Custom Stages',
          description: 'Customize pipeline stages to match your job search workflow.',
          features: [
            'Click "Customize" to add, edit, or remove stages',
            'Reorder stages using drag-and-drop or arrow buttons',
            'Change stage colors for better visual organization',
            'Choose from 50+ preset stages or create custom ones',
            'Search through popular stages to find what you need',
          ],
          tip: 'Customize stages to match company-specific hiring processes. For example, add "Technical Assessment" or "Take Home Project".',
        },
        filters: {
          title: 'Advanced Filtering',
          description: 'Find exactly what you\'re looking for with powerful filters.',
          features: [
            'Search by company name or job title',
            'Filter by application status',
            'Filter by date range',
            'Filter applications with resumes or cover letters',
            'View archived applications separately',
          ],
        },
        batch: {
          title: 'Batch Operations',
          description: 'Perform actions on multiple applications at once.',
          features: [
            'Select multiple applications using checkboxes',
            'Update status for all selected applications',
            'Archive multiple applications simultaneously',
            'Export selected applications',
          ],
          tip: 'Use batch operations to archive old rejections or update similar applications quickly.',
        },
        analytics: {
          title: 'Pipeline Analytics',
          description: 'Track your job search performance with visual insights.',
          features: [
            'View total applications and conversion rates',
            'See distribution across pipeline stages',
            'Track weekly application trends',
            'Monitor response rates and success metrics',
          ],
        },
      },
      tips: [
        {
          icon: MousePointerClick,
          title: 'Click to View Details',
          desc: 'Simply click cards to view full application details. Access all information quickly without extra navigation.',
        },
        {
          icon: CheckSquare,
          title: 'Use Batch Actions',
          desc: 'Select multiple applications and perform bulk updates to save time on repetitive tasks.',
        },
        {
          icon: Filter,
          title: 'Leverage Filters',
          desc: 'Use advanced filters to focus on specific applications. Filter by date, status, or company.',
        },
        {
          icon: Archive,
          title: 'Archive Old Applications',
          desc: 'Keep your pipeline clean by archiving rejected or withdrawn applications. You can always view them later.',
        },
        {
          icon: TrendingUp,
          title: 'Review Analytics Regularly',
          desc: 'Check your pipeline analytics weekly to identify bottlenecks and improve your job search strategy.',
        },
        {
          icon: Settings,
          title: 'Customize Your Workflow',
          desc: 'Tailor stages and filters to match your unique job search process and industry standards.',
        },
      ],
      quickActions: [
        {
          icon: Columns,
          title: 'Switch to Kanban',
          desc: 'Visual board view with clickable cards',
        },
        {
          icon: LayoutGrid,
          title: 'Switch to Grid',
          desc: 'Compact view showing all applications in a list',
        },
        {
          icon: Settings,
          title: 'Customize Stages',
          desc: 'Modify pipeline stages to match your workflow',
        },
        {
          icon: Download,
          title: 'Export Applications',
          desc: 'Download your applications as CSV or PDF',
        },
      ],
      workflow: {
        title: 'Recommended Workflow',
        steps: [
          {
            num: 1,
            title: 'Add Applications',
            desc: 'Save job applications from the Jobs page',
          },
          {
            num: 2,
            title: 'View in Pipeline',
            desc: 'Track applications as they move through stages',
          },
          {
            num: 3,
            title: 'Update Status',
            desc: 'Click cards to view details and update status',
          },
          {
            num: 4,
            title: 'Archive When Done',
            desc: 'Archive completed or rejected applications to keep pipeline clean',
          },
        ],
      },
    },
    he: {
      title: 'מדריך הפייפליין',
      subtitle: 'שלוט בניהול פייפליין הבקשות שלך',
      tabs: {
        overview: 'סקירה כללית',
        features: 'תכונות',
        tips: 'טיפים וטריקים',
        shortcuts: 'פעולות מהירות',
      },
      sections: {
        kanban: {
          title: 'תצוגת לוח קאנבאן',
          description: 'הצג את הבקשות שלך על פני שלבים שונים בתהליך הגיוס.',
          features: [
            'לחץ על כרטיסים לצפייה בפרטי הבקשה המלאים',
            'כל עמודה מייצגת שלב במסע הבקשות שלך',
            'הכרטיסים מציגים חברה, תפקיד וזמן מאז הגשת הבקשה',
            'פריסת רשת רספונסיבית מתאימה לכל גודל מסך',
          ],
          tip: 'לחץ על כל כרטיס לפתיחת מודל פרטי הבקשה. זה שומר על הפייפליין שלך מאורגן וקל לניווט.',
        },
        grid: {
          title: 'תצוגת רשת',
          description: 'צפה בכל הבקשות שלך בפריסת רשת קומפקטית וניתנת לסינון.',
          features: [
            'צפה ביותר בקשות בו-זמנית',
            'מיין לפי תאריך, חברה או סטטוס',
            'החל מסננים מתקדמים למצוא בקשות ספציפיות',
            'בחר מספר בקשות לפעולות אצווה',
          ],
        },
        stages: {
          title: 'שלבים מותאמים אישית',
          description: 'התאם את שלבי הפייפליין כך שיתאימו לתהליך חיפוש העבודה שלך.',
          features: [
            'לחץ על "התאם אישית" כדי להוסיף, לערוך או להסיר שלבים',
            'סדר מחדש שלבים באמצעות גרירה ושחרור או כפתורי חצים',
            'שנה צבעי שלבים לארגון חזותי טוב יותר',
            'בחר מתוך יותר מ-50 שלבים מוגדרים מראש או צור מותאמים אישית',
            'חפש בין שלבים פופולריים כדי למצוא את מה שאתה צריך',
          ],
          tip: 'התאם שלבים כך שיתאימו לתהליכי גיוס ספציפיים לחברה. לדוגמה, הוסף "מבחן טכני" או "פרויקט בית".',
        },
        filters: {
          title: 'סינון מתקדם',
          description: 'מצא בדיוק את מה שאתה מחפש עם מסננים עוצמתיים.',
          features: [
            'חפש לפי שם חברה או תפקיד',
            'סנן לפי סטטוס בקשה',
            'סנן לפי טווח תאריכים',
            'סנן בקשות עם קורות חיים או מכתבי כיסוי',
            'צפה בבקשות מאורכבות בנפרד',
          ],
        },
        batch: {
          title: 'פעולות אצווה',
          description: 'בצע פעולות על מספר בקשות בו-זמנית.',
          features: [
            'בחר מספר בקשות באמצעות תיבות סימון',
            'עדכן סטטוס לכל הבקשות שנבחרו',
            'העבר לארכיון מספר בקשות בו-זמנית',
            'ייצא בקשות שנבחרו',
          ],
          tip: 'השתמש בפעולות אצווה כדי לארכב דחיות ישנות או לעדכן בקשות דומות במהירות.',
        },
        analytics: {
          title: 'ניתוח פייפליין',
          description: 'עקוב אחר ביצועי חיפוש העבודה שלך עם תובנות חזותיות.',
          features: [
            'צפה בסך כל הבקשות ושיעורי ההמרה',
            'ראה התפלגות על פני שלבי הפייפליין',
            'עקוב אחר מגמות בקשות שבועיות',
            'עקוב אחר שיעורי תגובה ומדדי הצלחה',
          ],
        },
      },
      tips: [
        {
          icon: MousePointerClick,
          title: 'לחץ לצפייה בפרטים',
          desc: 'פשוט לחץ על כרטיסים כדי לצפות בפרטי הבקשה המלאים. גש לכל המידע במהירות ללא ניווט נוסף.',
        },
        {
          icon: CheckSquare,
          title: 'השתמש בפעולות אצווה',
          desc: 'בחר מספר בקשות ובצע עדכונים המוניים כדי לחסוך זמן במשימות חוזרות.',
        },
        {
          icon: Filter,
          title: 'נצל מסננים',
          desc: 'השתמש במסננים מתקדמים כדי להתמקד בבקשות ספציפיות. סנן לפי תאריך, סטטוס או חברה.',
        },
        {
          icon: Archive,
          title: 'ארכב בקשות ישנות',
          desc: 'שמור על הפייפליין שלך נקי על ידי ארכוב בקשות שנדחו או שנמשכו. אתה תמיד יכול לצפות בהן מאוחר יותר.',
        },
        {
          icon: TrendingUp,
          title: 'סקור ניתוחים באופן קבוע',
          desc: 'בדוק את ניתוחי הפייפליין שלך מדי שבוע כדי לזהות צווארי בקבוק ולשפר את אסטרטגיית חיפוש העבודה שלך.',
        },
        {
          icon: Settings,
          title: 'התאם את זרימת העבודה שלך',
          desc: 'התאם שלבים ומסננים כך שיתאימו לתהליך חיפוש העבודה הייחודי שלך ולסטנדרטים בתעשייה.',
        },
      ],
      quickActions: [
        {
          icon: Columns,
          title: 'עבור לקאנבאן',
          desc: 'תצוגת לוח חזותית עם כרטיסים לחיצים',
        },
        {
          icon: LayoutGrid,
          title: 'עבור לרשת',
          desc: 'תצוגה קומפקטית מציגה את כל הבקשות ברשימה',
        },
        {
          icon: Settings,
          title: 'התאם שלבים',
          desc: 'שנה את שלבי הפייפליין כך שיתאימו לזרמת העבודה שלך',
        },
        {
          icon: Download,
          title: 'ייצא בקשות',
          desc: 'הורד את הבקשות שלך כ-CSV או PDF',
        },
      ],
      workflow: {
        title: 'זרימת עבודה מומלצת',
        steps: [
          {
            num: 1,
            title: 'הוסף בקשות',
            desc: 'שמור בקשות עבודה מדף המשרות',
          },
          {
            num: 2,
            title: 'צפה בפייפליין',
            desc: 'עקוב אחר בקשות כשהן עוברות בין שלבים',
          },
          {
            num: 3,
            title: 'עדכן סטטוס',
            desc: 'לחץ על כרטיסים כדי לצפות בפרטים ולעדכן סטטוס',
          },
          {
            num: 4,
            title: 'ארכב בסיום',
            desc: 'ארכב בקשות שהושלמו או נדחו כדי לשמור על פייפליין נקי',
          },
        ],
      },
    },
  };

  const t = isRTL ? content.he : content.en;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 z-40 rounded-full shadow-2xl bg-gradient-to-r from-[#9F5F80] to-[#7a4a63] hover:from-[#8a5472] hover:to-[#6b3f56] text-white px-4 sm:px-6 py-3 sm:py-4 h-auto transition-all hover:scale-105 border-2 border-white/20"
          style={{
            [isRTL ? 'left' : 'right']: typeof window !== 'undefined' && window.innerWidth < 640 ? '1rem' : '1.5rem',
          }}
        >
          <BookOpen className="h-5 w-5 sm:mr-2" />
          <span className="hidden sm:inline font-semibold">{isRTL ? 'מדריך' : 'Guide'}</span>
        </Button>
      </SheetTrigger>
      <SheetContent 
        side={isRTL ? 'left' : 'right'} 
        className="w-full sm:w-[90vw] sm:max-w-[800px] p-0 overflow-hidden flex flex-col"
      >
        {/* Premium Header */}
        <div className="bg-gradient-to-br from-[#9F5F80] via-[#8a5472] to-[#7a4a63] p-8 text-white" dir={isRTL ? 'rtl' : 'ltr'}>
          <SheetHeader>
            <SheetTitle className={`flex items-center gap-4 text-white text-3xl mb-3 ${isRTL ? 'text-right' : ''}`}>
              <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm">
                <BookOpen className="h-8 w-8" />
              </div>
              {t.title}
            </SheetTitle>
            <SheetDescription className={`text-white/90 text-lg ${isRTL ? 'text-right' : ''}`}>
              {t.subtitle}
            </SheetDescription>
          </SheetHeader>

          {/* Visual Guide Button */}
          {onShowVisualGuide && (
            <Button
              onClick={handleShowVisualGuide}
              className="mt-6 w-full bg-white/20 hover:bg-white/30 text-white border-2 border-white/40 backdrop-blur-sm transition-all hover:scale-105"
              size="lg"
            >
              <Eye className="h-5 w-5 mr-2" />
              {isRTL ? '🎯 הצג הסבר ויזואלי על העמוד' : '🎯 Show Visual Page Guide'}
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="sticky top-0 z-10 bg-white dark:bg-[#383e4e] border-b border-gray-200 dark:border-[#b6bac5]/20 px-4 sm:px-8 pt-4 sm:pt-6">
              <TabsList className="grid w-full grid-cols-4 h-auto">
                <TabsTrigger value="overview" className="text-xs sm:text-sm md:text-base px-2 sm:px-4 py-2">
                  <BookOpen className="h-4 w-4 sm:hidden" />
                  <span className="hidden sm:inline">{t.tabs.overview}</span>
                </TabsTrigger>
                <TabsTrigger value="features" className="text-xs sm:text-sm md:text-base px-2 sm:px-4 py-2">
                  <BarChart3 className="h-4 w-4 sm:hidden" />
                  <span className="hidden sm:inline">{t.tabs.features}</span>
                </TabsTrigger>
                <TabsTrigger value="tips" className="text-xs sm:text-sm md:text-base px-2 sm:px-4 py-2">
                  <Lightbulb className="h-4 w-4 sm:hidden" />
                  <span className="hidden sm:inline">{t.tabs.tips}</span>
                </TabsTrigger>
                <TabsTrigger value="shortcuts" className="text-xs sm:text-sm md:text-base px-2 sm:px-4 py-2">
                  <Target className="h-4 w-4 sm:hidden" />
                  <span className="hidden sm:inline">{t.tabs.shortcuts}</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-4 sm:p-8" dir={isRTL ? 'rtl' : 'ltr'}>
              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-8 mt-0">
                {/* Welcome */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-8 rounded-2xl bg-gradient-to-br from-[#9F5F80]/10 via-[#9F5F80]/5 to-transparent border-2 border-[#9F5F80]/30 shadow-lg"
                >
                  <div className={`flex items-start gap-6 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-[#9F5F80] to-[#7a4a63] text-white shadow-md">
                      <Columns className="h-8 w-8" />
                    </div>
                    <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                      <h3 className="text-2xl font-bold mb-3">
                        {isRTL ? 'ברוכים הבאים לפייפליין שלך' : 'Welcome to Your Pipeline'}
                      </h3>
                      <p className="text-base text-muted-foreground leading-relaxed">
                        {isRTL
                          ? 'הפייפליין עוזר לך לעקוב אחר כל בקשות העבודה שלך ממקום אחד. הצג, סנן ועדכן בקשות בקלות עם ממשק אינטואיטיבי.'
                          : 'Your pipeline helps you track all your job applications from one place. View, filter, and update applications easily with an intuitive interface.'}
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Kanban View */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-2 border-blue-500/30 shadow-md">
                  <div className={`flex items-center gap-4 mb-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="p-3 rounded-xl bg-blue-500 text-white">
                      <Columns className="h-6 w-6" />
                    </div>
                    <h4 className={`text-xl font-bold ${isRTL ? 'text-right' : ''}`}>{t.sections.kanban.title}</h4>
                  </div>
                  <p className={`text-base text-muted-foreground mb-5 leading-relaxed ${isRTL ? 'text-right' : ''}`}>
                    {t.sections.kanban.description}
                  </p>
                  <ul className="space-y-2.5 mb-5">
                    {t.sections.kanban.features.map((feature, idx) => (
                      <li key={idx} className={`flex items-start gap-3 text-sm ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                        <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span className="leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <p className={`text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                      <Sparkles className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>{t.sections.kanban.tip}</span>
                    </p>
                  </div>
                </div>

                {/* Grid View */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/5 border-2 border-purple-500/30 shadow-md">
                  <div className={`flex items-center gap-4 mb-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="p-3 rounded-xl bg-purple-500 text-white">
                      <LayoutGrid className="h-6 w-6" />
                    </div>
                    <h4 className={`text-xl font-bold ${isRTL ? 'text-right' : ''}`}>{t.sections.grid.title}</h4>
                  </div>
                  <p className={`text-base text-muted-foreground mb-5 leading-relaxed ${isRTL ? 'text-right' : ''}`}>
                    {t.sections.grid.description}
                  </p>
                  <ul className="space-y-2.5">
                    {t.sections.grid.features.map((feature, idx) => (
                      <li key={idx} className={`flex items-start gap-3 text-sm ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                        <CheckCircle2 className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                        <span className="leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Workflow */}
                <div className="p-8 rounded-2xl bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent border-2 border-green-500/30 shadow-lg">
                  <h3 className={`text-2xl font-bold mb-6 flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="p-3 rounded-xl bg-green-500 text-white">
                      <Zap className="h-6 w-6" />
                    </div>
                    {t.workflow.title}
                  </h3>
                  <div className="space-y-5">
                    {t.workflow.steps.map((step, idx) => (
                      <div key={idx} className={`flex items-start gap-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-md">
                          {step.num}
                        </div>
                        <div className={`flex-1 pt-1 ${isRTL ? 'text-right' : ''}`}>
                          <p className="font-bold text-lg mb-2">{step.title}</p>
                          <p className="text-base text-muted-foreground leading-relaxed">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Features Tab */}
              <TabsContent value="features" className="space-y-8 mt-0">
                {/* Custom Stages */}
                <div>
                  <div className={`flex items-center gap-3 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="p-3 rounded-xl bg-[#9F5F80]/10">
                      <Settings className="h-6 w-6 text-[#9F5F80]" />
                    </div>
                    <h3 className={`text-2xl font-bold ${isRTL ? 'text-right' : ''}`}>{t.sections.stages.title}</h3>
                  </div>
                  <p className={`text-base text-muted-foreground mb-6 leading-relaxed ${isRTL ? 'text-right' : ''}`}>
                    {t.sections.stages.description}
                  </p>
                  <ul className="space-y-2.5 mb-6">
                    {t.sections.stages.features.map((feature, idx) => (
                      <li key={idx} className={`flex items-start gap-3 text-sm ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                        <CheckCircle2 className="h-4 w-4 text-[#9F5F80] mt-0.5 flex-shrink-0" />
                        <span className="leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <p className={`text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                      <Sparkles className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>{t.sections.stages.tip}</span>
                    </p>
                  </div>
                </div>

                {/* Advanced Filters */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-2 border-blue-500/30 shadow-md">
                  <div className={`flex items-center gap-4 mb-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="p-3 rounded-xl bg-blue-500 text-white">
                      <Filter className="h-6 w-6" />
                    </div>
                    <h4 className={`text-xl font-bold ${isRTL ? 'text-right' : ''}`}>{t.sections.filters.title}</h4>
                  </div>
                  <p className={`text-base text-muted-foreground mb-5 leading-relaxed ${isRTL ? 'text-right' : ''}`}>
                    {t.sections.filters.description}
                  </p>
                  <ul className="space-y-2.5">
                    {t.sections.filters.features.map((feature, idx) => (
                      <li key={idx} className={`flex items-start gap-3 text-sm ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                        <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span className="leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Batch Operations */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/5 border-2 border-purple-500/30 shadow-md">
                  <div className={`flex items-center gap-4 mb-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="p-3 rounded-xl bg-purple-500 text-white">
                      <CheckSquare className="h-6 w-6" />
                    </div>
                    <h4 className={`text-xl font-bold ${isRTL ? 'text-right' : ''}`}>{t.sections.batch.title}</h4>
                  </div>
                  <p className={`text-base text-muted-foreground mb-5 leading-relaxed ${isRTL ? 'text-right' : ''}`}>
                    {t.sections.batch.description}
                  </p>
                  <ul className="space-y-2.5 mb-5">
                    {t.sections.batch.features.map((feature, idx) => (
                      <li key={idx} className={`flex items-start gap-3 text-sm ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                        <ChevronRight className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                        <span className="leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <p className={`text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                      <Sparkles className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>{t.sections.batch.tip}</span>
                    </p>
                  </div>
                </div>

                {/* Analytics */}
                <div>
                  <div className={`flex items-center gap-3 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="p-3 rounded-xl bg-[#9F5F80]/10">
                      <BarChart3 className="h-6 w-6 text-[#9F5F80]" />
                    </div>
                    <h3 className={`text-2xl font-bold ${isRTL ? 'text-right' : ''}`}>{t.sections.analytics.title}</h3>
                  </div>
                  <p className={`text-base text-muted-foreground mb-6 leading-relaxed ${isRTL ? 'text-right' : ''}`}>
                    {t.sections.analytics.description}
                  </p>
                  <ul className="space-y-2.5">
                    {t.sections.analytics.features.map((feature, idx) => (
                      <li key={idx} className={`flex items-start gap-3 text-sm ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                        <CheckCircle2 className="h-4 w-4 text-[#9F5F80] mt-0.5 flex-shrink-0" />
                        <span className="leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </TabsContent>

              {/* Tips Tab */}
              <TabsContent value="tips" className="space-y-5 mt-0">
                {t.tips.map((tip, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="p-6 rounded-2xl bg-gradient-to-br from-white via-gray-50/50 to-white dark:from-[#383e4e]/50 dark:to-[#2a2f3d]/50 border-2 border-gray-200 dark:border-[#b6bac5]/20 shadow-md hover:shadow-lg transition-all"
                  >
                    <div className={`flex items-start gap-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#9F5F80] to-[#7a4a63] text-white flex-shrink-0 shadow-md">
                        <tip.icon className="h-7 w-7" />
                      </div>
                      <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                        <h4 className="font-bold text-xl mb-3">{tip.title}</h4>
                        <p className="text-base text-muted-foreground leading-relaxed">
                          {tip.desc}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </TabsContent>

              {/* Quick Actions Tab */}
              <TabsContent value="shortcuts" className="space-y-4 mt-0">
                {t.quickActions.map((action, idx) => {
                  const Icon = action.icon;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-6 rounded-2xl bg-gradient-to-r from-white to-gray-50 dark:from-[#383e4e] dark:to-[#2a2f3d] border-2 border-gray-200 dark:border-[#b6bac5]/20 shadow-md hover:shadow-lg transition-all cursor-pointer group"
                    >
                      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="p-4 rounded-xl bg-gradient-to-br from-[#9F5F80] to-[#8a5472] shadow-md group-hover:shadow-lg transition-shadow">
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                          <h4 className="font-bold text-lg mb-1">
                            {action.title}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {action.desc}
                          </p>
                        </div>
                        <ChevronRight className={`h-5 w-5 text-[#9F5F80] opacity-0 group-hover:opacity-100 transition-opacity ${isRTL ? 'rotate-180' : ''}`} />
                      </div>
                    </motion.div>
                  );
                })}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default PipelineHelp;