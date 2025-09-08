import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { login, api } from "../lib/api";
import { Button, Card, Input } from "../components/ui";
import { useToast } from '../lib/toast';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const toast = useToast();

  // Check if user is already logged in and redirect
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (mode === "login") {
        const success = await login(email, password, remember);
        if (success) {
          toast.success("Welcome back!");
          // Force a full page reload instead of Next.js navigation
          window.location.replace('/dashboard');
        } else {
          toast.error("Login failed");
        }
      } else {
        await api.register({
          email: email,
          password: password,
          full_name: fullName
        });
        toast.success("Account created successfully! Welcome to Applytide!");
        // Force a full page reload for registration too
        window.location.href = "/dashboard";
      }
    } catch (err) {
      toast.error(err.message || err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <img 
              src="/images/logomark.svg" 
              alt="Applytide" 
              className="h-20 w-20"
            />
          </div>
          <h1 className="text-3xl font-bold text-slate-200">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-slate-400 mt-2">
            {mode === "login" 
              ? "Sign in to continue your job search journey" 
              : "Join Applytide and streamline your applications"
            }
          </p>
        </div>

        {/* Form */}
        <div className="glass-card glass-cyan">
          <style jsx global>{`
            .login-form input {
              background-color: rgb(15 23 42 / 0.8) !important;
              color: rgb(226 232 240) !important;
              border-color: rgb(148 163 184 / 0.3) !important;
            }
            .login-form input::placeholder {
              color: rgb(148 163 184) !important;
            }
            .login-form input:focus {
              background-color: rgb(15 23 42 / 0.9) !important;
              border-color: rgb(99 102 241 / 0.6) !important;
              box-shadow: 0 0 0 2px rgb(99 102 241 / 0.2) !important;
            }
            .login-form label {
              color: rgb(226 232 240) !important;
            }
          `}</style>
          <form onSubmit={submit} className="space-y-6 login-form">
            {mode === "register" && (
              <Input
                label="Full Name"
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="John Doe"
                required
                className="dark-input"
                style={{
                  backgroundColor: 'rgb(15 23 42 / 0.8)',
                  color: 'rgb(226 232 240)',
                  borderColor: 'rgb(148 163 184 / 0.3)'
                }}
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
              />
            )}
            
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="dark-input"
              style={{
                backgroundColor: 'rgb(15 23 42 / 0.8)',
                color: 'rgb(226 232 240)',
                borderColor: 'rgb(148 163 184 / 0.3)'
              }}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
            />
            
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="dark-input"
              style={{
                backgroundColor: 'rgb(15 23 42 / 0.8)',
                color: 'rgb(226 232 240)',
                borderColor: 'rgb(148 163 184 / 0.3)'
              }}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
            />

            {mode === "login" && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input 
                    id="remember"
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded bg-slate-800"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <label htmlFor="remember" className="ml-2 block text-sm text-gray-300">
                    Remember me
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => window.location.href = "/auth/reset"}
                  className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors duration-200"
                >
                  Forgot your password?
                </button>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              loading={loading}
              disabled={!email || !password}
            >
              {loading 
                ? (mode === "login" ? "Signing in..." : "Creating account...") 
                : (mode === "login" ? "Sign In" : "Create Account")
              }
            </Button>
          </form>
        </div>

        {/* Mode Switch */}
        <div className="text-center space-y-4">
          <p className="text-slate-400">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}
          </p>
          <div className="flex justify-center">
            <Button
              variant="ghost"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="text-slate-300 hover:text-slate-200"
            >
              {mode === "login" ? "Create an account" : "Sign in instead"}
            </Button>
          </div>
        </div>

        {/* Features for new users */}
        {mode === "register" && (
          <div className="glass-card glass-cyan border-indigo-500/20">
            <div className="text-center space-y-4">
              <h3 className="font-semibold text-slate-200">What you'll get:</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2 text-slate-300">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Smart job tracking</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-300">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Visual pipeline</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-300">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Resume management</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-300">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>Progress analytics</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
