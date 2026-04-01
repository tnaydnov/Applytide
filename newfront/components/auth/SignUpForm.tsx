import { motion, AnimatePresence } from "motion/react";
import { Mail, Lock, ArrowRight, Check, AlertTriangle, User as UserIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { PasswordRequirements } from "./PasswordRequirements";
import { PasswordValidation } from "../../types";
import { useLanguage } from "../../contexts/LanguageContext";
import { authTranslations } from "../../utils/translations";

interface SignUpFormProps {
  fullName: string;
  email: string;
  password: string;
  agreeToTerms: boolean;
  passwordValidation: PasswordValidation;
  showWarning: boolean;
  onFullNameChange: (name: string) => void;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onAgreeToTermsChange: (checked: boolean) => void;
  onToggleMode: () => void;
  onSubmit?: () => void;
  isLoading?: boolean;
}

export function SignUpForm({
  fullName,
  email,
  password,
  agreeToTerms,
  passwordValidation,
  showWarning,
  onFullNameChange,
  onEmailChange,
  onPasswordChange,
  onAgreeToTermsChange,
  onToggleMode,
  onSubmit,
  isLoading,
}: SignUpFormProps) {
  const { language, dir } = useLanguage();
  const isRTL = dir === 'rtl';

  return (
    <motion.div
      key="signup-form"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      dir={dir}
    >
      {/* Full Name */}
      <div className="mb-4 md:mb-5">
        <label
          className="block text-sm mb-2.5"
          style={{ color: "#b6bac5", opacity: 0.9, textAlign: isRTL ? 'right' : 'left' }}
        >
          {authTranslations.fullName[language]}
        </label>
        <div className="relative">
          <UserIcon
            className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5`}
            style={{ color: "#b6bac5", opacity: 0.5 }}
          />
          <motion.input
            type="text"
            value={fullName}
            onChange={(e) => onFullNameChange(e.target.value)}
            placeholder={authTranslations.fullNamePlaceholder[language]}
            className={`w-full rounded-xl ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 md:py-4 border focus:outline-none transition-all text-sm md:text-base placeholder:text-gray-400`}
            style={{
              backgroundColor: "rgba(182, 186, 197, 0.08)",
              borderColor: "rgba(182, 186, 197, 0.2)",
              color: "#ffffff",
              textAlign: isRTL ? 'right' : 'left',
            }}
            whileFocus={{
              borderColor: "#9F5F80",
              backgroundColor: "rgba(182, 186, 197, 0.12)",
            }}
          />
        </div>
      </div>

      {/* Email */}
      <div className="mb-4 md:mb-5">
        <label
          className="block text-sm mb-2.5"
          style={{ color: "#b6bac5", opacity: 0.9, textAlign: isRTL ? 'right' : 'left' }}
        >
          {authTranslations.emailAddress[language]}
        </label>
        <div className="relative">
          <Mail
            className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5`}
            style={{ color: "#b6bac5", opacity: 0.5 }}
          />
          <motion.input
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder={authTranslations.emailPlaceholder[language]}
            className={`w-full rounded-xl ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 md:py-4 border focus:outline-none transition-all text-sm md:text-base placeholder:text-gray-400`}
            style={{
              backgroundColor: "rgba(182, 186, 197, 0.08)",
              borderColor: "rgba(182, 186, 197, 0.2)",
              color: "#ffffff",
              textAlign: isRTL ? 'right' : 'left',
            }}
            whileFocus={{
              borderColor: "#9F5F80",
              backgroundColor: "rgba(182, 186, 197, 0.12)",
            }}
          />
        </div>
      </div>

      {/* Password */}
      <div className="mb-4 md:mb-5">
        <label
          className="block text-sm mb-2.5"
          style={{ color: "#b6bac5", opacity: 0.9, textAlign: isRTL ? 'right' : 'left' }}
        >
          {authTranslations.password[language]}
        </label>
        <div className="relative">
          <Lock
            className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5`}
            style={{ color: "#b6bac5", opacity: 0.5 }}
          />
          <motion.input
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder={authTranslations.passwordPlaceholder[language]}
            className={`w-full rounded-xl ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 md:py-4 border focus:outline-none transition-all text-sm md:text-base placeholder:text-gray-400`}
            style={{
              backgroundColor: "rgba(182, 186, 197, 0.08)",
              borderColor: "rgba(182, 186, 197, 0.2)",
              color: "#ffffff",
              textAlign: isRTL ? 'right' : 'left',
            }}
            whileFocus={{
              borderColor: "#9F5F80",
              backgroundColor: "rgba(182, 186, 197, 0.12)",
            }}
          />
        </div>
      </div>

      {/* Password Requirements */}
      <PasswordRequirements validation={passwordValidation} />

      {/* Terms Agreement */}
      <div className="mb-4 md:mb-5">
        <label className={`flex items-start gap-3 cursor-pointer group ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="relative mt-0.5">
            <input
              type="checkbox"
              checked={agreeToTerms}
              onChange={(e) => onAgreeToTermsChange(e.target.checked)}
              className="sr-only"
            />
            <div
              className="w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
              style={{
                backgroundColor: agreeToTerms
                  ? "#9F5F80"
                  : "rgba(182, 186, 197, 0.08)",
                borderColor: agreeToTerms
                  ? "#9F5F80"
                  : "rgba(182, 186, 197, 0.2)",
              }}
            >
              {agreeToTerms && <Check className="w-3 h-3 text-white" />}
            </div>
          </div>
          <span className="text-xs" style={{ color: "#b6bac5", opacity: 0.8, textAlign: isRTL ? 'right' : 'left' }}>
            {language === 'en' ? (
              <>
                I agree to the{" "}
                <Link 
                  to="/terms" 
                  className="hover:opacity-80 transition-opacity underline"
                  style={{ color: "#BF7FA0" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  Terms of Service
                </Link>
                {" "}and{" "}
                <Link 
                  to="/privacy" 
                  className="hover:opacity-80 transition-opacity underline"
                  style={{ color: "#BF7FA0" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  Privacy Policy
                </Link>
              </>
            ) : (
              <>
                אני מסכים ל
                <Link 
                  to="/terms" 
                  className="hover:opacity-80 transition-opacity underline"
                  style={{ color: "#BF7FA0" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  תנאי השימוש
                </Link>
                {" "}ול
                <Link 
                  to="/privacy" 
                  className="hover:opacity-80 transition-opacity underline"
                  style={{ color: "#BF7FA0" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  מדיניות הפרטיות
                </Link>
              </>
            )}
          </span>
        </label>
      </div>

      {/* Warning for Terms */}
      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 md:mb-5 p-3 rounded-lg"
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
            }}
            dir={dir}
          >
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#ef4444" }} />
              <p className="text-xs m-0" style={{ color: "#ef4444", textAlign: isRTL ? 'right' : 'left' }}>
                {authTranslations.agreementRequired[language]}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sign Up Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onSubmit}
        disabled={isLoading || showWarning}
        className={`w-full py-3 md:py-4 rounded-xl text-white flex items-center justify-center gap-2 transition-all mb-5 md:mb-7 text-sm md:text-base ${isRTL ? 'flex-row-reverse' : ''} ${(isLoading || showWarning) ? 'opacity-60 cursor-not-allowed' : ''}`}
        style={{
          background: "linear-gradient(135deg, #9F5F80, #AF6F90)",
          boxShadow: "0 10px 30px rgba(159, 95, 128, 0.4)",
        }}
      >
        <span>{isLoading ? (language === 'en' ? 'Creating account...' : 'יוצר חשבון...') : authTranslations.signUpAction[language]}</span>
        {!isLoading && <ArrowRight className="w-5 h-5" />}
      </motion.button>

      {/* Divider */}
      <div className="relative my-5 md:my-7">
        <div className="absolute inset-0 flex items-center">
          <div
            className="w-full border-t"
            style={{
              borderColor: "rgba(182, 186, 197, 0.15)",
            }}
          />
        </div>
        <div className="relative flex justify-center">
          <span
            className="px-4 text-xs"
            style={{
              color: "#b6bac5",
              opacity: 0.5,
              backgroundColor: "#5a5e6a",
            }}
          >
            {authTranslations.continueWith[language]}
          </span>
        </div>
      </div>

      {/* Google SSO */}
      <motion.button
        type="button"
        onClick={() => { window.location.href = '/api/v1/auth/google/login'; }}
        whileHover={{
          scale: 1.02,
          backgroundColor: "rgba(182, 186, 197, 0.12)",
        }}
        whileTap={{ scale: 0.98 }}
        className="w-full py-3 rounded-xl border transition-all flex items-center justify-center gap-2 mb-5 md:mb-7 text-sm md:text-base"
        style={{
          backgroundColor: "rgba(182, 186, 197, 0.08)",
          borderColor: "rgba(182, 186, 197, 0.15)",
          color: "#b6bac5",
        }}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        <span>{authTranslations.continueWithGoogle[language]}</span>
      </motion.button>

      {/* Toggle to Sign In */}
      <p
        className="text-center text-xs md:text-sm"
        style={{ color: "#b6bac5", opacity: 0.7 }}
      >
        {authTranslations.accountExists[language]}{" "}
        <button
          onClick={onToggleMode}
          style={{ color: "#BF7FA0" }}
          className="hover:opacity-80 transition-opacity"
        >
          {authTranslations.signInAction[language]}
        </button>
      </p>
    </motion.div>
  );
}
