import Link from "next/link";

export default function UserMenu({
  user,
  loading,
  isAuthenticated,
  isUserMenuOpen,
  setIsUserMenuOpen,
  onLogout,
  userBtnRef,
  userMenuRef,
}) {
  // Show loading skeleton during auth check
  if (loading) {
    return (
      <div className="flex items-center space-x-3 px-3 py-2">
        <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse"></div>
      </div>
    );
  }
  
  // Show Sign In button if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <Link
        href="/login"
        className="px-4 py-2.5 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-all duration-200 flex items-center space-x-2"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
        <span>Sign In</span>
      </Link>
    );
  }

  // Show user menu if authenticated
  return (
    <div className="relative" data-user-menu>
      <button
        ref={userBtnRef}
        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
        className="flex items-center space-x-3 text-gray-300 hover:text-white px-3 py-2 rounded-xl hover:bg-white/5 transition-all duration-200 group"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
          <span className="text-white font-semibold text-sm">
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </span>
        </div>
        <span className="text-sm font-medium hidden sm:block">{user?.email || "User"}</span>
        <svg className="w-4 h-4 transition-transform duration-200 group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isUserMenuOpen && (
        <div
          ref={userMenuRef}
          className="absolute right-0 top-full mt-2 w-56 bg-red-500 backdrop-blur-xl rounded-xl shadow-2xl py-2 border-4 border-yellow-500 z-[9999]"
          style={{ pointerEvents: 'auto' }}
        >
          <div className="px-4 py-3 text-sm text-gray-300 border-b border-white/10">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {user.email?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
              <span className="truncate">{user.email}</span>
            </div>
          </div>
          <Link
            href="/profile"
            className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Profile Settings</span>
          </Link>
          <Link
            href="/pricing"
            className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200"
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
          <button
            onClick={(e) => {
              console.log("Sign Out clicked", e);
              setIsUserMenuOpen(false);
              onLogout();
            }}
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
  );
}

export function UserMenuMobile({
  user,
  loading,
  isAuthenticated,
  isUserMenuOpen,
  setIsUserMenuOpen,
  onLogout,
}) {
  if (!(isUserMenuOpen && !loading && isAuthenticated && user)) return null;

  return (
    <div
      className="md:hidden fixed inset-x-4 top-16 z-50 bg-gray-900/95 backdrop-blur-xl rounded-xl shadow-2xl py-2 border border-white/20"
      data-user-menu
      style={{ zIndex: 60 }}
    >
      <div className="px-4 py-3 text-sm text-gray-300 border-b border-white/10">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {user.email?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
          </div>
          <span className="truncate text-sm">{user.email}</span>
        </div>
      </div>
      <div className="flex flex-col">
        <Link
          href="/profile"
          className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200 tap-target"
          onClick={() => setIsUserMenuOpen(false)}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>Profile Settings</span>
        </Link>
        <Link
          href="/pricing"
          className="flex items-center justify-between px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200 tap-target"
          onClick={() => setIsUserMenuOpen(false)}
        >
          <div className="flex items-center space-x-3">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            <span>Pricing</span>
          </div>
          {!user?.is_premium && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-900/30 text-indigo-300 border border-indigo-500/30">
              Upgrade
            </span>
          )}
        </Link>
        <button
          onClick={() => {
            onLogout();
            setIsUserMenuOpen(false);
          }}
          className="flex items-center space-x-3 w-full text-left px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 tap-target"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3v1" />
          </svg>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
