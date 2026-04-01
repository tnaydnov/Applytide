import { motion, AnimatePresence, type MotionValue } from "motion/react";
import { RefObject } from "react";
const logo = "/images/logomark.png";
import { SignInForm } from "./SignInForm";
import { SignUpForm } from "./SignUpForm";
import { PasswordValidation } from "../../types";
import { useLanguage } from "../../contexts/LanguageContext";
import { authTranslations } from "../../utils/translations";

interface AuthCardProps {
  isSignUp: boolean;
  fullName: string;
  email: string;
  password: string;
  rememberMe: boolean;
  agreeToTerms: boolean;
  passwordValidation: PasswordValidation;
  showSignUpWarning: boolean;
  rotateX: MotionValue<number>;
  rotateY: MotionValue<number>;
  cardRef: RefObject<HTMLDivElement>;
  onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave: () => void;
  onFullNameChange: (name: string) => void;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onRememberMeChange: (checked: boolean) => void;
  onAgreeToTermsChange: (checked: boolean) => void;
  onToggleMode: () => void;
  onForgotPassword?: () => void;
  onSubmit?: () => void;
  isLoading?: boolean;
}

export function AuthCard({
  isSignUp,
  fullName,
  email,
  password,
  rememberMe,
  agreeToTerms,
  passwordValidation,
  showSignUpWarning,
  rotateX,
  rotateY,
  cardRef,
  onMouseMove,
  onMouseLeave,
  onFullNameChange,
  onEmailChange,
  onPasswordChange,
  onRememberMeChange,
  onAgreeToTermsChange,
  onToggleMode,
  onForgotPassword,
  onSubmit,
  isLoading,
}: AuthCardProps) {
  const { language } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full max-w-md"
    >
      {/* Header */}
      <div className="text-center mb-8 md:mb-12">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="relative inline-flex items-end gap-0 mb-6 md:mb-8"
          dir="ltr"
        >
          <motion.div
            className="relative"
            whileHover={{ scale: 1.05, rotate: 5 }}
          >
            <img src={logo} alt="Applytide Logo" className="w-20 md:w-auto" />
          </motion.div>

          <h1
            className="text-4xl md:text-6xl relative mb-3 md:mb-5"
            style={{
              color: "#383e4e",
              fontWeight: 700,
              letterSpacing: "-0.01em",
            }}
          >
            Applytide
          </h1>
        </motion.div>

        <AnimatePresence mode="wait">
          {isSignUp ? (
            <motion.div
              key="signup-header"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <p className="text-lg md:text-xl mb-1" style={{ color: "#383e4e" }}>
                {authTranslations.signUpTitle[language]}
              </p>
              <p
                className="text-sm md:text-base"
                style={{ color: "#383e4e", opacity: 0.6 }}
              >
                {authTranslations.signUpSubtitle[language]}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="signin-header"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <p className="text-lg md:text-xl mb-1" style={{ color: "#383e4e" }}>
                {authTranslations.signInTitle[language]}
              </p>
              <p
                className="text-sm md:text-base"
                style={{ color: "#383e4e", opacity: 0.6 }}
              >
                {authTranslations.signInSubtitle[language]}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Card with 3D tilt */}
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        style={{
          perspective: "1000px",
          transformStyle: "preserve-3d",
          rotateX,
          rotateY,
        }}
        className="relative"
      >
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
        >
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full"
              style={{
                left: `${10 + i * 12}%`,
                top: `${10 + (i % 3) * 30}%`,
                backgroundColor: "#BF7FA0",
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </motion.div>

        <div
          className="absolute -inset-1 rounded-3xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(159, 95, 128, 0.25), rgba(159, 95, 128, 0.15))",
            filter: "blur(10px)",
            transform: "translateZ(-20px)",
          }}
        />
        <div
          className="absolute -inset-2 rounded-3xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(159, 95, 128, 0.15), transparent)",
            filter: "blur(20px)",
            transform: "translateZ(-40px)",
          }}
        />

        <motion.div
          className="relative rounded-3xl p-6 md:p-9 backdrop-blur-xl"
          style={{
            backgroundColor: "#5a5e6a",
            boxShadow:
              "0 40px 80px rgba(0, 0, 0, 0.5), 0 20px 40px rgba(56, 62, 78, 0.4), 0 0 0 1px rgba(159, 95, 128, 0.2), 0 0 30px rgba(159, 95, 128, 0.1)",
            transform: "translateZ(0)",
          }}
          whileHover={{
            boxShadow:
              "0 50px 100px rgba(0, 0, 0, 0.6), 0 25px 50px rgba(159, 95, 128, 0.4), 0 0 0 2px rgba(159, 95, 128, 0.4), 0 0 60px rgba(159, 95, 128, 0.25)",
          }}
        >
          <motion.div
            className="absolute -inset-[1px] rounded-3xl pointer-events-none"
            style={{
              background:
                "linear-gradient(135deg, rgba(159, 95, 128, 0.4), rgba(191, 127, 160, 0.4))",
              opacity: 0,
            }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />

          <motion.div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{
              background:
                "linear-gradient(135deg, rgba(159, 95, 128, 0.05), transparent)",
              opacity: 0,
            }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />

          <div className="relative">
            <AnimatePresence mode="wait">
              {isSignUp ? (
                <SignUpForm
                  fullName={fullName}
                  email={email}
                  password={password}
                  agreeToTerms={agreeToTerms}
                  passwordValidation={passwordValidation}
                  showWarning={showSignUpWarning}
                  onFullNameChange={onFullNameChange}
                  onEmailChange={onEmailChange}
                  onPasswordChange={onPasswordChange}
                  onAgreeToTermsChange={onAgreeToTermsChange}
                  onToggleMode={onToggleMode}
                  onSubmit={onSubmit}
                  isLoading={isLoading}
                />
              ) : (
                <SignInForm
                  email={email}
                  password={password}
                  rememberMe={rememberMe}
                  onEmailChange={onEmailChange}
                  onPasswordChange={onPasswordChange}
                  onRememberMeChange={onRememberMeChange}
                  onToggleMode={onToggleMode}
                  onForgotPassword={onForgotPassword}
                  onSubmit={onSubmit}
                  isLoading={isLoading}
                />
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
