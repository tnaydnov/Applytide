/**
 * Premium Jobs Page Help & Guide
 * Comprehensive guide for the Jobs page
 */

import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  Eye,
  Send,
  Edit,
  Trash2,
  Chrome,
  CheckCircle2,
  ChevronRight,
  BookOpen,
  Lightbulb,
  BarChart3,
  Zap,
  FileText,
  Target,
  MousePointerClick,
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
import { CHROME_EXTENSION_URL } from '../../constants/urls';

interface JobsHelpProps {
  isRTL: boolean;
  onShowVisualGuide?: () => void;
}

export function JobsHelp({ isRTL, onShowVisualGuide }: JobsHelpProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleShowVisualGuide = () => {
    setIsOpen(false); // Close the sheet
    // Wait for sheet to close before showing visual guide
    timeoutRef.current = setTimeout(() => {
      if (onShowVisualGuide) {
        onShowVisualGuide();
      }
    }, 300); // Sheet animation duration
  };

  const content = {
    en: {
      title: 'Jobs Guide',
      subtitle: 'Learn how to save and manage job opportunities',
      tabs: {
        overview: 'Overview',
        features: 'Features',
        tips: 'Tips & Tricks',
        extension: 'Extension',
      },
      sections: {
        saving: {
          title: 'Saving Jobs',
          description: 'Save job opportunities you find online to track and apply later.',
          methods: [
            {
              icon: Plus,
              title: 'Manual Entry',
              desc: 'Click the "+ Add Job" button to manually enter job details',
            },
            {
              icon: Chrome,
              title: 'Chrome Extension',
              desc: 'Install our extension to save jobs from any website with one click',
            },
          ],
        },
        searching: {
          title: 'Search & Filter',
          description: 'Find the right opportunities quickly with powerful search and filters.',
          features: [
            'Search by job title, company, or keywords',
            'Filter by location and remote/hybrid/onsite',
            'Clear all filters to see all saved jobs',
            'Results update instantly as you type',
          ],
        },
        actions: {
          title: 'Job Actions',
          description: 'Manage your saved jobs efficiently.',
          actions: [
            {
              icon: Eye,
              title: 'View Details',
              desc: 'Click any job card to see full description and details',
            },
            {
              icon: Send,
              title: 'Apply',
              desc: 'Create an application and generate cover letter',
            },
            {
              icon: Edit,
              title: 'Edit',
              desc: 'Update job information as needed',
            },
            {
              icon: Trash2,
              title: 'Delete',
              desc: 'Remove jobs you\'re no longer interested in',
            },
          ],
        },
        bulk: {
          title: 'Bulk Actions',
          description: 'Manage multiple jobs at once.',
          features: [
            'Select multiple jobs with checkboxes',
            'Delete selected jobs in one action',
            'Clear selection to start over',
          ],
        },
      },
      tips: [
        {
          icon: Target,
          title: 'Save First, Apply Later',
          desc: 'Save all interesting jobs immediately. Review and apply when you\'re ready with a tailored cover letter.',
        },
        {
          icon: Chrome,
          title: 'Use the Chrome Extension',
          desc: 'Install our extension to save jobs from LinkedIn, Indeed, and other sites without copy-pasting.',
        },
        {
          icon: Filter,
          title: 'Use Filters Effectively',
          desc: 'Filter by remote type to focus on opportunities that match your work preferences.',
        },
        {
          icon: FileText,
          title: 'Add Detailed Information',
          desc: 'Include job description, salary range, and application deadline to stay organized.',
        },
        {
          icon: BarChart3,
          title: 'Track What Matters',
          desc: 'Save jobs even if you\'re not ready to apply. Build a collection to review later.',
        },
      ],
      extension: {
        title: 'Chrome Extension Benefits',
        benefits: [
          'Save jobs from any website with one click',
          'Automatically extract job title, company, and description',
          'Works on LinkedIn, Indeed, Glassdoor, and more',
          'No copy-pasting required',
          'Sync directly to your Applytide account',
        ],
      },
      workflow: {
        title: 'Recommended Workflow',
        steps: [
          {
            num: 1,
            title: 'Browse Job Boards',
            desc: 'Search for jobs on LinkedIn, Indeed, or your favorite sites',
          },
          {
            num: 2,
            title: 'Save Interesting Jobs',
            desc: 'Use the extension or manual entry to save opportunities',
          },
          {
            num: 3,
            title: 'Review & Filter',
            desc: 'Use filters to focus on the most relevant positions',
          },
          {
            num: 4,
            title: 'Apply When Ready',
            desc: 'Click Apply to create application and generate cover letter',
          },
        ],
      },
    },
    he: {
      title: 'מדריך משרות',
      subtitle: 'למד כיצד לשמור ולנהל הזדמנויות עבודה',
      tabs: {
        overview: 'סקירה',
        features: 'תכונות',
        tips: 'טיפים וטריקים',
        extension: 'תוסף',
      },
      sections: {
        saving: {
          title: 'שמירת משרות',
          description: 'שמור הזדמנויות עבודה שמצאת באינטרנט כדי לעקוב ולהגיש מועמדות מאוחר יותר.',
          methods: [
            {
              icon: Plus,
              title: 'הזנה ידנית',
              desc: 'לחץ על הכפתור "+ הוסף משרה" כדי להזין פרטי משרה ידנית',
            },
            {
              icon: Chrome,
              title: 'תוסף Chrome',
              desc: 'התקן את התוסף שלנו כדי לשמור משרות מכל אתר בלחיצה אחת',
            },
          ],
        },
        searching: {
          title: 'חיפוש וסינון',
          description: 'מצא הזדמנויות מתאימות במהירות עם חיפוש וסינון חזקים.',
          features: [
            'חפש לפי כותרת משרה, חברה או מילות מפתח',
            'סנן לפי מיקום ומרוחק/היברידי/במשרד',
            'נקה את כל הפילטרים כדי לראות את כל המשרות השמורות',
            'התוצאות מתעדכנות באופן מיידי בזמן שאתה מקליד',
          ],
        },
        actions: {
          title: 'פעולות משרה',
          description: 'נהל את המשרות השמורות שלך ביעילות.',
          actions: [
            {
              icon: Eye,
              title: 'צפה בפרטים',
              desc: 'לחץ על כל כרטיס משרה כדי לראות תיאור מלא ופרטים',
            },
            {
              icon: Send,
              title: 'הגש מועמדות',
              desc: 'צור מועמדות וצור מכתב מקדים',
            },
            {
              icon: Edit,
              title: 'ערוך',
              desc: 'עדכן מידע על המשרה לפי הצורך',
            },
            {
              icon: Trash2,
              title: 'מחק',
              desc: 'הסר משרות שאינך מעוניין בהן יותר',
            },
          ],
        },
        bulk: {
          title: 'פעולות בכמות גדולה',
          description: 'נהל מספר משרות בו זמנית.',
          features: [
            'בחר מספר משרות עם תיבות סימון',
            'מחק משרות שנבחרו בפעולה אחת',
            'נקה בחירה כדי להתחיל מחדש',
          ],
        },
      },
      tips: [
        {
          icon: Target,
          title: 'שמור קודם, הגש מועמדות אחר כך',
          desc: 'שמור את כל המשרות המעניינות מיד. סקור והגש מועמדות כשתהיה מוכן עם מכתב מקדים מותאם.',
        },
        {
          icon: Chrome,
          title: 'השתמש בתוסף Chrome',
          desc: 'התקן את התוסף שלנו כדי לשמור משרות מ-LinkedIn, Indeed ואתרים אחרים ללא העתקה והדבקה.',
        },
        {
          icon: Filter,
          title: 'השתמש בפילטרים ביעילות',
          desc: 'סנן לפי סוג עבודה מרוחקת כדי להתמקד בהזדמנויות שמתאימות להעדפות העבודה שלך.',
        },
        {
          icon: FileText,
          title: 'הוסף מידע מפורט',
          desc: 'כלול תיאור משרה, טווח שכר ותאריך יעד להגשת מועמדות כדי להישאר מאורגן.',
        },
        {
          icon: BarChart3,
          title: 'עקוב אחר מה שחשוב',
          desc: 'שמור משרות גם אם אינך מוכן להגיש מועמדות. בנה אוסף לסקירה מאוחר יותר.',
        },
      ],
      extension: {
        title: 'יתרונות תוסף Chrome',
        benefits: [
          'שמור משרות מכל אתר בלחיצה אחת',
          'חלץ אוטומטית כותרת משרה, חברה ותיאור',
          'עובד ב-LinkedIn, Indeed, Glassdoor ועוד',
          'אין צורך בהעתקה והדבקה',
          'סינכרון ישיר לחשבון Applytide שלך',
        ],
      },
      workflow: {
        title: 'זרימת עבודה מומלצת',
        steps: [
          {
            num: 1,
            title: 'עיין בלוחות משרות',
            desc: 'חפש משרות ב-LinkedIn, Indeed או באתרים האהובים עליך',
          },
          {
            num: 2,
            title: 'שמור משרות מעניינות',
            desc: 'השתמש בתוסף או בהזנה ידנית כדי לשמור הזדמנויות',
          },
          {
            num: 3,
            title: 'סקור וסנן',
            desc: 'השתמש בפילטרים כדי להתמקד בתפקידים הרלוונטיים ביותר',
          },
          {
            num: 4,
            title: 'הגש מועמדות כשמוכן',
            desc: 'לחץ על הגש מועמדות כדי ליצור מועמדות ולייצר מכתב מקדים',
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
                <TabsTrigger value="extension" className="text-xs sm:text-sm md:text-base px-2 sm:px-4 py-2">
                  <Chrome className="h-4 w-4 sm:hidden" />
                  <span className="hidden sm:inline">{t.tabs.extension}</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-4 sm:p-8" dir={isRTL ? 'rtl' : 'ltr'}>
              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-8 mt-0">
                {/* Saving Jobs */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-8 rounded-2xl bg-gradient-to-br from-[#9F5F80]/10 via-[#9F5F80]/5 to-transparent border-2 border-[#9F5F80]/30 shadow-lg"
                >
                  <div className={`flex items-start gap-6 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-[#9F5F80] to-[#7a4a63] text-white shadow-md">
                      <Briefcase className="h-8 w-8" />
                    </div>
                    <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                      <h3 className="text-2xl font-bold mb-3">
                        {t.sections.saving.title}
                      </h3>
                      <p className="text-base text-muted-foreground leading-relaxed">
                        {t.sections.saving.description}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {t.sections.saving.methods.map((method, idx) => (
                      <div key={idx} className="p-5 rounded-xl bg-white dark:bg-[#383e4e]/50 border-2 border-gray-200 dark:border-[#b6bac5]/20">
                        <div className={`flex items-start gap-3 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className="p-2.5 rounded-lg bg-[#9F5F80]/10">
                            <method.icon className="h-5 w-5 text-[#9F5F80]" />
                          </div>
                          <h4 className={`font-bold text-lg ${isRTL ? 'text-right' : ''}`}>{method.title}</h4>
                        </div>
                        <p className={`text-sm text-muted-foreground leading-relaxed ${isRTL ? 'text-right' : ''}`}>
                          {method.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Searching */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-2 border-blue-500/30 shadow-md">
                  <div className={`flex items-center gap-4 mb-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="p-3 rounded-xl bg-blue-500 text-white">
                      <Search className="h-6 w-6" />
                    </div>
                    <h4 className={`text-xl font-bold ${isRTL ? 'text-right' : ''}`}>{t.sections.searching.title}</h4>
                  </div>
                  <p className={`text-base text-muted-foreground mb-5 leading-relaxed ${isRTL ? 'text-right' : ''}`}>
                    {t.sections.searching.description}
                  </p>
                  <ul className="space-y-2.5">
                    {t.sections.searching.features.map((feature, idx) => (
                      <li key={idx} className={`flex items-start gap-3 text-sm ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                        <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
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
                {/* Actions */}
                <div>
                  <div className={`flex items-center gap-3 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="p-3 rounded-xl bg-[#9F5F80]/10">
                      <MousePointerClick className="h-6 w-6 text-[#9F5F80]" />
                    </div>
                    <h3 className={`text-2xl font-bold ${isRTL ? 'text-right' : ''}`}>{t.sections.actions.title}</h3>
                  </div>
                  <p className={`text-base text-muted-foreground mb-6 leading-relaxed ${isRTL ? 'text-right' : ''}`}>
                    {t.sections.actions.description}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {t.sections.actions.actions.map((action, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        className="p-6 rounded-2xl bg-white dark:bg-[#383e4e]/50 border-2 border-gray-200 dark:border-[#b6bac5]/20 shadow-md hover:shadow-lg transition-all"
                      >
                        <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className="p-3 rounded-xl bg-[#9F5F80]/10 flex-shrink-0">
                            <action.icon className="h-6 w-6 text-[#9F5F80]" />
                          </div>
                          <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                            <p className="font-bold text-lg mb-2">{action.title}</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">{action.desc}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Bulk Actions */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/5 border-2 border-purple-500/30 shadow-md">
                  <div className={`flex items-center gap-4 mb-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="p-3 rounded-xl bg-purple-500 text-white">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <h4 className={`text-xl font-bold ${isRTL ? 'text-right' : ''}`}>{t.sections.bulk.title}</h4>
                  </div>
                  <p className={`text-base text-muted-foreground mb-5 leading-relaxed ${isRTL ? 'text-right' : ''}`}>
                    {t.sections.bulk.description}
                  </p>
                  <ul className="space-y-2.5">
                    {t.sections.bulk.features.map((feature, idx) => (
                      <li key={idx} className={`flex items-start gap-3 text-sm ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                        <ChevronRight className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
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

              {/* Extension Tab */}
              <TabsContent value="extension" className="space-y-6 mt-0">
                <div className="p-8 rounded-2xl bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/5 border-2 border-blue-500/30 shadow-lg">
                  <div className={`flex items-start gap-4 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-md">
                      <Chrome className="h-8 w-8" />
                    </div>
                    <div className={`${isRTL ? 'text-right' : ''}`}>
                      <h3 className="text-2xl font-bold mb-2">{t.extension.title}</h3>
                    </div>
                  </div>
                  <ul className="space-y-4 mb-6">
                    {t.extension.benefits.map((benefit, idx) => (
                      <li key={idx} className={`flex items-start gap-3 text-base ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                        <CheckCircle2 className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
                        <span className="leading-relaxed">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    size="lg" 
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                    onClick={() => window.open(CHROME_EXTENSION_URL, '_blank', 'noopener,noreferrer')}
                  >
                    <Chrome className="h-5 w-5 mr-2" />
                    {isRTL ? 'התקן תוסף Chrome' : 'Install Chrome Extension'}
                  </Button>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-2 border-amber-500/30 shadow-md">
                  <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Lightbulb className="h-7 w-7 text-amber-600 mt-1 flex-shrink-0" />
                    <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                      <p className="font-bold text-lg mb-3">
                        {isRTL ? 'טיפ מקצועי' : 'Pro Tip'}
                      </p>
                      <p className="text-base text-muted-foreground leading-relaxed">
                        {isRTL
                          ? 'התקן את התוסף פעם אחת והשתמש בו באופן עקבי. זה חוסך שעות של עבודה ידנית ושומר את כל המשרות שלך מאורגנות.'
                          : 'Install the extension once and use it consistently. It saves hours of manual work and keeps all your jobs organized.'}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}