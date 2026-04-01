/**
 * Premium Analytics Help & Guide
 * Comprehensive guide for the Analytics page
 */

import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  BarChart3,
  FileText,
  Building2,
  Clock,
  Sun,
  Globe,
  Users,
  Eye,
  Target,
  TrendingUp,
  BookOpen,
  Lightbulb,
  Sparkles,
  CheckCircle2,
  Activity,
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

interface AnalyticsHelpProps {
  isRTL: boolean;
  onShowVisualGuide?: () => void;
}

export function AnalyticsHelp({ isRTL, onShowVisualGuide }: AnalyticsHelpProps) {
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
      title: 'Analytics Guide',
      subtitle: 'Master your job search data and insights',
      tabs: {
        overview: 'Overview',
        features: 'Features',
        tips: 'Tips & Tricks',
      },
      sections: {
        overview: {
          title: 'Overview Analytics',
          description: 'Get a comprehensive view of your job search performance with key metrics and trends.',
          features: [
            'Track total applications, response rates, and interview rates',
            'Monitor your weekly application trend',
            'Visualize status breakdown with interactive pie charts',
            'View average days to response and time-to-interview metrics',
          ],
          tip: 'Check your Overview tab weekly to identify trends and adjust your job search strategy.',
        },
        applications: {
          title: 'Applications Analytics',
          description: 'Deep dive into your application data with detailed breakdowns and insights.',
          features: [
            'Status distribution shows where your applications stand',
            'Monthly trends reveal your application patterns',
            'Position type breakdown helps you understand your focus areas',
            'See which application types perform best',
          ],
          tip: 'If you notice low conversion rates for certain position types, consider refining your approach for those roles.',
        },
        companies: {
          title: 'Companies Analytics',
          description: 'Analyze your interactions with different companies and identify opportunities.',
          features: [
            'See which companies you\'ve applied to most',
            'Track response rates by company',
            'Identify companies with highest success rates',
            'Monitor industry distribution of your applications',
          ],
          tip: 'Focus on companies with higher response rates to maximize your chances of success.',
        },
        timeline: {
          title: 'Timeline View',
          description: 'Visualize your job search journey over time with detailed timeline analytics.',
          features: [
            'See when you submitted applications',
            'Track responses and interview dates',
            'Identify gaps in your application schedule',
            'Understand seasonal patterns in responses',
          ],
          tip: 'Consistent application submission (2-3 times per week) often yields better results than sporadic bursts.',
        },
        bestTime: {
          title: 'Best Time Analytics',
          description: 'Discover the optimal times to submit applications for better response rates.',
          features: [
            'Best days of the week to apply',
            'Optimal time of day for submissions',
            'Response rate by submission time',
            'Success patterns by day and hour',
          ],
          tip: 'Applications submitted early in the week (Monday-Wednesday) often get higher response rates.',
        },
        sources: {
          title: 'Sources Analytics',
          description: 'Understand which job sources yield the best results for your search.',
          features: [
            'Track which platforms drive most applications',
            'Compare response rates across different sources',
            'Identify high-performing job boards',
            'See success rates by source type',
          ],
          tip: 'Focus 80% of your effort on the 20% of sources that give you the best results.',
        },
        interviews: {
          title: 'Interviews Analytics',
          description: 'Analyze your interview performance and conversion rates.',
          features: [
            'Track total interviews scheduled and completed',
            'Monitor interview-to-offer conversion rate',
            'See interview types breakdown (phone, video, in-person)',
            'Analyze interview outcomes and feedback patterns',
          ],
          tip: 'Prepare for each interview by researching the company for at least 2 hours beforehand.',
        },
      },
      tips: [
        {
          icon: Target,
          title: 'Set Data-Driven Goals',
          desc: 'Use your analytics to set realistic, measurable goals. If your response rate is 15%, aim to improve it to 20% by refining your applications.',
        },
        {
          icon: TrendingUp,
          title: 'Monitor Trends Weekly',
          desc: 'Check your analytics every week to spot trends early. A declining response rate might signal the need to update your resume or approach.',
        },
        {
          icon: Clock,
          title: 'Optimize Your Timing',
          desc: 'Use the Best Time analytics to submit applications when they\'re most likely to be seen. Early morning on weekdays often works best.',
        },
        {
          icon: Sparkles,
          title: 'Focus on What Works',
          desc: 'Double down on sources, companies, and strategies that show the highest success rates in your analytics.',
        },
      ],
    },
    he: {
      title: 'מדריך אנליטיקס',
      subtitle: 'שלוט במידע ובתובנות על חיפוש העבודה שלך',
      tabs: {
        overview: 'סקירה',
        features: 'תכונות',
        tips: 'טיפים וטריקים',
      },
      sections: {
        overview: {
          title: 'אנליטיקס כללי',
          description: 'קבל מבט כולל על ביצועי חיפוש העבודה שלך עם מדדים ומגמות מרכזיים.',
          features: [
            'עקוב אחר סך המועמדויות, אחוזי תגובה ואחוזי ראיונות',
            'עקוב אחר מגמת המועמדויות השבועית שלך',
            'הצג פילוח סטטוסים עם גרפי עוגה אינטראקטיביים',
            'צפה בממוצע ימים לתגובה וזמן עד ראיון',
          ],
          tip: 'בדוק את הכרטיסייה סקירה שבועית כדי לזהות מגמות ולהתאים את אסטרטגיית חיפוש העבודה שלך.',
        },
        applications: {
          title: 'אנליטיקס מועמדויות',
          description: 'התעמק בנתוני המועמדויות שלך עם פילוחים ותובנות מפורטים.',
          features: [
            'התפלגות סטטוסים מראה איפה המועמדויות שלך נמצאות',
            'מגמות חודשיות חושפות את דפוסי המועמדות שלך',
            'פילוח סוגי תפקידים עוזר לך להבין על מה אתה מתמקד',
            'ראה אילו סוגי מועמדויות עובדים הכי טוב',
          ],
          tip: 'אם אתה מבחין בשיעורי המרה נמוכים לסוגי תפקידים מסוימים, שקול לשפר את הגישה שלך לתפקידים אלה.',
        },
        companies: {
          title: 'אנליטיקס חברות',
          description: 'נתח את האינטראקציות שלך עם חברות שונות וזהה הזדמנויות.',
          features: [
            'ראה לאילו חברות הגשת הכי הרבה מועמדויות',
            'עקוב אחר אחוזי תגובה לפי חברה',
            'זהה חברות עם שיעורי הצלחה גבוהים',
            'עקוב אחר התפלגות תעשיות של המועמדויות שלך',
          ],
          tip: 'התמקד בחברות עם אחוזי תגובה גבוהים יותר כדי למקסם את סיכויי ההצלחה שלך.',
        },
        timeline: {
          title: 'תצוגת ציר זמן',
          description: 'הצג את מסע חיפוש העבודה שלך לאורך זמן עם אנליטיקס ציר זמן מפורט.',
          features: [
            'ראה מתי שלחת מועמדויות',
            'עקוב אחר תגובות ותאריכי ראיונות',
            'זהה פערים בלוח הזמנים של המועמדויות שלך',
            'הבן דפוסים עונתיים בתגובות',
          ],
          tip: 'שליחת מועמדויות עקבית (2-3 פעמים בשבוע) מניבה לעתים קרובות תוצאות טובות יותר מפרצי שליחה ספוראדיים.',
        },
        bestTime: {
          title: 'אנליטיקס זמן מיטבי',
          description: 'גלה את הזמנים האופטימליים לשליחת מועמדויות לקבלת שיעורי תגובה טובים יותר.',
          features: [
            'ימים הטובים ביותר בשבוע להגשת מועמדויות',
            'שעות אופטימליות ביום לשליחות',
            'שיעור תגובה לפי זמן שליחה',
            'דפוסי הצלחה לפי יום ושעה',
          ],
          tip: 'מועמדויות שנשלחות בתחילת השבוע (יום ב׳-ד׳) מקבלות לעתים קרובות שיעורי תגובה גבוהים יותר.',
        },
        sources: {
          title: 'אנליטיקס מקורות',
          description: 'הבן אילו מקורות משרות מניבים את התוצאות הטובות ביותר לחיפוש שלך.',
          features: [
            'עקוב אחר אילו פלטפורמות מניעות הכי הרבה מועמדויות',
            'השווה שיעורי תגובה בין מקורות שונים',
            'זהה לוחות משרות בעלי ביצועים גבוהים',
            'ראה שיעורי הצלחה לפי סוג מקור',
          ],
          tip: 'התמקד ב-80% מהמאמץ שלך ב-20% מהמקורות שנותנים לך את התוצאות הטובות ביותר.',
        },
        interviews: {
          title: 'אנליטיקס ראיונות',
          description: 'נתח את ביצועי הראיונות ושיעורי ההמרה שלך.',
          features: [
            'עקוב אחר סך הראיונות שתוזמנו והושלמו',
            'עקוב אחר שיעור המרה מראיון להצעה',
            'ראה פילוח סוגי ראיונות (טלפון, וידאו, פנים אל פנים)',
            'נתח תוצאות ראיונות ודפוסי משוב',
          ],
          tip: 'התכונן לכל ראיון על ידי חקירת החברה למשך לפחות שעתיים מראש.',
        },
      },
      tips: [
        {
          icon: Target,
          title: 'הגדר יעדים מבוססי נתונים',
          desc: 'השתמש באנליטיקס שלך כדי להגדיר יעדים ריאליים וניתנים למדידה. אם אחוז התגובה שלך הוא 15%, שאף לשפר אותו ל-20% על ידי שיפור המועמדויות.',
        },
        {
          icon: TrendingUp,
          title: 'עקוב אחר מגמות שבועית',
          desc: 'בדוק את האנליטיקס שלך כל שבוע כדי לזהות מגמות מוקדם. ירידה באחוז התגובה עשויה לאותת על הצורך לעדכן את קורות החיים או הגישה שלך.',
        },
        {
          icon: Clock,
          title: 'מטב את התזמון שלך',
          desc: 'השתמש באנליטיקס זמן מיטבי כדי לשלוח מועמדויות כשהן סביר להניח שייראו. בוקר מוקדם בימי חול לרוב עובד הכי טוב.',
        },
        {
          icon: Sparkles,
          title: 'התמקד במה שעובד',
          desc: 'הכפל את המאמצים במקורות, חברות ואסטרטגיות שמראים את שיעורי ההצלחה הגבוהים ביותר באנליטיקס שלך.',
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
                  {/* Overview Section */}
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-[#9F5F80]/10 to-[#9F5F80]/5 border border-[#9F5F80]/20">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-[#9F5F80]/20">
                        <BarChart3 className="h-6 w-6 text-[#9F5F80]" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-2">{t.sections.overview.title}</h3>
                        <p className="text-muted-foreground mb-3">{t.sections.overview.description}</p>
                        <ul className="space-y-2">
                          {t.sections.overview.features.map((feature: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-[#9F5F80] mt-0.5 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-4 p-3 bg-white dark:bg-[#383e4e] rounded-lg border border-[#b6bac5]/20">
                          <p className="text-sm text-muted-foreground flex items-start gap-2">
                            <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            <span>{t.sections.overview.tip}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Applications Section */}
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-blue-500/20">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-2">{t.sections.applications.title}</h3>
                        <p className="text-muted-foreground mb-3">{t.sections.applications.description}</p>
                        <ul className="space-y-2">
                          {t.sections.applications.features.map((feature: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-4 p-3 bg-white dark:bg-[#383e4e] rounded-lg border border-[#b6bac5]/20">
                          <p className="text-sm text-muted-foreground flex items-start gap-2">
                            <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            <span>{t.sections.applications.tip}</span>
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
                  className="space-y-4"
                >
                  {Object.entries(t.sections).slice(2).map(([key, section]: [string, { title: string; description: string; features: string[]; tip?: string }], index) => {
                    const icons: Record<string, LucideIcon> = {
                      companies: Building2,
                      timeline: Clock,
                      bestTime: Sun,
                      sources: Globe,
                      interviews: Users,
                    };
                    const colors = ['orange', 'purple', 'green', 'pink', 'indigo'];
                    const color = colors[index % colors.length];
                    const Icon = icons[key] || Activity;

                    return (
                      <div 
                        key={key}
                        className={`p-6 rounded-2xl bg-gradient-to-br from-${color}-500/10 to-${color}-500/5 border border-${color}-500/20`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-xl bg-${color}-500/20`}>
                            <Icon className={`h-6 w-6 text-${color}-600`} />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-lg mb-2">{section.title}</h3>
                            <p className="text-muted-foreground mb-3">{section.description}</p>
                            <ul className="space-y-2">
                              {section.features.map((feature: string, i: number) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                  <CheckCircle2 className={`h-4 w-4 text-${color}-600 mt-0.5 flex-shrink-0`} />
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                            {section.tip && (
                              <div className="mt-4 p-3 bg-white dark:bg-[#383e4e] rounded-lg border border-[#b6bac5]/20">
                                <p className="text-sm text-muted-foreground flex items-start gap-2">
                                  <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                  <span>{section.tip}</span>
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
