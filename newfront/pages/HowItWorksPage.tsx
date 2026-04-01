/**
 * HowItWorksPage - Interactive Visual Guide
 * Engaging, visual, and easy-to-digest tutorial
 */

import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Chrome,
  Briefcase,
  Target,
  FileText,
  Bell,
  BarChart3,
  User,
  LayoutDashboard,
  Plus,
  Filter,
  Search,
  Download,
  Upload,
  ChevronRight,
  ChevronDown,
  Check,
  Calendar,
  Zap,
  TrendingUp,
  Clock,
  Archive,
  ExternalLink,
  Lightbulb,
  Rocket,
  Grid,
  CheckCircle2,
  MousePointer,
  Columns,
  MonitorPlay,
  ArrowRight,
  BookOpen,
  Shield,
  Settings,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { useLanguage } from "../contexts/LanguageContext";
import { Badge } from "../components/ui/badge";
import { CHROME_EXTENSION_URL } from "../constants/urls";

export function HowItWorksPage() {
  const { t, language } = useLanguage();
  const isRTL = language === "he";
  const [activeSection, setActiveSection] = useState(0);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  // Ref for scrolling to content on mobile
  const contentRef = useRef<HTMLDivElement>(null);

  const handleSectionChange = (idx: number) => {
    setActiveSection(idx);
    setExpandedCard(null);
    
    // Scroll to content on mobile
    if (contentRef.current && window.innerWidth < 1024) {
      setTimeout(() => {
        contentRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
    }
  };

  // Simplified, visual-focused tutorial sections
  const tutorialSections = [
    {
      id: "getting-started",
      title: t("Getting Started", "התחלה"),
      subtitle: t("Set up Applytide in 5 minutes", "הגדר את Applytide ב-5 דקות"),
      icon: Rocket,
      color: "from-blue-500 to-cyan-500",
      features: [
        {
          icon: Chrome,
          title: t("Install Extension", "התקן תוסף"),
          description: t("Save jobs with one click", "שמור משרות בקליק אחד"),
          action: {
            label: t("Get Extension", "קבל תוסף"),
            link: CHROME_EXTENSION_URL,
          },
          quickTip: t("Click extension icon on any job posting", "לחץ על אייקון התוסף בכל פרסום משרה"),
          details: [
            t("Works on LinkedIn, Indeed, Glassdoor", "עובד ב-LinkedIn, Indeed, Glassdoor"),
            t("Auto-fills all job details", "ממלא את כל פרטי המשרה אוטומטית"),
            t("Saves to your Applytide account instantly", "שומר לחשבון Applytide שלך מיד"),
          ],
        },
        {
          icon: Plus,
          title: t("Add Your First Job", "הוסף משרה ראשונה"),
          description: t("From extension or manually", "מהתוסף או ידנית"),
          quickTip: t("All job details auto-filled", "כל פרטי המשרה ממולאים אוטומטית"),
          details: [
            t("Click 'Add Job' button on Jobs page", "לחץ על כפתור 'הוסף משרה' בעמוד משרות"),
            t("Fill in: title, company, location, salary", "מלא: כותרת, חברה, מיקום, שכר"),
            t("Add job description and your notes", "הוסף תיאור משרה והערות שלך"),
            t("Set initial status", "הגדר סטטוס ראשוני"),
          ],
        },
        {
          icon: Upload,
          title: t("Upload Resume", "העלה קו\"ח"),
          description: t("Get instant AI analysis", "קבל ניתוח AI מיידי"),
          quickTip: t("Supports PDF and DOCX", "תומך ב-PDF ו-DOCX"),
          details: [
            t("Go to Documents page", "עבור到账מוד מסמכים"),
            t("Click 'Upload Resume' button", "לחץ על 'העלה קורות חיים'"),
            t("AI analyzes formatting & keywords", "AI מנתח עיצוב ומילות מפתח"),
            t("Upload multiple versions for different roles", "העלה גרסאות מרובות לתפקידים שונים"),
          ],
        },
        {
          icon: Target,
          title: t("Track Progress", "עקוב אחר התקדמות"),
          description: t("Drag & drop in pipeline", "גרור ושחרר בצינור"),
          quickTip: t("Visual Kanban board", "לוח קנבן חזותי"),
          details: [
            t("Go to Pipeline page", "עבור到账מוד צינור"),
            t("See jobs organized by stage", "ראה משרות מאורגנות לפי שלב"),
            t("Drag cards between columns", "גרור כרטיסים בין עמודות"),
            t("7 stages: Saved → Offer", "7 שלבים: נשמר → הצעה"),
          ],
        },
      ],
    },
    {
      id: "dashboard",
      title: t("Dashboard", "לוח בקרה"),
      subtitle: t("Your job search at a glance", "חיפוש העבודה שלך במבט"),
      icon: LayoutDashboard,
      color: "from-purple-500 to-pink-500",
      features: [
        {
          icon: BarChart3,
          title: t("Quick Stats", "סטטיסטיקות מהירות"),
          description: t("Total jobs, applications, interviews", "סך משרות, מועמדויות, ראיונות"),
          quickTip: t("Real-time updates", "עדכונים בזמן אמת"),
          details: [
            t("See total jobs saved", "ראה סך משרות שנשמרו"),
            t("Track active applications", "עקוב אחר מועמדויות פעילות"),
            t("Count scheduled interviews", "ספור ראיונות מתוזמנים"),
            t("Monitor offers received", "עקוב אחר הצעות שהתקבלו"),
          ],
        },
        {
          icon: Clock,
          title: t("Recent Activity", "פעילות אחרונה"),
          description: t("Track all your actions", "עקוב אחר כל הפעולות שלך"),
          quickTip: t("Click to jump to any item", "לחץ לקפיצה לכל פריט"),
          details: [
            t("See recently added jobs", "ראה משרות שנוספו לאחרונה"),
            t("Track status changes", "עקוב אחר שינויי סטטוס"),
            t("View document uploads", "צפה בהעלאות מסמכים"),
            t("Monitor reminder creation", "עקוב אחר יצירת תזכורות"),
          ],
        },
        {
          icon: TrendingUp,
          title: t("Timeline View", "תצוגת ציר זמן"),
          description: t("Visualize your journey", "הצג את המסע שלך"),
          quickTip: t("Color-coded by status", "מקודד צבע לפי סטטוס"),
          details: [
            t("See all applications on timeline", "ראה את כל המועמדויות על ציר זמן"),
            t("Each status has unique color", "לכל סטטוס יש צבע ייחודי"),
            t("Click points to view details", "לחץ על נקודות לצפייה בפרטים"),
            t("Track application velocity", "עקוב אחר מהירות מועמדות"),
          ],
        },
        {
          icon: Bell,
          title: t("Upcoming Events", "אירועים קרובים"),
          description: t("Never miss deadlines", "לעולם אל תפספס דדליינים"),
          quickTip: t("Syncs with Google Calendar", "מסתנכרן עם Google Calendar"),
          details: [
            t("See all upcoming reminders", "ראה את כל התזכורות הקרובות"),
            t("Interviews highlighted prominently", "ראיונות מודגשים בבולטות"),
            t("Click to view full details", "לחץ לצפייה בפרטים מלאים"),
            t("Auto-sync with Google account", "סנכרון אוטומטי עם חשבון Google"),
          ],
        },
      ],
    },
    {
      id: "jobs",
      title: t("Jobs", "משרות"),
      subtitle: t("Save, organize, and manage opportunities", "שמור, ארגן ונהל הזדמנויות"),
      icon: Briefcase,
      color: "from-green-500 to-emerald-500",
      features: [
        {
          icon: Grid,
          title: t("Multiple Views", "תצוגות מרובות"),
          description: t("Grid, List, or Kanban", "רשת, רשימה או קנבן"),
          quickTip: t("Switch anytime", "החלף בכל עת"),
          details: [
            t("Grid: Visual cards with key info", "רשת: כרטיסים חזותיים עם מידע מרכזי"),
            t("List: Compact table view", "רשימה: תצוגת טבלה קומפקטית"),
            t("Kanban: Available in Pipeline page", "קנבן: זמין בעמוד צינור"),
            t("Toggle with toolbar buttons", "החלף עם כפתורי סרגל כלים"),
          ],
        },
        {
          icon: Search,
          title: t("Smart Filters", "מסננים חכמים"),
          description: t("Find jobs instantly", "מצא משרות מיד"),
          quickTip: t("By status, type, salary, location", "לפי סטטוס, סוג, שכר, מיקום"),
          details: [
            t("Search by title, company, location", "חפש לפי כותרת, חברה, מיקום"),
            t("Filter by application status", "סנן לפי סטטוס מועמדות"),
            t("Filter by work type (Remote/Hybrid/Onsite)", "סנן לפי סוג עבודה"),
            t("Combine multiple filters", "שלב מסננים מרובים"),
          ],
        },
        {
          icon: MousePointer,
          title: t("Quick Actions", "פעולות מהירות"),
          description: t("Edit, archive, delete, favorite", "ערוך, אrchive, מחק, מועדף"),
          quickTip: t("Right-click or hover menu", "תפריט קליק ימני או ריחוף"),
          details: [
            t("View: See full job details", "צפה: ראה פרטי משרה מלאים"),
            t("Edit: Update any information", "ערוך: עדכן כל מידע"),
            t("Change Status: Move through stages", "שנה סטטוס: עבור בין שלבים"),
            t("Archive: Clean list without deleting", "ארכיון: נקה רשימה מבלי למחוק"),
          ],
        },
        {
          icon: Archive,
          title: t("Archive System", "מערכת ארכיון"),
          description: t("Keep lists clean", "שמור רשימות נקיות"),
          quickTip: t("Restore anytime", "שחזר בכל עת"),
          details: [
            t("Archive old or rejected jobs", "אrchive משרות ישנות או נדחות"),
            t("Archived jobs hidden by default", "משרות בארכיון מוסתרות כברירת מחדל"),
            t("Toggle 'Show Archived' to view", "החלף 'הצג בארכיון' לצפייה"),
            t("Restore with one click", "שחזר בקליק אחד"),
          ],
        },
      ],
    },
    {
      id: "pipeline",
      title: t("Pipeline", "צינור"),
      subtitle: t("Visual job tracking board", "לוח מעקב משרות חזותי"),
      icon: Target,
      color: "from-orange-500 to-red-500",
      features: [
        {
          icon: Columns,
          title: t("Kanban Board", "לוח קנבן"),
          description: t("7 application stages", "7 שלבי מועמדות"),
          quickTip: t("Drag cards between columns", "גרור כרטיסים בין עמודות"),
          details: [
            t("7 columns: Saved → Accepted/Rejected", "7 עמודות: נשמר → התקבל/נדחה"),
            t("Drag & drop to update status", "גרור ושחרר לעדכון סטטוס"),
            t("Column headers show job count", "כותרות עמודות מציגות ספירת משרות"),
            t("Changes save automatically", "שינויים נשמרים אוטומטית"),
          ],
        },
        {
          icon: Filter,
          title: t("Pipeline Filters", "מסנני צינור"),
          description: t("Focus on what matters", "התמקד במה שחשוב"),
          quickTip: t("Search + work type filters", "חיפוש + מסנני סוג עבודה"),
          details: [
            t("Search across all pipeline jobs", "חפש בכל משרות הצינור"),
            t("Filter by Remote/Hybrid/Onsite", "סנן לפי מרחוק/היברידי/באתר"),
            t("Show or hide archived jobs", "הצג או הסתר משרות בארכיון"),
            t("Filters apply to all columns", "מסננים חלים על כל העמודות"),
          ],
        },
        {
          icon: MonitorPlay,
          title: t("Smooth Navigation", "ניווט חלק"),
          description: t("Works on all devices", "עובד בכל המכשירים"),
          quickTip: t("Touch gestures on mobile", "מחוות מגע בנייד"),
          details: [
            t("Scroll horizontally to see all columns", "גלול אופקית לראות את כל העמודות"),
            t("Each column scrolls independently", "כל עמודה גוללת באופן עצמאי"),
            t("Touch drag & drop on mobile", "גרור ושחרר במגע בנייד"),
            t("Click job card to view details", "לחץ על כרטיס משרה לצפייה בפרטים"),
          ],
        },
      ],
    },
    {
      id: "documents",
      title: t("Documents", "מסמכים"),
      subtitle: t("Resumes and cover letters", "קורות חיים ומכתבי מקדמה"),
      icon: FileText,
      color: "from-yellow-500 to-amber-500",
      features: [
        {
          icon: Upload,
          title: t("Resume Upload", "העלאת קו\"ח"),
          description: t("Store multiple versions", "אחסן גרסאות מרובות"),
          quickTip: t("Set one as primary", "הגדר אחד כראשי"),
          details: [
            t("Upload PDF or DOCX (max 10MB)", "העלה PDF או DOCX (מקס 10MB)"),
            t("Add name and description", "הוסף שם ותיאור"),
            t("Mark one as primary resume", "סמן אחד כקורות חיים ראשיים"),
            t("Multiple versions for different roles", "גרסאות מרובות לתפקידים שונים"),
          ],
        },
        {
          icon: Sparkles,
          title: t("AI Analysis", "ניתוח AI"),
          description: t("Get instant feedback", "קבל משוב מיידי"),
          quickTip: t("ATS compatibility check", "בדיקת תאימות ATS"),
          details: [
            t("Click 'Analyze' on any resume", "לחץ על 'נתח' על כל קורות חיים"),
            t("AI checks formatting & keywords", "AI בודק עיצוב ומילות מפתח"),
            t("Get improvement suggestions", "קבל הצעות שיפור"),
            t("Re-analyze after making changes", "נתח מחדש לאחר ביצוע שינויים"),
          ],
        },
        {
          icon: Zap,
          title: t("Cover Letter AI", "AI למכתב מקדמה"),
          description: t("Auto-generate personalized", "צור אוטומטית מותאם אישית"),
          quickTip: t("Based on job + resume", "מבוסס על משרה + קו\"ח"),
          details: [
            t("Click 'Generate Cover Letter'", "לחץ על 'צור מכתב מקדמה'"),
            t("Select which job", "בחר איזו משרה"),
            t("Choose which resume to base on", "בחר על איזה קורות חיים לבסס"),
            t("AI creates personalized letter", "AI יוצר מכתב מותאם אישית"),
          ],
        },
        {
          icon: Download,
          title: t("Easy Export", "ייצוא קל"),
          description: t("Download as PDF", "הורד כ-PDF"),
          quickTip: t("Preview before download", "תצוגה מקדימה לפני הורדה"),
          details: [
            t("Preview any document", "תצוגה מקדימה של כל מסמך"),
            t("Download as PDF", "הורד כ-PDF"),
            t("Edit document details", "ערוך פרטי מסמך"),
            t("Delete unwanted documents", "מחק מסמכים לא רצויים"),
          ],
        },
      ],
    },
    {
      id: "reminders",
      title: t("Reminders", "תזכורות"),
      subtitle: t("Never miss important dates", "לעולם אל תפספס תאריכים"),
      icon: Bell,
      color: "from-pink-500 to-rose-500",
      features: [
        {
          icon: Plus,
          title: t("Create Reminders", "צור תזכורות"),
          description: t("6 types: Interview, Follow-up, etc.", "6 סוגים: ראיון, מעקב וכו'"),
          quickTip: t("Link to specific jobs", "קשר למשרות ספציפיות"),
          details: [
            t("Click 'New Reminder' button", "לחץ על 'תזכורת חדשה'"),
            t("Select job to attach to", "בחר משרה לצרף אליה"),
            t("Choose type: Interview, Follow-up, etc.", "בחר סוג: ראיון, מעקב וכו'"),
            t("Set date, time, and notes", "הגדר תאריך, שעה והערות"),
          ],
        },
        {
          icon: Calendar,
          title: t("Calendar Views", "תצוגות לוח שנה"),
          description: t("Month, Week, or List", "חודש, שבוע או רשימה"),
          quickTip: t("Click dates to add reminders", "לחץ על תאריכים להוספת תזכורות"),
          details: [
            t("Month View: See full month", "תצוגת חודש: ראה חודש מלא"),
            t("Week View: 7-day view", "תצוגת שבוע: תצוגת 7 ימים"),
            t("List View: Chronological list", "תצוגת רשימה: רשימה כרונולוגית"),
            t("Switch with top buttons", "החלף עם כפתורים עליונים"),
          ],
        },
        {
          icon: Calendar,
          title: t("Google Sync", "סנכרון Google"),
          description: t("Two-way calendar sync", "סנכרון דו-כיווני לוח שנה"),
          quickTip: t("Auto-create Meet links", "צור קישורי Meet אוטומטית"),
          details: [
            t("Connect Google in Profile settings", "חבר Google בהגדרות פרופיל"),
            t("Enable 'Add to Google Calendar'", "אפשר 'הוסף ל-Google Calendar'"),
            t("Create Google Meet links", "צור קישורי Google Meet"),
            t("Import external events", "ייבא אירועים חיצוניים"),
          ],
        },
        {
          icon: CheckCircle2,
          title: t("Mark Complete", "סמן כהושלם"),
          description: t("Track what's done", "עקוב אחר מה שהושלם"),
          quickTip: t("Filter by completion", "סנן לפי השלמה"),
          details: [
            t("Check checkbox to mark complete", "סמן תיבת סימון להשלמה"),
            t("Edit reminder anytime", "ערוך תזכורת בכל עת"),
            t("Filter by completion status", "סנן לפי סטטוס השלמה"),
            t("Delete completed reminders", "מחק תזכורות שהושלמו"),
          ],
        },
      ],
    },
    {
      id: "analytics",
      title: t("Analytics", "אנליטיקה"),
      subtitle: t("Track success and optimize", "עקוב אחר הצלחה ואופטימיזציה"),
      icon: BarChart3,
      color: "from-indigo-500 to-purple-500",
      features: [
        {
          icon: TrendingUp,
          title: t("Success Metrics", "מדדי הצלחה"),
          description: t("Response, interview, offer rates", "שיעורי תגובה, ראיון, הצעה"),
          quickTip: t("Compare to averages", "השווה לממוצעים"),
          details: [
            t("Total applications count", "ספירת סך מועמדויות"),
            t("Response rate percentage", "אחוז שיעור תגובה"),
            t("Interview rate tracking", "מעקב שיעור ראיונות"),
            t("Offer rate calculation", "חישוב שיעור הצעות"),
          ],
        },
        {
          icon: BarChart3,
          title: t("Visual Charts", "תרשימים חזותיים"),
          description: t("Funnel, timeline, distribution", "משפך, ציר זמן, התפלגות"),
          quickTip: t("Interactive graphs", "גרפים אינטראקטיביים"),
          details: [
            t("Application funnel chart", "תרשים משprech מועמדויות"),
            t("Timeline of applications", "ציר זמן של מועמדויות"),
            t("Status distribution pie chart", "תרשים עוגה של התפלגות סטטוס"),
            t("Hover for detailed data", "רחף לנתונים מפורטים"),
          ],
        },
        {
          icon: Sparkles,
          title: t("AI Insights", "תובנות AI"),
          description: t("Smart recommendations", "המלצות חכמות"),
          quickTip: t("Personalized tips", "טיפים מותאמים אישית"),
          details: [
            t("Best job types for you", "סוגי משרות הטובים ביותר עבורך"),
            t("Optimal application times", "זמני מועמדות אופטימליים"),
            t("Response rate improvement tips", "טיפים לשיפור שיעור תגובה"),
            t("Success pattern identification", "זיהוי דפוסי הצלחה"),
          ],
        },
        {
          icon: Download,
          title: t("Export Data", "ייצוא נתונים"),
          description: t("CSV and Excel reports", "דוחות CSV ו-Excel"),
          quickTip: t("Custom date ranges", "טווחי תאריכים מותאמים"),
          details: [
            t("Export as CSV or Excel", "ייצא כ-CSV או Excel"),
            t("Download complete job list", "הורד רשימת משרות מלאה"),
            t("Set custom date ranges", "הגדר טווחי תאריכים מותאמים"),
            t("Use for your own analysis", "השתמש לניתוח משלך"),
          ],
        },
      ],
    },
    {
      id: "profile",
      title: t("Profile & Settings", "פרופיל והגדרות"),
      subtitle: t("Customize your experience", "התאם אישית את החוויה שלך"),
      icon: User,
      color: "from-teal-500 to-cyan-500",
      features: [
        {
          icon: User,
          title: t("Personal Info", "מידע אישי"),
          description: t("Name, email, phone, photo", "שם, אימייל, טלפון, תמונה"),
          quickTip: t("Add bio and social links", "הוסף ביוגרפיה וקישורים חברתיים"),
          details: [
            t("Update name and contact info", "עדכן שם ופרטי התקשרות"),
            t("Add phone number and location", "הוסף מספר טלפון ומיקום"),
            t("Upload profile picture", "העלה תמונת פרופיל"),
            t("Add bio and social links", "הוסף ביוגרפיה וקישורים חברתיים"),
          ],
        },
        {
          icon: Shield,
          title: t("Security", "אבטחה"),
          description: t("Password & Sessions", "סיסמה והפעלות"),
          quickTip: t("View active sessions", "צפה בהפעלות פעילות"),
          details: [
            t("Change your password securely", "שנה את הסיסמה שלך בבטחה"),
            t("View active login sessions", "צפה בהפעלות כניסה פעילות"),
            t("Revoke all sessions", "בטל את כל ההפעלות"),
            t("Monitor security activity", "עקוב אחר פעילות אבטחה"),
          ],
        },
        {
          icon: Zap,
          title: t("Integrations", "אינטגרציות"),
          description: t("Google Calendar & Gmail", "Google Calendar ו-Gmail"),
          quickTip: t("Disconnect anytime", "נתק בכל עת"),
          details: [
            t("Connect Google Calendar", "חבר Google Calendar"),
            t("Sync with Gmail", "סנכרן עם Gmail"),
            t("Enable Chrome extension", "אפשר תוסף Chrome"),
            t("Manage connected services", "נהל שירותים מחוברים"),
          ],
        },
        {
          icon: Settings,
          title: t("Preferences", "העדפות"),
          description: t("Language, notifications, defaults", "שפה, התראות, ברירות מחדל"),
          quickTip: t("English or Hebrew", "אנגלית או עברית"),
          details: [
            t("Switch language", "החלף שפה"),
            t("Set default view for Jobs page", "הגדר תצוגת ברירת מחדל לעמוד משרות"),
            t("Configure notifications", "הגדר התראות"),
            t("Set email frequency", "הגדר תדירות אימייל"),
          ],
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen relative" dir={isRTL ? "rtl" : "ltr"}>
      <div className="pb-20">
        {/* Hero */}
        <div className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <Badge className="mb-4 bg-[#9F5F80]/20 text-[#9F5F80] border-[#9F5F80]/30">
              <BookOpen className="w-4 h-4 mr-2" />
              {t("Interactive Guide", "מדריך אינטראקטיבי")}
            </Badge>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 text-[#383e4e]">
              {t("How", "איך")} <span className="text-[#9F5F80]">Applytide</span> {t("Works", "עובד")}
            </h1>

            <p className="text-lg sm:text-xl text-[#383e4e]/70">
              {t(
                "Quick, visual walkthroughs of every feature. Click any card to learn more.",
                "הדרכות מהירות וחזותיות של כל תכונה. לחץ על כל כרטיס כדי ללמוד עוד."
              )}
            </p>
          </motion.div>
        </div>

        {/* Tutorial Sections */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-3">
              <div className="lg:sticky lg:top-8 space-y-2">
                {tutorialSections.map((section, idx) => {
                  const Icon = section.icon;
                  const isActive = activeSection === idx;

                  return (
                    <button
                      key={section.id}
                      onClick={() => handleSectionChange(idx)}
                      className={`
                        w-full text-left p-4 rounded-xl transition-all
                        ${
                          isActive
                            ? `bg-gradient-to-r ${section.color} text-white shadow-lg transform scale-105`
                            : "bg-[#383e4e]/90 backdrop-blur-sm border border-[#9F5F80]/20 text-[#b6bac5] hover:bg-[#383e4e]"
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`
                          w-10 h-10 rounded-lg flex items-center justify-center
                          ${isActive ? "bg-white/20" : "bg-[#9F5F80]/20"}
                        `}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold">{section.title}</div>
                          <div className={`text-xs ${isActive ? "text-white/80" : "text-[#b6bac5]/60"}`}>
                            {section.features.length} {t("features", "תכונות")}
                          </div>
                        </div>
                        {isActive && <ChevronRight className="w-5 h-5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-9" ref={contentRef}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Section Header */}
                  <div
                    className={`
                    p-6 sm:p-8 rounded-2xl bg-gradient-to-r ${tutorialSections[activeSection].color}
                    text-white shadow-xl
                  `}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                        {(() => {
                          const SectionIcon = tutorialSections[activeSection].icon;
                          return <SectionIcon className="w-7 h-7" />;
                        })()}
                      </div>
                      <div>
                        <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                          {tutorialSections[activeSection].title}
                        </h2>
                        <p className="text-white/90">{tutorialSections[activeSection].subtitle}</p>
                      </div>
                    </div>
                  </div>

                  {/* Feature Cards Grid */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {tutorialSections[activeSection].features.map((feature, featureIdx) => {
                      const FeatureIcon = feature.icon;
                      const isExpanded = expandedCard === featureIdx;

                      return (
                        <motion.div
                          key={featureIdx}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: featureIdx * 0.1 }}
                          className={`
                            backdrop-blur-xl bg-[#383e4e]/95 border border-[#9F5F80]/30 rounded-xl
                            hover:border-[#9F5F80]/50 transition-all cursor-pointer
                            ${isExpanded ? "shadow-2xl ring-2 ring-[#9F5F80]/50" : "shadow-lg hover:shadow-xl"}
                          `}
                          onClick={() => setExpandedCard(isExpanded ? null : featureIdx)}
                        >
                          <div className="p-6">
                            {/* Card Header */}
                            <div className="flex items-start gap-4 mb-4">
                              <div
                                className={`
                                w-12 h-12 rounded-lg bg-gradient-to-br ${tutorialSections[activeSection].color}
                                flex items-center justify-center flex-shrink-0
                              `}
                              >
                                <FeatureIcon className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1">
                                <h3 className="font-bold text-[#b6bac5] mb-1">{feature.title}</h3>
                                <p className="text-sm text-[#b6bac5]/70">{feature.description}</p>
                              </div>
                              <div className="flex-shrink-0">
                                <motion.div
                                  animate={{ rotate: isExpanded ? 180 : 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ChevronDown className="w-5 h-5 text-[#9F5F80]" />
                                </motion.div>
                              </div>
                            </div>

                            {/* Quick Tip (Always Visible) */}
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-[#9F5F80]/10 border border-[#9F5F80]/20">
                              <Lightbulb className="w-4 h-4 text-[#9F5F80] flex-shrink-0 mt-0.5" />
                              <p className="text-sm text-[#b6bac5]">{feature.quickTip}</p>
                            </div>

                            {/* Expanded Content */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="mt-4 pt-4 border-t border-[#9F5F80]/20 space-y-4"
                                >
                                  {/* Details List */}
                                  <div className="space-y-2">
                                    {feature.details.map((detail, idx) => (
                                      <div key={idx} className="flex items-start gap-2">
                                        <Check className="w-4 h-4 text-[#9F5F80] flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-[#b6bac5]">{detail}</p>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Action Button */}
                                  {feature.action && (
                                    <Button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(feature.action!.link, "_blank", "noopener,noreferrer");
                                      }}
                                      className="w-full bg-gradient-to-r from-[#9F5F80] to-[#7a4a63] hover:from-[#8a5472] hover:to-[#6b3f56] text-white"
                                    >
                                      {feature.action.label}
                                      <ExternalLink className="w-4 h-4 ml-2" />
                                    </Button>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Helper Text */}
                  <div className="text-center p-4">
                    <p className="text-sm text-[#b6bac5]/60">
                      {t("Click any card to see more details", "לחץ על כל כרטיס כדי לראות פרטים נוספים")}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 mx-4 sm:mx-6 lg:mx-8">
          <div className="max-w-4xl mx-auto p-8 sm:p-12 rounded-2xl bg-white/80 backdrop-blur-xl border border-[#9F5F80]/30 shadow-2xl text-center">
            <Rocket className="w-16 h-16 text-[#9F5F80] mx-auto mb-4" />
            <h3 className="text-2xl sm:text-3xl font-bold text-[#383e4e] mb-4">
              {t("Ready to Master Your Job Search?", "מוכן לשלוט בחיפוש העבודה שלך?")}
            </h3>
            <p className="text-[#383e4e]/80 mb-6 max-w-2xl mx-auto">
              {t(
                "Start using Applytide today and land your dream role faster.",
                "התחל להשתמש ב-Applytide היום והשג את תפקיד החלומות שלך מהר יותר."
              )}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/dashboard">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-[#9F5F80] to-[#7a4a63] hover:from-[#8a5472] hover:to-[#6b3f56] text-white shadow-lg"
                >
                  {t("Go to Dashboard", "עבור ללוח הבקרה")}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/jobs">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-[#9F5F80] text-[#9F5F80] hover:bg-[#9F5F80]/10"
                >
                  {t("View My Jobs", "צפה במשרות שלי")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}