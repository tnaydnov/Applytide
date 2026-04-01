import { motion, AnimatePresence } from "motion/react";
import { User as UserIcon, LogIn } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { userMenuItems } from "../../constants/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { logger } from "../../lib/logger";

interface UserMenuProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function UserMenu({ isOpen, onToggle }: UserMenuProps) {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const handleSignOut = async () => {
    try {
      await logout();
      navigate("/signin");
      onToggle(); // Close the menu
    } catch (error) {
      logger.error("Error signing out:", error);
    }
  };

  // If user is not authenticated, show sign in button
  if (!isAuthenticated) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 }}
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/signin")}
          className="px-4 md:px-6 py-2 md:py-3 rounded-full backdrop-blur-xl flex items-center gap-2 md:gap-3"
          style={{
            backgroundColor: "rgba(159, 95, 128, 0.9)",
            boxShadow: "0 10px 30px rgba(159, 95, 128, 0.4)",
            border: "1px solid rgba(159, 95, 128, 0.3)",
          }}
        >
          <LogIn className="w-4 h-4 md:w-5 md:h-5" style={{ color: "#ffffff" }} />
          <span className="text-sm md:text-base hidden sm:block" style={{ color: "#ffffff" }}>
            {t("Sign In", "כניסה")}
          </span>
        </motion.button>
      </motion.div>
    );
  }

  // If user is authenticated, show user menu
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4 }}
      data-tour="user-menu"
    >
      <div className="relative">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggle}
          className="header-user-menu w-12 h-12 md:w-14 md:h-14 rounded-full backdrop-blur-xl flex items-center justify-center"
          style={{
            backgroundColor: "rgba(90, 94, 106, 0.4)",
            boxShadow: "0 10px 30px rgba(56, 62, 78, 0.2)",
            border: isOpen
              ? "2px solid rgba(159, 95, 128, 0.4)"
              : "1px solid rgba(159, 95, 128, 0.1)",
          }}
        >
          <UserIcon className="w-4 h-4 md:w-5 md:h-5" style={{ color: "#b6bac5" }} />
        </motion.button>

        {/* User Dropdown */}
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onToggle}
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
                  minWidth: "200px",
                }}
              >
                {userMenuItems.map((item, i) => {
                  const isSignOut = item.label.en === "Sign Out";
                  
                  return (
                    <motion.div
                      key={item.label.en}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      {isSignOut ? (
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2 md:gap-3 px-4 md:px-5 py-3 md:py-4 transition-all text-left"
                          style={{
                            color: "#fca5a5",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "rgba(220, 38, 38, 0.2)";
                            e.currentTarget.style.transform = "translateX(5px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                            e.currentTarget.style.transform = "translateX(0)";
                          }}
                        >
                          <item.icon className="w-4 h-4" />
                          <span className="text-sm">{t(item.label.en, item.label.he)}</span>
                        </button>
                      ) : (
                        <Link
                          to={item.href}
                          className="flex items-center gap-2 md:gap-3 px-4 md:px-5 py-3 md:py-4 transition-all"
                          style={{
                            color: item.variant === "danger" ? "#fca5a5" : "#b6bac5",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor =
                              item.variant === "danger"
                                ? "rgba(220, 38, 38, 0.2)"
                                : "rgba(159, 95, 128, 0.2)";
                            e.currentTarget.style.transform = "translateX(5px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                            e.currentTarget.style.transform = "translateX(0)";
                          }}
                        >
                          <item.icon className="w-4 h-4" />
                          <span className="text-sm">{t(item.label.en, item.label.he)}</span>
                        </Link>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}