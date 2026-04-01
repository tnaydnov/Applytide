/**
 * CTASection Component
 * 
 * Final call-to-action section encouraging users to sign up.
 * Features animated badges, social proof, and prominent CTA button.
 */

import { motion } from "motion/react";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import { ctaContent } from "../../constants/homePageContent";
import { ScrollWaveReveal } from "../../components/background/ScrollWaveReveal";

export function CTASection() {
  const navigate = useNavigate();
  const { language } = useLanguage();

  // Avatar emojis for social proof
  const avatars = [
    { emoji: "👨‍💻", x: -20 },
    { emoji: "👩‍💼", x: -10 },
    { emoji: "🧑‍🔬", x: 0 },
    { emoji: "👨‍🎨", x: 10 },
    { emoji: "👩‍💻", x: 20 },
  ];

  return (
    <motion.section
      id="cta"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: false, amount: 0.3 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen flex items-center justify-center py-24 px-4 sm:px-8 relative"
      style={{ scrollSnapAlign: "start" }}
    >
      {/* Scroll Wave Reveal Effect */}
      <ScrollWaveReveal sectionIndex={4} />

      <div className="max-w-4xl mx-auto text-center relative z-10" style={{ transformStyle: "preserve-3d" }}>
        {/* Beta Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full mb-8"
          style={{
            backgroundColor: "rgba(159, 95, 128, 0.1)",
            border: "1px solid rgba(159, 95, 128, 0.2)",
            backdropFilter: "blur(10px)",
          }}
        >
          <Sparkles className="w-5 h-5" style={{ color: "#9F5F80" }} />
          <span style={{ color: "#9F5F80", fontWeight: 600 }}>
            {ctaContent.badge[language]}
          </span>
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: 0.2, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6"
          style={{
            fontSize: "clamp(2.5rem, 6vw, 5rem)",
            fontWeight: 900,
            color: "#383e4e",
            lineHeight: 1.1,
          }}
        >
          {ctaContent.title[language]}
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: 0.3, duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10 max-w-2xl mx-auto"
          style={{
            fontSize: "clamp(1.125rem, 2.5vw, 1.5rem)",
            color: "#5a5e6a",
            lineHeight: 1.6,
          }}
        >
          {ctaContent.subtitle[language]}
        </motion.p>

        {/* CTA Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: 0.5, duration: 1, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{
            scale: 1.05,
            y: -5,
            boxShadow: "0 20px 40px rgba(159, 95, 128, 0.3)",
            transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
          }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/signup")}
          className="group px-10 py-5 rounded-2xl flex items-center gap-3 mx-auto mb-8 transition-all"
          style={{
            backgroundColor: "#9F5F80",
            color: "#ffffff",
            fontSize: "1.25rem",
            fontWeight: 700,
          }}
        >
          {ctaContent.cta[language]}
          <motion.div
            animate={{ x: [0, 5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ArrowRight className="w-6 h-6" />
          </motion.div>
        </motion.button>

        {/* Feature Bullets */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-6 mb-12"
        >
          {ctaContent.features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: 0.9 + index * 0.1 }}
              className="flex items-center gap-2"
            >
              <Check className="w-5 h-5" style={{ color: "#9F5F80" }} />
              <span
                style={{
                  color: "#5a5e6a",
                  fontSize: "1rem",
                }}
              >
                {feature[language]}
              </span>
            </motion.div>
          ))}
        </motion.div>

        {/* Social Proof */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="flex items-center justify-center -space-x-3">
            {avatars.map((avatar, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, x: avatar.x }}
                whileInView={{ scale: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: 1 + i * 0.1, type: "spring", stiffness: 200 }}
                whileHover={{ scale: 1.2, y: -5 }}
                className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                style={{
                  backgroundColor: "rgba(159, 95, 128, 0.1)",
                  border: "2px solid rgba(159, 95, 128, 0.2)",
                  backdropFilter: "blur(10px)",
                }}
              >
                {avatar.emoji}
              </motion.div>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: 1.5 }}
            style={{ color: "#5a5e6a", fontSize: "0.95rem" }}
          >
            <span style={{ fontWeight: 600 }}>
              {ctaContent.stats.count} {ctaContent.stats.label[language].split(" ")[0]}
            </span>{" "}
            {ctaContent.stats.label[language].split(" ").slice(1).join(" ")}
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );
}
