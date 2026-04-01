/**
 * DocumentsGuideDrawer Component
 * Comprehensive guide for the Documents page with premium design
 */

import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  FileText,
  Upload,
  Sparkles,
  Search,
  Brain,
  FileCheck,
  Folder,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { ScrollArea } from '../../../components/ui/scroll-area';

interface DocumentsGuideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isRTL?: boolean;
}

export function DocumentsGuideDrawer({
  isOpen,
  onClose,
  isRTL = false,
}: DocumentsGuideDrawerProps) {
  const guides = {
    en: {
      title: 'Documents Guide',
      subtitle: 'Everything you need to know about managing your documents',
      sections: [
        {
          icon: Upload,
          title: 'Uploading Documents',
          color: '#3b82f6',
          content: [
            'Click "Upload Document" to add new files',
            'Supports PDF and DOCX formats up to 10MB',
            'Drag and drop files directly into the upload area',
            'Choose document type (Resume, Cover Letter, Portfolio, etc.)',
            'Set initial status (Active, Draft, or Archived)',
          ],
        },
        {
          icon: Sparkles,
          title: 'AI Cover Letter Generator',
          color: '#9F5F80',
          content: [
            'Generate tailored cover letters using AI',
            'Select a resume to extract your experience',
            'Choose a saved job to match requirements',
            'Customize tone (Professional, Friendly, Enthusiastic)',
            'Select length (Short, Medium, Long)',
            'Edit and save generated content',
          ],
        },
        {
          icon: FileText,
          title: 'Document Types',
          color: '#f59e0b',
          content: [
            'Resume - Your professional CV',
            'Cover Letter - Job-specific letters',
            'Portfolio - Work samples and projects',
            'Transcript - Academic records',
            'Certificate - Professional certifications',
            'Reference Letter - Recommendations',
            'Other - Additional documents',
          ],
        },
        {
          icon: FileCheck,
          title: 'Document Status',
          color: '#10b981',
          content: [
            'Active - Currently in use',
            'Draft - Work in progress',
            'Archived - Kept for reference',
            'Change status from document menu',
            'Filter by status to organize documents',
          ],
        },
        {
          icon: Brain,
          title: 'AI Document Analysis',
          color: '#8b5cf6',
          content: [
            'Click "Analyze" to get AI insights',
            'Review document strengths and weaknesses',
            'Get suggestions for improvements',
            'Compare resumes to job descriptions',
            'Track ATS compatibility scores',
          ],
        },
        {
          icon: Search,
          title: 'Searching & Filtering',
          color: '#06b6d4',
          content: [
            'Use search bar to find documents by name',
            'Filter by document type',
            'Filter by status (Active, Draft, Archived)',
            'Sort by name, date, or file size',
            'Switch between grid and list views',
          ],
        },
        {
          icon: Folder,
          title: 'Document Actions',
          color: '#ec4899',
          content: [
            'Preview - View document contents',
            'Download - Save to your device',
            'Analyze - Get AI insights',
            'Compare to Job - Match with job requirements',
            'Change Status - Update document state',
            'Delete - Remove permanently',
          ],
        },
        {
          icon: AlertCircle,
          title: 'Best Practices',
          color: '#ef4444',
          content: [
            'Keep multiple versions of your resume',
            'Use descriptive names for easy identification',
            'Archive old versions instead of deleting',
            'Generate job-specific cover letters',
            'Regularly update your documents',
            'Review AI analysis for improvements',
          ],
        },
      ],
    },
    he: {
      title: 'מדריך מסמכים',
      subtitle: 'כל מה שצריך לדעת על ניהול המסמכים שלך',
      sections: [
        {
          icon: Upload,
          title: 'העלאת מסמכים',
          color: '#3b82f6',
          content: [
            'לחץ על "העלה מסמך" להוספת קבצים חדשים',
            'תומך בפורמטים PDF ו-DOCX עד 10MB',
            'גרור ושחרר קבצים ישירות לאזור ההעלאה',
            'בחר סוג מסמך (קורות חיים, מכתב מקדים, תיק עבודות וכו\')',
            'הגדר סטטוס התחלתי (פעיל, טיוטה או ארכיון)',
          ],
        },
        {
          icon: Sparkles,
          title: 'מחולל מכתבי מקדים AI',
          color: '#9F5F80',
          content: [
            'צור מכתבי מקדים מותאמים באמצעות AI',
            'בחר קורות חיים לחילוץ הניסיון שלך',
            'בחר משרה שמורה להתאמת דרישות',
            'התאם אישית טון (מקצועי, ידידותי, נלהב)',
            'בחר אורך (קצר, בינוני, ארוך)',
            'ערוך ושמור את התוכן שנוצר',
          ],
        },
        {
          icon: FileText,
          title: 'סוגי מסמכים',
          color: '#f59e0b',
          content: [
            'קורות חיים - קורות החיים המקצועיים שלך',
            'מכתב מקדים - מכתבים ספציפיים לעבודה',
            'תיק עבודות - דגימות עבודה ופרויקטים',
            'תעודת גמר - רשומות אקדמיות',
            'תעודה - הסמכות מקצועיות',
            'מכתב המלצה - המלצות',
            'אחר - מסמכים נוספים',
          ],
        },
        {
          icon: FileCheck,
          title: 'סטטוס מסמך',
          color: '#10b981',
          content: [
            'פעיל - נמצא בשימוש כרגע',
            'טיוטה - עבודה בתהליך',
            'ארכיון - נשמר לעיון',
            'שנה סטטוס מתפריט המסמך',
            'סנן לפי סטטוס לארגון מסמכים',
          ],
        },
        {
          icon: Brain,
          title: 'ניתוח מסמכים AI',
          color: '#8b5cf6',
          content: [
            'לחץ על "נתח" לקבלת תובנות AI',
            'סקור חוזקות וחולשות של המסמך',
            'קבל הצעות לשיפורים',
            'השווה קורות חיים לתיאורי משרות',
            'עקוב אחר ציוני תואמות ATS',
          ],
        },
        {
          icon: Search,
          title: 'חיפוש וסינון',
          color: '#06b6d4',
          content: [
            'השתמש בשורת החיפוש למצוא מסמכים לפי שם',
            'סנן לפי סוג מסמך',
            'סנן לפי סטטוס (פעיל, טיוטה, ארכיון)',
            'מיין לפי שם, תאריך או גודל קובץ',
            'החלף בין תצוגות רשת ורשימה',
          ],
        },
        {
          icon: Folder,
          title: 'פעולות מסמך',
          color: '#ec4899',
          content: [
            'תצוגה מקדימה - צפה בתוכן המסמך',
            'הורדה - שמור במכשיר שלך',
            'נתח - קבל תובנות AI',
            'השווה למשרה - התאם לדרישות משרה',
            'שנה סטטוס - עדכן מצב מסמך',
            'מחק - הסר לצמיתות',
          ],
        },
        {
          icon: AlertCircle,
          title: 'שיטות מומלצות',
          color: '#ef4444',
          content: [
            'שמור מספר גרסאות של קורות החיים שלך',
            'השתמש בשמות תיאוריים לזיהוי קל',
            'העבר לארכיון גרסאות ישנות במקום למחוק',
            'צור מכתבי מקדים ספציפיים למשרה',
            'עדכן באופן קבוע את המסמכים שלך',
            'סקור ניתוח AI לשיפורים',
          ],
        },
      ],
    },
  };

  const content = isRTL ? guides.he : guides.en;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: isRTL ? -500 : 500, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isRTL ? -500 : 500, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`
              fixed top-0 ${isRTL ? 'left-0' : 'right-0'} h-full w-full sm:w-[500px] lg:w-[600px]
              bg-white dark:bg-[#383e4e]
              shadow-2xl z-[101]
              overflow-hidden
            `}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-gradient-to-r from-[#9F5F80] to-[#383e4e] px-6 py-6 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">
                    {content.title}
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white hover:bg-white/20 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-white/90 text-sm">
                {content.subtitle}
              </p>
            </div>

            {/* Content */}
            <ScrollArea className="h-[calc(100vh-140px)] px-6 py-6">
              <div className="space-y-6">
                {content.sections.map((section, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group"
                  >
                    {/* Section Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="p-2.5 rounded-lg shadow-md transition-transform group-hover:scale-110"
                        style={{ backgroundColor: `${section.color}20` }}
                      >
                        <section.icon
                          className="h-5 w-5"
                          style={{ color: section.color }}
                        />
                      </div>
                      <h3
                        className="text-lg font-bold"
                        style={{ color: section.color }}
                      >
                        {section.title}
                      </h3>
                    </div>

                    {/* Section Content */}
                    <div className="bg-gradient-to-br from-gray-50 to-white dark:from-[#2d3242] dark:to-[#383e4e]/50 rounded-xl p-5 border border-[#b6bac5]/20 shadow-sm">
                      <ul className="space-y-3">
                        {section.content.map((item, idx) => (
                          <motion.li
                            key={idx}
                            initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: (index * 0.05) + (idx * 0.02) }}
                            className="flex items-start gap-3 text-[#383e4e] dark:text-[#b6bac5]"
                          >
                            <CheckCircle2
                              className="h-4 w-4 flex-shrink-0 mt-0.5"
                              style={{ color: section.color }}
                            />
                            <span className="text-sm leading-relaxed">{item}</span>
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Footer Tip */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8 p-5 bg-gradient-to-br from-[#9F5F80]/10 to-[#383e4e]/10 border border-[#9F5F80]/20 rounded-xl"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-[#9F5F80] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#383e4e] dark:text-white mb-1">
                      {isRTL ? 'טיפ מקצועי' : 'Pro Tip'}
                    </p>
                    <p className="text-sm text-[#6c757d] dark:text-[#b6bac5] leading-relaxed">
                      {isRTL
                        ? 'השתמש במחולל מכתבי המקדים AI כדי ליצור מכתבים מותאמים אישית לכל משרה. זה חוסך זמן ומשפר את הסיכויים שלך!'
                        : 'Use the AI Cover Letter Generator to create personalized letters for each job. This saves time and improves your chances!'}
                    </p>
                  </div>
                </div>
              </motion.div>
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default DocumentsGuideDrawer;
