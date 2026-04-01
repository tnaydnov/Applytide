import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { X, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { safeGetJSON, safeSetJSON } from '../../lib/storage';

interface HelpContent {
  route: string;
  titleEn: string;
  titleHe: string;
  tipsEn: string[];
  tipsHe: string[];
}

const helpContents: HelpContent[] = [
  {
    route: '/dashboard',
    titleEn: 'Dashboard Tips',
    titleHe: 'טיפים למסך הבית',
    tipsEn: [
      'Set a weekly goal to stay motivated and track your progress',
      'Check your active pipeline to see applications that need attention',
      'Use quick actions to jump to common tasks',
      'Review AI insights for personalized recommendations',
    ],
    tipsHe: [
      'הגדירו יעד שבועי כדי להישאר מוטיבציה ולעקוב אחר ההתקדמות שלכם',
      'בדקו את ה-Pipeline הפעיל כדי לראות מועמדויות שדורשות תשומת לב',
      'השתמשו בפעולות מהירות כדי לקפוץ למשימות נפוצות',
      'עיינו בתובנות הבינה המלאכותית להמלצות מותאמות אישית',
    ],
  },
  {
    route: '/documents',
    titleEn: 'Documents Tips',
    titleHe: 'טיפים למסמכים',
    tipsEn: [
      'Upload your resume first - it\'s required for generating cover letters',
      'Use the analysis feature to get feedback on your resume',
      'Keep multiple versions for different types of jobs',
      'Cover letters can only be generated for saved jobs',
    ],
    tipsHe: [
      'העלו את קורות החיים תחילה - זה נדרש ליצירת מכתבי מקדים',
      'השתמשו בתכונת הניתוח כדי לקבל משוב על קורות החיים שלכם',
      'שמרו מספר גרסאות לסוגים שונים של משרות',
      'מכתבי מקדים יכולים להיווצר רק למשרות שמורות',
    ],
  },
  {
    route: '/jobs',
    titleEn: 'Jobs Tips',
    titleHe: 'טיפים למשרות',
    tipsEn: [
      'Save jobs first before applying - this helps track your applications',
      'Use filters to find the most relevant opportunities',
      'Install our Chrome extension to save jobs from any website',
      'Generate a cover letter for each saved job to improve your chances',
    ],
    tipsHe: [
      'שמרו משרות לפני הגשת מועמדות - זה עוזר לעקוב אחר המועמדויות שלכם',
      'השתמשו במסננים כדי למצוא את ההזדמנויות הרלוונטיות ביותר',
      'התקינו את תוסף Chrome שלנו כדי לשמור משרות מכל אתר',
      'צרו מכתב נלווה לכל משרה שמורה כדי לשפר את הסיכויים שלכם',
    ],
  },
  {
    route: '/pipeline',
    titleEn: 'Pipeline Tips',
    titleHe: 'טיפים ל-Pipeline',
    tipsEn: [
      'Drag and drop cards between columns to update status',
      'Click on any application to see full details and add notes',
      'Customize your pipeline stages to match your workflow',
      'Use the cards view for a more detailed layout',
    ],
    tipsHe: [
      'גררו ושחררו כרטיסים בין עמודות כדי לעדכן סטטוס',
      'לחצו על כל מועמדות כדי לראות פרטים מלאים ולהוסיף הערות',
      'התאימו אישית את שלבי ה-Pipeline שלכם להתאים לזרימת העבודה שלכם',
      'השתמשו בתצוגת הכרטיסים לפריסה מפורטת יותר',
    ],
  },
  {
    route: '/profile',
    titleEn: 'Profile Tips',
    titleHe: 'טיפים לפרופיל',
    tipsEn: [
      'Keep your personal information up to date',
      'Enable email notifications to stay informed',
      'Review your activity log to see what you\'ve accomplished',
      'Use 2FA for added security',
    ],
    tipsHe: [
      'שמרו את המידע האישי שלכם מעודכן',
      'הפעילו התראות דוא"ל כדי להישאר מעודכנים',
      'עיינו ביומן הפעילות שלכם כדי לראות מה השגתם',
      'השתמשו באימות דו-שלבי לאבטחה נוספת',
    ],
  },
];

export function ContextualHelp() {
  const location = useLocation();
  const { language } = useLanguage();
  const isRTL = language === 'he';
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  // Get help content for current page
  const currentHelp = helpContents.find(
    (content) => content.route === location.pathname
  );

  useEffect(() => {
    // Check if help was dismissed for this page
    const dismissedPages = safeGetJSON<string[]>('dismissedHelp', []);
    setIsDismissed(dismissedPages.includes(location.pathname));
    setIsExpanded(true); // Expand when navigating to new page
  }, [location.pathname]);

  if (!currentHelp || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    const dismissedPages = safeGetJSON<string[]>('dismissedHelp', []);
    dismissedPages.push(location.pathname);
    safeSetJSON('dismissedHelp', dismissedPages);
    setIsDismissed(true);
  };

  const tips = isRTL ? currentHelp.tipsHe : currentHelp.tipsEn;
  const title = isRTL ? currentHelp.titleHe : currentHelp.titleEn;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-6"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
          <div className="bg-gradient-to-r from-[#9F5F80]/10 to-[#383e4e]/10 border border-[#9F5F80]/20 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-[#9F5F80]/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#9F5F80]/20 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-[#9F5F80]" />
                </div>
                <h3 className="text-white">{title}</h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-[#b6bac5] hover:text-white transition-colors p-1"
                >
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={handleDismiss}
                  className="text-[#b6bac5] hover:text-white transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="p-4 space-y-2">
                    {tips.map((tip, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-start gap-3"
                      >
                        <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#9F5F80] mt-2" />
                        <p className="text-sm text-[#b6bac5]">{tip}</p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
    </AnimatePresence>
  );
}