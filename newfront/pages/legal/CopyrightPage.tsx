/**
 * CopyrightPage Component
 * 
 * Copyright & Trademark information page with Hebrew/English support.
 */

import { useState } from "react";
import { PageContainer } from "../../components/layout/PageContainer";
import { PageHeader } from "../../components/layout/PageHeader";
import { LegalSection } from "../../components/legal/LegalSection";
import { useLanguage } from "../../contexts/LanguageContext";
import { legalTranslations } from "../../utils/translations";

export function CopyrightPage() {
  const { language, dir } = useLanguage();
  const { copyright } = legalTranslations;
  const textAlign = dir === 'rtl' ? 'right' : 'left';
  
  const [currentYear] = useState(new Date().getFullYear());

  const sections = [
    copyright.sections.ownership,
    copyright.sections.trademarks,
    copyright.sections.userContent,
    copyright.sections.dmca,
    copyright.sections.attribution,
  ];

  return (
    <PageContainer size="lg">
      <PageHeader
        title={copyright.title[language]}
        subtitle={copyright.subtitle[language]}
      />

      <div className="space-y-6" dir={dir}>
        {sections.map((section, index) => (
          <LegalSection
            key={index}
            title={section.title[language]}
            content={section.content[language]}
          />
        ))}

        {/* Copyright Notice */}
        <div
          className="rounded-xl backdrop-blur-xl p-6 text-center"
          style={{
            backgroundColor: "rgba(159, 95, 128, 0.1)",
            border: "1px solid rgba(159, 95, 128, 0.2)",
          }}
        >
          <p style={{ color: "#383e4e", textAlign }}>
            © {currentYear} Applytide. {language === 'en' ? 'All rights reserved.' : 'כל הזכויות שמורות.'}
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
