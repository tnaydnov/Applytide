import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button, Card, Input } from "../../components/ui";
import { useToast } from '../../lib/toast';

export default function PasswordResetPage() {
  const [step, setStep] = useState("request"); // request, reset, success
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { token } = router.query;
  const toast = useToast();

  useEffect(() => {
    if (token) {
      setStep("reset");
    }
  }, [token]);

  async function requestReset(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/auth/password_reset_request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setStep("success");
        toast.success("Password reset email sent!");
      } else {
        const data = await response.json();
        if (response.status === 404) {
          // Email not registered
          toast.error(data.detail || "This email is not registered");
        } else {
          // Other errors
          toast.error(data.detail || "Failed to send reset email");
        }
      }
    } catch (error) {
      toast.error("Network error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(e) {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/auth/password_reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });

      if (response.ok) {
        toast.success("Password reset successfully!");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        const data = await response.json();
        toast.error(data.detail || "Failed to reset password");
      }
    } catch (error) {
      toast.error("Network error occurred");
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
            {step === "request" ? "Reset Password" : step === "reset" ? "Set New Password" : "Check Your Email"}
          </h1>
          <p className="text-slate-400 mt-2">
            {step === "request" 
              ? "Enter your email to receive a reset link" 
              : step === "reset" 
              ? "Enter your new password" 
              : "We've sent you a password reset link"
            }
          </p>
        </div>

        {/* Request Reset Form */}
        {step === "request" && (
          <div className="glass-card glass-cyan">
            <style jsx global>{`
              .reset-form input {
                background-color: rgb(15 23 42 / 0.8) !important;
                color: rgb(226 232 240) !important;
                border-color: rgb(148 163 184 / 0.3) !important;
              }
              .reset-form input::placeholder {
                color: rgb(148 163 184) !important;
              }
              .reset-form input:focus {
                background-color: rgb(15 23 42 / 0.9) !important;
                border-color: rgb(99 102 241 / 0.6) !important;
                box-shadow: 0 0 0 2px rgb(99 102 241 / 0.2) !important;
              }
              .reset-form label {
                color: rgb(226 232 240) !important;
              }
            `}</style>
            <form onSubmit={requestReset} className="space-y-6 reset-form">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  style={{
                    backgroundColor: 'rgb(15 23 42 / 0.8)',
                    color: 'rgb(226 232 240)',
                    borderColor: 'rgb(148 163 184 / 0.3)'
                  }}
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          </div>
        )}

        {/* Reset Password Form */}
        {step === "reset" && (
          <div className="glass-card glass-cyan">
            <form onSubmit={resetPassword} className="space-y-6 reset-form">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                  New Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  style={{
                    backgroundColor: 'rgb(15 23 42 / 0.8)',
                    color: 'rgb(226 232 240)',
                    borderColor: 'rgb(148 163 184 / 0.3)'
                  }}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  style={{
                    backgroundColor: 'rgb(15 23 42 / 0.8)',
                    color: 'rgb(226 232 240)',
                    borderColor: 'rgb(148 163 184 / 0.3)'
                  }}
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !password || !confirmPassword}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          </div>
        )}

        {/* Success Message */}
        {step === "success" && (
          <div className="glass-card glass-cyan text-center space-y-6">
            <div className="w-16 h-16 bg-green-900/40 rounded-full flex items-center justify-center mx-auto border border-green-500/30">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.83 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-green-400">Email Sent!</h3>
              <p className="text-slate-300">
                We've sent a password reset link to {email}. 
                Check your email and follow the instructions to reset your password.
              </p>
              <p className="text-sm text-slate-400">
                The link will expire in 1 hour.
              </p>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="text-center text-sm text-slate-400">
          <p>
            {step === "request" 
              ? "Remember your password? " 
              : step === "reset" 
              ? "Password must be at least 8 characters long."
              : "Didn't receive the email? Check your spam folder."
            }
            {step === "request" && (
              <>
                <button
                  onClick={() => router.push("/login")}
                  className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                >
                  Sign in instead
                </button>
              </>
            )}
          </p>
          {step === "request" && (
            <p className="mt-2">
              Don't have an account?{" "}
              <button
                onClick={() => router.push("/register")}
                className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
              >
                Create one here
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
