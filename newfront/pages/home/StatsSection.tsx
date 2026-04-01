/**
 * StatsSection Component
 * 
 * Displays key statistics and metrics about Applytide.
 * Features animated counters and icons.
 */

import { motion } from "motion/react";
import { useLanguage } from "../../contexts/LanguageContext";
import { stats } from "../../constants/homePageContent";
import { ScrollWaveReveal } from "../../components/background/ScrollWaveReveal";

export function StatsSection() {
  const { language, dir } = useLanguage();

  return (
    <motion.section
      id="stats"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: false, amount: 0.3 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen flex items-center justify-center py-24 px-4 sm:px-8 relative"
      style={{ scrollSnapAlign: "start" }}
    >
      {/* Scroll Wave Reveal Effect */}
      <ScrollWaveReveal sectionIndex={2} />
      <div className="max-w-7xl mx-auto w-full relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ 
            duration: 1.2, 
            ease: [0.16, 1, 0.3, 1],
            delay: 0.1
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
          style={{
            transformStyle: "preserve-3d",
          }}
        >
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: index * 0.1, type: "spring", stiffness: 200 }}
              whileHover={{ scale: 1.1, y: -10 }}
              className={`p-8 rounded-3xl relative group ${dir === 'rtl' ? 'text-center' : 'text-center'}`}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.6)",
                border: "1px solid rgba(90, 94, 106, 0.1)",
                backdropFilter: "blur(10px)",
              }}
              dir={dir}
            >
              {/* Glow Effect */}
              <motion.div
                className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"
                style={{
                  background: "radial-gradient(circle at center, rgba(159, 95, 128, 0.2), transparent 70%)",
                  filter: "blur(30px)",
                }}
              />

              {/* Icon */}
              <motion.div
                className="inline-flex p-4 rounded-2xl mb-4"
                style={{
                  backgroundColor: "rgba(159, 95, 128, 0.2)",
                }}
                whileHover={{ rotate: 360, transition: { duration: 0.6 } }}
              >
                <stat.icon
                  className="w-8 h-8"
                  style={{ color: "#9F5F80" }}
                />
              </motion.div>

              {/* Value */}
              <motion.div
                className="mb-2"
                style={{
                  fontSize: "clamp(2rem, 4vw, 3.5rem)",
                  fontWeight: 900,
                  color: "#383e4e",
                }}
              >
                {stat.value}
              </motion.div>

              {/* Label */}
              <div
                style={{
                  fontSize: "1.125rem",
                  color: "#5a5e6a",
                  opacity: 0.8,
                }}
              >
                {stat.label[language]}
              </div>

              {/* Decorative Pulse */}
              <motion.div
                className="absolute bottom-4 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full"
                style={{ backgroundColor: "#9F5F80" }}
                animate={{
                  scaleX: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: index * 0.3,
                }}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}
