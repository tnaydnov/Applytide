import NavBar from "../components/nav/NavBar";
import Footer from "../components/Footer";
import AuthGuard from "../components/guards/AuthGuard";
import FloatingFeedbackButton from "../components/feedback/FloatingFeedbackButton";
import "../styles/globals.css";
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../lib/toast';
import { isPublicRoute } from '../lib/routes';
import Head from 'next/head';
import AppLayout from "../components/layout/AppLayout";

export default function MyApp({ Component, pageProps, router }) {
  const isPublicPage = isPublicRoute(router.pathname);

  return (
    <ToastProvider>
      <AuthProvider>
        <Head>
          <title>Applytide - Track Every Job Application Like a Pro</title>
        </Head>
        <AppLayout className="flex flex-col">
          {isPublicPage && router.pathname !== '/' ? (
            // Public pages (login, reset password, etc.) - excluding home page
            <>
              <NavBar />
              <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
                <Component {...pageProps} />
              </main>
              <Footer />
            </>
          ) : isPublicPage && router.pathname === '/' ? (
            // Home page - accessible to everyone, but shows proper auth state
            <>
              <NavBar />
              <main className="flex-1">
                <Component {...pageProps} />
              </main>
              <Footer />
            </>
          ) : (
            // Protected pages (require authentication)
            <AuthGuard>
              <NavBar />
              <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
                <Component {...pageProps} />
              </main>
              <Footer />
            </AuthGuard>
          )}
          
          {/* Floating Feedback Button - appears on all pages */}
          <FloatingFeedbackButton />
        </AppLayout>
      </AuthProvider>
    </ToastProvider>
  );
}
