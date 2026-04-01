/**
 * Pricing Hero Section
 * 
 * @module pages/pricing/PricingHero
 * @description Hero section for the pricing page with title, subtitle, and billing toggle.
 * Features smooth animations and interactive billing period switching.
 * 
 * @features
 * - Animated badge with icon
 * - Large gradient title
 * - Subtitle with high contrast
 * - Interactive billing toggle (monthly/yearly)
 * - Animated "Save 20%" badge on yearly option
 * - Smooth spring animations for active state
 * 
 * @responsive
 * - Text sizes scale from mobile (text-5xl) to desktop (text-8xl)
 * - Toggle buttons stack properly on small screens
 * - Proper spacing on all screen sizes
 */

import { motion } from "motion/react";
import { useLanguage } from "../../contexts/LanguageContext";
import { DollarSign } from "lucide-react";
import { heroContent } from "../../constants/pricingContent";

/**
 * Props for PricingHero component
 */
interface PricingHeroProps {
  /** Current billing period selection */
  billingPeriod: "monthly" | "yearly";
  /** Callback when billing period is changed */
  onToggle: (period: "monthly" | "yearly") => void;
}

/**
 * Pricing Hero Component
 * 
 * @param {PricingHeroProps} props - Component props
 * @returns {JSX.Element} Hero section with title and billing toggle
 * 
 * @example
 * ```tsx
 * <PricingHero 
 *   billingPeriod={billingPeriod} 
 *   onToggle={setBillingPeriod} 
 * />
 * ```
 */
export function PricingHero({ billingPeriod, onToggle }: PricingHeroProps) {
  const { language, dir } = useLanguage();
  const content = heroContent;

  return (
    <div className="relative pb-16 pt-8" dir={dir}>
      <div className="max-w-5xl mx-auto text-center px-4">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full mb-8"
          style={{
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))",
            border: "1px solid rgba(99, 102, 241, 0.4)",
            boxShadow: "0 8px 32px rgba(99, 102, 241, 0.2)",
            backdropFilter: "blur(10px)",
          }}
        >
          <DollarSign className="w-5 h-5" style={{ color: "#818cf8" }} />
          <span className="text-base" style={{ color: "#e0e7ff", fontWeight: 600 }}>
            {content.badge[language]}
          </span>
        </motion.div>

        {/* Title with Gradient */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6 text-5xl sm:text-6xl md:text-7xl lg:text-8xl"
          style={{ 
            fontWeight: 900,
            background: "linear-gradient(135deg, #ffffff 0%, #e0e7ff 50%, #c7d2fe 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            letterSpacing: "-0.02em",
            lineHeight: "1.1",
          }}
        >
          {content.title[language]}
        </motion.h1>

        {/* Subtitle with Better Contrast */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-xl sm:text-2xl mb-12 max-w-3xl mx-auto leading-relaxed"
          style={{ color: "#d1d5db", fontWeight: 500 }}
        >
          {content.subtitle[language]}
        </motion.p>

        {/* Billing Toggle - Redesigned */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="inline-flex items-center gap-2 p-2 rounded-full"
          style={{
            background: "rgba(30, 35, 48, 0.8)",
            border: "1px solid rgba(159, 95, 128, 0.3)",
            boxShadow: "0 12px 40px rgba(0, 0, 0, 0.3)",
            backdropFilter: "blur(20px)",
          }}
        >
          <button
            onClick={() => onToggle("monthly")}
            className="px-8 py-3 rounded-full transition-all duration-300 relative overflow-hidden"
            style={{
              background: billingPeriod === "monthly" 
                ? "linear-gradient(135deg, #9F5F80, #8b5cf6)" 
                : "transparent",
              color: "#ffffff",
              fontWeight: 700,
              boxShadow: billingPeriod === "monthly" 
                ? "0 4px 20px rgba(159, 95, 128, 0.5)" 
                : "none",
            }}
            aria-pressed={billingPeriod === "monthly"}
            aria-label={content.billingToggle.monthly[language]}
          >
            <span className="relative z-10">{content.billingToggle.monthly[language]}</span>
            {billingPeriod === "monthly" && (
              <motion.div
                layoutId="active-pill"
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(135deg, #9F5F80, #8b5cf6)",
                }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
          
          <button
            onClick={() => onToggle("yearly")}
            className="px-8 py-3 rounded-full transition-all duration-300 flex items-center gap-3 relative overflow-hidden"
            style={{
              background: billingPeriod === "yearly" 
                ? "linear-gradient(135deg, #9F5F80, #8b5cf6)" 
                : "transparent",
              color: "#ffffff",
              fontWeight: 700,
              boxShadow: billingPeriod === "yearly" 
                ? "0 4px 20px rgba(159, 95, 128, 0.5)" 
                : "none",
            }}
            aria-pressed={billingPeriod === "yearly"}
            aria-label={`${content.billingToggle.yearly[language]} - ${content.billingToggle.save[language]}`}
          >
            <span className="relative z-10">{content.billingToggle.yearly[language]}</span>
            <span
              className="px-3 py-1 rounded-full text-xs relative z-10"
              style={{
                backgroundColor: "rgba(34, 197, 94, 0.2)",
                color: "#22c55e",
                border: "1px solid rgba(34, 197, 94, 0.4)",
                fontWeight: 700,
              }}
            >
              {content.billingToggle.save[language]}
            </span>
            {billingPeriod === "yearly" && (
              <motion.div
                layoutId="active-pill"
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(135deg, #9F5F80, #8b5cf6)",
                }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
