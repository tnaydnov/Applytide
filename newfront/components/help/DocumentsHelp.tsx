/**
 * Premium Documents Help & Guide
 * Tab-based guide matching Dashboard pattern
 */

import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  FileText,
  Upload,
  Sparkles,
  BookOpen,
  Lightbulb,
  CheckCircle2,
  BarChart3,
  Zap,
  Download,
  Eye,
  Archive,
  Search,
  Filter,
  Shield,
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

interface DocumentsHelpProps {
  isRTL: boolean;
  onShowVisualGuide?: () => void;
}

export function DocumentsHelp({ isRTL, onShowVisualGuide }: DocumentsHelpProps) {
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
      title: 'Documents Guide',
      subtitle: 'Learn how to manage your documents effectively',
      tabs: {
        overview: 'Overview',
        features: 'Features',
        tips: 'Tips & Tricks',
        aiTools: 'AI Tools',
      },
      sections: {
        intro: {
          title: 'Document Management',
          description: 'Store, organize, and manage all your job application documents in one centralized location.',
        },
        upload: {
          title: 'Upload Documents',
          description: 'Add your resumes, cover letters, portfolios, and other documents.',
          features: [
            'Drag and drop files or click to browse',
            'Supports PDF and DOCX formats',
            'Maximum file size: 10MB',
            'Auto-categorize by document type',
          ],
        },
        organize: {
          title: 'Organize & Filter',
          description: 'Keep your documents organized with powerful filtering and sorting.',
          features: [
            'Filter by document type (resume, cover letter, etc.)',
            'Filter by status (active, draft, archived)',
            'Sort by name, date, or file size',
            'Search documents by name',
          ],
        },
        aiGenerate: {
          title: 'AI Cover Letter Generator',
          description: 'Generate personalized cover letters using AI.',
          features: [
            'Select a resume from your documents',
            'Choose a saved job from your pipeline',
            'Customize length (short, medium, long)',
            'Adjust tone (professional, friendly, enthusiastic)',
            'Edit and save the generated letter',
          ],
        },
        actions: {
          title: 'Document Actions',
          description: 'Manage your documents with these quick actions:',
          list: [
            { icon: Eye, label: 'Preview', desc: 'View document contents' },
            { icon: Download, label: 'Download', desc: 'Download to your device' },
            { icon: Sparkles, label: 'Analyze', desc: 'AI analysis and suggestions' },
            { icon: Archive, label: 'Archive', desc: 'Archive old documents' },
          ],
        },
      },
      tips: [
        {
          icon: Upload,
          title: 'Keep Documents Updated',
          desc: 'Regularly update your resume with new skills and experiences. Use draft status while working on updates.',
        },
        {
          icon: FileText,
          title: 'Multiple Versions',
          desc: 'Maintain multiple resume versions targeted at different job types or industries.',
        },
        {
          icon: Sparkles,
          title: 'Use AI Generation',
          desc: 'Generate tailored cover letters for each job application. The AI analyzes the job description and your resume.',
        },
        {
          icon: Archive,
          title: 'Archive Old Versions',
          desc: 'Keep your active documents clean by archiving outdated versions. Archived documents can be restored anytime.',
        },
        {
          icon: Shield,
          title: 'Security & Privacy',
          desc: 'Your documents are securely stored and encrypted. Only you can access your files.',
        },
        {
          icon: Search,
          title: 'Quick Search',
          desc: 'Use the search bar to quickly find documents by name. Perfect when you have many files.',
        },
      ],
      workflow: {
        title: 'Recommended Workflow',
        steps: [
          {
            num: 1,
            title: 'Upload Your Resume',
            desc: 'Start by uploading your primary resume. You can add multiple versions later.',
          },
          {
            num: 2,
            title: 'Add Supporting Documents',
            desc: 'Upload portfolios, certificates, transcripts, and reference letters.',
          },
          {
            num: 3,
            title: 'Save Job Opportunities',
            desc: 'Go to Jobs page and save positions you want to apply to.',
          },
          {
            num: 4,
            title: 'Generate Cover Letters',
            desc: 'Use AI to create customized cover letters for each saved job.',
          },
          {
            num: 5,
            title: 'Download & Apply',
            desc: 'Download your documents and submit applications.',
          },
        ],
      },
    },
    he: {
      title: 'מדריך מסמכים',
      subtitle: 'למד כיצד לנהל את המסמכים שלך ביעילות',
      tabs: {
        overview: 'סקירה',
        features: 'תכונות',
        tips: 'טיפים וטריקים',
        aiTools: 'כלי AI',
      },
      sections: {
        intro: {
          title: 'ניהול מסמכים',
          description: 'אחסן, ארגן ונהל את כל מסמכי הגשת המועמדות שלך במיקום מרכזי אחד.',
        },
        upload: {
          title: 'העלאת מסמכים',
          description: 'הוסף קורות חיים, מכתבי מקדים, תיקי עבודות ומסמכים אחרים.',
          features: [
            'גרור ושחרר קבצים או לחץ לעיון',
            'תומך בפורמטים PDF ו-DOCX',
            'גודל קובץ מקסימלי: 10MB',
            'סיווג אוטומטי לפי סוג מסמך',
          ],
        },
        organize: {
          title: 'ארגון וסינון',
          description: 'שמור על המסמכים שלך מאורגנים עם סינון ומיון חזקים.',
          features: [
            'סנן לפי סוג מסמך (קורות חיים, מכתב מקדים וכו\')',
            'סנן לפי סטטוס (פעיל, טיוטה, בארכיון)',
            'מיין לפי שם, תאריך או גודל קובץ',
            'חפש מסמכים לפי שם',
          ],
        },
        aiGenerate: {
          title: 'מחולל מכתבי מקדים AI',
          description: 'צור מכתבי מקדים מותאמים אישית באמצעות AI.',
          features: [
            'בחר קורות חיים מהמסמכים שלך',
            'בחר משרה שמורה מה-pipeline שלך',
            'התאם אורך (קצר, בינוני, ארוך)',
            'התאם טון (מקצועי, ידידותי, נלהב)',
            'ערוך ושמור את המכתב שנוצר',
          ],
        },
        actions: {
          title: 'פעולות מסמך',
          description: 'נהל את המסמכים שלך עם פעולות מהירות אלה:',
          list: [
            { icon: Eye, label: 'תצוגה מקדימה', desc: 'צפה בתוכן המסמך' },
            { icon: Download, label: 'הורדה', desc: 'הורד למכשיר שלך' },
            { icon: Sparkles, label: 'ניתוח', desc: 'ניתוח AI והמלצות' },
            { icon: Archive, label: 'ארכיון', desc: 'העבר מסמכים ישנים לארכיון' },
          ],
        },
      },
      tips: [
        {
          icon: Upload,
          title: 'שמור על מסמכים מעודכנים',
          desc: 'עדכן באופן קבוע את קורות החיים שלך עם כישורים וניסיון חדשים. השתמש בסטטוס טיוטה בזמן עבודה על עדכונים.',
        },
        {
          icon: FileText,
          title: 'מספר גרסאות',
          desc: 'שמור מספר גרסאות קורות חיים המותאמות לסוגי משרות או תעשיות שונות.',
        },
        {
          icon: Sparkles,
          title: 'השתמש ביצירת AI',
          desc: 'צור מכתבי מקדים מותאמים לכל הגשת מועמדות. ה-AI מנתח את תיאור המשרה וקורות החיים שלך.',
        },
        {
          icon: Archive,
          title: 'העבר גרסאות ישנות לארכיון',
          desc: 'שמור על המסמכים הפעילים שלך נקיים על ידי העברת גרסאות מיושנות לארכיון. ניתן לשחזר מסמכים מהארכיון בכל עת.',
        },
        {
          icon: Shield,
          title: 'אבטחה ופרטיות',
          desc: 'המסמכים שלך מאוחסנים בצורה מאובטחת ומוצפנים. רק אתה יכול לגשת לקבצים שלך.',
        },
        {
          icon: Search,
          title: 'חיפוש מהיר',
          desc: 'השתמש בסרגל החיפוש כדי למצוא במהירות מסמכים לפי שם. מושלם כשיש לך קבצים רבים.',
        },
      ],
      workflow: {
        title: 'זרימת עבודה מומלצת',
        steps: [
          {
            num: 1,
            title: 'העלה את קורות החיים שלך',
            desc: 'התחל בהעלאת קורות החיים העיקריים שלך. תוכל להוסיף גרסאות נוספות מאוחר יותר.',
          },
          {
            num: 2,
            title: 'הוסף מסמכי תמיכה',
            desc: 'העלה תיקי עבודות, תעודות, תעודות גמר ומכתבי המלצה.',
          },
          {
            num: 3,
            title: 'שמור הזדמנויות עבודה',
            desc: 'עבור לעמוד המשרות ושמור משרות שאליהן תרצה להגיש מועמדות.',
          },
          {
            num: 4,
            title: 'צור מכתבי מקדים',
            desc: 'השתמש ב-AI כדי ליצור מכתבי מקדים מותאמים אישית לכל משרה שמורה.',
          },
          {
            num: 5,
            title: 'הורד והגש מועמדות',
            desc: 'הורד את המסמכים שלך והגש מועמדויות.',
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
                <TabsTrigger value="aiTools" className="text-xs sm:text-sm md:text-base px-2 sm:px-4 py-2">
                  <Sparkles className="h-4 w-4 sm:hidden" />
                  <span className="hidden sm:inline">{t.tabs.aiTools}</span>
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
                      <FileText className="h-8 w-8" />
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
                </motion.div>

                {/* Upload & Organize */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border-2 border-blue-500/30 shadow-md"
                  >
                    <div className={`flex items-center gap-4 mb-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="p-3 rounded-xl bg-blue-500 text-white">
                        <Upload className="h-6 w-6" />
                      </div>
                      <h4 className={`text-xl font-bold ${isRTL ? 'text-right' : ''}`}>{t.sections.upload.title}</h4>
                    </div>
                    <p className={`text-base text-muted-foreground mb-5 leading-relaxed ${isRTL ? 'text-right' : ''}`}>
                      {t.sections.upload.description}
                    </p>
                    <ul className="space-y-2.5">
                      {t.sections.upload.features.map((feature, idx) => (
                        <li key={idx} className={`flex items-start gap-3 text-sm ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                          <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span className="leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/5 border-2 border-purple-500/30 shadow-md"
                  >
                    <div className={`flex items-center gap-4 mb-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="p-3 rounded-xl bg-purple-500 text-white">
                        <Filter className="h-6 w-6" />
                      </div>
                      <h4 className={`text-xl font-bold ${isRTL ? 'text-right' : ''}`}>{t.sections.organize.title}</h4>
                    </div>
                    <p className={`text-base text-muted-foreground mb-5 leading-relaxed ${isRTL ? 'text-right' : ''}`}>
                      {t.sections.organize.description}
                    </p>
                    <ul className="space-y-2.5">
                      {t.sections.organize.features.map((feature, idx) => (
                        <li key={idx} className={`flex items-start gap-3 text-sm ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                          <CheckCircle2 className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                          <span className="leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
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
                {/* Document Actions */}
                <div>
                  <div className={`flex items-center gap-3 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="p-3 rounded-xl bg-[#9F5F80]/10">
                      <Zap className="h-6 w-6 text-[#9F5F80]" />
                    </div>
                    <h3 className={`text-2xl font-bold ${isRTL ? 'text-right' : ''}`}>{t.sections.actions.title}</h3>
                  </div>
                  <p className={`text-base text-muted-foreground mb-6 leading-relaxed ${isRTL ? 'text-right' : ''}`}>
                    {t.sections.actions.description}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {t.sections.actions.list.map((action, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        className="p-6 rounded-2xl bg-white dark:bg-[#383e4e]/50 border-2 border-gray-200 dark:border-[#b6bac5]/20 shadow-md hover:shadow-lg transition-all"
                      >
                        <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className="p-4 rounded-xl bg-[#9F5F80]/10 flex-shrink-0">
                            <action.icon className="h-7 w-7 text-[#9F5F80]" />
                          </div>
                          <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                            <p className="font-bold text-lg mb-2">{action.label}</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">{action.desc}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
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

              {/* AI Tools Tab */}
              <TabsContent value="aiTools" className="space-y-6 mt-0">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-8 rounded-2xl bg-gradient-to-br from-[#9F5F80]/10 via-[#9F5F80]/5 to-transparent border-2 border-[#9F5F80]/30 shadow-lg"
                >
                  <div className={`flex items-start gap-6 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-[#9F5F80] to-[#7a4a63] text-white shadow-md">
                      <Sparkles className="h-8 w-8" />
                    </div>
                    <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                      <h3 className="text-2xl font-bold mb-3">
                        {t.sections.aiGenerate.title}
                      </h3>
                      <p className="text-base text-muted-foreground leading-relaxed mb-5">
                        {t.sections.aiGenerate.description}
                      </p>
                      <ul className="space-y-3">
                        {t.sections.aiGenerate.features.map((feature, idx) => (
                          <li key={idx} className={`flex items-start gap-3 text-base ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                            <CheckCircle2 className="h-5 w-5 text-[#9F5F80] mt-1 flex-shrink-0" />
                            <span className="leading-relaxed">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}