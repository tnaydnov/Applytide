import { motion } from "motion/react";
import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { useLanguage } from "../../contexts/LanguageContext";

interface InstantSectionProps {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  delay?: number; // Keep for compatibility but won't use it
}

/**
 * Fast-loading section component with no delays
 * Replaces the slow Section components to prevent "loading" feel when scrolling
 */
export function InstantSection({
  title,
  icon: Icon,
  children,
}: InstantSectionProps) {
  const { dir } = useLanguage();
  const textAlign = dir === 'rtl' ? 'right' : 'left';
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-50px" }} // Trigger earlier!
      transition={{
        duration: 0.2, // Super fast!
        ease: "easeOut",
        delay: 0, // NO DELAY!
      }}
      whileHover={{ 
        scale: 1.005, 
        y: -4,
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(159, 95, 128, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
      }}
      className="rounded-2xl backdrop-blur-xl p-6 md:p-8"
      style={{
        backgroundColor: "rgba(56, 62, 78, 0.95)",
        boxShadow: "0 15px 50px rgba(0, 0, 0, 0.4), 0 5px 20px rgba(159, 95, 128, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        border: "1px solid rgba(159, 95, 128, 0.35)",
        backdropFilter: "blur(20px) saturate(180%)",
      }}
      dir={dir}
    >
      <div className="flex items-center gap-3 mb-4">
        {Icon && (
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: "rgba(159, 95, 128, 0.2)",
              border: "1px solid rgba(159, 95, 128, 0.4)",
            }}
          >
            <Icon className="w-5 h-5" style={{ color: "#9F5F80" }} />
          </div>
        )}
        <h2 className="text-xl md:text-2xl m-0 flex-1" style={{ color: "#b6bac5", textAlign }}>
          {title}
        </h2>
      </div>
      <div style={{ textAlign }}>{children}</div>
    </motion.div>
  );
}
