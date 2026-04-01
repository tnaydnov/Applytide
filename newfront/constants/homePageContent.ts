/**
 * HomePage Content & Data
 *
 * This file contains all static content, translations, and data for the HomePage.
 * Separating content from components makes it easier to manage and translate.
 */

import {
  LucideIcon,
  Sparkles,
  Brain,
  Target,
  Zap,
  TrendingUp,
  Shield,
  Rocket,
  Users,
  BarChart3,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export interface TranslatedText {
  en: string;
  he: string;
}

export interface Feature {
  icon: LucideIcon;
  title: TranslatedText;
  description: TranslatedText;
}

export interface Stat {
  value: string;
  label: TranslatedText;
  icon: LucideIcon;
}

export interface Review {
  name: string;
  role: TranslatedText;
  content: TranslatedText;
  avatar: string;
}

// ============================================================================
// HERO SECTION
// ============================================================================

export const heroContent = {
  badge: {
    en: "✨ Now in Beta",
    he: "✨ עכשיו בבטא",
  },
  title: {
    line1: {
      en: "Stop Losing Track.",
      he: "תפסיקו להתפזר.",
    },
    line2: {
      en: "Start Landing Jobs.",
      he: "תתחילו להתקבל.",
    },
  },
  subtitle: {
    en: "Track every application, ace every interview, and land your dream job with AI-powered insights.",
    he: "עקבו אחרי כל המועמדויות, התכוננו נכון לראיונות, וקבלו את המשרה שאתם רוצים — עם תובנות מבוססות AI.",
  },
  cta: {
    primary: {
      en: "Start Free Trial",
      he: "התחילו ניסיון חינם",
    },
  },
  trustBadge: {
    en: "No credit card required • Free forever",
    he: "ללא כרטיס אשראי • חינם לתמיד",
  },
  stats: {
    users: {
      en: "Users",
      he: "משתמשים",
    },
    applications: {
      en: "Applications",
      he: "מועמדויות",
    },
    offers: {
      en: "Offers",
      he: "הצעות עבודה",
    },
  },
};

// ============================================================================
// FEATURES SECTION
// ============================================================================

export const featuresContent = {
  title: {
    en: "Everything you need to succeed",
    he: "כל מה שצריך כדי להצליח",
  },
  subtitle: {
    en: "Powerful features designed for the modern job seeker",
    he: "כלים מתקדמים שמותאמים במיוחד למחפשי עבודה כיום",
  },
};

export const features: Feature[] = [
  {
    icon: Sparkles,
    title: {
      en: "Smart Tracking",
      he: "מעקב חכם",
    },
    description: {
      en: "Automatically organize and track all your job applications in one place. Never lose track of an opportunity again.",
      he: "כל ההגשות והפניות שלך מסודרות אוטומטית במקום אחד. לא תפספס יותר אף הזדמנות.",
    },
  },
  {
    icon: Brain,
    title: {
      en: "AI-Powered Insights",
      he: "תובנות מבוססות בינה מלאכותית",
    },
    description: {
      en: "Get intelligent recommendations and insights to improve your application success rate with machine learning.",
      he: "קבל המלצות ותובנות חכמות שיעזרו לך לשפר את הסיכויים לקבל תשובות והזמנות לראיון.",
    },
  },
  {
    icon: Target,
    title: {
      en: "Application Pipeline",
      he: "ניהול תהליך הגיוס",
    },
    description: {
      en: "Visualize your job search journey from application to offer with intuitive kanban-style boards.",
      he: "ראה בצורה ברורה את מצב כל בקשה – מהשליחה ועד להצעה – עם לוחות קנבן נוחים ואינטואיטיביים.",
    },
  },
  {
    icon: Zap,
    title: {
      en: "Quick Apply",
      he: "הגשה מהירה",
    },
    description: {
      en: "Speed up your application process with saved templates and one-click submissions to multiple platforms.",
      he: "תבניות מוכנות והגשה בלחיצה אחת – חוסך זמן ומשאיר אותך מרוכז בעיקר.",
    },
  },
  {
    icon: TrendingUp,
    title: {
      en: "Analytics Dashboard",
      he: "נתונים וסטטיסטיקות",
    },
    description: {
      en: "Track your progress with detailed analytics on response rates, interview conversions, and success patterns.",
      he: "נתוני הצלחה, אחוזי תגובה, וניתוח התקדמות – הכל מוצג בצורה ברורה ופשוטה.",
    },
  },
  {
    icon: Shield,
    title: {
      en: "Secure & Private",
      he: "מאובטח ופרטי",
    },
    description: {
      en: "Your data is encrypted and never shared. We take your privacy seriously with bank-level security.",
      he: "המידע שלך נשמר באופן מוצפן ולא מועבר לאף גורם. הפרטיות שלך במקום הראשון.",
    },
  },
];

// ============================================================================
// STATS SECTION
// ============================================================================

export const stats: Stat[] = [
  {
    value: "150+",
    label: {
      en: "Beta Testers",
      he: "בודקי בטא",
    },
    icon: Users,
  },
  {
    value: "500+",
    label: {
      en: "Applications Tracked",
      he: "בקשות במעקב",
    },
    icon: BarChart3,
  },
  {
    value: "95%",
    label: {
      en: "User Satisfaction",
      he: "שביעות רצון משתמשים",
    },
    icon: TrendingUp,
  },
  {
    value: "Beta",
    label: {
      en: "Early Access",
      he: "גרסת בטא",
    },
    icon: Rocket,
  },
];

// ============================================================================
// REVIEWS SECTION
// ============================================================================

export const reviewsContent = {
  title: {
    en: "What beta testers are saying",
    he: "מה בודקי הבטא אומרים",
  },
  subtitle: {
    en: "Early feedback from our beta community",
    he: "משוב ראשוני מקהילת הבטא שלנו",
  },
};

export const reviews: Review[] = [
  {
    name: "דני כהן",
    role: {
      en: "Computer Science Student",
      he: "סטודנט למדעי המחשב",
    },
    content: {
      en: "Finally a tool that helps me organize my internship applications. The beta is already super useful!",
      he: "סוף סוף כלי שמארגן לי את כל בקשות ההתמחות. אפילו בגרסת הבטא הוא כבר מאוד שימושי.",
    },
    avatar: "👨‍💻",
  },
  {
    name: "שרה לוי",
    role: {
      en: "Junior Developer",
      he: "מפתחת ג'וניור",
    },
    content: {
      en: "Great for keeping track of applications. Love the simple interface and it's helping me stay organized during my job search.",
      he: "כלי מעולה למעקב אחרי בקשות עבודה. הממשק פשוט ונוח, ועוזר לי לשמור על סדר בתקופה לחוצה.",
    },
    avatar: "👩‍💼",
  },
  {
    name: "יוסי מזרחי",
    role: {
      en: "Freelance Designer",
      he: "מעצב UI/UX",
    },
    content: {
      en: "As someone juggling multiple job applications, this beta has been a lifesaver. Looking forward to more features!",
      he: "אני מנהל המון פניות במקביל, והכלי הזה באמת עושה סדר. מחכה לראות את הפיצ'רים הבאים!",
    },
    avatar: "🧑‍🎨",
  },
];

// ============================================================================
// CTA SECTION
// ============================================================================

export const ctaContent = {
  badge: {
    en: "🚀 Beta Access Available",
    he: "🚀 גישת בטא זמינה",
  },
  title: {
    en: "Ready to organize your job search?",
    he: "רוצה לעשות סדר בחיפוש העבודה?",
  },
  subtitle: {
    en: "Join our beta community and be among the first to try Applytide.",
    he: "הצטרף לקהילת הבטא והיה בין הראשונים לנסות את Applytide.",
  },
  cta: {
    en: "Join Beta - Free",
    he: "הצטרף לבטא - חינם",
  },
  features: [
    {
      en: "Completely free",
      he: "חינם לחלוטין",
    },
    {
      en: "No credit card needed",
      he: "ללא צורך בכרטיס אשראי",
    },
    {
      en: "Beta access for early adopters",
      he: "גישה מוקדמת לפני כולם",
    },
  ],
  stats: {
    title: {
      en: "Join the Beta",
      he: "הצטרף לבטא",
    },
    count: "12",
    label: {
      en: "beta testers joined this week",
      he: "בודקי בטא הצטרפו השבוע",
    },
  },
};