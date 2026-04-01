/**
 * Pricing Cards Section
 * 
 * @module pages/pricing/PricingCards
 * @description Displays three pricing plan cards with features, pricing, and CTAs.
 * Each card has unique styling, animations, and illustrations.
 * 
 * @features
 * - Three tiers: Starter (free), Pro, Premium
 * - Animated illustrations for each plan
 * - Gradient borders with glow effects
 * - Hover animations (scale + lift)
 * - Different CTAs based on plan availability
 * - "Everything in X" separator line
 * - Feature lists with custom checkmarks
 * - Responsive grid layout
 * 
 * @responsive
 * - Single column on mobile
 * - Three columns on lg+ screens
 * - Proper spacing and padding adjustments
 * - Cards maintain aspect ratio and styling
 */

import { motion } from "motion/react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { pricingPlans } from "../../constants/pricingContent";
import { 
  StarterIllustration, 
  ProIllustration, 
  PremiumIllustration 
} from "../../components/pricing/PricingIllustrations";

/**
 * Props for PricingCards component
 */
interface PricingCardsProps {
  /** Current billing period (monthly/yearly) */
  billingPeriod: "monthly" | "yearly";
}

/**
 * Illustration component mapping for each plan
 */
const illustrations = {
  starter: StarterIllustration,
  pro: ProIllustration,
  premium: PremiumIllustration,
} as const;

/**
 * Improved marketing copy for each plan
 */
const improvedCopy = {
  starter: {
    en: "Perfect for getting started with job search organization",
    he: "מושלם להתחיל לארגן את חיפוש העבודה"
  },
  pro: {
    en: "For serious job seekers who want unlimited AI power",
    he: "למחפשי עבודה רציניים שרוצים כוח AI בלתי מוגבל"
  },
  premium: {
    en: "AI does the heavy lifting—you land the interviews",
    he: "ה-AI עושה את העבודה הקשה—אתם מקבלים את הראיונות"
  }
} as const;

/**
 * Pricing Cards Component
 * 
 * @param {PricingCardsProps} props - Component props
 * @returns {JSX.Element} Grid of pricing plan cards
 * 
 * @example
 * ```tsx
 * <PricingCards billingPeriod="monthly" />
 * ```
 */
export function PricingCards({ billingPeriod: _billingPeriod }: PricingCardsProps) {
  const { language, dir } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const textAlign = dir === "rtl" ? "right" : "left";

  /**
   * Handles CTA button clicks based on action type
   * @param action - The action to perform (current/waitlist)
   */
  const handleCTA = (action: string) => {
    if (action === "current") {
      if (user) {
        navigate("/dashboard");
      } else {
        navigate("/signup");
      }
    } else if (action === "waitlist") {
      navigate("/contact");
    }
  };

  // Edge case: if no plans exist, render nothing
  if (!pricingPlans || pricingPlans.length === 0) {
    return null;
  }

  return (
    <div className="relative py-16" dir={dir}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {pricingPlans.map((plan, index) => {
            // Get the illustration component for this plan
            const IllustrationComponent = illustrations[plan.id as keyof typeof illustrations];
            const description = improvedCopy[plan.id as keyof typeof improvedCopy];
            const isFree = plan.id === "starter";
            
            // Separate the "Everything in X, plus:" from the rest
            const firstFeature = plan.features[0];
            const isFirstFeatureIncludes = 
              firstFeature?.en?.includes("Everything in") || 
              firstFeature?.he?.includes("כל מה שיש");
            
            const includesLine = isFirstFeatureIncludes ? firstFeature : null;
            const actualFeatures = isFirstFeatureIncludes ? plan.features.slice(1) : plan.features;
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ 
                  scale: 1.02, 
                  y: -8,
                }}
                className="relative rounded-3xl overflow-hidden group"
                style={{
                  background: "#2a2d3a",
                  border: `2px solid transparent`,
                  backgroundImage: `
                    linear-gradient(#2a2d3a, #2a2d3a),
                    ${plan.gradient}
                  `,
                  backgroundOrigin: "border-box",
                  backgroundClip: "padding-box, border-box",
                  boxShadow: `
                    0 20px 60px rgba(0, 0, 0, 0.5),
                    0 0 0 1px ${plan.glowColor}20,
                    0 0 40px ${plan.glowColor}30
                  `,
                }}
              >
                <div className="relative z-10 p-8">
                  {/* Header with Illustration */}
                  <div className="flex items-start justify-between mb-8" dir={dir}>
                    <div className="flex-1">
                      <h3 
                        className="text-2xl"
                        style={{ 
                          color: "#ffffff",
                          fontWeight: 700,
                          textAlign,
                        }}
                      >
                        {plan.name[language]}
                      </h3>
                    </div>
                    
                    {/* Small Illustration */}
                    {IllustrationComponent && (
                      <div className="flex-shrink-0">
                        <IllustrationComponent />
                      </div>
                    )}
                  </div>

                  {/* Price or Coming Soon */}
                  <div className="mb-4" dir={dir} style={{ textAlign }}>
                    {isFree ? (
                      <div className="mb-2">
                        <span 
                          className="text-6xl"
                          style={{ 
                            fontWeight: 800,
                            background: plan.gradient,
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                          }}
                        >
                          {language === "en" ? "Free" : "חינם"}
                        </span>
                      </div>
                    ) : (
                      <p 
                        className="text-2xl mb-2"
                        style={{ 
                          color: "#9ca3af",
                          fontWeight: 600,
                          fontStyle: "italic",
                          textAlign,
                        }}
                      >
                        {language === "en" ? "Pricing not announced yet" : "המחיר טרם הוכרז"}
                      </p>
                    )}
                  </div>

                  {/* One-line Description */}
                  <p className="mb-8 text-base leading-relaxed" style={{ color: "#d1d5db", textAlign, fontWeight: 500 }}>
                    {description[language]}
                  </p>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleCTA(plan.ctaAction)}
                    disabled={plan.ctaAction === "waitlist"}
                    className="w-full py-4 rounded-xl mb-8 transition-all duration-300 relative overflow-hidden group/btn flex items-center justify-center"
                    style={{
                      background: plan.ctaAction === "waitlist" ? "#4b5563" : plan.gradient,
                      color: "#ffffff",
                      fontWeight: 700,
                      fontSize: "1rem",
                      boxShadow: plan.ctaAction === "waitlist" ? "0 8px 20px rgba(0, 0, 0, 0.3)" : `0 12px 32px ${plan.glowColor}50`,
                      border: "none",
                      cursor: plan.ctaAction === "waitlist" ? "not-allowed" : "pointer",
                      opacity: plan.ctaAction === "waitlist" ? 0.7 : 1,
                    }}
                    aria-label={plan.cta[language]}
                  >
                    <span className="relative z-10">
                      {plan.ctaAction === "current" 
                        ? (language === "en" ? "Get Started Free" : "התחל חינם")
                        : (language === "en" ? "Coming Soon" : "בקרוב")
                      }
                    </span>
                    {plan.ctaAction !== "waitlist" && (
                      <div 
                        className="absolute inset-0 bg-white opacity-0 group-hover/btn:opacity-10 transition-opacity duration-300"
                      />
                    )}
                  </button>

                  {/* "Everything in X, plus:" line - separate from bullets */}
                  {includesLine && (
                    <div 
                      className="mb-4 pb-4"
                      style={{
                        borderBottom: `1px solid ${plan.glowColor}30`,
                      }}
                    >
                      <p 
                        className="text-sm"
                        style={{ 
                          color: plan.glowColor, 
                          textAlign,
                          fontWeight: 700,
                        }}
                      >
                        {includesLine[language]}
                      </p>
                    </div>
                  )}

                  {/* Features List */}
                  <div className="space-y-3">
                    {actualFeatures.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3" dir={dir}>
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{
                            backgroundColor: `${plan.glowColor}20`,
                            border: `1px solid ${plan.glowColor}40`,
                          }}
                        >
                          <Check className="w-3 h-3" style={{ color: plan.glowColor, strokeWidth: 3 }} />
                        </div>
                        <span className="text-sm flex-1 leading-relaxed" style={{ color: "#e5e7eb", textAlign }}>
                          {feature[language]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Glow Effect on Hover */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at 50% 0%, ${plan.glowColor}15, transparent 60%)`,
                  }}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
