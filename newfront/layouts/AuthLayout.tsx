import { ReactNode, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { WaveBackground } from "../components/background/WaveBackground";
import { Header } from "../components/layout/Header";
import { UserMenu } from "../components/layout/UserMenu";
import { LanguageSelector } from "../components/layout/LanguageSelector";
import { Sidebar } from "../components/layout/Sidebar";
import { ImprovedWelcomeModal } from "../components/onboarding/ImprovedWelcomeModal";
import { useAuth } from "../contexts/AuthContext";
import { safeGetItem, safeSetItem, safeRemoveItem } from "../lib/storage";

interface AuthLayoutProps {
  children: ReactNode;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  isUserMenuOpen: boolean;
  onUserMenuToggle: () => void;
  expandedMenu: string | null;
  onMenuExpand: (menu: string | null) => void;
  expandedFooterSection: string | null;
  onFooterExpand: (section: string | null) => void;
}

export function AuthLayout({
  children,
  isMenuOpen,
  onMenuToggle,
  isUserMenuOpen,
  onUserMenuToggle,
  expandedMenu,
  onMenuExpand,
  expandedFooterSection,
  onFooterExpand,
}: AuthLayoutProps) {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const isHomePage = location.pathname === "/";
  
  // Onboarding state
  const [showWelcome, setShowWelcome] = useState(false);

  // Check if user is new and should see onboarding
  useEffect(() => {
    if (isAuthenticated && !isHomePage) {
      const hasSeenWelcome = safeGetItem('welcomeShown');
      
      // Clean up old tutorial flags
      safeRemoveItem('tutorialCompleted');
      safeRemoveItem('tutorialSkipped');

      if (!hasSeenWelcome) {
        setShowWelcome(true);
      }
    }
  }, [isAuthenticated, isHomePage]);

  const handleWelcomeComplete = () => {
    setShowWelcome(false);
    safeSetItem('welcomeShown', 'true');
  };

  return (
    <div
      className="min-h-screen relative flex flex-col"
      style={{
        backgroundColor: isHomePage ? "#e8eaed" : "#b6bac5",
        fontFamily: "'Righteous', sans-serif",
        overflow: isHomePage ? "visible" : "hidden",
      }}
    >
      {/* Only show WaveBackground if NOT on HomePage */}
      {!isHomePage && <WaveBackground />}

      <Header isMenuOpen={isMenuOpen} onMenuToggle={onMenuToggle} />

      {/* Top Right Group: Language Selector + User Menu */}
      {/* Force LTR to keep order: Language Selector (left), then Profile/Sign In (rightmost) */}
      <div className="fixed top-4 right-4 md:top-8 md:right-8 z-50 flex items-center gap-2 md:gap-3" dir="ltr" data-tour="top-nav">
        <LanguageSelector />
        <UserMenu isOpen={isUserMenuOpen} onToggle={onUserMenuToggle} />
      </div>

      <Sidebar
        isOpen={isMenuOpen}
        onClose={() => onMenuToggle()}
        expandedMenu={expandedMenu}
        onMenuExpand={onMenuExpand}
        expandedFooterSection={expandedFooterSection}
        onFooterExpand={onFooterExpand}
      />

      {/* Main Content - Different layout for HomePage */}
      {isHomePage ? (
        // HomePage: No padding, full screen
        <div className="flex-1 relative">
          {children}
        </div>
      ) : (
        // Other pages: Centered with padding
        <div className="flex-1 relative flex items-center justify-center px-4 sm:px-8 py-32">
          {children}
        </div>
      )}

      {/* Onboarding Modals */}
      {showWelcome && (
        <ImprovedWelcomeModal
          onComplete={handleWelcomeComplete}
        />
      )}
    </div>
  );
}