import { motion } from "motion/react";
import { PageContainer } from "../../components/layout/PageContainer";
import { PageHeader } from "../../components/layout/PageHeader";
import { useLanguage } from "../../contexts/LanguageContext";
import { companyTranslations } from "../../utils/translations";
import {
  Target,
  Clipboard,
  Chrome,
  Sparkles,
  FileText,
  Calendar,
  Check,
  Mail,
  HelpCircle,
  DollarSign,
} from "lucide-react";

export function AboutPage() {
  const { language, dir } = useLanguage();
  const { about } = companyTranslations;
  const textAlign: 'right' | 'left' = dir === 'rtl' ? 'right' : 'left';

  const features = [
    {
      icon: Clipboard,
      title: { 
        en: "Application Tracking", 
        he: "מעקב אחר מועמדויות" 
      },
      description: { 
        en: "Keep track of every job application, from initial submission to final decision, all in one organized dashboard.",
        he: "עקוב אחר כל מועמדות-from הגשה ועד החלטה-בלוח בקרה מסודר אחד."
      },
      color: "#60a5fa",
    },
    {
      icon: Chrome,
      title: { 
        en: "Chrome Extension", 
        he: "תוסף Chrome" 
      },
      description: { 
        en: "Extract job details instantly from any job board with our Chrome extension. One click saves all the important information to your dashboard.",
        he: "חלץ פרטי משרה מכל לוח דרושים בלחיצה אחת ושמור את המידע ישר ללוח הבקרה."
      },
      color: "#34d9c0",
    },
    {
      icon: Sparkles,
      title: { 
        en: "AI-Powered Insights", 
        he: "תובנות מבוססות בינה מלאכותית" 
      },
      description: { 
        en: "Get intelligent recommendations and insights to improve your job search strategy and increase your success rate.",
        he: "קבל המלצות חכמות לשיפור האסטרטגיה ולהגדלת אחוזי ההצלחה."
      },
      color: "#a78bfa",
    },
    {
      icon: FileText,
      title: { 
        en: "Document Management", 
        he: "ניהול מסמכים" 
      },
      description: { 
        en: "Organize and optimize your resumes, cover letters, and other job search documents with our smart document tools.",
        he: "ארגון ואופטימיזציה של קורות חיים, מכתבי מקדים ומסמכים נוספים באמצעות כלים חכמים."
      },
      color: "#34d399",
    },
    {
      icon: Calendar,
      title: { 
        en: "Google Calendar Integration", 
        he: "אינטגרציה עם Google Calendar" 
      },
      description: { 
        en: "Connect your Google Calendar to create reminders and never miss an interview or follow-up. All your job search events in one place.",
        he: "חבר את היומן כדי ליצור תזכורות ולא לפספס ראיונות או מעקבים-כל האירועים במקום אחד."
      },
      color: "#fb923c",
    },
  ];

  const benefits = [
    { 
      en: "Everything you need for your job search in one place",
      he: "כל מה שצריך לחיפוש עבודה במקום אחד",
      strong: { en: "Comprehensive:", he: "מקיף:" }
    },
    { 
      en: "One-click job extraction from any job board",
      he: "חילוץ משרות בלחיצה אחת מכל לוח דרושים",
      strong: { en: "Chrome Extension:", he: "תוסף Chrome:" }
    },
    { 
      en: "Your data stays secure with minimal tracking",
      he: "הנתונים שלך מאובטחים, עם מינימום מעקב",
      strong: { en: "Privacy-Focused:", he: "מיקוד בפרטיות:" }
    },
    { 
      en: "Built by a developer who understands job searching",
      he: "נבנה בידי מפתח שמכיר מקרוב את תהליך החיפוש",
      strong: { en: "Individual Developer:", he: "מפתח עצמאי:" }
    },
  ];

  const contacts = [
    { icon: Mail, title: { en: "General", he: "כללי" }, email: "contact@applytide.com", color: "#60a5fa" },
    { icon: HelpCircle, title: { en: "Support", he: "תמיכה" }, email: "support@applytide.com", color: "#34d399" },
    { icon: DollarSign, title: { en: "Billing", he: "חיוב" }, email: "billing@applytide.com", color: "#a78bfa" },
  ];

  return (
    <PageContainer size="lg">
      <PageHeader
        title={about.title[language]}
        subtitle={about.subtitle[language]}
      />

      <div className="space-y-8" dir={dir}>
        {/* Mission Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          whileHover={{ 
            y: -3,
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5), 0 5px 20px rgba(159, 95, 128, 0.2)"
          }}
          className="rounded-2xl backdrop-blur-xl p-6 md:p-10"
          style={{
            backgroundColor: "#383e4e",
            boxShadow: "0 15px 50px rgba(0, 0, 0, 0.4), 0 5px 15px rgba(159, 95, 128, 0.1)",
            border: "1px solid rgba(159, 95, 128, 0.3)",
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: "rgba(159, 95, 128, 0.2)",
                border: "1px solid rgba(159, 95, 128, 0.4)",
              }}
            >
              <Target className="w-6 h-6" style={{ color: "#9F5F80" }} />
            </div>
            <h2 className="text-2xl md:text-3xl m-0 flex-1" style={{ color: "#b6bac5", textAlign }}>
              {about.mission.title[language]}
            </h2>
          </div>
          <p style={{ color: "#b6bac5", opacity: 0.9, textAlign }} className="text-lg">
            {about.mission.content[language]}
          </p>
        </motion.div>

        {/* What We Do Section */}
        <div>
          <h2
            className="text-2xl md:text-3xl mb-6"
            style={{ color: "#383e4e", textShadow: "0 2px 8px rgba(159, 95, 128, 0.15)", textAlign }}
          >
            {language === 'en' ? 'What We Do' : 'מה אנחנו עושים'}
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title[language]}
                description={feature.description[language]}
                color={feature.color}
                textAlign={textAlign}
              />
            ))}
          </div>
        </div>

        {/* Why Choose Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          whileHover={{ 
            y: -3,
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5), 0 5px 20px rgba(159, 95, 128, 0.2)"
          }}
          className="rounded-2xl backdrop-blur-xl p-6 md:p-10"
          style={{
            backgroundColor: "#383e4e",
            boxShadow: "0 15px 50px rgba(0, 0, 0, 0.4), 0 5px 15px rgba(159, 95, 128, 0.1)",
            border: "1px solid rgba(159, 95, 128, 0.3)",
          }}
        >
          <h2 className="text-2xl md:text-3xl mb-6" style={{ color: "#b6bac5", textAlign }}>
            {language === 'en' ? 'Why Choose Applytide?' : 'למה לבחור ב-Applytide?'}
          </h2>
          <div className="space-y-4">
            {benefits.map((benefit, index) => (
              <BenefitItem
                key={index}
                text={
                  <>
                    <strong>{benefit.strong[language]}</strong> {benefit[language]}
                  </>
                }
                dir={dir}
                textAlign={textAlign}
              />
            ))}
          </div>
        </motion.div>

        {/* Contact Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          whileHover={{ 
            y: -3,
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5), 0 5px 20px rgba(159, 95, 128, 0.2)"
          }}
          className="rounded-2xl backdrop-blur-xl p-6 md:p-10"
          style={{
            backgroundColor: "#383e4e",
            boxShadow: "0 15px 50px rgba(0, 0, 0, 0.4), 0 5px 15px rgba(159, 95, 128, 0.1)",
            border: "1px solid rgba(159, 95, 128, 0.3)",
          }}
        >
          <h2 className="text-2xl md:text-3xl mb-4" style={{ color: "#b6bac5", textAlign }}>
            {language === 'en' ? 'Get in Touch' : 'צור קשר'}
          </h2>
          <p style={{ color: "#b6bac5", opacity: 0.8, textAlign }} className="mb-6">
            {language === 'en' 
              ? "Have questions, feedback, or need support? We'd love to hear from you."
              : "יש לך שאלות, משוב או צריך תמיכה? נשמח לשמוע ממך."
            }
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {contacts.map((contact, index) => (
              <ContactCard
                key={index}
                icon={contact.icon}
                title={contact.title[language]}
                email={contact.email}
                color={contact.color}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </PageContainer>
  );
}

// Feature Card Component
interface FeatureCardProps {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  description: string;
  color: string;
  textAlign: 'right' | 'left';
}

function FeatureCard({ icon: Icon, title, description, color, textAlign }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      whileHover={{ 
        scale: 1.03, 
        y: -5,
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5), 0 5px 20px rgba(159, 95, 128, 0.2)"
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
      <p className="text-sm m-0" style={{ color: "#b6bac5", opacity: 0.8, textAlign }}>
        {description}
      </p>
    </motion.div>
  );
}

// Benefit Item Component
interface BenefitItemProps {
  text: React.ReactNode;
  dir: string;
  textAlign: 'right' | 'left';
}

function BenefitItem({ text, dir, textAlign }: BenefitItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex items-start gap-3"
      dir={dir}
    >
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{
          backgroundColor: "rgba(34, 197, 94, 0.2)",
          border: "1px solid rgba(34, 197, 94, 0.4)",
        }}
      >
        <Check className="w-4 h-4" style={{ color: "#22c55e" }} />
      </div>
      <p className="m-0 flex-1" style={{ color: "#b6bac5", opacity: 0.9, textAlign }}>
        {text}
      </p>
    </motion.div>
  );
}

// Contact Card Component
interface ContactCardProps {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  email: string;
  color: string;
}

function ContactCard({ icon: Icon, title, email, color }: ContactCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -3 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="text-center rounded-xl p-6"
      style={{
        backgroundColor: "rgba(159, 95, 128, 0.1)",
        border: "1px solid rgba(159, 95, 128, 0.2)",
      }}
    >
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3"
        style={{
          backgroundColor: `${color}33`,
          border: `1px solid ${color}66`,
        }}
      >
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
      <h4 className="mb-2" style={{ color: "#b6bac5" }}>
        {title}
      </h4>
      <a
        href={`mailto:${email}`}
        className="text-sm hover:opacity-80 transition-opacity"
        style={{ color: "#9F5F80" }}
      >
        {email}
      </a>
    </motion.div>
  );
}
