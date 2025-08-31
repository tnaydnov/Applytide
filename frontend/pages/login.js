import { useState } from "react";
import { login, register } from "../lib/api";
import { Button, Card, Input } from "../components/ui";
import { useToast } from '../lib/toast';

export default function LoginPage() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (mode === "login") {
        await login(email, password);
        toast.success("Welcome back!");
      } else {
        await register(email, password);
        toast.success("Account created successfully!");
      }
      window.location.href = "/pipeline";
    } catch (err) {
      toast.error(err.message || err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">JF</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-gray-600 mt-2">
            {mode === "login" 
              ? "Sign in to continue your job search journey" 
              : "Join JobFlow Copilot and streamline your applications"
            }
          </p>
        </div>

        {/* Form */}
        <Card>
          <form onSubmit={submit} className="space-y-6">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              icon={<span>📧</span>}
            />
            
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              icon={<span>🔒</span>}
            />

            {mode === "login" && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => window.location.href = "/auth/reset"}
                  className="text-sm text-indigo-600 hover:text-indigo-500"
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
        </Card>

        {/* Mode Switch */}
        <div className="text-center">
          <p className="text-gray-600">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}
          </p>
          <Button
            variant="ghost"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="mt-2"
          >
            {mode === "login" ? "Create an account" : "Sign in instead"}
          </Button>
        </div>

        {/* Features for new users */}
        {mode === "register" && (
          <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
            <div className="text-center space-y-4">
              <h3 className="font-semibold text-gray-900">What you'll get:</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <span>🎯</span>
                  <span>Smart job tracking</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>🔄</span>
                  <span>Visual pipeline</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>📄</span>
                  <span>Resume management</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>📊</span>
                  <span>Progress analytics</span>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
