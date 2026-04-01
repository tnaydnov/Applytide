/**
 * Premium Reminders Help & Guide
 * Wide, beautiful design with comprehensive explanations and tabs
 */

import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Calendar,
  Bell,
  Clock,
  List,
  Download,
  RefreshCw,
  BookOpen,
  Lightbulb,
  Target,
  Zap,
  CheckCircle2,
  MousePointerClick,
  Users,
  Share2,
  BarChart3,
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

interface RemindersHelpProps {
  isRTL: boolean;
  onShowVisualGuide?: () => void;
}

export function RemindersHelp({ isRTL, onShowVisualGuide }: RemindersHelpProps) {
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
      title: 'Reminders Guide',
      subtitle: 'Stay organized and never miss important job search events',
      tabs: {
        overview: 'Overview',
        features: 'Features',
        tips: 'Tips & Tricks',
        integration: 'Integration',
      },
      sections: {
        intro: {
          title: 'Reminders & Calendar',
          description: 'Manage all your job search events, interviews, deadlines, and follow-ups in one organized calendar.',
          features: [
            'Track interviews and deadlines',
            'Set follow-up reminders',
            'Sync with Google Calendar',
            'Export to ICS format',
            'Multiple view modes (Calendar/List)',
            'Real-time notifications',
          ],
        },
        calendarView: {
          title: 'Calendar View',
          description: 'Visual representation of your schedule across different time frames.',
          features: [
            'Month view: See your entire month at a glance',
            'Week view: Focus on the current week',
            'Day view: Detailed daily schedule',
            'Click any date to create a reminder',
            'Color-coded event types',
            'Easy navigation between periods',
          ],
          tip: 'Use Month view for planning, Week view for current focus, and Day view for detailed preparation.',
        },
        listView: {
          title: 'List View',
          description: 'Chronological list of all upcoming events.',
          features: [
            'All reminders in chronological order',
            'Quick search and filtering',
            'Event type badges',
            'Status indicators',
            'One-click event editing',
            'Bulk actions support',
          ],
        },
        reminderTypes: {
          title: 'Reminder Types',
          description: 'Different types of reminders for different purposes.',
          types: [
            {
              title: 'Interview',
              icon: Users,
              description: 'Schedule and prepare for upcoming interviews',
            },
            {
              title: 'Deadline',
              icon: Clock,
              description: 'Track application deadlines and important dates',
            },
            {
              title: 'Follow-up',
              icon: Bell,
              description: 'Set reminders to follow up on applications',
            },
            {
              title: 'Custom',
              icon: Calendar,
              description: 'Create custom reminders for any event',
            },
          ],
        },
        googleCalendar: {
          title: 'Google Calendar Integration',
          description: 'Sync your reminders with Google Calendar for universal access.',
          features: [
            'Two-way sync with your Google Calendar',
            'Get notifications on all devices',
            'Share events with others',
            'Automatic timezone handling',
            'Works offline and syncs later',
          ],
          tip: 'Connect Google Calendar to receive notifications on your phone and computer.',
        },
        export: {
          title: 'Export & Sharing',
          description: 'Export your reminders to share or backup.',
          features: [
            'Export to ICS format',
            'Import to any calendar app',
            'Share with recruiters or mentors',
            'Backup your schedule',
            'Compatible with Outlook, Apple Calendar, etc.',
          ],
        },
        tips: [
          {
            title: 'Set Follow-up Reminders',
            description: 'Create follow-up reminders 1-2 weeks after submitting applications to show your interest.',
            icon: Target,
          },
          {
            title: 'Use Multiple Reminders',
            description: 'Set a reminder 1 day before and 1 hour before important interviews to prepare properly.',
            icon: Clock,
          },
          {
            title: 'Add Detailed Notes',
            description: 'Include preparation notes, questions to ask, or research findings in reminder descriptions.',
            icon: BookOpen,
          },
          {
            title: 'Color Code Events',
            description: 'Use different reminder types (Interview, Deadline, Follow-up) to visually organize your calendar.',
            icon: Calendar,
          },
          {
            title: 'Sync Everywhere',
            description: 'Connect Google Calendar to access your reminders from any device, anywhere.',
            icon: RefreshCw,
          },
          {
            title: 'Regular Review',
            description: 'Check your calendar daily in the morning to plan your day and stay prepared.',
            icon: CheckCircle2,
          },
        ],
        quickActions: [
          {
            title: 'Create Reminder',
            description: 'Click the "+" button or any calendar date to create a new reminder.',
            icon: MousePointerClick,
          },
          {
            title: 'Switch Views',
            description: 'Toggle between Calendar and List views using the view selector.',
            icon: List,
          },
          {
            title: 'Export ICS',
            description: 'Download your reminders as an ICS file to import into other calendar apps.',
            icon: Download,
          },
          {
            title: 'Sync Google',
            description: 'Click the Google Calendar button to sync your events.',
            icon: RefreshCw,
          },
        ],
      },
    },
    he: {
      title: 'מדריך תזכורות',
      subtitle: 'הישארו מאורגנים ואל תפספסו אירועי חיפוש עבודה חשובים',
      tabs: {
        overview: 'סקירה',
        features: 'תכונות',
        tips: 'טיפים וטריקים',
        integration: 'שילוב',
      },
      sections: {
        intro: {
          title: 'תזכורות ויומן',
          description: 'נהלו את כל אירועי חיפוש העבודה, ראיונות, תאריכי יעד ומעקבים ביומן מאורגן אחד.',
          features: [
            'מעקב אחר ראיונות ותאריכי יעד',
            'הגדרת תזכורות למעקב',
            'סנכרון עם Google Calendar',
            'ייצוא לפורמט ICS',
            'מצבי תצוגה מרובים (יומן/רשימה)',
            'התראות בזמן אמת',
          ],
        },
        calendarView: {
          title: 'תצוגת יומן',
          description: 'ייצוג ויזואלי של לוח הזמינו שלכם-frameworkות זמן שונות.',
          features: [
            'תצוגת חודש: ראו את כל החודש במבט אחד',
            'תצוגת שבוע: התמקדו בשבוע הנוכחי',
            'תצוגת יום: לוח זמינו יומי מפורט',
            'לחצו על כל תאריך ליצירת תזכורת',
            'סוגי אירועים מקודדי צבע',
            'ניווט קל בין תקופות',
          ],
          tip: 'השתמשו בתצוגת חודש לתכנון, בתצוגת שבוע להתמקדות נוכחית, ובתצוגת יום להכנה מפורטת.',
        },
        listView: {
          title: 'תצוגת רשימה',
          description: 'רשימה כרונולוגית של כל האירועים הקרובים.',
          features: [
            'כל התזכורות בסדר כרונולוגי',
            'חיפוש וסינון מהיר',
            'תגיות סוג אירוע',
            'מחווני סטטוס',
            'עריכת אירוע בקליק אחד',
            'תמיכה בפעולות מרובות',
          ],
        },
        reminderTypes: {
          title: 'סוגי תזכורות',
          description: 'סוגים שונים של תזכורות למטרות שונות.',
          types: [
            {
              title: 'ראיון',
              icon: Users,
              description: 'תזמו והתכוננו לראיונות קרובים',
            },
            {
              title: 'תאריך יעד',
              icon: Clock,
              description: 'עקבו אחר תאריכי יעד להגשת מועמדות ותאריכים חשובים',
            },
            {
              title: 'מעקב',
              icon: Bell,
              description: 'הגדירו תזכורות למעקב אחר מועמדויות',
            },
            {
              title: 'מותאם אישית',
              icon: Calendar,
              description: 'צרו תזכורות מותאמות אישית לכל אירוע',
            },
          ],
        },
        googleCalendar: {
          title: 'אינטגרציה עם Google Calendar',
          description: 'סנכרנו את התזכורות שלכם עם Google Calendar לגישה אוניברסלית.',
          features: [
            'סנכרון דו-כיווני עם Google Calendar שלכם',
            'קבלו התראות בכל המכשירים',
            'שתפו אירועים עם אחרים',
            'טיפול אוטומטי באזור זמן',
            'עובד במצב לא מקוון ומסתנכרן מאוחר יותר',
          ],
          tip: 'חברו Google Calendar כדי לקבל התראות בטלפון ובמחשב שלכם.',
        },
        export: {
          title: 'ייצוא ושיתוף',
          description: 'ייצאו את התזכורות שלכם לשיתוף או גיבוי.',
          features: [
            'ייצוא לפורמט ICS',
            'ייבוא לכל אפליקציית יומן',
            'שיתוף עם מגייסים או מנטורים',
            'גבו את לוח הזמינו שלכם',
            'תואם ל-Outlook, Apple Calendar ועוד',
          ],
        },
        tips: [
          {
            title: 'הגדירו תזכורות למעקב',
            description: 'צרו תזכורות למעקב שבוע-שבועיים לאחר הגשת מועמדות כדי להראות את העניין שלכם.',
            icon: Target,
          },
          {
            title: 'השתמשו בתזכורות מרובות',
            description: 'הגדירו תזכורת יום לפני ושעה לפני ראיונות חשובים כדי להתכונן כראוי.',
            icon: Clock,
          },
          {
            title: 'הוסיפו הערות מפורטות',
            description: 'כללו הערות הכנה, שאלות לשאול או ממצאי מחקר בתיאורי התזכורות.',
            icon: BookOpen,
          },
          {
            title: 'קידוד צבעים של אירועים',
            description: 'השתמשו בסוגי תזכורת שונים (ראיון, תאריך יעד, מעקב) כדי לארגן את היומן שלכם ויזואלית.',
            icon: Calendar,
          },
          {
            title: 'סנכרנו בכל מקום',
            description: 'חברו Google Calendar כדי לגשת לתזכורות שלכם מכל מכשיר, בכל מקום.',
            icon: RefreshCw,
          },
          {
            title: 'סקירה קבועה',
            description: 'בדקו את היומן שלכם מדי בוקר כדי לתכנן את היום ולהישאר מוכנים.',
            icon: CheckCircle2,
          },
        ],
        quickActions: [
          {
            title: 'יצירת תזכורת',
            description: 'לחצו על כפתור "+" או על כל תאריך ביומן כדי ליצור תזכורת חדשה.',
            icon: MousePointerClick,
          },
          {
            title: 'החלפת תצוגות',
            description: 'החליפו בין תצוגות יומן ורשימה באמצעות בורר התצוגות.',
            icon: List,
          },
          {
            title: 'ייצוא ICS',
            description: 'הורדו את התזכורות שלכם כקובץ ICS לייבוא לאפליקציות יומן אחרות.',
            icon: Download,
          },
          {
            title: 'סנכרון Google',
            description: 'לחצו על כפתור Google Calendar כדי לסנכרן את האירועים שלכם.',
            icon: RefreshCw,
          },
        ],
      },
    },
  };

  const t = isRTL ? content.he : content.en;

  return (
    <>
      {/* Floating Guide Button */}
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
                  <TabsTrigger value="integration" className="text-xs sm:text-sm md:text-base px-2 sm:px-4 py-2">
                    <Zap className="h-4 w-4 sm:hidden" />
                    <span className="hidden sm:inline">{t.tabs.integration}</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-4 sm:p-8" dir={isRTL ? 'rtl' : 'ltr'}>
                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-8 mt-0">
                  {/* Intro */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-8 rounded-2xl bg-gradient-to-br from-[#9F5F80]/10 via-[#9F5F80]/5 to-transparent border-2 border-[#9F5F80]/30 shadow-lg"
                  >
                    <div className={`flex items-start gap-6 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#9F5F80] to-[#7a4a63] text-white shadow-md">
                        <Calendar className="h-8 w-8" />
                      </div>
                      <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                        <h3 className="text-2xl font-bold mb-3">
                          {t.sections.intro.title}
                        </h3>
                        <p className="text-base text-muted-foreground leading-relaxed">
                          {t.sections.intro.description}
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-3">
                      {t.sections.intro.features.map((feature, idx) => (
                        <li key={idx} className={`flex items-start gap-3 text-base ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                          <CheckCircle2 className="h-5 w-5 text-[#9F5F80] mt-1 flex-shrink-0" />
                          <span className="leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>

                  {/* Reminder Types */}
                  <div className="p-8 rounded-2xl bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-transparent border-2 border-purple-500/30 shadow-lg">
                    <h3 className={`text-2xl font-bold mb-6 flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="p-3 rounded-xl bg-purple-500 text-white">
                        <Bell className="h-6 w-6" />
                      </div>
                      {t.sections.reminderTypes.title}
                    </h3>
                    <p className={`text-base text-muted-foreground mb-6 leading-relaxed ${isRTL ? 'text-right' : ''}`}>
                      {t.sections.reminderTypes.description}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {t.sections.reminderTypes.types.map((type, index) => {
                        const Icon = type.icon;
                        return (
                          <div
                            key={index}
                            className="p-5 rounded-xl bg-white/50 dark:bg-[#383e4e]/50 border border-purple-500/20 hover:border-purple-500/40 transition-all"
                          >
                            <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                <Icon className="w-5 h-5 text-purple-500" />
                              </div>
                              <div className={`${isRTL ? 'text-right' : ''}`}>
                                <h4 className="font-bold mb-1">{type.title}</h4>
                                <p className="text-sm text-muted-foreground">{type.description}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Google Calendar Integration */}
                  <div className="p-8 rounded-2xl bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent border-2 border-blue-500/30 shadow-lg">
                    <div className={`flex items-start gap-6 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-md">
                        <RefreshCw className="h-8 w-8" />
                      </div>
                      <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                        <h3 className="text-2xl font-bold mb-3">
                          {t.sections.googleCalendar.title}
                        </h3>
                        <p className="text-base text-muted-foreground leading-relaxed">
                          {t.sections.googleCalendar.description}
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-3 mb-5">
                      {t.sections.googleCalendar.features.map((feature, idx) => (
                        <li key={idx} className={`flex items-start gap-3 text-base ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                          <CheckCircle2 className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
                          <span className="leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                        <Lightbulb className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm leading-relaxed">{t.sections.googleCalendar.tip}</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Features Tab */}
                <TabsContent value="features" className="space-y-4 mt-0">
                  {t.sections.quickActions.map((action, index) => {
                    const Icon = action.icon;
                    const colors = [
                      { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/20' },
                      { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-500/20' },
                      { bg: 'bg-green-500/10', text: 'text-green-600', border: 'border-green-500/20' },
                      { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/20' },
                    ];
                    const color = colors[index % colors.length];
                    
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`bg-white dark:bg-[#383e4e]/50 backdrop-blur-sm border ${color.border} rounded-xl p-5 shadow-md hover:shadow-lg transition-all`}
                      >
                        <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-10 h-10 rounded-lg ${color.bg} flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`w-5 h-5 ${color.text}`} />
                          </div>
                          <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                            <h4 className="font-semibold mb-2">{action.title}</h4>
                            <p className="text-muted-foreground text-sm">{action.description}</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </TabsContent>

                {/* Tips & Tricks Tab */}
                <TabsContent value="tips" className="space-y-4 mt-0">
                  {t.sections.tips.map((tip, index) => {
                    const Icon = tip.icon;
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white dark:bg-[#383e4e]/50 backdrop-blur-sm border border-gray-200 dark:border-[#b6bac5]/20 rounded-xl p-5 hover:border-[#9F5F80]/40 transition-all shadow-md hover:shadow-lg"
                      >
                        <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className="w-10 h-10 rounded-lg bg-[#9F5F80]/20 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-5 h-5 text-[#9F5F80]" />
                          </div>
                          <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                            <h4 className="font-semibold mb-2">{tip.title}</h4>
                            <p className="text-muted-foreground text-sm">{tip.description}</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </TabsContent>

                {/* Integration Tab */}
                <TabsContent value="integration" className="space-y-8 mt-0">
                  {/* Google Calendar */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-8 rounded-2xl bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent border-2 border-blue-500/30 shadow-lg"
                  >
                    <div className={`flex items-start gap-6 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-md">
                        <RefreshCw className="h-8 w-8" />
                      </div>
                      <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                        <h3 className="text-2xl font-bold mb-3">
                          {t.sections.googleCalendar.title}
                        </h3>
                        <p className="text-base text-muted-foreground leading-relaxed">
                          {t.sections.googleCalendar.description}
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-3 mb-5">
                      {t.sections.googleCalendar.features.map((feature, idx) => (
                        <li key={idx} className={`flex items-start gap-3 text-base ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                          <CheckCircle2 className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
                          <span className="leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                        <Lightbulb className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm leading-relaxed">{t.sections.googleCalendar.tip}</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Export & Sharing */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-8 rounded-2xl bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent border-2 border-green-500/30 shadow-lg"
                  >
                    <div className={`flex items-start gap-6 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-md">
                        <Share2 className="h-8 w-8" />
                      </div>
                      <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                        <h3 className="text-2xl font-bold mb-3">
                          {t.sections.export.title}
                        </h3>
                        <p className="text-base text-muted-foreground leading-relaxed">
                          {t.sections.export.description}
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-3">
                      {t.sections.export.features.map((feature, idx) => (
                        <li key={idx} className={`flex items-start gap-3 text-base ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                          <CheckCircle2 className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                          <span className="leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default RemindersHelp;