import { motion, AnimatePresence } from "motion/react";
import { Languages, Check } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: "en" as const, label: "English", nativeLabel: "English" },
    { code: "he" as const, label: "Hebrew", nativeLabel: "עברית" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className="relative"
      data-tour="language-selector"
    >
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="header-language-selector w-12 h-12 md:w-14 md:h-14 rounded-full backdrop-blur-xl flex items-center justify-center"
        style={{
          backgroundColor: "rgba(90, 94, 106, 0.5)",
          boxShadow: "0 10px 30px rgba(56, 62, 78, 0.3)",
          border: isOpen
            ? "2px solid rgba(159, 95, 128, 0.4)"
            : "1px solid rgba(159, 95, 128, 0.1)",
        }}
        title="Change Language"
      >
        <Languages className="w-5 h-5 md:w-6 md:h-6" style={{ color: "#b6bac5" }} />
      </motion.button>

      {/* Language Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[60]"
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 10, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-full right-0 mt-2 rounded-xl md:rounded-2xl backdrop-blur-xl overflow-hidden z-[60]"
              style={{
                backgroundColor: "rgba(90, 94, 106, 0.95)",
                boxShadow: "0 20px 40px rgba(56, 62, 78, 0.3)",
                border: "1px solid rgba(159, 95, 128, 0.2)",
                minWidth: "180px",
              }}
            >
              {languages.map((lang, i) => (
                <motion.button
                  key={lang.code}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => {
                    setLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-between gap-3 px-4 md:px-5 py-3 md:py-4 transition-all"
                  style={{
                    color: language === lang.code ? "#9F5F80" : "#b6bac5",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(159, 95, 128, 0.2)";
                    e.currentTarget.style.transform = "translateX(-5px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                >
                  <span className="text-sm">{lang.nativeLabel}</span>
                  {language === lang.code && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    >
                      <Check className="w-4 h-4" />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}