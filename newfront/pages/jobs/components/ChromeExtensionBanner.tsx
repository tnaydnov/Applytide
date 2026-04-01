/**
 * ChromeExtensionBanner Component
 * Eye-catching banner promoting the Chrome extension - Coral Neon Edition
 */

import { motion } from 'motion/react';
import { Chrome, X, Zap, Sparkles, ArrowRight, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { CHROME_EXTENSION_URL } from '../../../constants/urls';

interface ChromeExtensionBannerProps {
  onDismiss: () => void;
  isRTL?: boolean;
}

export function ChromeExtensionBanner({ onDismiss, isRTL = false }: ChromeExtensionBannerProps) {
  const navigate = useNavigate();

  const handleInstall = () => {
    window.open(
      CHROME_EXTENSION_URL,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleLearnMore = () => {
    navigate('/how-it-works#extension');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, type: 'spring', bounce: 0.3 }}
      className="chrome-extension-banner relative overflow-hidden rounded-3xl mb-8 shadow-2xl"
      style={{
        background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E72 25%, #FB5607 50%, #FF006E 75%, #C9184A 100%)',
      }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Neon Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, 0.3) 25%, rgba(255, 255, 255, 0.3) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, 0.3) 75%, rgba(255, 255, 255, 0.3) 76%, transparent 77%, transparent),
              linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, 0.3) 25%, rgba(255, 255, 255, 0.3) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, 0.3) 75%, rgba(255, 255, 255, 0.3) 76%, transparent 77%, transparent)
            `,
            backgroundSize: '50px 50px',
          }}
        />

        {/* Floating Gradient Orbs */}
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.4, 0.6, 0.4],
            x: [0, 40, 0],
            y: [0, -40, 0],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -top-20 -right-20 w-80 h-80 bg-gradient-to-br from-yellow-300/40 to-orange-400/40 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3],
            x: [0, -40, 0],
            y: [0, 40, 0],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -bottom-20 -left-20 w-96 h-96 bg-gradient-to-br from-pink-400/40 to-purple-500/40 rounded-full blur-3xl"
        />

        {/* Neon Sparkles */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              delay: i * 0.4,
              ease: 'easeInOut',
            }}
            className="absolute"
            style={{
              left: `${15 + i * 12}%`,
              top: `${25 + (i % 3) * 25}%`,
            }}
          >
            <div className="w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
          </motion.div>
        ))}

        {/* Animated Diagonal Lines */}
        <motion.div
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute inset-0 opacity-10"
          style={{
            background: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.5) 35px, rgba(255,255,255,0.5) 37px)',
          }}
        />
      </div>

      {/* Close Button */}
      <button
        onClick={onDismiss}
        className={`
          absolute ${isRTL ? 'left-4' : 'right-4'} top-4 
          z-20
          p-2 rounded-full
          bg-white/20 hover:bg-white/30
          backdrop-blur-md
          text-white hover:text-white 
          transition-all duration-200
          hover:scale-110 hover:rotate-90
          border border-white/30
          shadow-lg
        `}
        aria-label="Dismiss"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Content Container */}
      <div className="relative z-10 p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
          {/* Extension Preview Image - Simple floating icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, duration: 0.6, type: 'spring', bounce: 0.4 }}
            className="hidden lg:block flex-shrink-0"
          >
            <motion.div
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="relative"
            >
              {/* Glow effect behind image */}
              <div className="absolute inset-0 bg-white/30 rounded-full blur-2xl scale-110" />
              
              {/* Chrome icon in circle */}
              <div className="relative w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-white/50">
                <Chrome className="w-20 h-20" style={{
                  background: 'linear-gradient(135deg, #FF6B6B, #FB5607, #FF006E)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }} strokeWidth={1.5} />
                
                {/* Animated pulse ring */}
                <motion.div
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 0, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeOut',
                  }}
                  className="absolute inset-0 border-4 border-white rounded-full"
                />
              </div>
            </motion.div>
          </motion.div>

          {/* Text Content */}
          <div className="flex-1 text-center md:text-left">
            <motion.div
              initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-center md:justify-start gap-2 mb-3 flex-wrap"
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <Zap className="h-7 w-7 text-yellow-300 drop-shadow-[0_0_8px_rgba(255,235,59,0.8)]" fill="currentColor" />
              </motion.div>
              <h3 className="text-2xl md:text-3xl font-bold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.3)]">
                {isRTL ? 'שמור משרות בקליק אחד!' : 'Save Jobs with One Click!'}
              </h3>
              <motion.div
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <Sparkles className="h-6 w-6 text-yellow-200 drop-shadow-[0_0_8px_rgba(255,235,59,0.8)]" fill="currentColor" />
              </motion.div>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-base md:text-lg text-white/95 mb-6 max-w-2xl font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.2)]"
            >
              {isRTL
                ? 'התקן את תוסף Chrome של Applytide ושמור משרות ישירות מכל לוח משרות - LinkedIn, Indeed, Glassdoor ועוד.'
                : 'Install the Applytide Chrome extension and save jobs directly from any job board - LinkedIn, Indeed, Glassdoor, and more.'}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={handleInstall}
                  size="lg"
                  className="
                    bg-white text-[#FF006E] hover:bg-yellow-50
                    px-8 py-6 text-lg font-bold
                    shadow-2xl hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]
                    border-2 border-white
                    transition-all duration-300
                    group
                  "
                  style={{
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 255, 255, 0.4)',
                  }}
                >
                  <Download className="h-5 w-5 mr-2 group-hover:animate-bounce" />
                  {isRTL ? 'התקן את התוסף בחינם' : 'Install Free Extension'}
                  <motion.div
                    animate={{
                      x: [0, 5, 0],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </motion.div>
                </Button>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={handleLearnMore}
                  size="lg"
                  variant="outline"
                  className="
                    bg-white/10 text-white hover:bg-white/20
                    border-2 border-white/50 hover:border-white
                    px-6 py-6 text-base font-semibold
                    backdrop-blur-md
                    shadow-lg hover:shadow-xl
                    transition-all duration-300
                  "
                >
                  {isRTL ? 'למד עוד' : 'Learn More'}
                </Button>
              </motion.div>
            </motion.div>

            {/* Feature Badges */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-6"
            >
              {[
                { icon: '⚡', text: isRTL ? 'עובד בכל לוחות המשרות' : 'Works on All Job Boards', color: 'from-yellow-400/20 to-orange-400/20 border-yellow-300/40' },
                { icon: '💾', text: isRTL ? 'שמירה מיידית' : 'Instant Save', color: 'from-pink-400/20 to-purple-400/20 border-pink-300/40' },
                { icon: '🎯', text: isRTL ? '100% בחינם' : '100% Free', color: 'from-green-400/20 to-teal-400/20 border-green-300/40' },
              ].map((badge, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + idx * 0.1 }}
                  whileHover={{ scale: 1.1 }}
                  className={`
                    px-4 py-2 rounded-full
                    bg-gradient-to-r ${badge.color}
                    backdrop-blur-sm
                    border-2
                    text-white text-sm font-medium
                    shadow-lg
                    flex items-center gap-2
                  `}
                >
                  <span className="text-lg">{badge.icon}</span>
                  <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]">{badge.text}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Bottom Shine Effect */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-50" />
    </motion.div>
  );
}

export default ChromeExtensionBanner;