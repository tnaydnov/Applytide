import NavBar from "../components/NavBar";
import "../styles/globals.css";
import { ToastProvider } from '../lib/toast';

export default function MyApp({ Component, pageProps }) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Component {...pageProps} />
        </main>
      </div>
    </ToastProvider>
  );
}
