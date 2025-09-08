import NavBar from "../components/NavBar";
import AuthGuard from "../components/AuthGuard";
import "../styles/globals.css";
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../lib/toast';
import Head from 'next/head';

// Pages that don't require authentication
const PUBLIC_PAGES = ['/', '/login', '/register', '/auth/reset', '/auth/verify'];

export default function MyApp({ Component, pageProps, router }) {
  const isPublicPage = PUBLIC_PAGES.includes(router.pathname);

  return (
    <ToastProvider>
      <AuthProvider>
        <Head>
          <title>Applytide - Track Every Job Application Like a Pro</title>
        </Head>
        <div className="min-h-screen" style={{background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)'}}>
          {isPublicPage ? (
            // Public pages (login, reset password, etc.)
            <>
              <NavBar />
              <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Component {...pageProps} />
              </main>
            </>
          ) : (
            // Protected pages (require authentication)
            <AuthGuard>
              <NavBar />
              <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Component {...pageProps} />
              </main>
            </AuthGuard>
          )}
        </div>
      </AuthProvider>
    </ToastProvider>
  );
}
