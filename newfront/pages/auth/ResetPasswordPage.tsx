import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Lock, ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
const logo = "/images/logomark.png";
import { useCardTilt } from "../../hooks/useCardTilt";
import { PasswordRequirements } from "../../components/auth/PasswordRequirements";
import { validatePassword, isPasswordStrong } from "../../utils/validators";
import { useLanguage } from "../../contexts/LanguageContext";
import { authTranslations } from "../../utils/translations";
import { apiFetch } from "../../lib/api";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token"); // Get reset token from URL
  const { language, dir } = useLanguage();
  const isRTL = dir === 'rtl';

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const cardRef = useRef<HTMLDivElement>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { rotateX, rotateY, handleMouseMove, handleMouseLeave } = useCardTilt();

  // Cleanup redirect timer on unmount
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  const passwordValidation = validatePassword(password);
  const isPasswordValid = isPasswordStrong(password);
  const passwordsMatch = password === confirmPassword && confirmPassword !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!isPasswordValid) {
      setError(language === 'en' ? "Password does not meet requirements" : "הסיסמה אינה עומדת בדרישות");
      return;
    }

    if (!passwordsMatch) {
      setError(authTranslations.passwordsDontMatch[language]);
      return;
    }

    if (!token) {
      setError(language === 'en' ? "Invalid or missing reset token" : "טוקן איפוס לא תקין או חסר");
      return;
    }

    setIsLoading(true);

    try {
      const res = await apiFetch('/auth/password_reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      });

      if (res.ok) {
        setIsSubmitted(true);
        // Redirect to sign in after 3 seconds
        redirectTimerRef.current = setTimeout(() => {
          navigate("/signin");
        }, 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || data.message || (language === 'en' ? 'Password reset failed' : 'איפוס סיסמה נכשל'));
      }
    } catch (err) {
      setError(language === 'en' ? 'Network error. Please try again.' : 'שגיאת רשת. נסה שוב.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setError("");
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    setError("");
  };

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
          {!isSubmitted ? (
            <motion.div
              key="reset-header"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <p className="text-lg md:text-xl mb-1" style={{ color: "#383e4e" }}>
                {authTranslations.createNewPassword[language]}
              </p>
              <p
                className="text-sm md:text-base"
                style={{ color: "#383e4e", opacity: 0.6 }}
              >
                {authTranslations.chooseStrongPassword[language]}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="success-header"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <p className="text-lg md:text-xl mb-1" style={{ color: "#383e4e" }}>
                {authTranslations.passwordResetSuccess[language]}
              </p>
              <p
                className="text-sm md:text-base"
                style={{ color: "#383e4e", opacity: 0.6 }}
              >
                {authTranslations.canSignInNow[language]}
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
        onMouseMove={(e) => handleMouseMove(e, cardRef)}
        onMouseLeave={handleMouseLeave}
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
              {!isSubmitted ? (
                <motion.form
                  key="reset-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleSubmit}
                  dir={dir}
                >
                  {/* New Password */}
                  <div className="mb-4 md:mb-5">
                    <label
                      className="block text-sm mb-2.5"
                      style={{ color: "#b6bac5", opacity: 0.9, textAlign: isRTL ? 'right' : 'left' }}
                    >
                      {authTranslations.newPassword[language]}
                    </label>
                    <div className="relative">
                      <Lock
                        className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5`}
                        style={{ color: "#b6bac5", opacity: 0.5 }}
                      />
                      <motion.input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        placeholder={authTranslations.passwordPlaceholder[language]}
                        required
                        className={`w-full rounded-xl ${isRTL ? 'pr-12 pl-12' : 'pl-12 pr-12'} py-3 md:py-4 border focus:outline-none transition-all text-sm md:text-base placeholder:text-gray-400`}
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
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80`}
                        style={{ color: "#b6bac5", opacity: 0.5 }}
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Password Requirements */}
                  <PasswordRequirements validation={passwordValidation} />

                  {/* Confirm New Password */}
                  <div className="mb-4 md:mb-5">
                    <label
                      className="block text-sm mb-2.5"
                      style={{ color: "#b6bac5", opacity: 0.9, textAlign: isRTL ? 'right' : 'left' }}
                    >
                      {authTranslations.confirmNewPassword[language]}
                    </label>
                    <div className="relative">
                      <Lock
                        className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5`}
                        style={{ color: "#b6bac5", opacity: 0.5 }}
                      />
                      <motion.input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                        placeholder={authTranslations.passwordPlaceholder[language]}
                        required
                        className={`w-full rounded-xl ${isRTL ? 'pr-12 pl-12' : 'pl-12 pr-12'} py-3 md:py-4 border focus:outline-none transition-all text-sm md:text-base placeholder:text-gray-400`}
                        style={{
                          backgroundColor: "rgba(182, 186, 197, 0.08)",
                          borderColor: confirmPassword
                            ? passwordsMatch
                              ? "rgba(34, 197, 94, 0.5)"
                              : "rgba(239, 68, 68, 0.5)"
                            : "rgba(182, 186, 197, 0.2)",
                          color: "#ffffff",
                          textAlign: isRTL ? 'right' : 'left',
                        }}
                        whileFocus={{
                          borderColor: confirmPassword
                            ? passwordsMatch
                              ? "#22c55e"
                              : "#ef4444"
                            : "#9F5F80",
                          backgroundColor: "rgba(182, 186, 197, 0.12)",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80`}
                        style={{ color: "#b6bac5", opacity: 0.5 }}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    {confirmPassword && (
                      <p
                        className="text-xs mt-2"
                        style={{
                          color: passwordsMatch ? "#22c55e" : "#ef4444",
                          textAlign: isRTL ? 'right' : 'left',
                        }}
                      >
                        {passwordsMatch ? authTranslations.passwordsMatch[language] : authTranslations.passwordsDontMatch[language]}
                      </p>
                    )}
                  </div>

                  {/* Error Message */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-5 p-3 rounded-lg"
                      style={{
                        backgroundColor: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                      }}
                      dir={dir}
                    >
                      <p className="text-sm m-0" style={{ color: "#ef4444", textAlign: isRTL ? 'right' : 'left' }}>
                        {error}
                      </p>
                    </motion.div>
                  )}

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={
                      isLoading || !isPasswordValid || !passwordsMatch
                    }
                    whileHover={{
                      scale:
                        isLoading || !isPasswordValid || !passwordsMatch ? 1 : 1.02,
                    }}
                    whileTap={{
                      scale:
                        isLoading || !isPasswordValid || !passwordsMatch ? 1 : 0.98,
                    }}
                    className={`w-full py-3 md:py-4 rounded-xl text-white flex items-center justify-center gap-2 transition-all text-sm md:text-base ${isRTL ? 'flex-row-reverse' : ''}`}
                    style={{
                      background:
                        isLoading || !isPasswordValid || !passwordsMatch
                          ? "rgba(159, 95, 128, 0.5)"
                          : "linear-gradient(135deg, #9F5F80, #AF6F90)",
                      boxShadow: "0 10px 30px rgba(159, 95, 128, 0.4)",
                      cursor:
                        isLoading || !isPasswordValid || !passwordsMatch
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {isLoading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        />
                        <span>{language === 'en' ? 'Resetting...' : 'מאפס...'}</span>
                      </>
                    ) : (
                      <>
                        <span>{authTranslations.resetMyPassword[language]}</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </motion.button>
                </motion.form>
              ) : (
                <motion.div
                  key="success-message"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  dir={dir}
                >
                  {/* Success Icon */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                    className="flex justify-center mb-6"
                  >
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.1))",
                        border: "2px solid rgba(34, 197, 94, 0.3)",
                      }}
                    >
                      <CheckCircle2
                        className="w-10 h-10"
                        style={{ color: "#22c55e" }}
                      />
                    </div>
                  </motion.div>

                  {/* Success Message */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-center mb-6"
                  >
                    <p
                      className="text-lg leading-relaxed"
                      style={{ color: "#b6bac5", textAlign: isRTL ? 'right' : 'left' }}
                    >
                      {authTranslations.passwordResetComplete[language]}
                    </p>
                  </motion.div>

                  {/* Return to Sign In */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate("/signin")}
                    className={`w-full py-3 md:py-4 rounded-xl text-white flex items-center justify-center gap-2 transition-all text-sm md:text-base ${isRTL ? 'flex-row-reverse' : ''}`}
                    style={{
                      background: "linear-gradient(135deg, #9F5F80, #AF6F90)",
                      boxShadow: "0 10px 30px rgba(159, 95, 128, 0.4)",
                    }}
                  >
                    <span>{authTranslations.backToSignIn[language]}</span>
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
