/**
 * CookiePolicyPage Component
 * 
 * Cookie Policy page with Hebrew/English support.
 */

import { useState } from "react";
import { motion } from "motion/react";
import { PageContainer } from "../../components/layout/PageContainer";
import { PageHeader } from "../../components/layout/PageHeader";
import { LegalSection } from "../../components/legal/LegalSection";
import { useLanguage } from "../../contexts/LanguageContext";
import { legalTranslations } from "../../utils/translations";
import { Cookie, Shield, BarChart3, Megaphone } from "lucide-react";

export function CookiePolicyPage() {
  const { language, dir } = useLanguage();
  const { cookies } = legalTranslations;
  const textAlign: 'right' | 'left' = dir === 'rtl' ? 'right' : 'left';
  
  const [currentDate] = useState(
    new Date().toLocaleDateString(language === 'en' ? "en-US" : "he-IL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  );

  const cookieTypes = [
    {
      icon: Shield,
      title: cookies.sections.types.essential.title[language],
      description: cookies.sections.types.essential.description[language],
      color: "#34d399",
    },
    {
      icon: Cookie,
      title: cookies.sections.types.functional.title[language],
      description: cookies.sections.types.functional.description[language],
      color: "#60a5fa",
    },
    {
      icon: BarChart3,
      title: cookies.sections.types.analytics.title[language],
      description: cookies.sections.types.analytics.description[language],
      color: "#a78bfa",
    },
    {
      icon: Megaphone,
      title: cookies.sections.types.marketing.title[language],
      description: cookies.sections.types.marketing.description[language],
      color: "#fb923c",
    },
  ];

  return (
    <PageContainer size="lg">
      <PageHeader
        title={cookies.title[language]}
        subtitle={`${legalTranslations.common.lastUpdated[language]}: ${currentDate}`}
      />

      <div className="space-y-6" dir={dir}>
        {/* What Are Cookies */}
        <LegalSection
          title={cookies.sections.what.title[language]}
          content={cookies.sections.what.content[language]}
        />

        {/* Types of Cookies Section */}
        <div>
          <h2
            className="text-2xl md:text-3xl mb-6"
            style={{ color: "#383e4e", textShadow: "0 2px 8px rgba(159, 95, 128, 0.15)", textAlign }}
          >
            {cookies.sections.types.title[language]}
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {cookieTypes.map((type, index) => (
              <CookieTypeCard
                key={index}
                icon={type.icon}
                title={type.title}
                description={type.description}
                color={type.color}
                textAlign={textAlign}
                delay={0.1 * index}
              />
            ))}
          </div>
        </div>

        {/* Managing Cookies */}
        <LegalSection
          title={cookies.sections.control.title[language]}
          content={cookies.sections.control.content[language]}
        />

        {/* Third-Party Cookies */}
        <LegalSection
          title={cookies.sections.thirdParty.title[language]}
          content={cookies.sections.thirdParty.content[language]}
        />

        {/* Updates */}
        <LegalSection
          title={cookies.sections.updates.title[language]}
          content={cookies.sections.updates.content[language]}
        />
      </div>
    </PageContainer>
  );
}

// Cookie Type Card Component
interface CookieTypeCardProps {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  description: string;
  color: string;
  textAlign: 'right' | 'left';
  delay?: number;
}

function CookieTypeCard({
  icon: Icon,
  title,
  description,
  color,
  textAlign,
  delay = 0,
}: CookieTypeCardProps) {
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
      <p className="text-sm" style={{ color: "#b6bac5", opacity: 0.8, textAlign }}>
        {description}
      </p>
    </motion.div>
  );
}
