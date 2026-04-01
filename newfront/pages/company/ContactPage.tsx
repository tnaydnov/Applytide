import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { PageContainer } from "../../components/layout/PageContainer";
import { PageHeader } from "../../components/layout/PageHeader";
import { useLanguage } from "../../contexts/LanguageContext";
import { companyTranslations } from "../../utils/translations";
import {
  Mail,
  Shield,
  AlertTriangle,
  HelpCircle,
  FileQuestion,
  Download,
  Trash2,
  Chrome,
  Bug,
} from "lucide-react";

export function ContactPage() {
  const { language, dir } = useLanguage();
  const { contact } = companyTranslations;
  const textAlign: 'right' | 'left' = dir === 'rtl' ? 'right' : 'left';

  const contactCards = [
    {
      icon: Mail,
      title: { en: "General Inquiries", he: "פניות כלליות" },
      description: { 
        en: "Questions about our service, features, or how to use Applytide?",
        he: "שאלות על השירות, יכולות או איך משתמשים ב-Applytide?"
      },
      email: "contact@localhost",
      color: "#60a5fa",
      responseTime: { en: "24-48 hours", he: "24–48 שעות" },
    },
    {
      icon: Shield,
      title: { en: "Privacy & Data", he: "פרטיות ומידע" },
      description: { 
        en: "GDPR requests, data export, account deletion, or privacy concerns.",
        he: "בקשות לפי GDPR, ייצוא נתונים, מחיקת חשבון או סוגיות פרטיות."
      },
      email: "privacy@localhost",
      color: "#a78bfa",
      responseTime: { en: "30-45 days (legal requirement)", he: "30–45 יום (כנדרש בדין)" },
    },
    {
      icon: AlertTriangle,
      title: { en: "Security Issues", he: "סוגיות אבטחה" },
      description: { 
        en: "Found a security vulnerability? We appreciate responsible disclosure.",
        he: "מצאת פגיעות? אנו מעריכים גילוי אחראי."
      },
      email: "security@localhost",
      color: "#f87171",
      responseTime: { en: "72 hours", he: "72 שעות" },
    },
    {
      icon: HelpCircle,
      title: { en: "Technical Support", he: "תמיכה טכנית" },
      description: { 
        en: "Having trouble with the app? Need help with a feature?",
        he: "בעיה באפליקציה? צריך עזרה בתכונה מסוימת?"
      },
      email: "contact@localhost",
      color: "#34d399",
      responseTime: { en: "24-48 hours", he: "24–48 שעות" },
    },
    {
      icon: FileQuestion,
      title: { en: "Legal & Compliance", he: "משפטי ותאימות" },
      description: { 
        en: "Legal questions, terms of service, or compliance matters.",
        he: "שאלות משפטיות, תנאי שימוש או נושאי תאימות/רגולציה."
      },
      email: "legal@localhost",
      color: "#fb923c",
      responseTime: { en: "5-7 business days", he: "5–7 ימי עסקים" },
    },
    {
      icon: Bug,
      title: { en: "Bug Reports", he: "דיווחי באגים" },
      description: { 
        en: "Found a bug? Help us improve by reporting it.",
        he: "מצאתם באג? עזרו לנו להשתפר באמצעות דיווח."
      },
      email: "contact@localhost",
      color: "#f472b6",
      responseTime: { en: "24-48 hours", he: "24–48 שעות" },
    },
  ];

  const frequentRequests = [
    {
      icon: Download,
      title: { en: "Data Export (GDPR)", he: "ייצוא נתונים (GDPR)" },
      description: { 
        en: "Request a copy of all your personal data stored in Applytide",
        he: "בקשת עותק מכלל המידע האישי השמור ב-Applytide"
      },
      email: "privacy@localhost",
    },
    {
      icon: Trash2,
      title: { en: "Account Deletion", he: "מחיקת חשבון" },
      description: { 
        en: "Permanently delete your account and all associated data",
        he: "מחיקה סופית של החשבון וכל הנתונים המשויכים"
      },
      email: "privacy@localhost",
    },
    {
      icon: Chrome,
      title: { en: "Chrome Extension Support", he: "תמיכה בתוסף Chrome" },
      description: { 
        en: "Having issues with the Chrome extension?",
        he: "נתקלתם בבעיה בתוסף? אנחנו כאן לעזור."
      },
      email: "contact@localhost",
    },
  ];

  return (
    <PageContainer size="lg">
      <PageHeader 
        title={contact.title[language]} 
        subtitle={contact.subtitle[language]} 
      />

      <div className="space-y-8" dir={dir}>
        {/* Contact Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {contactCards.map((card, index) => (
            <ContactCard
              key={index}
              icon={card.icon}
              title={card.title[language]}
              description={card.description[language]}
              email={card.email}
              color={card.color}
              responseTime={card.responseTime[language]}
              textAlign={textAlign}
              delay={0.2 + index * 0.1}
            />
          ))}
        </div>

        {/* Frequent Requests Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <h2
            className="text-2xl md:text-3xl mb-6"
            style={{ color: "#383e4e", textShadow: "0 2px 8px rgba(159, 95, 128, 0.15)", textAlign }}
          >
            {language === 'en' ? 'Frequent Requests' : 'בקשות נפוצות'}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {frequentRequests.map((request, index) => (
              <FrequentRequestCard
                key={index}
                icon={request.icon}
                title={request.title[language]}
                description={request.description[language]}
                email={request.email}
                textAlign={textAlign}
                delay={0.6 + index * 0.1}
              />
            ))}
          </div>
        </motion.div>

        {/* Important Notes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="rounded-2xl backdrop-blur-xl p-6 md:p-8"
          style={{
            backgroundColor: "#383e4e",
            boxShadow: "0 15px 50px rgba(0, 0, 0, 0.4), 0 5px 15px rgba(159, 95, 128, 0.1)",
            border: "1px solid rgba(159, 95, 128, 0.3)",
          }}
        >
          <h3 className="text-xl md:text-2xl mb-4" style={{ color: "#b6bac5", textAlign }}>
            {language === 'en' ? 'Important Notes' : 'הערות חשובות'}
          </h3>
          <ul 
            className="space-y-3"
            style={{ 
              color: "#b6bac5", 
              opacity: 0.9, 
              listStyle: 'none',
              paddingInlineStart: 0,
            }}
          >
            <li style={{ textAlign }}>
              {language === 'en' 
                ? '• We typically respond to emails within the timeframes listed above'
                : '• בדרך כלל נשיב לאימיילים במסגרת הזמנים המצוינים לעיל'
              }
            </li>
            <li style={{ textAlign }}>
              {language === 'en' 
                ? '• For security issues, we follow a responsible disclosure process'
                : '• סוגיות אבטחה מטופלות בתהליך גילוי אחראי'
              }
            </li>
            <li style={{ textAlign }}>
              {language === 'en' 
                ? '• GDPR requests are handled within the legal 30-day requirement'
                : '• בקשות לפי GDPR מטופלות בהתאם לדרישה החוקית של 30 יום'
              }
            </li>
            <li style={{ textAlign }}>
              {language === 'en' 
                ? "• For privacy policy questions, review our "
                : '• לשאלות על מדיניות הפרטיות, מומלץ לעיין ב־'
              }
              <Link to="/privacy" style={{ color: "#9F5F80" }} className="hover:opacity-80">
                {language === 'en' ? 'Privacy Policy' : 'מדיניות הפרטיות'}
              </Link>
            </li>
          </ul>
        </motion.div>
      </div>
    </PageContainer>
  );
}

// Contact Card Component
interface ContactCardProps {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  description: string;
  email: string;
  color: string;
  responseTime: string;
  textAlign: 'right' | 'left';
  delay?: number;
}

function ContactCard({
  icon: Icon,
  title,
  description,
  email,
  color,
  responseTime,
  textAlign,
  delay = 0,
}: ContactCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.2, delay, ease: "easeOut" }}
      whileHover={{
        scale: 1.03,
        y: -5,
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5), 0 5px 20px rgba(159, 95, 128, 0.2)",
      }}
      className="rounded-2xl backdrop-blur-xl p-6"
      style={{
        backgroundColor: "#383e4e",
        boxShadow: "0 15px 50px rgba(0, 0, 0, 0.4), 0 5px 15px rgba(159, 95, 128, 0.1)",
        border: "1px solid rgba(159, 95, 128, 0.2)",
      }}
    >
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
        style={{
          backgroundColor: `${color}33`,
          border: `1px solid ${color}66`,
        }}
      >
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
      <h3 className="text-lg mb-2" style={{ color: "#b6bac5", textAlign }}>
        {title}
      </h3>
      <p className="text-sm mb-4" style={{ color: "#b6bac5", opacity: 0.8, textAlign }}>
        {description}
      </p>
      <a
        href={`mailto:${email}`}
        className="inline-block mb-3 hover:opacity-80 transition-opacity"
        style={{ color: "#9F5F80", textAlign }}
      >
        {email}
      </a>
      <div className="text-xs" style={{ color: "#b6bac5", opacity: 0.6, textAlign }}>
        {responseTime}
      </div>
    </motion.div>
  );
}

// Frequent Request Card Component
interface FrequentRequestCardProps {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  description: string;
  email: string;
  textAlign: 'right' | 'left';
  delay?: number;
}

function FrequentRequestCard({
  icon: Icon,
  title,
  description,
  email,
  textAlign,
  delay = 0,
}: FrequentRequestCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.2, delay, ease: "easeOut" }}
      whileHover={{ scale: 1.03, y: -3 }}
      className="rounded-xl backdrop-blur-xl p-6 text-center"
      style={{
        backgroundColor: "rgba(159, 95, 128, 0.1)",
        border: "1px solid rgba(159, 95, 128, 0.2)",
      }}
    >
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3"
        style={{
          backgroundColor: "rgba(159, 95, 128, 0.2)",
          border: "1px solid rgba(159, 95, 128, 0.3)",
        }}
      >
        <Icon className="w-6 h-6" style={{ color: "#9F5F80" }} />
      </div>
      <h4 className="mb-2" style={{ color: "#383e4e", textAlign }}>
        {title}
      </h4>
      <p className="text-sm mb-3" style={{ color: "#5a5e6a", textAlign }}>
        {description}
      </p>
      <a
        href={`mailto:${email}`}
        className="text-sm hover:opacity-80 transition-opacity inline-block"
        style={{ color: "#9F5F80" }}
      >
        {email}
      </a>
    </motion.div>
  );
}
