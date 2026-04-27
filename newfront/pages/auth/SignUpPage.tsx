import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthCard } from "../../components/auth/AuthCard";
import { useCardTilt } from "../../hooks/useCardTilt";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import { apiFetch } from "../../lib/api";
import { logger } from "../../lib/logger";
import { formatResponseError, formatAuthError } from "../../lib/authErrors";
import { isValidEmail } from "../../utils/validators";

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
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{}|;':",./<>?`~\\]/.test(password),
  };

  const allPasswordRequirementsMet =
    passwordValidation.minLength &&
    passwordValidation.hasUppercase &&
    passwordValidation.hasLowercase &&
    passwordValidation.hasNumber &&
    passwordValidation.hasSpecial;

  const showSignUpWarning = !agreeToTerms || !allPasswordRequirementsMet;

  const handleSignUp = async () => {
    if (!fullName.trim()) {
      toast.error("Please enter your full name.");
      return;
    }
    if (!email.trim()) {
      toast.error("Please enter your email address.");
      return;
    }
    if (!isValidEmail(email.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!password) {
      toast.error("Please enter a password.");
      return;
    }
    if (!allPasswordRequirementsMet) {
      const missing: string[] = [];
      if (!passwordValidation.minLength) missing.push("at least 8 characters");
      if (!passwordValidation.hasUppercase) missing.push("an uppercase letter");
      if (!passwordValidation.hasLowercase) missing.push("a lowercase letter");
      if (!passwordValidation.hasNumber) missing.push("a number");
      if (!passwordValidation.hasSpecial) missing.push("a special character");
      toast.error(`Password needs ${missing.join(", ")}.`);
      return;
    }
    if (!agreeToTerms) {
      toast.error("Please agree to the Terms of Service and Privacy Policy.");
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
          email: email.trim(),
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
        await checkAuthStatus();
        toast.success("Account created successfully!");
        navigate("/dashboard");
      } else {
        const formatted = await formatResponseError(res, "Registration failed. Please try again.");
        logger.warn("Registration failed", { status: formatted.status, message: formatted.message });
        toast.error(formatted.message, {
          description: formatted.details?.slice(1).join(" \u2022 "),
          duration: 6000,
        });
      }
    } catch (error) {
      logger.error("Registration error:", error);
      const formatted = formatAuthError(error, "Registration failed. Please try again.");
      toast.error(formatted.message);
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
