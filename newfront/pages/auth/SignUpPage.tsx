import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthCard } from "../../components/auth/AuthCard";
import { useCardTilt } from "../../hooks/useCardTilt";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import { apiFetch } from "../../lib/api";
import { logger } from "../../lib/logger";

export function SignUpPage() {
  const navigate = useNavigate();
  const { checkAuthStatus } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const { rotateX, rotateY, handleMouseMove, handleMouseLeave } = useCardTilt();

  // Password validation
  const passwordValidation = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };

  const allPasswordRequirementsMet =
    passwordValidation.minLength &&
    passwordValidation.hasUppercase &&
    passwordValidation.hasLowercase &&
    passwordValidation.hasNumber;

  const showSignUpWarning = !agreeToTerms || !allPasswordRequirementsMet;

  const handleSignUp = async () => {
    if (!fullName || !email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    if (!allPasswordRequirementsMet) {
      toast.error("Password does not meet requirements");
      return;
    }
    if (!agreeToTerms) {
      toast.error("Please agree to the terms and conditions");
      return;
    }

    setIsLoading(true);
    try {
      // Split full name into first/last
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const res = await apiFetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName.trim(),
          first_name: firstName,
          last_name: lastName,
          terms_accepted: true,
          privacy_accepted: true,
          age_verified: true,
          data_processing_consent: true,
        }),
      });

      if (res.ok) {
        // Registration sets cookies, check auth to load user
        await checkAuthStatus();
        toast.success("Account created successfully!");
        navigate("/dashboard");
      } else {
        const data = await res.json().catch(() => ({}));
        const msg = data.detail || data.message || "Registration failed";
        toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
    } catch (error) {
      logger.error("Registration error:", error);
      toast.error("Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard
      isSignUp={true}
      fullName={fullName}
      email={email}
      password={password}
      rememberMe={false}
      agreeToTerms={agreeToTerms}
      passwordValidation={passwordValidation}
      showSignUpWarning={showSignUpWarning}
      rotateX={rotateX}
      rotateY={rotateY}
      cardRef={cardRef}
      onMouseMove={(e) => handleMouseMove(e, cardRef)}
      onMouseLeave={handleMouseLeave}
      onFullNameChange={setFullName}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onRememberMeChange={() => {}}
      onAgreeToTermsChange={setAgreeToTerms}
      onToggleMode={() => navigate("/signin")}
      onForgotPassword={() => {}}
      onSubmit={handleSignUp}
      isLoading={isLoading}
    />
  );
}
