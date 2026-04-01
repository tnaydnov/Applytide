import { motion } from "motion/react";
import { WaveBackground } from "./WaveBackground";

/**
 * Enhanced background for content pages with subtle decorative elements
 * Option 1: Subtle gradient radials + waves (CURRENT)
 * Option 2: Dot grid pattern
 * Option 3: Floating geometric shapes
 * Option 4: Diagonal stripes
 */
export function PageBackground() {
  return (
    <>
      {/* Base background with subtle radial gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 bg-[#b6bac5]">
        {/* Subtle radial gradient spots - very gentle */}
        <div
          className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full blur-3xl"
          style={{
            background: "radial-gradient(circle, rgba(159, 95, 128, 0.08) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] rounded-full blur-3xl"
          style={{
            background: "radial-gradient(circle, rgba(56, 62, 78, 0.05) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-3xl"
          style={{
            background: "radial-gradient(circle, rgba(159, 95, 128, 0.04) 0%, transparent 70%)",
          }}
        />

        {/* Subtle animated dots/particles */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${4 + Math.random() * 6}px`,
              height: `${4 + Math.random() * 6}px`,
              backgroundColor: i % 3 === 0 ? "rgba(159, 95, 128, 0.15)" : "rgba(56, 62, 78, 0.1)",
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 4 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Wave background at bottom */}
      <WaveBackground />
    </>
  );
}

/**
 * OPTION 2: Dot Grid Pattern
 * Uncomment this to use a subtle dot grid instead
 */
/*
export function PageBackground() {
  return (
    <>
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 bg-[#b6bac5]">
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dot-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="rgba(56, 62, 78, 0.08)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-pattern)" />
        </svg>
      </div>
      <WaveBackground />
    </>
  );
}
*/

/**
 * OPTION 3: Geometric Shapes
 * Uncomment this for floating geometric shapes
 */
/*
export function PageBackground() {
  return (
    <>
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 bg-[#b6bac5]">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              width: `${60 + Math.random() * 100}px`,
              height: `${60 + Math.random() * 100}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              borderRadius: i % 2 === 0 ? "50%" : "8px",
              border: `2px solid ${i % 3 === 0 ? "rgba(159, 95, 128, 0.1)" : "rgba(56, 62, 78, 0.08)"}`,
            }}
            animate={{
              rotate: [0, 360],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 20 + Math.random() * 10,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>
      <WaveBackground />
    </>
  );
}
*/

/**
 * OPTION 4: Diagonal Stripes
 * Uncomment this for subtle diagonal stripes
 */
/*
export function PageBackground() {
  return (
    <>
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 bg-[#b6bac5]">
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="stripe-pattern" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="1" height="80" fill="rgba(56, 62, 78, 0.03)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#stripe-pattern)" />
        </svg>
      </div>
      <WaveBackground />
    </>
  );
}
*/
