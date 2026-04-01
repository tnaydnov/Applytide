/**
 * Pricing FAQ Section
 * 
 * @module pages/pricing/PricingFAQ
 * @description FAQ accordion section with common pricing questions and answers.
 * Includes a contact CTA card at the bottom for additional support.
 * 
 * @features
 * - Expandable/collapsible accordion items
 * - Smooth height animations
 * - Rotating chevron icon
 * - First question open by default
 * - Contact CTA card with icon animation
 * - Hover effects on accordion items
 * 
 * @responsive
 * - Single column layout on all screens
 * - Proper text wrapping and spacing
 * - Button sizes adjust for mobile
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../../contexts/LanguageContext";
import { ChevronDown, HelpCircle, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { faqContent, faqs } from "../../constants/pricingContent";

/**
 * Pricing FAQ Component
 * 
 * @returns {JSX.Element} FAQ accordion with contact CTA
 * 
 * @example
 * ```tsx
 * <PricingFAQ />
 * ```
 */
export function PricingFAQ() {
  const { language, dir } = useLanguage();
  const navigate = useNavigate();
  const textAlign = dir === "rtl" ? "right" : "left";
  
  // State: currently open accordion item (0 = first item open by default)
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  
  const content = faqContent;

  // Edge case: if no FAQs exist, render nothing
  if (!faqs || faqs.length === 0) {
    return null;
  }

  /**
   * Toggles accordion item open/closed
   * @param index - Index of the item to toggle
   */
  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="relative py-24 pb-32" dir={dir}>
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <div
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full mb-6"
            style={{
              background: "linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(99, 102, 241, 0.2))",
              border: "1px solid rgba(139, 92, 246, 0.4)",
              boxShadow: "0 8px 32px rgba(139, 92, 246, 0.2)",
              backdropFilter: "blur(10px)",
            }}
          >
            <HelpCircle className="w-5 h-5" style={{ color: "#c4b5fd" }} />
            <span className="text-base" style={{ color: "#e0e7ff", fontWeight: 600 }}>
              FAQ
            </span>
          </div>
          
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

        {/* FAQ Items */}
        <div className="space-y-4 mb-16">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl overflow-hidden"
                style={{
                  backgroundColor: isOpen 
                    ? "rgba(30, 35, 48, 0.8)" 
                    : "rgba(30, 35, 48, 0.6)",
                  border: isOpen 
                    ? "1px solid rgba(159, 95, 128, 0.4)" 
                    : "1px solid rgba(159, 95, 128, 0.2)",
                  boxShadow: isOpen 
                    ? "0 20px 60px rgba(0, 0, 0, 0.4), 0 0 40px rgba(159, 95, 128, 0.1)" 
                    : "0 10px 30px rgba(0, 0, 0, 0.3)",
                  backdropFilter: "blur(20px)",
                  transition: "all 0.3s ease",
                }}
              >
                {/* Question Button */}
                <button
                  onClick={() => toggleAccordion(index)}
                  className="w-full p-6 flex items-center justify-between gap-4 transition-all duration-300"
                  style={{ textAlign }}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                >
                  <span 
                    className="text-lg flex-1" 
                    style={{ 
                      color: isOpen ? "#ffffff" : "#e5e5e7",
                      textAlign,
                      fontWeight: 700,
                    }}
                  >
                    {faq.question[language]}
                  </span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: isOpen 
                        ? "rgba(159, 95, 128, 0.2)" 
                        : "rgba(159, 95, 128, 0.1)",
                      border: "1px solid rgba(159, 95, 128, 0.3)",
                    }}
                    aria-hidden="true"
                  >
                    <ChevronDown className="w-5 h-5" style={{ color: "#c084fc" }} />
                  </motion.div>
                </button>

                {/* Answer */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      id={`faq-answer-${index}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div
                        className="px-6 pb-6"
                        style={{
                          borderTop: "1px solid rgba(159, 95, 128, 0.2)",
                          paddingTop: "1.5rem",
                        }}
                      >
                        <p style={{ color: "#d1d5db", textAlign, lineHeight: "1.8", fontSize: "1rem" }}>
                          {faq.answer[language]}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center rounded-3xl p-12 relative overflow-hidden group"
          style={{
            background: "rgba(30, 35, 48, 0.6)",
            border: "1px solid rgba(159, 95, 128, 0.3)",
            boxShadow: "0 25px 70px rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Top Gradient Bar */}
          <div 
            className="absolute top-0 left-0 right-0 h-1"
            style={{ 
              background: "linear-gradient(90deg, transparent, #9F5F80, transparent)",
            }}
          />

          {/* Background Gradient */}
          <div 
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: "radial-gradient(circle at 50% 0%, rgba(159, 95, 128, 0.1), transparent 70%)",
            }}
          />

          <div className="relative z-10">
            {/* Animated Icon */}
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.3 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6"
              style={{
                background: "linear-gradient(135deg, rgba(159, 95, 128, 0.2), rgba(139, 92, 246, 0.2))",
                border: "1px solid rgba(159, 95, 128, 0.4)",
              }}
            >
              <Mail 
                className="w-10 h-10" 
                style={{ 
                  color: "#c084fc",
                }} 
              />
            </motion.div>
            
            <h3 
              className="text-3xl mb-4" 
              style={{ 
                color: "#ffffff",
                fontWeight: 700,
              }}
            >
              {content.stillQuestions[language]}
            </h3>
            
            <p className="text-lg mb-8 max-w-xl mx-auto leading-relaxed" style={{ color: "#d1d5db" }}>
              {content.contactUs[language]}
            </p>
            
            <button
              onClick={() => navigate("/contact")}
              className="px-10 py-4 rounded-xl transition-all duration-300 hover:scale-105 relative overflow-hidden group/btn"
              style={{
                background: "linear-gradient(135deg, #9F5F80, #8b5cf6)",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "1.0625rem",
                boxShadow: "0 12px 40px rgba(159, 95, 128, 0.4)",
                border: "1px solid rgba(159, 95, 128, 0.5)",
              }}
              aria-label={content.contactButton[language]}
            >
              <span className="relative z-10">{content.contactButton[language]}</span>
              <div className="absolute inset-0 bg-white opacity-0 group-hover/btn:opacity-10 transition-opacity duration-300" />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
