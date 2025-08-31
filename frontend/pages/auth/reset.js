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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"}/auth/password_reset_request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setStep("success");
        toast.success("Password reset email sent!");
      } else {
        const data = await response.json();
        toast.error(data.detail || "Failed to send reset email");
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"}/auth/password_reset`, {
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
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">JF</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {step === "request" ? "Reset Password" : step === "reset" ? "Set New Password" : "Check Your Email"}
          </h1>
          <p className="text-gray-600 mt-2">
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
          <Card>
            <form onSubmit={requestReset} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !email}
                className="w-full"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>

            <div className="text-center mt-6">
              <Button
                variant="ghost"
                onClick={() => router.push("/login")}
              >
                Back to Login
              </Button>
            </div>
          </Card>
        )}

        {/* Reset Password Form */}
        {step === "reset" && (
          <Card>
            <form onSubmit={resetPassword} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !password || !confirmPassword}
                className="w-full"
              >
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          </Card>
        )}

        {/* Success Message */}
        {step === "success" && (
          <Card className="text-center space-y-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.83 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-green-600">Email Sent!</h3>
              <p className="text-gray-600">
                We've sent a password reset link to {email}. 
                Check your email and follow the instructions to reset your password.
              </p>
              <p className="text-sm text-gray-500">
                The link will expire in 1 hour.
              </p>
            </div>
            <Button
              onClick={() => router.push("/login")}
              variant="ghost"
              className="w-full"
            >
              Back to Login
            </Button>
          </Card>
        )}

        {/* Help Text */}
        <div className="text-center text-sm text-gray-500">
          <p>
            {step === "request" 
              ? "Remember your password? " 
              : step === "reset" 
              ? "Password must be at least 8 characters long."
              : "Didn't receive the email? Check your spam folder."
            }
            {step === "request" && (
              <button
                onClick={() => router.push("/login")}
                className="text-indigo-600 hover:text-indigo-500 font-medium"
              >
                Sign in instead
              </button>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
