/**
 * Header Component
 * 
 * Main application header with logo, hamburger menu, and user menu.
 * Fixed positioning at the top of the page with animated menu toggle.
 * 
 * Features:
 * - Logo bubble (clickable, navigates to home)
 * - Hamburger menu button (toggles sidebar)
 * - User menu button (opens user dropdown)
 * - Smooth animations on mount and interaction
 * - LTR forced to keep hamburger on the left
 * 
 * @example
 * ```tsx
 * const [isMenuOpen, setIsMenuOpen] = useState(false);
 * 
 * <Header 
 *   isMenuOpen={isMenuOpen} 
 *   onMenuToggle={() => setIsMenuOpen(!isMenuOpen)} 
 * />
 * ```
 */

import { motion, AnimatePresence } from "motion/react";
import { Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
const logo = "/images/logomark.png";

/**
 * Props for the Header component
 */
interface HeaderProps {
  /** Whether the sidebar menu is currently open */
  isMenuOpen: boolean;
  /** Callback function to toggle the sidebar menu */
  onMenuToggle: () => void;
}

export function Header({ isMenuOpen, onMenuToggle }: HeaderProps) {
  const navigate = useNavigate();

  return (
    <>
      {/* Top Left Group: Logo + Hamburger */}
      {/* Force LTR to keep order: Hamburger (leftmost) then Logo (right of it) */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="fixed top-4 left-4 md:top-8 md:left-8 z-50 flex items-center gap-2 md:gap-3"
        dir="ltr"
      >
        {/* Hamburger Menu */}
        <motion.button
          whileHover={{ scale: 1.05, rotate: 90 }}
          whileTap={{ scale: 0.95 }}
          data-tour="hamburger-menu"
          onClick={onMenuToggle}
          className="header-menu-button w-12 h-12 md:w-14 md:h-14 rounded-full backdrop-blur-xl flex items-center justify-center"
          style={{
            backgroundColor: "rgba(90, 94, 106, 0.5)",
            boxShadow: "0 10px 30px rgba(56, 62, 78, 0.3)",
            border: isMenuOpen
              ? "2px solid rgba(159, 95, 128, 0.4)"
              : "1px solid rgba(159, 95, 128, 0.1)",
          }}
        >
          <AnimatePresence mode="wait">
            {isMenuOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
              >
                <X className="w-5 h-5 md:w-6 md:h-6" style={{ color: "#b6bac5" }} />
              </motion.div>
            ) : (
              <motion.div
                key="menu"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
              >
                <Menu className="w-5 h-5 md:w-6 md:h-6" style={{ color: "#b6bac5" }} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Logo */}
        <motion.button
          onClick={() => navigate("/")}
          whileHover={{ scale: 1.05, rotate: 2 }}
          whileTap={{ scale: 0.98 }}
          className="header-logo-button rounded-xl md:rounded-2xl p-2 md:p-4 backdrop-blur-xl flex items-center gap-2 md:gap-3 cursor-pointer"
          style={{
            backgroundColor: "rgba(90, 94, 106, 0.6)",
            boxShadow: "0 10px 30px rgba(56, 62, 78, 0.2)",
            border: "1px solid rgba(159, 95, 128, 0.2)",
          }}
          data-tour="logo-brand"
        >
          <img src={logo} alt="Applytide" className="w-8 md:w-10" />
          <span className="text-base md:text-xl font-semibold hidden sm:block" style={{ color: "#ffffff" }}>
            Applytide
          </span>
        </motion.button>
      </motion.div>
    </>
  );
}