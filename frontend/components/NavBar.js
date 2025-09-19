import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useRef, useEffect } from "react";
import PremiumModal from "./PremiumFeature";
import { useAuth } from "../contexts/AuthContext";

const publicLinks = [
  { label: "Pricing", href: "/pricing", icon: "pricing" },
  { label: "Sign In", href: "/login", icon: "login" },
];

export default function NavBar() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const userBtnRef = useRef(null);
  
  // Replace the existing user state with AuthContext
  const { user, isAuthenticated, logout: authLogout } = useAuth();

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (activeDropdown && !event.target.closest('.relative')) {
        setActiveDropdown(null);
      }
      if (isUserMenuOpen && !event.target.closest('[data-user-menu]')) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdown, isUserMenuOpen]);

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
    if (item.subItems) {
      return item.subItems.some(subItem => router.pathname === subItem.href);
    }
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
        { label: "My Pipeline", href: "/pipeline", icon: "timeline" }
      ]
    },
    { 
      label: "Tools", 
      href: "/documents", 
      icon: "tools",
      subItems: [
        { label: "Documents", href: "/documents", icon: "description" },
        { label: "Analytics", href: "/analytics", icon: "analytics", isPro: true },
        { label: "Reminders", href: "/reminders", icon: "notifications" }
      ]
    }
  ];

  const links = isAuthenticated ? authenticatedLinks : publicLinks;

  const renderIcon = (iconName) => {
    const iconClass = "h-5 w-5";
    switch (iconName) {
      case 'pricing':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        );
      case 'login':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
        );
      case 'dashboard':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
          </svg>
        );
      case 'search':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        );
      case 'tools':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'work':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0V8a2 2 0 01-2 2H8a2 2 0 01-2-2V6m8 0H8" />
          </svg>
        );
      case 'timeline':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'description':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'notifications':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.868 12.683A17.925 17.925 0 012 21h8m4 0h8a17.925 17.925 0 01-2.868-8.317M9 5a3 3 0 116 0 3 3 0 01-6 0zm6 0a3 3 0 116 0 3 3 0 01-6 0z" />
          </svg>
        );
      case 'analytics':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  function handleLogout() {
    authLogout();
    router.push('/login');
  }

  return (
    <nav className="glass-nav shadow-lg border-b border-gray-200 sticky top-0 z-40">
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
              <span className="hidden sm:block text-xl font-bold text-white group-hover:text-indigo-200 transition-colors duration-200" style={{fontFamily: 'Inter, sans-serif'}}>
                Applytide
              </span>
            </Link>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-2">
            {/* Navigation Links */}
            <div className="flex items-center space-x-1">
              {links.map((item) => {
                const hasSubItems = item.subItems && item.subItems.length > 0;
                
                if (hasSubItems) {
                  return (
                    <div key={item.label} className="relative">
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === item.label ? null : item.label)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center space-x-2 group ${
                          isParentActive(item)
                            ? "bg-white/10 text-white shadow-lg backdrop-blur-sm border border-white/20"
                            : "text-gray-300 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <span className="transition-transform duration-200 group-hover:scale-110">
                          {renderIcon(item.icon)}
                        </span>
                        <span>{item.label}</span>
                        <svg className={`w-4 h-4 transition-transform duration-200 ${activeDropdown === item.label ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Dropdown Menu */}
                      {activeDropdown === item.label && (
                        <div className="absolute top-full left-0 mt-2 w-56 bg-gray-900/95 backdrop-blur-xl rounded-xl shadow-2xl py-2 border border-white/20 z-50">
                          {item.subItems.map((subItem) => (
                            subItem.isPro ? (
                              <button
                                key={subItem.href}
                                onClick={() => handleLinkClick(subItem.href, subItem.isPro)}
                                className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200"
                              >
                                <span className="transition-transform duration-200 hover:scale-110">
                                  {renderIcon(subItem.icon)}
                                </span>
                                <span className="flex-1 text-left">{subItem.label}</span>
                                <span className="px-1.5 py-0.5 text-xs font-bold bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full flex items-center">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                  PRO
                                </span>
                              </button>
                            ) : (
                              <Link
                                key={subItem.href}
                                href={subItem.href}
                                className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200"
                                onClick={() => setActiveDropdown(null)}
                              >
                                <span className="transition-transform duration-200 hover:scale-110">
                                  {renderIcon(subItem.icon)}
                                </span>
                                <span>{subItem.label}</span>
                              </Link>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                // Regular navigation item (no subitems)
                return item.isPro ? (
                  <button
                    key={item.href}
                    onClick={() => handleLinkClick(item.href, item.isPro)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center space-x-2 group ${
                      isActive(item.href)
                        ? "bg-white/10 text-white shadow-lg backdrop-blur-sm border border-white/20"
                        : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span className="transition-transform duration-200 group-hover:scale-110">
                      {renderIcon(item.icon)}
                    </span>
                    <span>{item.label}</span>
                    <span className="px-1.5 py-0.5 text-xs font-bold bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      PRO
                    </span>
                  </button>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center space-x-2 group ${
                      isActive(item.href)
                        ? "bg-white/10 text-white shadow-lg backdrop-blur-sm border border-white/20"
                        : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span className="transition-transform duration-200 group-hover:scale-110">
                      {renderIcon(item.icon)}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* User Menu */}
            {isAuthenticated && user && (
              <div className="relative" data-user-menu>
                <button
                  ref={userBtnRef}
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-3 text-gray-300 hover:text-white px-3 py-2 rounded-xl hover:bg-white/5 transition-all duration-200 group"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <span className="text-white font-semibold text-sm">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <span className="text-sm font-medium hidden sm:block">{user?.email || 'User'}</span>
                  <svg className="w-4 h-4 transition-transform duration-200 group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* User Dropdown */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-gray-900/95 backdrop-blur-xl rounded-xl shadow-2xl py-2 border border-white/20 z-50">
                    <div className="px-4 py-3 text-sm text-gray-300 border-b border-white/10">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {user.email?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <span className="truncate">{user.email}</span>
                      </div>
                    </div>
                    <Link
                      href="/profile"
                      className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Profile Settings</span>
                    </Link>
                    <Link
                      href="/pricing"
                      className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      <span>Pricing</span>
                      {!user?.is_premium && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-900/30 text-indigo-300 border border-indigo-500/30">
                          Upgrade
                        </span>
                      )}
                    </Link>
                    <Link
                      href="/sessions"
                      className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>Active Sessions</span>
                    </Link>
                    <Link
                      href="/dashboard"
                      className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                      </svg>
                      <span>Dashboard</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-3 w-full text-left px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-all duration-200"
            >
              <svg
                className="h-6 w-6"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 24 24"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden glass-card animate-slideIn border-t border-white/10">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {/* User info for mobile */}
            {user && (
              <div className="px-3 py-4 border-b border-white/10 mb-2">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{user.email || 'User'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation sections */}
            {authenticatedLinks.map(({ label, href, icon, subItems }) => (
              <div key={label} className="mb-2">
                {subItems ? (
                  // Section with subitems
                  <div>
                    <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      <span className="flex items-center space-x-2">
                        <span className="transition-transform duration-200">
                          {renderIcon(icon)}
                        </span>
                        <span>{label}</span>
                      </span>
                    </div>
                    {subItems.map(({ label: subLabel, href: subHref, isPro }) => (
                      isPro ? (
                        <button
                          key={subHref}
                          onClick={() => handleLinkClick(subHref, isPro)}
                          className={`block w-full text-left px-6 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-between ${
                            isActive(subHref)
                              ? "bg-white/10 text-white shadow-lg backdrop-blur-sm border border-white/20"
                              : "text-gray-300 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          <span>{subLabel}</span>
                          <span className="px-1.5 py-0.5 text-xs font-bold bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            PRO
                          </span>
                        </button>
                      ) : (
                        <Link
                          key={subHref}
                          href={subHref}
                          onClick={() => setIsMenuOpen(false)}
                          className={`block px-6 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                            isActive(subHref)
                              ? "bg-white/10 text-white shadow-lg backdrop-blur-sm border border-white/20"
                              : "text-gray-300 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          {subLabel}
                        </Link>
                      )
                    ))}
                  </div>
                ) : (
                  // Single navigation item
                  <Link
                    href={href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`block px-3 py-3 rounded-xl text-base font-medium transition-all duration-200 flex items-center space-x-3 ${
                      isActive(href)
                        ? "bg-white/10 text-white shadow-lg backdrop-blur-sm border border-white/20"
                        : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span className="transition-transform duration-200 hover:scale-110">
                      {renderIcon(icon)}
                    </span>
                    <span>{label}</span>
                  </Link>
                )}
              </div>
            ))}

            {/* Logout button for mobile */}
            {user && (
              <button
                onClick={() => {
                  handleLogout();
                  setIsMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-3 rounded-xl text-base font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center space-x-3 transition-all duration-200"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013 3v1" />
                </svg>
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Premium Modal */}
      <PremiumModal 
        isOpen={showPremiumModal} 
        onClose={() => setShowPremiumModal(false)} 
        feature="Analytics Dashboard" 
      />
    </nav>
  );
}
