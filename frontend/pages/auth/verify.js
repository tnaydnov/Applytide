import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button, Card } from "../../components/ui";
import { useToast } from '../../lib/toast';

export default function VerifyEmailPage() {
  const [status, setStatus] = useState("verifying"); // verifying, success, error
  const [message, setMessage] = useState("");
  const router = useRouter();
  const { token } = router.query;
  const toast = useToast();

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    }
  }, [token]);

  async function verifyEmail(verificationToken) {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"}/auth/verify_email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: verificationToken }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(data.message || "Email verified successfully!");
        setTimeout(() => {
          router.push("/pipeline");
        }, 3000);
      } else {
        setStatus("error");
        setMessage(data.detail || "Verification failed");
      }
    } catch (error) {
      setStatus("error");
      setMessage("Network error occurred");
    }
  }

  async function resendVerification() {
    try {
      const email = prompt("Please enter your email address:");
      if (!email) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"}/auth/send_verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        toast.success("Verification email sent!");
      } else {
        const data = await response.json();
        toast.error(data.detail || "Failed to send verification email");
      }
    } catch (error) {
      toast.error("Network error occurred");
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
            Email Verification
          </h1>
        </div>

        {/* Status Card */}
        <Card className="text-center space-y-6">
          {status === "verifying" && (
            <>
              <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-gray-600">Verifying your email address...</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-green-600">Email Verified!</h3>
                <p className="text-gray-600">{message}</p>
                <p className="text-sm text-gray-500">Redirecting to your dashboard...</p>
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-red-600">Verification Failed</h3>
                <p className="text-gray-600">{message}</p>
                <div className="space-y-2">
                  <Button
                    onClick={resendVerification}
                    className="w-full"
                  >
                    Resend Verification Email
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => router.push("/login")}
                    className="w-full"
                  >
                    Back to Login
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>

        {/* Help Text */}
        <div className="text-center text-sm text-gray-500">
          <p>Having trouble? Check your spam folder or contact support.</p>
        </div>
      </div>
    </div>
  );
}
