/**
 * Pricing Page Background
 * 
 * @module components/background/PricingBackground
 * @description Animated background with gradient orbs and subtle grid pattern.
 * Creates depth and visual interest without overwhelming the content.
 * 
 * @features
 * - Three animated gradient orbs (Warm Plum, Indigo, Purple)
 * - Subtle grid pattern overlay
 * - Vignette effect for depth
 * - Smooth continuous animations
 * - Fixed positioning for scroll independence
 * 
 * @performance
 * - Uses GPU-accelerated transforms
 * - Pointer-events: none for no interaction blocking
 * - Optimized animation loops
 * 
 * @design
 * - Low opacity (8-12%) to stay subtle
 * - Colors match pricing page theme
 * - Complementary movement patterns
 */

import { motion } from "motion/react";

/**
 * Pricing Background Component
 * 
 * @returns {JSX.Element} Fixed background with animated orbs
 * 
 * @example
 * ```tsx
 * <PricingBackground />
 * <PageContainer>
 *   // Your content here
 * </PageContainer>
 * ```
 */
export function PricingBackground() {
  return (
    <div 
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      aria-hidden="true"
    >
      {/* Gradient Orb 1 - Top Left (Warm Plum) */}
      <motion.div
        animate={{
          x: [0, 80, 0],
          y: [0, -40, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -top-32 -left-32 w-80 h-80 rounded-full blur-3xl"
        style={{
          background: "radial-gradient(circle, #9F5F80 0%, transparent 65%)",
          opacity: 0.12,
        }}
      />

      {/* Gradient Orb 2 - Right Side (Indigo) */}
      <motion.div
        animate={{
          x: [0, -60, 0],
          y: [0, 80, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-1/4 -right-32 w-96 h-96 rounded-full blur-3xl"
        style={{
          background: "radial-gradient(circle, #6366f1 0%, transparent 65%)",
          opacity: 0.1,
        }}
      />

      {/* Gradient Orb 3 - Bottom Left (Purple) */}
      <motion.div
        animate={{
          x: [0, 50, 0],
          y: [0, -60, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 35,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bottom-32 left-1/4 w-72 h-72 rounded-full blur-3xl"
        style={{
          background: "radial-gradient(circle, #8b5cf6 0%, transparent 65%)",
          opacity: 0.08,
        }}
      />

      {/* Subtle Grid Pattern */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(159, 95, 128, 0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(159, 95, 128, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
          opacity: 0.015,
        }}
      />

      {/* Vignette Effect */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(circle at 50% 50%, transparent 0%, rgba(13, 16, 23, 0.5) 100%)",
        }}
      />
    </div>
  );
}
