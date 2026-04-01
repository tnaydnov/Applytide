/**
 * NavigationDots Component
 * 
 * Floating navigation dots for HomePage sections.
 * Allows quick jumping between different sections of the landing page.
 */

import { motion } from "motion/react";
import { useLanguage } from "../../contexts/LanguageContext";

interface NavigationDotsProps {
  sections: Array<{
    label: string;
    id: string;
  }>;
  activeSection: number;
  onSectionClick: (index: number) => void;
}

export function NavigationDots({ sections, activeSection, onSectionClick }: NavigationDotsProps) {
  const { dir } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, x: dir === "rtl" ? 50 : -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.8 }}
      className="fixed top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col gap-4"
      style={{
        [dir === "rtl" ? "right" : "left"]: "2rem"
      }}
    >
      {sections.map((section, index) => (
        <motion.button
          key={index}
          onClick={() => onSectionClick(index)}
          className="group relative"
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
        >
          {/* Dot */}
          <motion.div
            className="w-3 h-3 rounded-full transition-all duration-300"
            style={{
              backgroundColor: activeSection === index ? "#9F5F80" : "#5a5e6a",
              boxShadow: activeSection === index
                ? "0 0 20px rgba(159, 95, 128, 0.6)"
                : "none",
            }}
            animate={{
              scale: activeSection === index ? 1.2 : 1,
            }}
          />

          {/* Label on hover */}
          <motion.div
            initial={{ opacity: 0, x: dir === "rtl" ? 10 : -10 }}
            whileHover={{ opacity: 1, x: 0 }}
            className="absolute top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg whitespace-nowrap pointer-events-none"
            style={{
              backgroundColor: "#383e4e",
              color: "#b6bac5",
              [dir === "rtl" ? "right" : "left"]: "1.5rem",
              fontSize: "0.875rem",
            }}
          >
            {section.label}
          </motion.div>
        </motion.button>
      ))}
    </motion.div>
  );
}
