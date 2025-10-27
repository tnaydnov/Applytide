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
      setValidationError("Please accept all legal agreements to continue");
      toast.error("Please accept all legal agreements to continue");
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
          toast.error("Login failed");
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
      // Parse validation errors from Pydantic
      let errorMessage = err?.message || String(err);
      
      // Check if it's a Pydantic validation error
      if (err?.response?.data?.detail) {
        const detail = err.response.data.detail;
        
        // Handle array of validation errors
        if (Array.isArray(detail)) {
          // Find password-related errors
          const passwordErrors = detail.filter(e => 
            e.loc && e.loc.includes('password') || 
            e.msg && e.msg.toLowerCase().includes('password')
          );
          
          if (passwordErrors.length > 0) {
            errorMessage = passwordErrors.map(e => e.msg).join('. ');
          } else {
            errorMessage = detail.map(e => e.msg || e.message).join('. ');
          }
        } else if (typeof detail === 'string') {
          errorMessage = detail;
        }
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
