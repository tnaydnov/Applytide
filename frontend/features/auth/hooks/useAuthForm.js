import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useToast } from "../../../lib/toast";
import { useAuth } from "../../../contexts/AuthContext";
import { loginWithEmail, registerUser } from "../../../services/auth";

export default function useAuthForm() {
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const [validationError, setValidationError] = useState("");
  
  // Legal agreements for registration
  const [legalAgreements, setLegalAgreements] = useState({
    terms: false,
    privacy: false,
    age: false,
    dataProcessing: false,
  });
  const [allAgreed, setAllAgreed] = useState(false);

  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const toast = useToast();

  // Redirect if already logged in (matches original)
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  const toggleMode = () => setMode((m) => (m === "login" ? "register" : "login"));

  const submit = async (e) => {
    e?.preventDefault?.();
    
    // Clear previous errors
    setValidationError("");
    
    // Validate legal agreements for registration
    if (mode === "register" && !allAgreed) {
      const errorMsg = "Please accept all legal agreements to continue";
      setValidationError(errorMsg);
      toast.error(errorMsg);
      return;
    }
    
    setLoading(true);
    try {
      if (mode === "login") {
        const success = await loginWithEmail(email, password, remember);
        if (success) {
          toast.success("Welcome back!");
          setTimeout(() => {
            window.location.replace("/dashboard");
          }, 500);
        } else {
          const errorMsg = "Login failed. Please check your credentials.";
          setValidationError(errorMsg);
          toast.error(errorMsg);
        }
      } else {
        // Include legal agreements in registration
        await registerUser({ 
          email, 
          password, 
          full_name: fullName,
          terms_accepted: legalAgreements.terms,
          privacy_accepted: legalAgreements.privacy,
          age_verified: legalAgreements.age,
          data_processing_consent: legalAgreements.dataProcessing,
        });
        toast.success("Account created successfully! Welcome to Applytide!");
        window.location.href = "/dashboard";
      }
    } catch (err) {
      // Extract error message
      let errorMessage = "An error occurred. Please try again.";
      
      // Handle Fetch API Response errors
      if (err?.response) {
        const data = err.response.data;
        
        // Check for detail field (FastAPI standard)
        if (data?.detail) {
          if (typeof data.detail === 'string') {
            errorMessage = data.detail;
          } else if (Array.isArray(data.detail)) {
            // Pydantic validation errors
            const messages = data.detail.map(e => {
              const msg = e.msg || e.message || 'Validation error';
              // Clean up "Value error, " prefix
              return msg.replace(/^Value error,\s*/i, '');
            });
            errorMessage = messages.join('. ');
          }
        }
        
        // Handle specific HTTP status codes with clear, actionable messages
        if (err.response.status === 403) {
          // Banned account/IP
          if (data?.detail?.toLowerCase().includes('suspended') || data?.detail?.toLowerCase().includes('banned')) {
            errorMessage = "🚫 Account Suspended: This account has been disabled. Please contact support if you believe this is an error.";
          } else if (data?.detail?.toLowerCase().includes('ip') || data?.detail?.toLowerCase().includes('address')) {
            errorMessage = "🚫 Access Blocked: Too many failed attempts from this location. Please try again later or contact support.";
          } else {
            errorMessage = data?.detail || "Access denied. Please contact support.";
          }
        } else if (err.response.status === 401) {
          // Invalid credentials
          if (mode === "login") {
            errorMessage = "❌ Incorrect email or password. Please check your credentials and try again.";
          } else {
            errorMessage = data?.detail || "Authentication failed";
          }
        } else if (err.response.status === 429) {
          // Rate limit exceeded
          if (mode === "login") {
            errorMessage = "⏱️ Too Many Attempts: Your account has been temporarily locked for security. Please wait 5 minutes and try again.";
          } else {
            errorMessage = "⏱️ Too Many Attempts: Please wait a few minutes before trying to register again.";
          }
        } else if (err.response.status === 400) {
          // Bad request - could be email exists, validation, etc.
          if (mode === "register" && data?.detail?.toLowerCase().includes('already')) {
            errorMessage = "📧 Email Already Registered: This email is already in use. Try logging in instead, or use a different email.";
          } else if (data?.detail?.toLowerCase().includes('password')) {
            errorMessage = `🔒 Password Requirements Not Met: ${data.detail}`;
          } else if (data?.detail?.toLowerCase().includes('legal') || data?.detail?.toLowerCase().includes('agreement')) {
            errorMessage = "📜 Legal Agreements Required: You must accept all terms and agreements to create an account.";
          } else {
            errorMessage = data?.detail || "Invalid request. Please check your information.";
          }
        } else if (err.response.status === 422) {
          // Validation error
          errorMessage = `⚠️ Validation Error: ${errorMessage}`;
        }
      } 
      // Handle Error object with message
      else if (err?.message) {
        errorMessage = err.message;
      }
      // Handle string errors
      else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      setValidationError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    // state
    mode,
    email,
    password,
    fullName,
    loading,
    remember,
    legalAgreements,
    allAgreed,
    validationError,

    // setters
    setEmail,
    setPassword,
    setFullName,
    setRemember,
    setMode: toggleMode,
    setLegalAgreements,
    setAllAgreed,

    // actions
    submit,
  };
}
