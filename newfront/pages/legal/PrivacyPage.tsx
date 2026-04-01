/**
 * PrivacyPage Component
 * 
 * Privacy Policy page with Hebrew/English support.
 */

import { useState } from "react";
import { PageContainer } from "../../components/layout/PageContainer";
import { PageHeader } from "../../components/layout/PageHeader";
import { LegalSection } from "../../components/legal/LegalSection";
import { useLanguage } from "../../contexts/LanguageContext";
import { legalTranslations } from "../../utils/translations";

export function PrivacyPage() {
  const { language, dir } = useLanguage();
  const { privacy } = legalTranslations;
  
  const [currentDate] = useState(
    new Date().toLocaleDateString(language === 'en' ? "en-US" : "he-IL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  );

  const sections = [
    privacy.sections.intro,
    privacy.sections.collection,
    privacy.sections.usage,
    privacy.sections.sharing,
    privacy.sections.security,
    privacy.sections.rights,
    privacy.sections.cookies,
    privacy.sections.children,
    privacy.sections.changes,
    privacy.sections.contact,
  ];

  return (
    <PageContainer size="lg">
      <PageHeader
        title={privacy.title[language]}
        subtitle={`${legalTranslations.common.lastUpdated[language]}: ${currentDate}`}
      />

      <div className="space-y-6" dir={dir}>
        {sections.map((section, index) => (
          <LegalSection
            key={index}
            title={section.title[language]}
            content={section.content[language]}
          />
        ))}
      </div>
    </PageContainer>
  );
}
