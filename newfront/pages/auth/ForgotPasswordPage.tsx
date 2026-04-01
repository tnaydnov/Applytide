import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Mail, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
const logo = "/images/logomark.png";
import { useCardTilt } from "../../hooks/useCardTilt";
import { useLanguage } from "../../contexts/LanguageContext";
import { authTranslations } from "../../utils/translations";
import { apiFetch } from "../../lib/api";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { language, dir } = useLanguage();
  const isRTL = dir === 'rtl';
  
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const { rotateX, rotateY, handleMouseMove, handleMouseLeave } = useCardTilt();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await apiFetch('/auth/password_reset_request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      // Show success regardless of whether email exists (prevent enumeration)
      setIsSubmitted(true);
    } catch (err) {
      // Still show success message to prevent email enumeration
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
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
              key="forgot-header"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <p className="text-lg md:text-xl mb-1" style={{ color: "#383e4e" }}>
                {authTranslations.resetYourPassword[language]}
              </p>
              <p
                className="text-sm md:text-base"
                style={{ color: "#383e4e", opacity: 0.6 }}
              >
                {authTranslations.resetInstructions[language]}
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
                {authTranslations.checkYourEmail[language]}
              </p>
              <p
                className="text-sm md:text-base"
                style={{ color: "#383e4e", opacity: 0.6 }}
              >
                {authTranslations.emailSent[language]}
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
                  key="forgot-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleSubmit}
                  dir={dir}
                >
                  {/* Email */}
                  <div className="mb-5 md:mb-7">
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
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={authTranslations.emailPlaceholder[language]}
                        required
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

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    whileHover={{ scale: isLoading ? 1 : 1.02 }}
                    whileTap={{ scale: isLoading ? 1 : 0.98 }}
                    className={`w-full py-3 md:py-4 rounded-xl text-white flex items-center justify-center gap-2 transition-all mb-5 md:mb-7 text-sm md:text-base ${isRTL ? 'flex-row-reverse' : ''}`}
                    style={{
                      background: isLoading
                        ? "rgba(159, 95, 128, 0.5)"
                        : "linear-gradient(135deg, #9F5F80, #AF6F90)",
                      boxShadow: "0 10px 30px rgba(159, 95, 128, 0.4)",
                      cursor: isLoading ? "not-allowed" : "pointer",
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
                        <span>{language === 'en' ? 'Sending...' : 'שולח...'}</span>
                      </>
                    ) : (
                      <>
                        <span>{authTranslations.sendResetLink[language]}</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </motion.button>

                  {/* Back to Sign In */}
                  <button
                    type="button"
                    onClick={() => navigate("/signin")}
                    className={`w-full flex items-center justify-center gap-2 text-sm md:text-base transition-all hover:gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}
                    style={{ color: "#BF7FA0" }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>{authTranslations.backToSignIn[language]}</span>
                  </button>
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
                      className="text-lg mb-3"
                      style={{ color: "#b6bac5" }}
                    >
                      {authTranslations.emailSentTo[language]}
                    </p>
                    <p
                      className="text-xl mb-6"
                      style={{ color: "#9F5F80" }}
                    >
                      {email}
                    </p>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "#b6bac5", opacity: 0.7, textAlign: isRTL ? 'right' : 'left' }}
                    >
                      {authTranslations.checkEmailInstructions[language]}
                    </p>
                  </motion.div>

                  {/* Return to Dashboard */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate("/signin")}
                    className={`w-full py-3 md:py-4 rounded-xl text-white flex items-center justify-center gap-2 transition-all text-sm md:text-base mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}
                    style={{
                      background: "linear-gradient(135deg, #9F5F80, #AF6F90)",
                      boxShadow: "0 10px 30px rgba(159, 95, 128, 0.4)",
                    }}
                  >
                    <span>{authTranslations.backToSignIn[language]}</span>
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>

                  {/* Try Again Link */}
                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="text-sm transition-opacity hover:opacity-80 w-full"
                    style={{ color: "#b6bac5", opacity: 0.6 }}
                  >
                    {authTranslations.didntReceiveEmail[language]}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
