/**
 * TermsPage Component
 * 
 * Terms of Service page with Hebrew/English support.
 */

import { useState } from "react";
import { PageContainer } from "../../components/layout/PageContainer";
import { PageHeader } from "../../components/layout/PageHeader";
import { LegalSection } from "../../components/legal/LegalSection";
import { useLanguage } from "../../contexts/LanguageContext";
import { legalTranslations } from "../../utils/translations";

export function TermsPage() {
  const { language, dir } = useLanguage();
  const { terms } = legalTranslations;
  
  const [currentDate] = useState(
    new Date().toLocaleDateString(language === 'en' ? "en-US" : "he-IL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  );

  const sections = [
    terms.sections.acceptance,
    terms.sections.services,
    terms.sections.userAccount,
    terms.sections.userConduct,
    terms.sections.intellectualProperty,
    terms.sections.dataPrivacy,
    terms.sections.termination,
    terms.sections.disclaimers,
    terms.sections.liability,
    terms.sections.changes,
    terms.sections.contact,
  ];

  return (
    <PageContainer size="lg">
      <PageHeader
        title={terms.title[language]}
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
