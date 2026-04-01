import { lazy, Suspense, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { Toaster } from "sonner";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthLayout } from "./layouts/AuthLayout";
import { AuthGuard } from "./components/guards/AuthGuard";
import { AdminGuard } from "./components/guards/AdminGuard";
import { ErrorBoundary } from "./components/shared/ErrorBoundary";
import { PageLoader } from "./components/shared/PageLoader";
import { useScrollToTop } from "./hooks/useScrollToTop";
import { PageTransition } from "./components/layout/PageTransition";
import { DevTools } from "./components/dev/DevTools";

// --- Eagerly loaded (critical path) ---
import { HomePage } from "./pages/HomePage";
import { SignInPage } from "./pages/auth/SignInPage";
import { SignUpPage } from "./pages/auth/SignUpPage";
import { GoogleCallbackPage } from "./pages/auth/GoogleCallbackPage";

// --- Lazy-loaded pages (code-split) ---
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage").then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage").then(m => ({ default: m.ResetPasswordPage })));
const TermsPage = lazy(() => import("./pages/legal/TermsPage").then(m => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import("./pages/legal/PrivacyPage").then(m => ({ default: m.PrivacyPage })));
const CopyrightPage = lazy(() => import("./pages/legal/CopyrightPage").then(m => ({ default: m.CopyrightPage })));
const CookiePolicyPage = lazy(() => import("./pages/legal/CookiePolicyPage").then(m => ({ default: m.CookiePolicyPage })));
const ContactPage = lazy(() => import("./pages/company/ContactPage").then(m => ({ default: m.ContactPage })));
const AccessibilityPage = lazy(() => import("./pages/company/AccessibilityPage").then(m => ({ default: m.AccessibilityPage })));
const AboutPage = lazy(() => import("./pages/company/AboutPage").then(m => ({ default: m.AboutPage })));
const PricingPage = lazy(() => import("./pages/pricing/PricingPage"));
const HowItWorksPage = lazy(() => import("./pages/HowItWorksPage").then(m => ({ default: m.HowItWorksPage })));
const DashboardPage = lazy(() => import("./pages/dashboard/DashboardPage").then(m => ({ default: m.DashboardPage })));
const JobsPage = lazy(() => import("./pages/jobs/JobsPage").then(m => ({ default: m.JobsPage })));
const PipelinePage = lazy(() => import("./pages/pipeline/PipelinePage").then(m => ({ default: m.PipelinePage })));
const DocumentsPage = lazy(() => import("./pages/documents/DocumentsPage").then(m => ({ default: m.DocumentsPage })));
const AnalyticsPage = lazy(() => import("./pages/analytics/AnalyticsPage").then(m => ({ default: m.AnalyticsPage })));
const RemindersPage = lazy(() => import("./pages/reminders/RemindersPage").then(m => ({ default: m.RemindersPage })));
const ProfilePage = lazy(() => import("./pages/profile/ProfilePage").then(m => ({ default: m.ProfilePage })));
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));
const UsersPage = lazy(() => import("./pages/admin/UsersPage"));
const ErrorsPage = lazy(() => import("./pages/admin/ErrorsPage"));
const LLMUsagePage = lazy(() => import("./pages/admin/LLMUsagePage"));
const SecurityPage = lazy(() => import("./pages/admin/SecurityPage"));
const SessionsPage = lazy(() => import("./pages/admin/SessionsPage"));
const SystemPage = lazy(() => import("./pages/admin/SystemPage"));

export default function App() {
  // Note: Smooth scrolling disabled for HomePage to work with scroll-snap
  // useSmoothScroll();

  // Google Fonts loaded via <link> in index.html <head> (not useEffect)

  // Navigation state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [expandedFooterSection, setExpandedFooterSection] = useState<
    string | null
  >(null);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LanguageProvider>
        <AuthProvider>
          <Toaster position="top-right" richColors />
          <DevTools />
          <AppRoutes
            isMenuOpen={isMenuOpen}
            onMenuToggle={() => setIsMenuOpen(!isMenuOpen)}
            isUserMenuOpen={isUserMenuOpen}
            onUserMenuToggle={() => setIsUserMenuOpen(!isUserMenuOpen)}
            expandedMenu={expandedMenu}
            onMenuExpand={setExpandedMenu}
            expandedFooterSection={expandedFooterSection}
            onFooterExpand={setExpandedFooterSection}
          />
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

// Separate component so hooks like useScrollToTop can use Router context
interface AppRoutesProps {
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  isUserMenuOpen: boolean;
  onUserMenuToggle: () => void;
  expandedMenu: string | null;
  onMenuExpand: (menu: string | null) => void;
  expandedFooterSection: string | null;
  onFooterExpand: (section: string | null) => void;
}

function AppRoutes({
  isMenuOpen,
  onMenuToggle,
  isUserMenuOpen,
  onUserMenuToggle,
  expandedMenu,
  onMenuExpand,
  expandedFooterSection,
  onFooterExpand,
}: AppRoutesProps) {
  // Scroll to top on route change
  useScrollToTop();

  return (
    <AuthLayout
      isMenuOpen={isMenuOpen}
      onMenuToggle={onMenuToggle}
      isUserMenuOpen={isUserMenuOpen}
      onUserMenuToggle={onUserMenuToggle}
      expandedMenu={expandedMenu}
      onMenuExpand={onMenuExpand}
      expandedFooterSection={expandedFooterSection}
      onFooterExpand={onFooterExpand}
    >
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Home Route */}
          <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />

          {/* Auth Routes */}
          <Route path="/signin" element={<PageTransition><SignInPage /></PageTransition>} />
          <Route path="/signup" element={<PageTransition><SignUpPage /></PageTransition>} />
          <Route path="/forgot-password" element={<PageTransition><ForgotPasswordPage /></PageTransition>} />
          <Route path="/reset-password" element={<PageTransition><ResetPasswordPage /></PageTransition>} />
          <Route path="/auth/google-callback" element={<GoogleCallbackPage />} />

          {/* Legal Routes */}
          <Route path="/terms" element={<PageTransition><TermsPage /></PageTransition>} />
          <Route path="/privacy" element={<PageTransition><PrivacyPage /></PageTransition>} />
          <Route path="/copyright" element={<PageTransition><CopyrightPage /></PageTransition>} />
          <Route path="/cookie-policy" element={<PageTransition><CookiePolicyPage /></PageTransition>} />

          {/* Company Routes */}
          <Route path="/contact" element={<PageTransition><ContactPage /></PageTransition>} />
          <Route path="/accessibility" element={<PageTransition><AccessibilityPage /></PageTransition>} />
          <Route path="/about" element={<PageTransition><AboutPage /></PageTransition>} />

          {/* Pricing Route */}
          <Route path="/pricing" element={<PageTransition><PricingPage /></PageTransition>} />

          {/* How It Works Route - Public */}
          <Route path="/how-it-works" element={<PageTransition><HowItWorksPage /></PageTransition>} />

          {/* Dashboard Route - Protected */}
          <Route path="/dashboard" element={<AuthGuard><PageTransition><DashboardPage /></PageTransition></AuthGuard>} />

          {/* Jobs Route - Protected */}
          <Route path="/jobs" element={<AuthGuard><PageTransition><JobsPage /></PageTransition></AuthGuard>} />
          <Route path="/job-search" element={<Navigate to="/jobs" replace />} />

          {/* Pipeline Route - Protected */}
          <Route path="/pipeline" element={<AuthGuard><PageTransition><PipelinePage /></PageTransition></AuthGuard>} />

          {/* Documents Route - Protected */}
          <Route path="/documents" element={<AuthGuard><PageTransition><DocumentsPage /></PageTransition></AuthGuard>} />

          {/* Analytics Route - Protected */}
          <Route path="/analytics" element={<AuthGuard><PageTransition><AnalyticsPage /></PageTransition></AuthGuard>} />

          {/* Reminders Route - Protected */}
          <Route path="/reminders" element={<AuthGuard><PageTransition><RemindersPage /></PageTransition></AuthGuard>} />

          {/* Profile Route - Protected */}
          <Route path="/profile" element={<AuthGuard><PageTransition><ProfilePage /></PageTransition></AuthGuard>} />

          {/* Admin Routes - Protected by AdminGuard */}
          <Route path="/admin" element={<AdminGuard><PageTransition><AdminDashboardPage /></PageTransition></AdminGuard>} />
          <Route path="/admin/users" element={<AdminGuard><PageTransition><UsersPage /></PageTransition></AdminGuard>} />
          <Route path="/admin/errors" element={<AdminGuard><PageTransition><ErrorsPage /></PageTransition></AdminGuard>} />
          <Route path="/admin/llm-usage" element={<AdminGuard><PageTransition><LLMUsagePage /></PageTransition></AdminGuard>} />
          <Route path="/admin/security" element={<AdminGuard><PageTransition><SecurityPage /></PageTransition></AdminGuard>} />
          <Route path="/admin/sessions" element={<AdminGuard><PageTransition><SessionsPage /></PageTransition></AdminGuard>} />
          <Route path="/admin/system" element={<AdminGuard><PageTransition><SystemPage /></PageTransition></AdminGuard>} />
          
          {/* Catch-all Route - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </ErrorBoundary>
    </AuthLayout>
  );
}