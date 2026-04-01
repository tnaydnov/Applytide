/**
 * Pricing Illustrations
 * 
 * @module components/pricing/PricingIllustrations
 * @description Animated SVG illustrations for each pricing plan card.
 * Each illustration features unique animations and gradient colors matching the plan theme.
 * 
 * @components
 * - StarterIllustration: Rotating sphere with pulsing ellipses (Purple/Indigo)
 * - ProIllustration: Rotating rings with breathing effect (Warm Plum/Purple)
 * - PremiumIllustration: Star burst with pulsing center (Amber/Yellow)
 * 
 * @animations
 * - All animations use Motion (Framer Motion) for smooth performance
 * - Continuous loops with varying durations for organic feel
 * - Easing functions for natural motion
 * 
 * @responsive
 * - Fixed size (100x100) for consistency
 * - SVG scales with container
 * - Viewbox ensures proper aspect ratio
 */

import { motion } from "motion/react";

/**
 * Starter Plan Illustration
 * 
 * @description Rotating sphere with pulsing horizontal ellipses.
 * Represents foundational features and getting started.
 * 
 * @animation
 * - 20s continuous Y-axis rotation
 * - Individual ellipses pulse with staggered delays
 * - Alternating gradient colors for depth
 * 
 * @returns {JSX.Element} Animated SVG illustration
 */
export function StarterIllustration() {
  return (
    <motion.svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial={{ rotateY: 0 }}
      animate={{ rotateY: 360 }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="starter-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id="starter-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      
      <g transform="translate(50, 50)">
        {/* Pulsing ellipses forming a sphere */}
        {[...Array(7)].map((_, i) => {
          const y = (i - 3) * 8;
          const width = Math.sqrt(1600 - y * y) * 1.5;
          return (
            <motion.ellipse
              key={i}
              cx="0"
              cy={y}
              rx={width / 2}
              ry="4"
              fill={i % 2 === 0 ? "url(#starter-grad-1)" : "url(#starter-grad-2)"}
              initial={{ scaleX: 0.8 }}
              animate={{ scaleX: [0.8, 1, 0.8] }}
              transition={{ 
                duration: 3, 
                delay: i * 0.2, 
                repeat: Infinity,
                ease: "easeInOut" 
              }}
            />
          );
        })}
        {/* Background glow */}
        <circle cx="0" cy="0" r="40" fill="url(#starter-grad-1)" opacity="0.1" />
      </g>
    </motion.svg>
  );
}

/**
 * Pro Plan Illustration
 * 
 * @description Counter-rotating rings with breathing center circle.
 * Represents advanced features and professional power.
 * 
 * @animation
 * - Outer ring: 15s clockwise rotation
 * - Inner ring: 12s counter-clockwise rotation
 * - Center circle: Breathing scale and opacity
 * - Three different gradient colors
 * 
 * @returns {JSX.Element} Animated SVG illustration
 */
export function ProIllustration() {
  return (
    <motion.svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="pro-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9F5F80" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id="pro-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c084fc" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#e9d5ff" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id="pro-grad-3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      
      <g transform="translate(50, 50)">
        {/* Outer rotating ring */}
        <motion.path
          d="M 25,0 A 25,25 0 0,1 0,25 A 25,25 0 0,1 -25,0 A 25,25 0 0,1 0,-25 A 25,25 0 0,1 25,0 Z M 18,0 A 18,18 0 0,0 0,-18 A 18,18 0 0,0 -18,0 A 18,18 0 0,0 0,18 A 18,18 0 0,0 18,0 Z"
          fill="url(#pro-grad-1)"
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Inner counter-rotating ring */}
        <motion.path
          d="M 15,15 A 22,22 0 0,1 -15,15 A 22,22 0 0,1 -15,-15 A 22,22 0 0,1 15,-15 A 22,22 0 0,1 15,15 Z M 10,10 A 14,14 0 0,0 10,-10 A 14,14 0 0,0 -10,-10 A 14,14 0 0,0 -10,10 A 14,14 0 0,0 10,10 Z"
          fill="url(#pro-grad-2)"
          initial={{ rotate: 45 }}
          animate={{ rotate: -315 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Breathing center circle */}
        <motion.circle 
          cx="0" 
          cy="0" 
          r="30" 
          fill="url(#pro-grad-1)" 
          opacity="0.15"
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.15, 0.25, 0.15]
          }}
          transition={{ 
            duration: 3, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
      </g>
    </motion.svg>
  );
}

/**
 * Premium Plan Illustration
 * 
 * @description Star burst with pulsing center and glowing background.
 * Represents ultimate features and premium automation.
 * 
 * @animation
 * - 6 star points with individual scale pulses
 * - Staggered delays create wave effect
 * - Center circle breathing animation
 * - Radial glow background
 * - Highlight for 3D effect
 * 
 * @returns {JSX.Element} Animated SVG illustration
 */
export function PremiumIllustration() {
  return (
    <motion.svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="premium-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id="premium-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde047" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#fef3c7" stopOpacity="0.5" />
        </linearGradient>
        <radialGradient id="premium-glow">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
      </defs>
      
      <g transform="translate(50, 50)">
        {/* Background glow */}
        <circle cx="0" cy="0" r="40" fill="url(#premium-glow)" />
        
        {/* Star points with staggered pulse animation */}
        {[0, 60, 120, 180, 240, 300].map((angle, i) => (
          <motion.g
            key={i}
            initial={{ rotate: angle, scale: 1 }}
            animate={{ 
              rotate: angle,
              scale: [1, 1.1, 1],
            }}
            transition={{
              scale: {
                duration: 2,
                delay: i * 0.2,
                repeat: Infinity,
                ease: "easeInOut"
              }
            }}
          >
            <path
              d="M 0,0 Q 15,-10 20,-18 Q 25,-22 20,-25 Q 18,-26 15,-20 Q 10,-12 0,0 Z"
              fill={i % 2 === 0 ? "url(#premium-grad-1)" : "url(#premium-grad-2)"}
              opacity="0.9"
            />
          </motion.g>
        ))}
        
        {/* Center breathing circle */}
        <motion.circle
          cx="0"
          cy="0"
          r="10"
          fill="url(#premium-grad-1)"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Highlight for 3D effect */}
        <circle cx="-3" cy="-3" r="4" fill="#ffffff" opacity="0.6" />
      </g>
    </motion.svg>
  );
}
