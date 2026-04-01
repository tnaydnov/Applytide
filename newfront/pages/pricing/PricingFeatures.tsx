/**
 * Pricing Features Section
 * 
 * @module pages/pricing/PricingFeatures
 * @description Displays four major feature blocks highlighting Applytide's capabilities.
 * Each block includes an icon, title, badge, description, and benefit items.
 * 
 * @features
 * - Visual Pipeline (Available Now) - Kanban board, Chrome extension
 * - AI Writing Assistant (Available Now) - Cover letters, resume analysis
 * - AI Automation (Coming Soon) - Unlimited AI, auto-fill forms
 * - Smart Insights (Coming Soon) - Analytics, interview prep
 * 
 * @icons
 * - Uses lucide-react icons instead of emojis for consistency
 * - Columns3: Visual Pipeline (Kanban board)
 * - Bot: AI Writing Assistant
 * - Zap: AI Automation
 * - TrendingUp: Smart Insights
 * 
 * @responsive
 * - 1 column on mobile, 2 columns on md+ screens
 * - Cards expand to full width on small screens
 * - Proper spacing and padding adjustments
 */

import { motion } from "motion/react";
import { useLanguage } from "../../contexts/LanguageContext";
import { Sparkles, Columns3, Bot, Zap, TrendingUp } from "lucide-react";
import { featuresContent, pricingFeatures } from "../../constants/pricingContent";

/**
 * Icon mapping for each feature based on index
 * Using an array for reliable index-based access
 */
const featureIcons = [Columns3, Bot, Zap, TrendingUp] as const;

/**
 * Pricing Features Component
 * 
 * @returns {JSX.Element} Grid of feature blocks
 * 
 * @example
 * ```tsx
 * <PricingFeatures />
 * ```
 */
export function PricingFeatures() {
  const { language, dir } = useLanguage();
  const textAlign = dir === "rtl" ? "right" : "left";
  const content = featuresContent;

  // Edge case: if no features exist, render nothing
  if (!pricingFeatures || pricingFeatures.length === 0) {
    return null;
  }

  return (
    <div className="relative py-24" dir={dir}>
      <div className="max-w-7xl mx-auto px-4">
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
              background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))",
              border: "1px solid rgba(99, 102, 241, 0.4)",
              boxShadow: "0 8px 32px rgba(99, 102, 241, 0.2)",
              backdropFilter: "blur(10px)",
            }}
          >
            <Sparkles className="w-5 h-5" style={{ color: "#818cf8" }} />
            <span className="text-base" style={{ color: "#e0e7ff", fontWeight: 600 }}>
              {content.badge[language]}
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
          
          <p className="text-xl max-w-3xl mx-auto leading-relaxed" style={{ color: "#d1d5db", fontWeight: 500 }}>
            {content.subtitle[language]}
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {pricingFeatures.map((feature, index) => {
            // Get icon component safely with fallback
            const IconComponent = featureIcons[index] || Sparkles;
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ 
                  scale: 1.02, 
                  y: -8,
                }}
                className="rounded-3xl p-8 relative overflow-hidden group"
                style={{
                  backgroundColor: "rgba(30, 35, 48, 0.6)",
                  border: "1px solid rgba(159, 95, 128, 0.25)",
                  boxShadow: "0 25px 70px rgba(0, 0, 0, 0.4)",
                  backdropFilter: "blur(20px)",
                }}
              >
                {/* Top Gradient Bar */}
                <div 
                  className="absolute top-0 left-0 right-0 h-1 opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ 
                    background: `linear-gradient(90deg, transparent, ${feature.badgeColor}, transparent)`,
                  }}
                />

                {/* Gradient Background on Hover */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ 
                    background: `radial-gradient(circle at 50% 0%, ${feature.badgeColor}08, transparent 70%)`,
                  }}
                />

                {/* Content */}
                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6" dir={dir}>
                    <div className="flex items-center gap-4 flex-1">
                      <div 
                        className="w-16 h-16 rounded-2xl flex items-center justify-center"
                        style={{
                          background: `radial-gradient(circle, ${feature.badgeColor}20, ${feature.badgeColor}10)`,
                          border: `1px solid ${feature.badgeColor}30`,
                        }}
                      >
                        <IconComponent className="w-8 h-8" style={{ color: feature.badgeColor }} />
                      </div>
                      <h3 
                        className="text-2xl" 
                        style={{ 
                          color: "#ffffff", 
                          textAlign,
                          fontWeight: 700,
                        }}
                      >
                        {feature.title[language]}
                      </h3>
                    </div>
                    <span
                      className="px-4 py-2 rounded-full text-sm flex-shrink-0"
                      style={{
                        backgroundColor: `${feature.badgeColor}20`,
                        color: feature.badgeColor,
                        border: `1px solid ${feature.badgeColor}40`,
                        fontWeight: 700,
                      }}
                    >
                      {feature.badge[language]}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="mb-8 text-base leading-relaxed" style={{ color: "#d1d5db", textAlign }}>
                    {feature.description[language]}
                  </p>

                  {/* Items */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {feature.items?.map((item, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl p-5 transition-all duration-300 hover:scale-[1.03]"
                        style={{
                          backgroundColor: "rgba(159, 95, 128, 0.1)",
                          border: "1px solid rgba(159, 95, 128, 0.25)",
                          backdropFilter: "blur(10px)",
                        }}
                      >
                        <p className="mb-2" style={{ color: "#ffffff", textAlign, fontWeight: 600 }}>
                          {item.text[language]}
                        </p>
                        <p className="text-sm leading-relaxed" style={{ color: "#d1d5db", textAlign }}>
                          {item.benefit[language]}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
