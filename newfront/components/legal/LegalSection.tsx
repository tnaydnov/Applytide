/**
 * LegalSection Component
 * 
 * Reusable component for rendering legal document sections.
 * Handles different content types: text, lists, and nested subsections.
 */

import { InstantSection } from "../layout/InstantSection";
import { useLanguage } from "../../contexts/LanguageContext";
import { FileText } from "lucide-react";
import DOMPurify from 'dompurify';

interface LegalSectionProps {
  title: string;
  content: string | string[] | { subtitle: string; items: string[] }[];
}

export function LegalSection({ title, content }: LegalSectionProps) {
  const { dir } = useLanguage();
  const textAlign = dir === 'rtl' ? 'right' : 'left';

  // Simple text content
  if (typeof content === "string") {
    return (
      <InstantSection title={title}>
        <p
          style={{ color: "#b6bac5", textAlign }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
        />
      </InstantSection>
    );
  }

  // Array content
  if (Array.isArray(content)) {
    // Check if it's an array of strings (simple list)
    if (content.every((item): item is string => typeof item === "string")) {
      return (
        <InstantSection icon={FileText} title={title}>
          <ul 
            className={`list-disc space-y-2 ${dir === 'rtl' ? 'pr-6' : 'pl-6'}`} 
            style={{ color: "#b6bac5", textAlign }}
            dir={dir}
          >
            {content.map((item, index) => (
              <li key={index} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item) }} />
            ))}
          </ul>
        </InstantSection>
      );
    }

    // Array of subsections with subtitles
    return (
      <InstantSection title={title}>
        <div className="space-y-6">
          {content.map((section, index) => {
            if (typeof section === "object" && "subtitle" in section) {
              return (
                <div key={index}>
                  <h3
                    className="text-lg mb-2 mt-6"
                    style={{ color: "#9F5F80", textAlign }}
                  >
                    {section.subtitle}
                  </h3>
                  <ul
                    className={`list-disc space-y-2 ${dir === 'rtl' ? 'pr-6' : 'pl-6'}`}
                    style={{ color: "#b6bac5", textAlign }}
                    dir={dir}
                  >
                    {section.items.map((item, itemIndex) => (
                      <li
                        key={itemIndex}
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item) }}
                      />
                    ))}
                  </ul>
                </div>
              );
            }
            return null;
          })}
        </div>
      </InstantSection>
    );
  }

  return null;
}
