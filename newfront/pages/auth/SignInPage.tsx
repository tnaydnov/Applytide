import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthCard } from "../../components/auth/AuthCard";
import { useCardTilt } from "../../hooks/useCardTilt";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import { logger } from "../../lib/logger";
import { formatAuthError } from "../../lib/authErrors";
import { isValidEmail } from "../../utils/validators";

export function SignInPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const { rotateX, rotateY, handleMouseMove, handleMouseLeave } = useCardTilt();

  const passwordValidation = {
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecial: false,
  };
  
  const handleSignIn = async () => {
    if (!email.trim()) {
      toast.error("Please enter your email address.");
      return;
    }
    if (!isValidEmail(email.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!password) {
      toast.error("Please enter your password.");
      return;
    }

    setIsLoading(true);
    try {
      const success = await login(email.trim(), password, rememberMe);
      if (success) {
        toast.success("Welcome back!");
        navigate("/dashboard");
      } else {
        toast.error("Invalid email or password.");
      }
    } catch (error) {
      logger.error("Login error:", error);
      const formatted = formatAuthError(error, "Login failed. Please try again.");
      toast.error(formatted.message, {
        description: formatted.details?.slice(1).join(" \u2022 "),
        duration: 6000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AuthCard
      isSignUp={false}
      fullName=""
      email={email}
      password={password}
      rememberMe={rememberMe}
      agreeToTerms={false}
      passwordValidation={passwordValidation}
      showSignUpWarning={false}
      rotateX={rotateX}
      rotateY={rotateY}
      cardRef={cardRef}
      onMouseMove={(e) => handleMouseMove(e, cardRef)}
      onMouseLeave={handleMouseLeave}
      onFullNameChange={() => {}}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onRememberMeChange={setRememberMe}
      onAgreeToTermsChange={() => {}}
      onToggleMode={() => navigate("/signup")}
      onForgotPassword={() => navigate("/forgot-password")}
      onSubmit={handleSignIn}
      isLoading={isLoading}
    />
    </>
  );
}
