/**
 * Pricing Comparison Table
 * 
 * @module pages/pricing/PricingComparison
 * @description Detailed feature comparison table showing all three pricing plans.
 * Displays features organized by categories with visual indicators.
 * 
 * @features
 * - 4-column grid: Feature name + 3 plans
 * - Category headers with distinct styling
 * - Boolean values shown as checkmarks/X icons
 * - String values (e.g., "10/mo", "Standard") displayed as text
 * - Infinity symbol (∞) with special styling
 * - Hover effects on rows
 * - Responsive layout
 * 
 * @categories
 * - Core Features: Basic app functionality
 * - AI Features: AI-powered tools
 * - Premium Automation: Advanced AI automation
 * - Support: Customer support levels
 * 
 * @responsive
 * - Horizontal scroll on small screens
 * - Full table on larger screens
 * - Maintains readability at all sizes
 */

import { motion } from "motion/react";
import { useLanguage } from "../../contexts/LanguageContext";
import { Check, X } from "lucide-react";
import { comparisonContent, comparisonCategories } from "../../constants/pricingContent";

/**
 * Renders a table cell value based on its type
 * 
 * @param value - The value to render (boolean, string, or infinity symbol)
 * @param language - Current language for translations
 * @returns Rendered cell content
 */
function renderCell(value: string | boolean, language: "en" | "he") {
  // Boolean values: checkmark or X icon
  if (typeof value === "boolean") {
    return value ? (
      <div 
        className="w-8 h-8 rounded-full flex items-center justify-center mx-auto"
        style={{
          backgroundColor: "rgba(34, 197, 94, 0.2)",
          border: "1px solid rgba(34, 197, 94, 0.4)",
        }}
        aria-label="Included"
      >
        <Check className="w-5 h-5" style={{ color: "#22c55e", strokeWidth: 3 }} />
      </div>
    ) : (
      <div 
        className="w-8 h-8 rounded-full flex items-center justify-center mx-auto"
        style={{
          backgroundColor: "rgba(100, 100, 100, 0.1)",
          border: "1px solid rgba(100, 100, 100, 0.2)",
        }}
        aria-label="Not included"
      >
        <X className="w-4 h-4" style={{ color: "#6b7280", strokeWidth: 2 }} />
      </div>
    );
  }
  
  // Handle "Standard" and "Priority" translations
  let displayValue = value;
  if (value === "Standard") {
    displayValue = language === "en" ? "Standard" : "רגיל";
  } else if (value === "Priority") {
    displayValue = language === "en" ? "Priority" : "עדיפות";
  } else if (language === "he" && value.includes("/mo")) {
    // Translate "/mo" to "/חודש" in Hebrew
    displayValue = value.replace("/mo", "/חודש");
  }
  
  // Special styling for infinity symbol
  if (value === "∞") {
    return (
      <span 
        className="text-3xl" 
        style={{ 
          color: "#ffffff", 
          fontWeight: 700,
          textShadow: "0 0 10px rgba(255, 255, 255, 0.3)",
        }}
        aria-label="Unlimited"
      >
        {displayValue}
      </span>
    );
  }
  
  // Regular text values
  return (
    <span className="text-base" style={{ color: "#ffffff", fontWeight: 600 }}>
      {displayValue}
    </span>
  );
}

/**
 * Pricing Comparison Component
 * 
 * @returns {JSX.Element} Feature comparison table
 * 
 * @example
 * ```tsx
 * <PricingComparison />
 * ```
 */
export function PricingComparison() {
  const { language, dir } = useLanguage();
  const textAlign = dir === "rtl" ? "right" : "left";
  const content = comparisonContent;

  // Edge case: if no comparison data exists, render nothing
  if (!comparisonCategories || comparisonCategories.length === 0) {
    return null;
  }

  return (
    <div className="relative py-24" dir={dir}>
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 
            className="mb-6 text-4xl sm:text-5xl md:text-6xl" 
            style={{ 
              fontWeight: 900,
              background: "linear-gradient(135deg, #ffffff 0%, #e0e7ff 50%, #c7d2fe 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              letterSpacing: "-0.02em",
              lineHeight: "1.2",
            }}
          >
            {content.title[language]}
          </h2>
          <p className="text-xl leading-relaxed" style={{ color: "#d1d5db", fontWeight: 500 }}>
            {content.subtitle[language]}
          </p>
        </motion.div>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-3xl overflow-hidden"
          style={{
            backgroundColor: "rgba(20, 23, 33, 0.85)",
            border: "1px solid rgba(159, 95, 128, 0.3)",
            boxShadow: "0 25px 70px rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Table Header */}
          <div
            className="grid grid-cols-4 gap-4 p-6"
            style={{
              background: "linear-gradient(135deg, rgba(159, 95, 128, 0.35), rgba(99, 102, 241, 0.3))",
              borderBottom: "1px solid rgba(159, 95, 128, 0.4)",
            }}
          >
            <div style={{ textAlign }}>
              <h3 className="text-lg" style={{ color: "#ffffff", fontWeight: 700 }}>
                {content.headers.feature[language]}
              </h3>
            </div>
            <div className="text-center">
              <h3 className="text-lg" style={{ color: "#ffffff", fontWeight: 700 }}>
                {content.headers.starter[language]}
              </h3>
            </div>
            <div className="text-center">
              <h3 className="text-lg" style={{ color: "#ffffff", fontWeight: 700 }}>
                {content.headers.pro[language]}
              </h3>
            </div>
            <div className="text-center">
              <h3 className="text-lg" style={{ color: "#ffffff", fontWeight: 700 }}>
                {content.headers.premium[language]}
              </h3>
            </div>
          </div>

          {/* Categories */}
          {comparisonCategories.map((category, catIndex) => (
            <div key={catIndex}>
              {/* Category Header */}
              <div
                className="px-6 py-4"
                style={{
                  backgroundColor: "rgba(159, 95, 128, 0.22)",
                  borderBottom: "1px solid rgba(159, 95, 128, 0.3)",
                }}
              >
                <h4 
                  className="text-lg" 
                  style={{ 
                    color: "#e9d5ff", 
                    textAlign,
                    fontWeight: 700,
                  }}
                >
                  {category.category[language]}
                </h4>
              </div>

              {/* Features */}
              {category.items?.map((item, itemIndex) => (
                <div
                  key={itemIndex}
                  className="grid grid-cols-4 gap-4 p-6 transition-all duration-300 hover:bg-white/5"
                  style={{
                    borderBottom: itemIndex < category.items.length - 1 
                      ? "1px solid rgba(159, 95, 128, 0.1)" 
                      : catIndex < comparisonCategories.length - 1 
                        ? "1px solid rgba(159, 95, 128, 0.1)"
                        : "none",
                  }}
                >
                  <div style={{ textAlign }}>
                    <p style={{ color: "#e5e5e7", fontWeight: 500 }}>
                      {item.name[language]}
                    </p>
                  </div>
                  <div className="text-center flex items-center justify-center">
                    {renderCell(item.starter, language)}
                  </div>
                  <div className="text-center flex items-center justify-center">
                    {renderCell(item.pro, language)}
                  </div>
                  <div className="text-center flex items-center justify-center">
                    {renderCell(item.premium, language)}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
