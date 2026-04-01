import { motion } from "motion/react";
import { useLanguage } from "../../contexts/LanguageContext";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  const { dir } = useLanguage();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="mb-8 md:mb-12"
      dir={dir}
    >
      <div className="text-center">
        <motion.h1
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mb-3 md:mb-4"
          style={{
            color: "#383e4e",
            letterSpacing: "-0.01em",
            textShadow: "0 2px 8px rgba(159, 95, 128, 0.15), 0 0 20px rgba(255, 255, 255, 0.3)",
          }}
        >
          {title}
        </motion.h1>
        
        {subtitle && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-base md:text-lg"
            style={{
              color: "#383e4e",
              opacity: 0.75,
              textShadow: "0 1px 4px rgba(255, 255, 255, 0.25)",
            }}
          >
            {subtitle}
          </motion.p>
        )}
      </div>

      {/* Decorative wave line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
        className="mt-6 md:mt-8 h-1 rounded-full mx-auto"
        style={{
          maxWidth: "200px",
          background: "linear-gradient(90deg, transparent, #9F5F80, transparent)",
        }}
      />
    </motion.div>
  );
}
