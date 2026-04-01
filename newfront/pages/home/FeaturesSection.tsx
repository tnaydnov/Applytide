/**
 * FeaturesSection Component
 * 
 * Displays the main features of Applytide in a grid layout.
 * Features animated cards with icons and descriptions.
 */

import { motion } from "motion/react";
import { useLanguage } from "../../contexts/LanguageContext";
import { featuresContent, features } from "../../constants/homePageContent";
import { ScrollWaveReveal } from "../../components/background/ScrollWaveReveal";

export function FeaturesSection() {
  const { language, dir } = useLanguage();

  return (
    <motion.section
      id="features"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: false, amount: 0.3 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen flex items-center justify-center py-24 px-4 sm:px-8 relative"
      style={{ scrollSnapAlign: "start" }}
    >
      {/* Scroll Wave Reveal Effect */}
      <ScrollWaveReveal sectionIndex={1} />
      <div className="max-w-7xl mx-auto w-full relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ 
            duration: 1.2, 
            ease: [0.16, 1, 0.3, 1],
            delay: 0.1
          }}
          className="text-center mb-16"
          style={{
            transformStyle: "preserve-3d",
          }}
        >
          <h2
            className="mb-4"
            style={{
              fontSize: "clamp(2rem, 5vw, 4rem)",
              fontWeight: 800,
              color: "#383e4e",
            }}
          >
            {featuresContent.title[language]}
          </h2>
          <p
            style={{
              fontSize: "clamp(1rem, 2vw, 1.25rem)",
              color: "#5a5e6a",
            }}
          >
            {featuresContent.subtitle[language]}
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ 
                delay: 0.2 + index * 0.08, 
                duration: 1, 
                ease: [0.16, 1, 0.3, 1]
              }}
              whileHover={{
                scale: 1.03,
                y: -8,
                transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
              }}
              className={`relative group p-8 rounded-3xl ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid rgba(90, 94, 106, 0.1)",
              }}
              dir={dir}
            >
              {/* Gradient Glow on Hover */}
              <motion.div
                className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"
                style={{
                  background: "linear-gradient(135deg, rgba(159, 95, 128, 0.1), rgba(90, 94, 106, 0.05))",
                  filter: "blur(20px)",
                }}
              />

              {/* Icon */}
              <motion.div
                className="mb-6 inline-flex p-4 rounded-2xl"
                style={{
                  backgroundColor: "rgba(159, 95, 128, 0.1)",
                }}
                whileHover={{ rotate: [0, -10, 10, 0], transition: { duration: 0.5 } }}
              >
                <feature.icon
                  className="w-8 h-8"
                  style={{ color: "#9F5F80" }}
                />
              </motion.div>

              {/* Title */}
              <h3
                className="mb-3"
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "#383e4e",
                }}
              >
                {feature.title[language]}
              </h3>

              {/* Description */}
              <p
                style={{
                  fontSize: "1rem",
                  color: "#5a5e6a",
                  lineHeight: 1.6,
                }}
              >
                {feature.description[language]}
              </p>

              {/* Decorative Corner */}
              <motion.div
                className="absolute top-4 right-4 w-2 h-2 rounded-full"
                style={{ backgroundColor: "#9F5F80" }}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: index * 0.2,
                }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
