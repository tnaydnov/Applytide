import Link from "next/link";
import { Icon } from "./icons";
import { useEffect, useState } from "react";

export default function NavLinks({
  links,
  isActive,
  isParentActive,
  handleLinkClick,
  activeDropdown,
  setActiveDropdown,
  dropdownRef,
}) {
  const [showNewBadge, setShowNewBadge] = useState(false);

  useEffect(() => {
    // Function to check badge visibility
    const checkBadgeVisibility = () => {
      const hasSeenGuide = localStorage.getItem('hasSeenHowItWorks');
      const dismissedDate = localStorage.getItem('howItWorksBadgeDismissed');
      
      if (!hasSeenGuide && !dismissedDate) {
        setShowNewBadge(true);
      } else if (dismissedDate) {
        // Check if 7 days have passed since dismissal
        const daysSinceDismissed = (Date.now() - parseInt(dismissedDate)) / (1000 * 60 * 60 * 24);
        if (daysSinceDismissed < 7) {
          setShowNewBadge(false);
        } else {
          setShowNewBadge(true);
        }
      } else {
        setShowNewBadge(false);
      }
    };

    // Check on mount
    checkBadgeVisibility();

    // Listen for custom event when page is visited
    const handlePageVisit = () => {
      checkBadgeVisibility();
    };
    
    window.addEventListener('howItWorksVisited', handlePageVisit);

    // Cleanup
    return () => {
      window.removeEventListener('howItWorksVisited', handlePageVisit);
    };
  }, []);

  return (
    <div className="flex items-center space-x-1">
      {links.map((item) => {
        const hasSubItems = !!item.subItems?.length;

        if (hasSubItems) {
          const isOpen = activeDropdown === item.label;
          return (
            <div key={item.label} className="relative">
              <button
                onClick={() => setActiveDropdown(isOpen ? null : item.label)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center space-x-2 group ${
                  isParentActive(item)
                    ? "bg-white/10 text-white shadow-lg backdrop-blur-sm border border-white/20"
                    : "text-gray-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="transition-transform duration-200 group-hover:scale-110">
                  <Icon name={item.icon} />
                </span>
                <span>{item.label}</span>
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isOpen && (
                <div
                  ref={dropdownRef}
                  className="absolute top-full left-0 mt-2 w-56 bg-gray-900/95 backdrop-blur-xl rounded-xl shadow-2xl py-2 border border-white/20 z-50"
                >
                  {item.subItems.map((subItem) =>
                    subItem.isPro ? (
                      <button
                        key={subItem.href}
                        onClick={() => handleLinkClick(subItem.href, subItem.isPro)}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200"
                      >
                        <span className="transition-transform duration-200 hover:scale-110">
                          <Icon name={subItem.icon} />
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
                          <Icon name={subItem.icon} />
                        </span>
                        <span>{subItem.label}</span>
                      </Link>
                    )
                  )}
                </div>
              )}
            </div>
          );
        }

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
              <Icon name={item.icon} />
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
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center space-x-2 group relative ${
              isActive(item.href)
                ? "bg-white/10 text-white shadow-lg backdrop-blur-sm border border-white/20"
                : "text-gray-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="transition-transform duration-200 group-hover:scale-110">
              <Icon name={item.icon} />
            </span>
            <span>{item.label}</span>
            {/* NEW badge for "How It Works" */}
            {item.href === "/how-it-works" && showNewBadge && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-full shadow-lg animate-pulse">
                NEW
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
