/**
 * Pricing Page Content & Data
 *
 * This file contains all static content, translations, and data for the Pricing Page.
 * Separating content from components makes it easier to manage and translate.
 */


// ============================================================================
// TYPES
// ============================================================================

export interface TranslatedText {
  en: string;
  he: string;
}

export interface PricingPlan {
  id: string;
  name: TranslatedText;
  price: {
    monthly: string;
    yearly: string;
  };
  yearlyDiscount?: TranslatedText;
  description: TranslatedText;
  features: TranslatedText[];
  cta: TranslatedText;
  ctaAction: string;
  popular?: boolean;
  gradient: string;
  glowColor: string;
}

export interface PricingFeatureItem {
  text: TranslatedText;
  benefit: TranslatedText;
}

export interface PricingFeatureBlock {
  emoji: string;
  title: TranslatedText;
  badge: TranslatedText;
  badgeColor: string;
  description: TranslatedText;
  items: PricingFeatureItem[];
  gradient: string;
}

export interface ComparisonFeatureItem {
  name: TranslatedText;
  starter: string | boolean;
  pro: string | boolean;
  premium: string | boolean;
}

export interface ComparisonCategory {
  category: TranslatedText;
  items: ComparisonFeatureItem[];
}

export interface FAQItem {
  question: TranslatedText;
  answer: TranslatedText;
}

// ============================================================================
// HERO SECTION
// ============================================================================

export const heroContent = {
  badge: {
    en: "Best value for your money",
    he: "תמורה מקסימלית לכסף",
  },
  title: { en: "Choose Your Plan", he: "בחרו תוכנית" },
  subtitle: {
    en: "Start for free, upgrade when you need more power",
    he: "התחילו בחינם, ושדרגו כשאתם צריכים יותר",
  },
  billingToggle: {
    monthly: { en: "Monthly", he: "חודשי" },
    yearly: { en: "Yearly", he: "שנתי" },
    save: { en: "Save 20%", he: "חיסכון 20%" },
  },
};

// ============================================================================
// PRICING PLANS
// ============================================================================

export const pricingPlans: PricingPlan[] = [
  {
    id: "starter",
    name: { en: "Starter", he: "Starter" },
    price: {
      monthly: "$0",
      yearly: "$0",
    },
    description: {
      en: "Perfect for getting started with job search organization",
      he: "מושלם להתחיל לעשות סדר בחיפוש העבודה",
    },
    features: [
      {
        en: "Track up to 25 job applications",
        he: "מעקב עד 25 מועמדויות",
      },
      { en: "Visual kanban board", he: "לוח Kanban ויזואלי" },
      { en: "Chrome extension", he: "תוסף Chrome" },
      {
        en: "Smart reminders & calendar sync",
        he: "תזכורות חכמות וסנכרון יומן",
      },
      {
        en: "10 AI cover letters per month",
        he: "10 מכתבים נלווים ב-AI בחודש",
      },
      {
        en: "7 AI resume analyses per month",
        he: "7 ניתוחי קורות חיים ב-AI בחודש",
      },
      { en: "Email support", he: "תמיכה בדוא״ל" },
    ],
    cta: { en: "Get Started Free", he: "התחילו בחינם" },
    ctaAction: "current",
    gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    glowColor: "#6366f1",
  },
  {
    id: "pro",
    name: { en: "Pro", he: "Pro" },
    price: {
      monthly: "$12",
      yearly: "$10",
    },
    yearlyDiscount: { en: "2 months free", he: "חודשיים חינם" },
    description: {
      en: "For serious job seekers who want unlimited AI power",
      he: "למחפשי עבודה רציניים שרוצים כוח AI ללא הגבלה",
    },
    features: [
      {
        en: "Everything in Starter, plus:",
        he: "כל מה שיש ב-Starter, ועוד:",
      },
      {
        en: "Unlimited job applications",
        he: "מועמדויות ללא הגבלה",
      },
      {
        en: "Unlimited AI cover letters",
        he: "מכתבים נלווים ב-AI ללא הגבלה",
      },
      {
        en: "Unlimited AI resume analysis",
        he: "ניתוח קורות חיים ב-AI ללא הגבלה",
      },
      {
        en: "Advanced analytics & insights",
        he: "ניתוחים ותובנות מתקדמים",
      },
      {
        en: "Interview prep & tips",
        he: "הכנה וטיפים לראיונות",
      },
      { en: "Company research tools", he: "כלי מחקר על חברות" },
      { en: "Priority support", he: "תמיכה בעדיפות" },
    ],
    cta: { en: "Join Waitlist", he: "הצטרף לרשימת המתנה" },
    ctaAction: "waitlist",
    popular: true,
    gradient: "linear-gradient(135deg, #9F5F80, #8b5cf6)",
    glowColor: "#9F5F80",
  },
  {
    id: "premium",
    name: { en: "Premium", he: "Premium" },
    price: {
      monthly: "$29",
      yearly: "$24",
    },
    yearlyDiscount: { en: "2 months free", he: "חודשיים חינם" },
    description: {
      en: "AI does the heavy lifting-you land the interviews",
      he: "ה-AI עושה את העבודה הכבדה - ואתם מגיעים לראיונות",
    },
    features: [
      {
        en: "Everything in Pro, plus:",
        he: "כל מה שיש ב-Pro, ועוד:",
      },
      {
        en: "AI Smart Agent (auto job search)",
        he: "סוכן AI חכם (חיפוש משרות אוטומטי)",
      },
      {
        en: "Auto-generate & optimize resumes",
        he: "יצירה ואופטימיזציה אוטומטית של קו״ח",
      },
      {
        en: "Auto-fill job application forms",
        he: "מילוי אוטומטי של טפסי מועמדות",
      },
      { en: "Skills gap analysis", he: "ניתוח פערי מיומנויות" },
      {
        en: "Personalized learning paths",
        he: "מסלולי למידה מותאמים אישית",
      },
      { en: "White-glove onboarding", he: "ליווי אישי בהטמעה" },
      { en: "Dedicated support", he: "תמיכה ייעודית" },
    ],
    cta: { en: "Join Waitlist", he: "הצטרף לרשימת המתנה" },
    ctaAction: "waitlist",
    gradient: "linear-gradient(135deg, #f59e0b, #ef4444)",
    glowColor: "#f59e0b",
  },
];

// ============================================================================
// FEATURES SECTION
// ============================================================================

export const featuresContent = {
  badge: { en: "Why Applytide", he: "למה Applytide" },
  title: {
    en: "Everything You Need to Get Organized",
    he: "כל מה שצריך כדי להיות מסודר",
  },
  subtitle: {
    en: "Track applications, manage interviews, and stay on top of your job search - all in one place",
    he: "עקוב אחרי מועמדויות, נהל ראיונות, והישאר בעניינים - הכל במקום אחד",
  },
};

export const pricingFeatures: PricingFeatureBlock[] = [
  {
    emoji: "📊",
    title: { en: "Visual Pipeline", he: "לוח ניהול ויזואלי" },
    badge: { en: "Available Now", he: "זמין עכשיו" },
    badgeColor: "#10b981",
    description: {
      en: "See your entire job search at a glance. Drag and drop applications between stages.",
      he: "ראו את כל חיפוש העבודה במבט אחד. גררו ושחררו מועמדויות בין השלבים.",
    },
    items: [
      {
        text: {
          en: "Kanban board view",
          he: "תצוגת לוח Kanban",
        },
        benefit: {
          en: "Track every stage",
          he: "עקבו אחר כל שלב",
        },
      },
      {
        text: { en: "Chrome extension", he: "תוסף Chrome" },
        benefit: {
          en: "Save in one click",
          he: "שמרו בלחיצה",
        },
      },
      {
        text: { en: "Smart reminders", he: "תזכורות חכמות" },
        benefit: {
          en: "Never miss deadlines",
          he: "אל תפספסו דדליינים",
        },
      },
      {
        text: {
          en: "Calendar integration",
          he: "אינטגרציה ליומן",
        },
        benefit: { en: "Schedule easily", he: "תזמון פשוט" },
      },
    ],
    gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)",
  },
  {
    emoji: "🤖",
    title: {
      en: "AI Writing Assistant",
      he: "עוזר כתיבה מבוסס AI",
    },
    badge: { en: "Available Now", he: "זמין עכשיו" },
    badgeColor: "#9F5F80",
    description: {
      en: "Get AI-powered cover letters and resume analysis. Free tier includes monthly credits.",
      he: "קבלו מכתבים נלווים וניתוח קורות חיים בעזרת AI. בתוכנית החינמית כלולים קרדיטים חודשיים.",
    },
    items: [
      {
        text: {
          en: "AI cover letters",
          he: "מכתבים נלווים מבוססי AI",
        },
        benefit: { en: "10/month free", he: "10 בחודש חינם" },
      },
      {
        text: { en: "Resume analysis", he: "ניתוח קורות חיים" },
        benefit: { en: "7/month free", he: "7 בחודש חינם" },
      },
      {
        text: { en: "Job matching", he: "התאמת משרות" },
        benefit: { en: "See what fits", he: "ראו מה מתאים" },
      },
      {
        text: { en: "Document storage", he: "אחסון מסמכים" },
        benefit: { en: "Stay organized", he: "שימרו על סדר" },
      },
    ],
    gradient: "linear-gradient(135deg, #9F5F80, #8b5cf6)",
  },
  {
    emoji: "⚡",
    title: { en: "AI Automation", he: "אוטומציה מבוססת AI" },
    badge: { en: "Coming Soon", he: "בקרוב" },
    badgeColor: "#fbbf24",
    description: {
      en: "Save hours every week with unlimited AI and smart automation.",
      he: "חסכו שעות בכל שבוע בעזרת AI ללא הגבלה ואוטומציות חכמות.",
    },
    items: [
      {
        text: { en: "Unlimited AI", he: "AI ללא הגבלה" },
        benefit: { en: "No limits", he: "ללא מגבלות" },
      },
      {
        text: { en: "Auto-fill forms", he: "מילוי אוטומטי" },
        benefit: { en: "Apply in seconds", he: "הגשה בשניות" },
      },
      {
        text: { en: "Job discovery", he: "גילוי משרות" },
        benefit: {
          en: "AI finds for you",
          he: "ה-AI מוצא עבורכם",
        },
      },
      {
        text: {
          en: "Auto-optimize",
          he: "אופטימיזציה אוטומטית",
        },
        benefit: { en: "Per job", he: "לכל משרה" },
      },
    ],
    gradient: "linear-gradient(135deg, #f59e0b, #ef4444)",
  },
  {
    emoji: "📊",
    title: { en: "Smart Insights", he: "תובנות חכמות" },
    badge: { en: "Coming Soon", he: "בקרוב" },
    badgeColor: "#fbbf24",
    description: {
      en: "Data-driven insights and personalized recommendations to improve results.",
      he: "תובנות מבוססות נתונים והמלצות מותאמות לשיפור התוצאות.",
    },
    items: [
      {
        text: {
          en: "Advanced analytics",
          he: "אנליטיקה מתקדמת",
        },
        benefit: {
          en: "Track success",
          he: "עקבו אחרי ההצלחה",
        },
      },
      {
        text: { en: "Interview prep", he: "הכנה לראיון" },
        benefit: { en: "AI tips", he: "טיפים מה-AI" },
      },
      {
        text: { en: "Company research", he: "מחקר חברות" },
        benefit: { en: "Know before", he: "דעו מראש" },
      },
      {
        text: { en: "Skills analysis", he: "ניתוח מיומנויות" },
        benefit: { en: "Learn smart", he: "למדו חכם" },
      },
    ],
    gradient: "linear-gradient(135deg, #10b981, #06b6d4)",
  },
];

// ============================================================================
// COMPARISON TABLE
// ============================================================================

export const comparisonContent = {
  title: { en: "Feature Comparison", he: "השוואת תכונות" },
  subtitle: {
    en: "See what's included in each plan",
    he: "ראו מה כלול בכל תוכנית",
  },
  headers: {
    feature: { en: "Feature", he: "פיצ'ר" },
    starter: { en: "Starter", he: "Starter" },
    pro: { en: "Pro", he: "Pro" },
    premium: { en: "Premium", he: "Premium" },
  },
};

export const comparisonCategories: ComparisonCategory[] = [
  {
    category: { en: "Core Features", he: "פיצ'רים עיקריים" },
    items: [
      {
        name: {
          en: "Job applications tracking",
          he: "מעקב אחר מועמדויות",
        },
        starter: "25",
        pro: "∞",
        premium: "∞",
      },
      {
        name: {
          en: "Visual kanban board",
          he: "לוח Kanban ויזואלי",
        },
        starter: true,
        pro: true,
        premium: true,
      },
      {
        name: { en: "Smart reminders", he: "תזכורות חכמות" },
        starter: true,
        pro: true,
        premium: true,
      },
      {
        name: {
          en: "Calendar integration",
          he: "אינטגרציה ליומן",
        },
        starter: true,
        pro: true,
        premium: true,
      },
    ],
  },
  {
    category: { en: "AI Features", he: "פיצ'רים מבוססי AI" },
    items: [
      {
        name: { en: "Chrome extension", he: "תוסף Chrome" },
        starter: true,
        pro: true,
        premium: true,
      },
      {
        name: {
          en: "AI cover letters",
          he: "מכתבים נלווים מבוססי AI",
        },
        starter: "10/mo",
        pro: "∞",
        premium: "∞",
      },
      {
        name: {
          en: "AI resume analysis",
          he: "ניתוח קורות חיים ב-AI",
        },
        starter: "7/mo",
        pro: "∞",
        premium: "∞",
      },
      {
        name: {
          en: "Advanced analytics",
          he: "אנליטיקה מתקדמת",
        },
        starter: false,
        pro: true,
        premium: true,
      },
      {
        name: {
          en: "Interview preparation",
          he: "הכנה לראיונות",
        },
        starter: false,
        pro: true,
        premium: true,
      },
      {
        name: { en: "Company research", he: "מחקר על חברות" },
        starter: false,
        pro: true,
        premium: true,
      },
    ],
  },
  {
    category: {
      en: "Premium Automation",
      he: "אוטומציה פרימיום",
    },
    items: [
      {
        name: {
          en: "AI Smart Agent (auto job search)",
          he: "סוכן AI (חיפוש אוטומטי)",
        },
        starter: false,
        pro: false,
        premium: true,
      },
      {
        name: {
          en: "Auto-generate resumes",
          he: "יצירת קו״ח אוטומטית",
        },
        starter: false,
        pro: false,
        premium: true,
      },
      {
        name: {
          en: "Auto-fill application forms",
          he: "מילוי טפסים אוטומטי",
        },
        starter: false,
        pro: false,
        premium: true,
      },
      {
        name: {
          en: "Skills gap analysis",
          he: "ניתוח פערי מיומנויות",
        },
        starter: false,
        pro: false,
        premium: true,
      },
      {
        name: {
          en: "Personalized learning paths",
          he: "מסלולי למידה מותאמים",
        },
        starter: false,
        pro: false,
        premium: true,
      },
    ],
  },
  {
    category: { en: "Support", he: "תמיכה" },
    items: [
      {
        name: { en: "Email support", he: "תמיכה במייל" },
        starter: "Standard",
        pro: "Priority",
        premium: "Priority",
      },
      {
        name: {
          en: "Export to CSV & PDF",
          he: "ייצוא ל-CSV ו-PDF",
        },
        starter: true,
        pro: true,
        premium: true,
      },
    ],
  },
];

// ============================================================================
// FAQ SECTION
// ============================================================================

export const faqContent = {
  title: { en: "Common Questions", he: "שאלות נפוצות" },
  subtitle: {
    en: "Everything you need to know about pricing and features",
    he: "כל מה שצריך לדעת על מחירים ופיצ'רים",
  },
  stillQuestions: {
    en: "Still have questions?",
    he: "עדיין יש שאלות?",
  },
  contactUs: {
    en: "Our support team is here to help you find the perfect plan",
    he: "צוות התמיכה שלנו כאן לעזור לך למצוא את התוכנית המושלמת",
  },
  contactButton: {
    en: "Contact Support",
    he: "צרו קשר עם התמיכה",
  },
};

export const faqs: FAQItem[] = [
  {
    question: {
      en: "Can I start with the free Starter plan?",
      he: "האם אפשר להתחיל עם תוכנית Starter החינמית?",
    },
    answer: {
      en: "Absolutely! The Starter plan is completely free forever with no credit card required. You get 25 application tracking, visual kanban board, Chrome extension, 10 AI cover letters per month, 7 AI resume analyses per month, and all core features. It's perfect for getting started and seeing if Applytide is right for you.",
      he: "בהחלט! תוכנית ה-Starter חינמית לחלוטין לתמיד ללא צורך בכרטיס אשראי. תקבלו מעקב 25 מועמדויות, לוח Kanban ויזואלי, תוסף Chrome, 10 מכתבי כיסוי AI בחודש, 7 ניתוחי קורות חיים AI בחודש, וכל התכונות הליבה. זה מושלם להתחלה ולראות אם Applytide מתאים לך.",
    },
  },
  {
    question: {
      en: "When will Pro and Premium plans be available?",
      he: "מתי תוכניות Pro ו-Premium יהיו זמינות?",
    },
    answer: {
      en: "We're working hard on Pro and Premium features! Join the waitlist to be among the first to get early access with special launch pricing. We'll notify you as soon as they're ready. You can already enjoy all the Starter features while we build the advanced AI tools.",
      he: "אנחנו עובדים קשה על מסלולי ה-Pro וה-Premium! הצטרפו לרשימת ההמתנה כדי להיות בין הראשונים לקבל גישה מוקדמת עם מחיר השקה מיוחד. נעדכן אתכם ברגע שהן מוכנות. אתם כבר יכולים ליהנות מכל הפיצ'רים של Starter בזמן שאנחנו בונים את כלי ה-AI המתקדמים.",
    },
  },
  {
    question: {
      en: "What's the difference between Pro and Premium?",
      he: "מה ההבדל בין Pro ל-Premium?",
    },
    answer: {
      en: "Pro unlocks unlimited AI (cover letters and resume analysis), advanced analytics, interview prep, and company insights. Premium adds the AI Smart Agent that finds jobs for you, auto-generates and optimizes resumes for each application, and auto-fills job forms-essentially doing the heavy lifting for you.",
      he: "ה-Pro פותח AI ללא הגבלה (מכתבי כיסוי וניתוח קורות חיים), אנליטיקה מתקדמת, הכנה לראיונות ותובנות על חברות. ה-Premium מוסיף את סוכן ה-AI החכם שמוצא משרות בשבילך, מייצר ומייעל קורות חיים אוטומטית לכל מועמדות, וממלא טפסים אוטומטית-בעצם עושה את העבודה הכבדה בשבילך.",
    },
  },
  {
    question: {
      en: "Will there be a free trial for paid plans?",
      he: "האם תהיה תקופת ניסיון חינם לתוכניות בתשלום?",
    },
    answer: {
      en: "Yes! When Pro and Premium launch, we'll offer a 7-day free trial so you can test all the advanced features before committing. No credit card required to start the trial.",
      he: "כן! כשה-Pro וה-Premium יושקו, נציע 7 ימי ניסיון חינם כדי שתוכל לבדוק את כל התכונות המתקדמות לפני שמתחייב. לא נדרש כרטיס אשראי להתחלת הניסיון.",
    },
  },
  {
    question: {
      en: "Can I upgrade or downgrade my plan later?",
      he: "האם אפשר לשדרג או להוריד תוכנית בהמשך?",
    },
    answer: {
      en: "Absolutely! You can change your plan anytime. When upgrading, you'll only pay the prorated difference for the remaining billing period. When downgrading, the change takes effect at the start of your next billing cycle, so you keep access to premium features until then.",
      he: "בהחלט! אפשר לשנות את התוכנית בכל זמן. בשדרוג, תשלמו רק את ההפרש היחסי עבור תקופת החיוב שנותרה. בהורדה, השינוי נכנס לתוקף בתחילת מחזור החיוב הבא, כך שתשמרו גישה לפיצ'רים הקודמים עד אז.",
    },
  },
];