import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthCard } from "../../components/auth/AuthCard";
import { useCardTilt } from "../../hooks/useCardTilt";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import { logger } from "../../lib/logger";

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
  };
  
  const handleSignIn = async () => {
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    setIsLoading(true);
    try {
      const success = await login(email, password, rememberMe);
      if (success) {
        toast.success("Welcome back!");
        navigate("/dashboard");
      } else {
        toast.error("Invalid email or password");
      }
    } catch (error) {
      logger.error("Login error:", error);
      toast.error("Login failed. Please try again.");
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
