/**
 * Company Pages Translations
 * 
 * Translations for About, Contact, and Accessibility pages.
 */

export const companyTranslations = {
  // About Page
  about: {
    title: { en: "About Applytide", he: "אודות Applytide" },
    subtitle: { 
      en: "Revolutionizing the way professionals manage their job search", 
      he: "משנים את האופן שבו מנהלים חיפוש עבודה" 
    },
    mission: {
      title: { en: "Our Mission", he: "המשימה שלנו" },
      content: { 
        en: "To empower job seekers with intelligent tools that simplify application tracking and increase their chances of landing their dream job.", 
        he: "להעניק למחפשי עבודה כלים חכמים שמפשטים את המעקב אחר מועמדויות ומגדילים את הסיכוי להגיע למשרת החלומות." 
      }
    },
    vision: {
      title: { en: "Our Vision", he: "החזון שלנו" },
      content: { 
        en: "A world where every professional can navigate their career journey with confidence, clarity, and control.", 
        he: "עולם שבו כל איש מקצוע מנהל את הקריירה בביטחון, בהירות ושליטה." 
      }
    },
    values: {
      title: { en: "Our Values", he: "הערכים שלנו" },
      items: [
        { 
          title: { en: "Innovation", he: "חדשנות" },
          description: { en: "Constantly evolving to meet the needs of modern job seekers", he: "מתפתחים כל הזמן כדי לענות על צרכי מחפשי העבודה" }
        },
        { 
          title: { en: "Simplicity", he: "פשטות" },
          description: { en: "Making complex processes easy and intuitive", he: "הופכים תהליכים מורכבים לפשוטים ואינטואיטיביים" }
        },
        { 
          title: { en: "Empowerment", he: "העצמה" },
          description: { en: "Giving you the tools to take control of your career", he: "נותנים לך את הכלים לקחת שליטה על הקריירה" }
        },
        { 
          title: { en: "Privacy", he: "פרטיות" },
          description: { en: "Your data security is our top priority", he: "אבטחת המידע שלך בראש סדר העדיפויות" }
        }
      ]
    },
    team: {
      title: { en: "Our Team", he: "הצוות שלנו" },
      description: { 
        en: "Built by professionals who understand the challenges of modern job searching", 
        he: "נבנה בידי אנשי מקצוע שמכירים מקרוב את אתגרי חיפוש העבודה" 
      }
    }
  },

  // Contact Page
  contact: {
    title: { en: "Get in Touch", he: "צור קשר" },
    subtitle: { 
      en: "We'd love to hear from you. Send us a message and we'll respond as soon as possible.", 
      he: "נשמח לשמוע ממך. שלח הודעה ונחזור בהקדם." 
    },
    form: {
      name: { en: "Name", he: "שם" },
      namePlaceholder: { en: "Your name", he: "השם שלך" },
      email: { en: "Email", he: "אימייל" },
      emailPlaceholder: { en: "your.email@example.com", he: "your.email@example.com" },
      subject: { en: "Subject", he: "נושא" },
      subjectPlaceholder: { en: "What is this about?", he: "על מה הפנייה?" },
      message: { en: "Message", he: "הודעה" },
      messagePlaceholder: { en: "Tell us more...", he: "ספר לנו עוד..." },
      submit: { en: "Send Message", he: "שלח הודעה" },
      sending: { en: "Sending...", he: "שולח..." },
      success: { en: "Message sent successfully!", he: "ההודעה נשלחה בהצלחה!" },
      error: { en: "Failed to send message. Please try again.", he: "שליחת ההודעה נכשלה. אנא נסה שוב." }
    },
    info: {
      title: { en: "Contact Information", he: "פרטי יצירת קשר" },
      email: { en: "Email", he: "אימייל" },
      response: { en: "We typically respond within 24 hours", he: "בדרך כלל נשיב תוך 24 שעות" }
    }
  },

  // Accessibility Page
  accessibility: {
    title: { en: "Accessibility Statement", he: "הצהרת נגישות" },
    subtitle: { 
      en: "Our commitment to making Applytide accessible to everyone", 
      he: "המחויבות שלנו להפוך את Applytide לנגישה לכלל המשתמשים" 
    },
    commitment: {
      title: { en: "Our Commitment", he: "המחויבות שלנו" },
      content: { 
        en: "Applytide is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards.", 
        he: "Applytide מחויבת לנגישות דיגיטלית לאנשים עם מוגבלויות. אנו משפרים באופן מתמשך את חוויית המשתמש ומיישמים תקנים רלוונטיים." 
      }
    },
    standards: {
      title: { en: "Conformance Standards", he: "תקני התאמה" },
      content: { 
        en: "Applytide strives to conform to the Web Content Accessibility Guidelines (WCAG) 2.1, Level AA. These guidelines explain how to make web content more accessible for people with disabilities and user-friendly for everyone.", 
        he: "אנו שואפים לעמידה בהנחיות WCAG 2.1 ברמה AA, לשיפור נגישות התוכן וחוויית השימוש." 
      }
    },
    features: {
      title: { en: "Accessibility Features", he: "תכונות נגישות" },
      items: [
        { en: "Keyboard navigation support", he: "תמיכה בניווט מקלדת" },
        { en: "Screen reader compatibility", he: "תאימות לקוראי מסך" },
        { en: "High contrast mode support", he: "מצב ניגודיות גבוהה" },
        { en: "Adjustable text sizes", he: "גדלי טקסט מתכווננים" },
        { en: "Clear focus indicators", he: "אינדיקטורי פוקוס ברורים" },
        { en: "Alternative text for images", he: "טקסט חלופי לתמונות" },
        { en: "Semantic HTML structure", he: "מבנה HTML סמנטי" },
        { en: "ARIA labels and landmarks", he: "תוויות ונקודות ציון ARIA" }
      ]
    },
    feedback: {
      title: { en: "Feedback", he: "משוב" },
      content: { 
        en: "We welcome your feedback on the accessibility of Applytide. Please let us know if you encounter accessibility barriers:", 
        he: "נשמח למשוב בנושא נגישות. אם נתקלת במחסומי נגישות, עדכן/י אותנו:" 
      },
      email: { en: "Email", he: "אימייל" }
    },
    updates: {
      title: { en: "Continuous Improvement", he: "שיפור מתמיד" },
      content: { 
        en: "We regularly review and test our platform to ensure we maintain and improve accessibility. Our team is dedicated to making ongoing enhancements to ensure all users can access our services.", 
        he: "אנו בודקים ומשפרים באופן קבוע את הפלטפורמה כדי לוודא שכל המשתמשים יכולים ליהנות מהשירות." 
      }
    }
  }
} as const;
