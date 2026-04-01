import { motion, AnimatePresence } from "motion/react";
import { ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
const logo = "/images/logomark.png";
import { publicNavigationItems, authenticatedNavigationItems } from "../../constants/navigation";
import { footerSections } from "../../constants/footerLinks";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { CreditCard, HelpCircle } from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  expandedMenu: string | null;
  onMenuExpand: (label: string | null) => void;
  expandedFooterSection: string | null;
  onFooterExpand: (id: string | null) => void;
}

export function Sidebar({
  isOpen,
  onClose,
  expandedMenu,
  onMenuExpand,
  expandedFooterSection,
  onFooterExpand,
}: SidebarProps) {
  const navigate = useNavigate();
  const { language, dir } = useLanguage();
  const { isAuthenticated } = useAuth();
  
  // Use different navigation items based on authentication state
  const navigationItems = isAuthenticated ? authenticatedNavigationItems : publicNavigationItems;

  const handleLogoClick = () => {
    navigate("/");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60]"
            style={{ backgroundColor: "rgba(56, 62, 78, 0.6)" }}
          />

          <motion.div
            key="sidebar"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
            className="fixed left-0 top-0 bottom-0 z-[60] w-[85vw] sm:w-80 max-w-sm backdrop-blur-xl overflow-y-auto flex flex-col"
            style={{
              backgroundColor: "#5a5e6a",
              boxShadow: "20px 0 60px rgba(56, 62, 78, 0.5)",
              borderRight: "1px solid rgba(159, 95, 128, 0.2)",
            }}
          >
            {/* Top Section - Scrollable */}
            <div className="flex-1 p-5 sm:p-8 pb-6">
              {/* Logo */}
              <motion.button
                onClick={handleLogoClick}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3 mb-12 cursor-pointer"
              >
                <img src={logo} alt="Applytide" className="w-10 sm:w-12" />
                <span className="text-xl sm:text-2xl font-semibold" style={{ color: "#ffffff" }}>
                  Applytide
                </span>
              </motion.button>

              {/* Section Label */}
              <div className="mb-4 px-4">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9F5F80" }}>
                  {isAuthenticated ? (language === "he" ? "ניווט ראשי" : "Main Navigation") : (language === "he" ? "תפריט" : "Menu")}
                </p>
              </div>

              {/* Main Navigation */}
              <nav className="space-y-2" dir={dir}>
                {navigationItems.map((item, i) => (
                  <div key={item.label.en}>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                    >
                      {item.submenu ? (
                        <button
                          onClick={() =>
                            onMenuExpand(
                              expandedMenu === item.label.en ? null : item.label.en
                            )
                          }
                          className="w-full flex items-center justify-between rounded-xl p-4 transition-all"
                          style={{
                            backgroundColor:
                              expandedMenu === item.label.en
                                ? "rgba(159, 95, 128, 0.1)"
                                : "transparent",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor =
                              "rgba(159, 95, 128, 0.1)";
                            e.currentTarget.style.transform =
                              dir === "rtl" ? "translateX(-10px)" : "translateX(10px)";
                          }}
                          onMouseLeave={(e) => {
                            if (expandedMenu !== item.label.en) {
                              e.currentTarget.style.backgroundColor =
                                "transparent";
                            }
                            e.currentTarget.style.transform = "translateX(0)";
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <item.icon
                              className="w-5 h-5"
                              style={{ color: "#9F5F80" }}
                            />
                            <span className="text-lg font-medium" style={{ color: "#ffffff" }}>
                              {item.label[language]}
                            </span>
                          </div>
                          <motion.div
                            animate={{
                              rotate: expandedMenu === item.label.en ? 90 : 0,
                            }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronRight
                              className="w-4 h-4"
                              style={{ color: "#ffffff", opacity: 0.6 }}
                            />
                          </motion.div>
                        </button>
                      ) : (
                        <Link
                          to={item.href || '#'}
                          onClick={onClose}
                          className="block rounded-xl p-4 transition-all"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor =
                              "rgba(159, 95, 128, 0.1)";
                            e.currentTarget.style.transform =
                              dir === "rtl" ? "translateX(-10px)" : "translateX(10px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              "transparent";
                            e.currentTarget.style.transform = "translateX(0)";
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <item.icon
                              className="w-5 h-5"
                              style={{ color: "#9F5F80" }}
                            />
                            <span className="text-lg font-medium" style={{ color: "#ffffff" }}>
                              {item.label[language]}
                            </span>
                          </div>
                        </Link>
                      )}
                    </motion.div>

                    <AnimatePresence>
                      {item.submenu && expandedMenu === item.label.en && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="ml-8 mt-1 space-y-1 overflow-hidden"
                        >
                          {item.submenu.map((subItem, j) => (
                            <motion.div
                              key={subItem.label.en}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: j * 0.05 }}
                            >
                              <Link
                                to={subItem.href}
                                onClick={onClose}
                                className="block rounded-lg px-4 py-3 text-sm transition-all"
                                style={{ color: "#b6bac5", opacity: 0.8 }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor =
                                    "rgba(159, 95, 128, 0.08)";
                                  e.currentTarget.style.opacity = "1";
                                  e.currentTarget.style.transform =
                                    dir === "rtl" ? "translateX(-5px)" : "translateX(5px)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor =
                                    "transparent";
                                  e.currentTarget.style.opacity = "0.8";
                                  e.currentTarget.style.transform =
                                    "translateX(0)";
                                }}
                              >
                                {subItem.label[language]}
                              </Link>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </nav>

              {/* Quick Links Section (only for authenticated users) */}
              {isAuthenticated && (
                <>
                  {/* Divider */}
                  <div
                    className="h-px my-6"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, rgba(159, 95, 128, 0.3), transparent)",
                    }}
                  />

                  {/* Section Label */}
                  <div className="mb-4 px-4">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#9F5F80", opacity: 0.8 }}>
                      {language === "he" ? "עזרה וחשבון" : "Help & Account"}
                    </p>
                  </div>

                  {/* Quick Links */}
                  <div className="space-y-2">
                    <Link
                      to="/pricing"
                      onClick={onClose}
                      className="flex items-center gap-3 rounded-xl p-4 transition-all"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(159, 95, 128, 0.1)";
                        e.currentTarget.style.transform = dir === "rtl" ? "translateX(-10px)" : "translateX(10px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.transform = "translateX(0)";
                      }}
                    >
                      <CreditCard className="w-5 h-5" style={{ color: "#9F5F80" }} />
                      <span className="text-lg font-medium" style={{ color: "#ffffff" }}>
                        {language === "he" ? "מחירים" : "Pricing"}
                      </span>
                    </Link>

                    <Link
                      to="/how-it-works"
                      onClick={onClose}
                      className="flex items-center gap-3 rounded-xl p-4 transition-all"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(159, 95, 128, 0.1)";
                        e.currentTarget.style.transform = dir === "rtl" ? "translateX(-10px)" : "translateX(10px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.transform = "translateX(0)";
                      }}
                    >
                      <HelpCircle className="w-5 h-5" style={{ color: "#9F5F80" }} />
                      <span className="text-lg font-medium" style={{ color: "#ffffff" }}>
                        {language === "he" ? "איך זה עובד" : "How It Works"}
                      </span>
                    </Link>
                  </div>
                </>
              )}
            </div>

            {/* Bottom Section - Always Visible */}
            <div className="p-5 sm:p-8 pt-0" style={{ marginTop: "auto" }}>
              {/* Divider */}
              <div
                className="h-px mb-6"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(159, 95, 128, 0.3), transparent)",
                }}
              />

              {/* Footer Sections */}
              <div className="space-y-2">
                {footerSections.map((section, i) => (
                  <div key={section.id}>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.1 }}
                    >
                      <button
                        onClick={() =>
                          onFooterExpand(
                            expandedFooterSection === section.id
                              ? null
                              : section.id
                          )
                        }
                        className="w-full flex items-center justify-between rounded-xl p-4 transition-all"
                        style={{
                          backgroundColor:
                            expandedFooterSection === section.id
                              ? "rgba(159, 95, 128, 0.1)"
                              : "transparent",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor =
                            "rgba(159, 95, 128, 0.1)";
                          e.currentTarget.style.transform = "translateX(10px)";
                        }}
                        onMouseLeave={(e) => {
                          if (expandedFooterSection !== section.id) {
                            e.currentTarget.style.backgroundColor =
                              "transparent";
                          }
                          e.currentTarget.style.transform = "translateX(0)";
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <section.icon
                            className="w-5 h-5"
                            style={{ color: "#9F5F80" }}
                          />
                          <span className="text-lg font-medium" style={{ color: "#ffffff" }}>
                            {section.title[language]}
                          </span>
                        </div>
                        <motion.div
                          animate={{
                            rotate:
                              expandedFooterSection === section.id ? 90 : 0,
                          }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronRight
                            className="w-4 h-4"
                            style={{ color: "#ffffff", opacity: 0.6 }}
                          />
                        </motion.div>
                      </button>
                    </motion.div>

                    <AnimatePresence>
                      {expandedFooterSection === section.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="ml-8 mt-1 space-y-1 overflow-hidden"
                        >
                          {section.links.map((link, j) => {
                            // Check if it's an external link (mailto: or http)
                            const isExternal = link.href.startsWith('mailto:') || link.href.startsWith('http');
                            
                            return (
                              <motion.div
                                key={link.label.en}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: j * 0.05 }}
                              >
                                {isExternal ? (
                                  <a
                                    href={link.href}
                                    className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm transition-all"
                                    style={{ color: "#ffffff", opacity: 0.9 }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor =
                                        "rgba(159, 95, 128, 0.08)";
                                      e.currentTarget.style.opacity = "1";
                                      e.currentTarget.style.transform =
                                        "translateX(5px)";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor =
                                        "transparent";
                                      e.currentTarget.style.opacity = "0.9";
                                      e.currentTarget.style.transform =
                                        "translateX(0)";
                                    }}
                                  >
                                    <link.icon
                                      className="w-4 h-4"
                                      style={{ color: "#9F5F80" }}
                                    />
                                    {link.label[language]}
                                  </a>
                                ) : (
                                  <Link
                                    to={link.href}
                                    onClick={onClose}
                                    className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm transition-all"
                                    style={{ color: "#ffffff", opacity: 0.9 }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor =
                                        "rgba(159, 95, 128, 0.08)";
                                      e.currentTarget.style.opacity = "1";
                                      e.currentTarget.style.transform =
                                        "translateX(5px)";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor =
                                        "transparent";
                                      e.currentTarget.style.opacity = "0.9";
                                      e.currentTarget.style.transform =
                                        "translateX(0)";
                                    }}
                                  >
                                    <link.icon
                                      className="w-4 h-4"
                                      style={{ color: "#9F5F80" }}
                                    />
                                    {link.label[language]}
                                  </Link>
                                )}
                              </motion.div>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>

              {/* Copyright */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="mt-8 pt-6 border-t"
                style={{ borderColor: "rgba(159, 95, 128, 0.1)" }}
              >
                <p
                  className="text-xs text-center"
                  style={{ color: "#b6bac5", opacity: 0.5 }}
                >
                  © 2025 Applytide
                </p>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}