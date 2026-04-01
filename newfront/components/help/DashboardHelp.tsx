/**
 * Premium Dashboard Help & Guide
 * Comprehensive guide for the Dashboard page
 */

import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Trophy,
  TrendingUp,
  Calendar,
  Activity,
  Eye,
  Target,
  Upload,
  Search,
  CheckCircle2,
  BookOpen,
  Lightbulb,
  BarChart3,
  Zap,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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

interface DashboardHelpProps {
  isRTL: boolean;
  onShowVisualGuide?: () => void;
}

export function DashboardHelp({ isRTL, onShowVisualGuide }: DashboardHelpProps) {
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
      title: 'Dashboard Guide',
      subtitle: 'Learn how to track and optimize your job search',
      tabs: {
        overview: 'Overview',
        features: 'Features',
        tips: 'Tips & Tricks',
      },
      sections: {
        weeklyGoal: {
          title: 'Weekly Goal Tracking',
          description: 'Stay consistent with your job search by setting weekly application targets.',
          features: [
            'Click the settings icon to adjust your weekly goal',
            'Visual progress bar shows completion percentage',
            'Get motivated when you hit your target! 🎉',
            'Track your momentum week over week',
          ],
          tip: 'Start with a realistic goal (5-10 applications) and adjust based on your schedule and results.',
        },
        stats: {
          title: 'Quick Stats Overview',
          description: 'Monitor your key job search metrics at a glance.',
          metrics: [
            { icon: Trophy, name: 'Job Offers', desc: 'Track successful offers received' },
            { icon: TrendingUp, name: 'Response Rate', desc: 'Percentage of applications that get responses' },
            { icon: Calendar, name: 'Interviews', desc: 'Scheduled and completed interviews' },
            { icon: Activity, name: 'Applications', desc: 'Total applications sent' },
          ],
          tip: 'Check your response rate weekly. If it\'s below 20%, consider revising your resume or application strategy.',
        },
        activity: {
          title: 'Recent Activity Feed',
          description: 'Stay updated with your latest job search actions and responses.',
          features: [
            'Applications sent in the last 7 days',
            'Company responses and interview invitations',
            'Status updates on pending applications',
            'Automatic timestamps for every activity',
          ],
        },
        upcoming: {
          title: 'Upcoming Events',
          description: 'Never miss an important interview or deadline.',
          features: [
            'Scheduled interviews with date and time',
            'Follow-up reminders for applications',
            'Application deadlines',
            'Networking events and job fairs',
          ],
          tip: 'Prepare for interviews at least 24 hours in advance. Research the company and practice common questions.',
        },
        quickActions: {
          title: 'Quick Actions',
          description: 'Fast access to your most common tasks.',
          actions: [
            { icon: Upload, name: 'Upload Resume', desc: 'Update your CV quickly' },
            { icon: Search, name: 'Find Jobs', desc: 'Browse new opportunities' },
            { icon: CheckCircle2, name: 'Track Applications', desc: 'Manage your pipeline' },
          ],
        },
      },
      tips: [
        {
          icon: Target,
          title: 'Set Realistic Goals',
          desc: 'Start with 5-10 applications per week. Quality matters more than quantity. Focus on roles that truly match your skills and career goals.',
        },
        {
          icon: TrendingUp,
          title: 'Monitor Your Metrics',
          desc: 'Check your response rate weekly. If it\'s low, revise your resume or tailor applications more carefully to job descriptions.',
        },
        {
          icon: Calendar,
          title: 'Stay Organized',
          desc: 'Use the upcoming events section to prepare for interviews in advance. Set reminders and research companies before meetings.',
        },
        {
          icon: Sparkles,
          title: 'Use AI Insights',
          desc: 'Check the AI insights regularly for personalized recommendations on improving your application strategy.',
        },
      ],
    },
    he: {
      title: 'מדריך לוח הבקרה',
      subtitle: 'למד כיצד לעקוב ולייעל את חיפוש העבודה שלך',
      tabs: {
        overview: 'סקירה',
        features: 'תכונות',
        tips: 'טיפים וטריקים',
      },
      sections: {
        weeklyGoal: {
          title: 'מעקב יעד שבועי',
          description: 'הישאר עקבי בחיפוש העבודה שלך על ידי הגדרת יעדים שבועיים.',
          features: [
            'לחץ על אייקון ההגדרות כדי להתאים את היעד השבועי',
            'פס התקדמות ויזואלי מציג אחוז השלמה',
            'קבל מוטיבציה כשאתה מגיע ליעד! 🎉',
            'עקוב אחר המומנטום שלך משבוע לשבוע',
          ],
          tip: 'התחל עם יעד ריאלי (5-10 מועמדויות) והתאם לפי הלוח זמנים והתוצאות שלך.',
        },
        stats: {
          title: 'סקירת נתונים מהירה',
          description: 'עקוב אחר מדדי חיפוש העבודה המרכזיים במבט חטוף.',
          metrics: [
            { icon: Trophy, name: 'הצעות עבודה', desc: 'עקוב אחר הצעות שהתקבלו' },
            { icon: TrendingUp, name: 'אחוז תגובה', desc: 'אחוז המועמדויות שמקבלות תגובות' },
            { icon: Calendar, name: 'ראיונות', desc: 'ראיונות מתוכננים ושהושלמו' },
            { icon: Activity, name: 'מועמדויות', desc: 'סך המועמדויות שנשלחו' },
          ],
          tip: 'בדוק את אחוז התגובה שבועית. אם הוא מתחת ל-20%, שקול לשפר את קורות החיים או אסטרטגיית המועמדות.',
        },
        activity: {
          title: 'פיד פעילות אחרונה',
          description: 'הישאר מעודכן עם הפעולות והתגובות האחרונות בחיפוש העבודה.',
          features: [
            'מועמדויות שנשלחו ב-7 הימים האחרונים',
            'תגובות מחברות והזמנות לראיונות',
            'עדכוני סטטוס על מועמדויות ממתינות',
            'חותמות זמן אוטומטיות לכל פעילות',
          ],
        },
        upcoming: {
          title: 'אירועים קרובים',
          description: 'לעולם אל תפספס ראיון או תאריך יעד חשוב.',
          features: [
            'ראיונות מתוכננים עם תאריך ושעה',
            'תזכורות מעקב למועמדויות',
            'תאריכי יעד למועמדויות',
            'אירועי נטוורקינג ויריד משרות',
          ],
          tip: 'התכונן לראיונות לפחות 24 שעות מראש. חקור את החברה ותרגל שאלות נפוצות.',
        },
        quickActions: {
          title: 'פעולות מהירות',
          description: 'גישה מהירה למשימות הנפוצות ביותר שלך.',
          actions: [
            { icon: Upload, name: 'העלאת קורות חיים', desc: 'עדכן את קורות החיים שלך' },
            { icon: Search, name: 'מציאת משרות', desc: 'עיין בהזדמנויות חדשות' },
            { icon: CheckCircle2, name: 'מעקב מועמדויות', desc: 'נהל את הפייפליין שלך' },
          ],
        },
      },
      tips: [
        {
          icon: Target,
          title: 'הגדר יעדים ריאליים',
          desc: 'התחל עם 5-10 מועמדויות בשבוע. איכות חשובה יותר מכמות. התמקד בתפקידים שמתאימים באמת לכישורים ולמטרות הקריירה שלך.',
        },
        {
          icon: TrendingUp,
          title: 'עקוב אחר המדדים',
          desc: 'בדוק את אחוז התגובה שבועית. אם הוא נמוך, שפר את קורות החיים או התאם את המועמדויות בצורה מדויקת יותר לתיאורי המשרה.',
        },
        {
          icon: Calendar,
          title: 'הישאר מאורגן',
          desc: 'השתמש בסקציית האירועים הקרובים כדי להתכונן לראיונות מראש. הגדר תזכורות וחקור חברות לפני פגישות.',
        },
        {
          icon: Sparkles,
          title: 'השתמש בתובנות AI',
          desc: 'בדוק את תובנות ה-AI באופן קבוע להמלצות מותאמות אישית לשיפור אסטרטגיית המועמדות שלך.',
        },
      ],
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
              <TabsList className="grid w-full grid-cols-3 h-auto">
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
              </TabsList>
            </div>

            <div className="px-4 sm:px-8 py-6 sm:py-8 bg-white dark:bg-[#383e4e]">
              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-0 space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Weekly Goal */}
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-[#9F5F80]/10 to-[#9F5F80]/5 border border-[#9F5F80]/20">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-[#9F5F80]/20">
                        <Target className="h-6 w-6 text-[#9F5F80]" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-2">{t.sections.weeklyGoal.title}</h3>
                        <p className="text-muted-foreground mb-3">{t.sections.weeklyGoal.description}</p>
                        <ul className="space-y-2">
                          {t.sections.weeklyGoal.features.map((feature: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-[#9F5F80] mt-0.5 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-4 p-3 bg-white dark:bg-[#383e4e] rounded-lg border border-[#b6bac5]/20">
                          <p className="text-sm text-muted-foreground flex items-start gap-2">
                            <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            <span>{t.sections.weeklyGoal.tip}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-blue-500/20">
                        <BarChart3 className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-2">{t.sections.stats.title}</h3>
                        <p className="text-muted-foreground mb-4">{t.sections.stats.description}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {t.sections.stats.metrics.map((metric: { icon: LucideIcon; name: string; desc: string }, i: number) => {
                            const Icon = metric.icon;
                            return (
                              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-[#383e4e] border border-gray-200 dark:border-[#b6bac5]/20">
                                <Icon className="h-5 w-5 text-blue-600 mt-0.5" />
                                <div>
                                  <div className="font-semibold text-sm">{metric.name}</div>
                                  <div className="text-xs text-muted-foreground">{metric.desc}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-4 p-3 bg-white dark:bg-[#383e4e] rounded-lg border border-[#b6bac5]/20">
                          <p className="text-sm text-muted-foreground flex items-start gap-2">
                            <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            <span>{t.sections.stats.tip}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </TabsContent>

              {/* Features Tab */}
              <TabsContent value="features" className="mt-0 space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Recent Activity */}
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-orange-500/20">
                        <Activity className="h-6 w-6 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-2">{t.sections.activity.title}</h3>
                        <p className="text-muted-foreground mb-3">{t.sections.activity.description}</p>
                        <ul className="space-y-2">
                          {t.sections.activity.features.map((feature: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Upcoming Events */}
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-purple-500/20">
                        <Calendar className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-2">{t.sections.upcoming.title}</h3>
                        <p className="text-muted-foreground mb-3">{t.sections.upcoming.description}</p>
                        <ul className="space-y-2">
                          {t.sections.upcoming.features.map((feature: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-4 p-3 bg-white dark:bg-[#383e4e] rounded-lg border border-[#b6bac5]/20">
                          <p className="text-sm text-muted-foreground flex items-start gap-2">
                            <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            <span>{t.sections.upcoming.tip}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-green-500/20">
                        <Zap className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-2">{t.sections.quickActions.title}</h3>
                        <p className="text-muted-foreground mb-4">{t.sections.quickActions.description}</p>
                        <div className="grid grid-cols-1 gap-3">
                          {t.sections.quickActions.actions.map((action: { icon: LucideIcon; name: string; desc: string }, i: number) => {
                            const Icon = action.icon;
                            return (
                              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-[#383e4e] border border-gray-200 dark:border-[#b6bac5]/20">
                                <Icon className="h-5 w-5 text-green-600 mt-0.5" />
                                <div>
                                  <div className="font-semibold text-sm">{action.name}</div>
                                  <div className="text-xs text-muted-foreground">{action.desc}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </TabsContent>

              {/* Tips Tab */}
              <TabsContent value="tips" className="mt-0 space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {t.tips.map((tip: { icon: LucideIcon; title: string; desc: string }, i: number) => {
                    const Icon = tip.icon;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-6 rounded-2xl bg-gradient-to-br from-[#9F5F80]/10 to-[#9F5F80]/5 border border-[#9F5F80]/20"
                      >
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-xl bg-[#9F5F80]/20">
                            <Icon className="h-6 w-6 text-[#9F5F80]" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-lg mb-2">{tip.title}</h3>
                            <p className="text-muted-foreground">{tip.desc}</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
