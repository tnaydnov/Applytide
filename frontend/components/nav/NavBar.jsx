import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import NavLinks from "./NavLinks";
import { Icon } from "./icons";
import UserMenu, { UserMenuMobile } from "./UserMenu";

const publicLinks = [
  { label: "Pricing", href: "/pricing", icon: "pricing" },
];

export default function NavBar() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);

  const userBtnRef = useRef(null);
  const dropdownRef = useRef(null);
  const userMenuRef = useRef(null);

  const { user, isAuthenticated, logout: authLogout, loading } = useAuth();

  // click outside handlers
  useEffect(() => {
    const onDoc = (e) => {
      const target = e.target;
      if (activeDropdown && dropdownRef.current && target && !dropdownRef.current.contains(target)) {
        setActiveDropdown(null);
      }
      if (isUserMenuOpen && target) {
        // Don't close if clicking inside the dropdown or user button
        if (!target.closest('[data-user-dropdown]') && !target.closest('[data-user-menu]')) {
          setIsUserMenuOpen(false);
        }
      }
      if (isMenuOpen && target && !target.closest("[data-mobile-popover]") && !target.closest(".glass-nav")) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, [activeDropdown, isUserMenuOpen, isMenuOpen]);

  // close mobile popover on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [router.pathname]);

  function handleLinkClick(href, isPro) {
    if (isPro && !isPremium) {
      setShowPremiumModal(true);
      return;
    }
    setActiveDropdown(null);
    router.push(href);
  }

  function isActive(href) {
    return router.pathname === href;
  }

  function isParentActive(item) {
    if (router.pathname === item.href) return true;
    if (item.subItems) return item.subItems.some((s) => router.pathname === s.href);
    return false;
  }

  const authenticatedLinks = [
    { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
    {
      label: "Job Hunt",
      href: "/jobs",
      icon: "search",
      subItems: [
        { label: "Save Jobs", href: "/jobs", icon: "work" },
        { label: "My Pipeline", href: "/pipeline", icon: "timeline" },
      ],
    },
    {
      label: "Tools",
      href: "/documents",
      icon: "tools",
      subItems: [
        { label: "Documents", href: "/documents", icon: "description" },
        { label: "Analytics", href: "/analytics", icon: "analytics" },
        { label: "Reminders", href: "/reminders", icon: "notifications" },
      ],
    },
    // Add admin link for admin users only
    ...(user?.role === 'admin' ? [
      { label: "Admin", href: "/admin", icon: "admin_panel_settings" }
    ] : []),
  ];

  // Determine which links to show based on auth state
  // While loading, show empty array (minimal UI)
  // When loaded, show appropriate links
  const links = loading ? [] : (isAuthenticated && user ? authenticatedLinks : publicLinks);

  function handleLogout() {
    authLogout();
  }

  return (
    <nav className="relative glass-nav shadow-lg border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3 group">
              <img
                src="/images/logomark.svg"
                alt="Applytide"
                className="h-10 w-10 group-hover:scale-105 transition-transform duration-200"
              />
              <span
                className="hidden sm:block text-xl font-bold text-white group-hover:text-indigo-200 transition-colors duration-200"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Applytide
              </span>
            </Link>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-2">
            <NavLinks
              links={links}
              isActive={isActive}
              isParentActive={isParentActive}
              handleLinkClick={handleLinkClick}
              activeDropdown={activeDropdown}
              setActiveDropdown={setActiveDropdown}
              dropdownRef={dropdownRef}
            />

            <UserMenu
              user={user}
              loading={loading}
              isAuthenticated={!!isAuthenticated}
              isUserMenuOpen={isUserMenuOpen}
              setIsUserMenuOpen={setIsUserMenuOpen}
              onLogout={handleLogout}
              userBtnRef={userBtnRef}
              userMenuRef={userMenuRef}
            />
          </div>

          {/* Mobile actions */}
          <div className="md:hidden flex items-center space-x-2">
            {/* Use UserMenu component for mobile too - it handles all states */}
            <div className="flex items-center">
              <UserMenu
                user={user}
                loading={loading}
                isAuthenticated={!!isAuthenticated}
                isUserMenuOpen={isUserMenuOpen}
                setIsUserMenuOpen={setIsUserMenuOpen}
                onLogout={handleLogout}
                userBtnRef={userBtnRef}
                userMenuRef={userMenuRef}
              />
            </div>

            <button
              onClick={() => setIsMenuOpen((v) => !v)}
              className="tap-target inline-flex items-center justify-center p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              aria-expanded={isMenuOpen}
              aria-haspopup="menu"
              ref={userBtnRef}
            >
              <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      <UserMenuMobile
        user={user}
        loading={loading}
        isAuthenticated={!!isAuthenticated}
        isUserMenuOpen={isUserMenuOpen}
        setIsUserMenuOpen={setIsUserMenuOpen}
        onLogout={handleLogout}
      />

      {isMenuOpen && (
        <div
          className="md:hidden absolute right-4 top-16 w-64 bg-gray-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/20 z-[60]"
          role="menu"
          data-mobile-popover
        >
          <div className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Navigation</div>
          <div className="py-1">
            {links.map((item) => {
              const hasSub = item.subItems?.length;
              if (!hasSub) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5"
                  >
                    <Icon name={item.icon} /> <span>{item.label}</span>
                  </Link>
                );
              }
              return (
                <div key={item.label} className="px-2 py-2">
                  <div className="px-2 py-1 text-[11px] text-gray-400 uppercase">{item.label}</div>
                  <div className="grid grid-cols-2 gap-1">
                    {item.subItems.map((sub) =>
                      sub.isPro ? (
                        <button
                          key={sub.href}
                          onClick={() => {
                            handleLinkClick(sub.href, true);
                            setIsMenuOpen(false);
                          }}
                          className="text-left px-2 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5"
                        >
                          {sub.label}
                          <span className="ml-1 px-1 text-[10px] font-bold bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded">
                            PRO
                          </span>
                        </button>
                      ) : (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setIsMenuOpen(false)}
                          className="px-2 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5"
                        >
                          {sub.label}
                        </Link>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
