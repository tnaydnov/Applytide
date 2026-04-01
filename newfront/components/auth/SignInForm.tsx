import { motion } from "motion/react";
import { Mail, Lock, ArrowRight, Check } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { authTranslations } from "../../utils/translations";

interface SignInFormProps {
  email: string;
  password: string;
  rememberMe: boolean;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onRememberMeChange: (checked: boolean) => void;
  onToggleMode: () => void;
  onForgotPassword?: () => void;
  onSubmit?: () => void;
  isLoading?: boolean;
}

export function SignInForm({
  email,
  password,
  rememberMe,
  onEmailChange,
  onPasswordChange,
  onRememberMeChange,
  onToggleMode,
  onForgotPassword,
  onSubmit,
  isLoading,
}: SignInFormProps) {
  const { language, dir } = useLanguage();
  const isRTL = dir === 'rtl';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };
  
  return (
    <motion.form
      key="signin-form"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      dir={dir}
      onSubmit={handleSubmit}
    >
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
            onKeyDown={handleKeyDown}
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
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Password */}
      <div className="mb-4 md:mb-5">
        <div className={`flex items-center justify-between mb-2.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <label
            className="text-sm"
            style={{ color: "#b6bac5", opacity: 0.9 }}
          >
            {authTranslations.password[language]}
          </label>
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-xs hover:opacity-80 transition-opacity"
            style={{ color: "#BF7FA0" }}
          >
            {authTranslations.forgotPassword[language]}
          </button>
        </div>
        <div className="relative">
          <Lock
            className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5`}
            style={{ color: "#b6bac5", opacity: 0.5 }}
          />
          <motion.input
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            onKeyDown={handleKeyDown}
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
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Remember Me */}
      <div className="mb-5 md:mb-7">
        <label className={`flex items-center gap-3 cursor-pointer group ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="relative">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => onRememberMeChange(e.target.checked)}
              className="sr-only"
            />
            <div
              className="w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
              style={{
                backgroundColor: rememberMe
                  ? "#9F5F80"
                  : "rgba(182, 186, 197, 0.08)",
                borderColor: rememberMe
                  ? "#9F5F80"
                  : "rgba(182, 186, 197, 0.2)",
              }}
            >
              {rememberMe && <Check className="w-3 h-3 text-white" />}
            </div>
          </div>
          <span className="text-sm" style={{ color: "#b6bac5", opacity: 0.8 }}>
            {authTranslations.rememberMe[language]}
          </span>
        </label>
      </div>

      {/* Sign In Button */}
      <motion.button
        type="submit"
        whileHover={{ scale: isLoading ? 1 : 1.02 }}
        whileTap={{ scale: isLoading ? 1 : 0.98 }}
        disabled={isLoading}
        className={`w-full py-3 md:py-4 rounded-xl text-white flex items-center justify-center gap-2 transition-all mb-5 md:mb-7 text-sm md:text-base ${isRTL ? 'flex-row-reverse' : ''} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
        style={{
          background: "linear-gradient(135deg, #9F5F80, #AF6F90)",
          boxShadow: "0 10px 30px rgba(159, 95, 128, 0.4)",
        }}
      >
        <span>{isLoading ? (language === 'he' ? 'מתחבר...' : 'Signing in...') : authTranslations.signInAction[language]}</span>
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
              backgroundColor: "#4a4e5a",
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

      {/* Toggle to Sign Up */}
      <p
        className="text-center text-xs md:text-sm"
        style={{ color: "#b6bac5", opacity: 0.7 }}
      >
        {authTranslations.noAccount[language]}{" "}
        <button
          onClick={onToggleMode}
          style={{ color: "#BF7FA0" }}
          className="hover:opacity-80 transition-opacity"
        >
          {authTranslations.createAccount[language]}
        </button>
      </p>
    </motion.form>
  );
}
