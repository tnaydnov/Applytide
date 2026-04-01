/**
 * LandingBackground Component
 * 
 * Insane, animated background for the landing page.
 * Features: animated gradients, floating waves, particles, glow effects
 */

import { motion } from "motion/react";

export function LandingBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Animated Gradient Base */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            "linear-gradient(135deg, #e8eaed 0%, #d8dae0 25%, #e0e2e6 50%, #d8dae0 75%, #e8eaed 100%)",
            "linear-gradient(135deg, #d8dae0 0%, #e8eaed 25%, #d8dae0 50%, #e0e2e6 75%, #d8dae0 100%)",
            "linear-gradient(135deg, #e8eaed 0%, #d8dae0 25%, #e0e2e6 50%, #d8dae0 75%, #e8eaed 100%)",
          ],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Large Floating Orbs */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={`orb-${i}`}
          className="absolute rounded-full blur-3xl"
          style={{
            width: 400 + i * 50,
            height: 400 + i * 50,
            left: `${i * 25}%`,
            top: `${i * 15}%`,
            background: i % 2 === 0 
              ? "radial-gradient(circle, rgba(159, 95, 128, 0.15), transparent 70%)"
              : "radial-gradient(circle, rgba(90, 94, 106, 0.1), transparent 70%)",
          }}
          animate={{
            y: [0, -40, 0],
            x: [0, 30, 0],
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 15 + i * 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 2,
          }}
        />
      ))}

      {/* Animated Waves Layer 1 - Full Width */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: "45vh",
        }}
      >
        <svg
          viewBox="0 0 1440 400"
          className="absolute bottom-0 w-full h-full"
          preserveAspectRatio="none"
          style={{ minWidth: "100%" }}
        >
          <defs>
            <linearGradient id="wave1-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(159, 95, 128, 0.15)" />
              <stop offset="100%" stopColor="rgba(159, 95, 128, 0.05)" />
            </linearGradient>
            <filter id="wave1-shadow">
              <feDropShadow dx="0" dy="-10" stdDeviation="20" floodColor="rgba(159, 95, 128, 0.2)" />
            </filter>
          </defs>
          <motion.path
            fill="url(#wave1-gradient)"
            filter="url(#wave1-shadow)"
            initial={{ d: "M0,160 C240,120 480,200 720,160 C960,120 1200,200 1440,160 L1440,400 L0,400 Z" }}
            animate={{
              d: [
                "M0,160 C240,120 480,200 720,160 C960,120 1200,200 1440,160 L1440,400 L0,400 Z",
                "M0,200 C240,240 480,160 720,200 C960,240 1200,160 1440,200 L1440,400 L0,400 Z",
                "M0,180 C240,140 480,220 720,180 C960,140 1200,220 1440,180 L1440,400 L0,400 Z",
                "M0,160 C240,120 480,200 720,160 C960,120 1200,200 1440,160 L1440,400 L0,400 Z",
              ],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          {/* Highlight layer for 3D effect */}
          <motion.path
            fill="rgba(255, 255, 255, 0.08)"
            initial={{ d: "M0,150 C240,110 480,190 720,150 C960,110 1200,190 1440,150 L1440,180 C1200,220 960,140 720,180 C480,220 240,140 0,180 Z" }}
            animate={{
              d: [
                "M0,150 C240,110 480,190 720,150 C960,110 1200,190 1440,150 L1440,180 C1200,220 960,140 720,180 C480,220 240,140 0,180 Z",
                "M0,190 C240,230 480,150 720,190 C960,230 1200,150 1440,190 L1440,220 C1200,180 960,260 720,220 C480,180 240,260 0,220 Z",
                "M0,170 C240,130 480,210 720,170 C960,130 1200,210 1440,170 L1440,200 C1200,240 960,160 720,200 C480,240 240,160 0,200 Z",
                "M0,150 C240,110 480,190 720,150 C960,110 1200,190 1440,150 L1440,180 C1200,220 960,140 720,180 C480,220 240,140 0,180 Z",
              ],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </svg>
      </div>

      {/* Animated Waves Layer 2 - Full Width */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: "38vh",
        }}
      >
        <svg
          viewBox="0 0 1440 350"
          className="absolute bottom-0 w-full h-full"
          preserveAspectRatio="none"
          style={{ minWidth: "100%" }}
        >
          <defs>
            <linearGradient id="wave2-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(90, 94, 106, 0.12)" />
              <stop offset="100%" stopColor="rgba(90, 94, 106, 0.04)" />
            </linearGradient>
          </defs>
          <motion.path
            fill="url(#wave2-gradient)"
            initial={{ d: "M0,140 C320,100 640,180 960,140 C1120,120 1280,160 1440,140 L1440,350 L0,350 Z" }}
            animate={{
              d: [
                "M0,140 C320,100 640,180 960,140 C1120,120 1280,160 1440,140 L1440,350 L0,350 Z",
                "M0,180 C320,220 640,140 960,180 C1120,200 1280,160 1440,180 L1440,350 L0,350 Z",
                "M0,160 C320,120 640,200 960,160 C1120,140 1280,180 1440,160 L1440,350 L0,350 Z",
                "M0,140 C320,100 640,180 960,140 C1120,120 1280,160 1440,140 L1440,350 L0,350 Z",
              ],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2,
            }}
          />
        </svg>
      </div>

      {/* Floating Particles - Slower, independent of scroll */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(25)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 5 + 2,
              height: Math.random() * 5 + 2,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              backgroundColor: i % 3 === 0 ? "#9F5F80" : i % 3 === 1 ? "#5a5e6a" : "#b6bac5",
            }}
            animate={{
              y: [0, -60 - Math.random() * 40, 0],
              x: [0, Math.random() * 30 - 15, 0],
              opacity: [0.08, 0.18, 0.08],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 15 + Math.random() * 15,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 10,
            }}
          />
        ))}
      </div>

      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(56, 62, 78, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56, 62, 78, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />

      {/* Radial Glow Effects */}
      <motion.div
        className="absolute"
        style={{
          width: 600,
          height: 600,
          top: "10%",
          left: "10%",
          background: "radial-gradient(circle, rgba(159, 95, 128, 0.15), transparent 70%)",
          filter: "blur(60px)",
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute"
        style={{
          width: 500,
          height: 500,
          top: "60%",
          right: "5%",
          background: "radial-gradient(circle, rgba(90, 94, 106, 0.12), transparent 70%)",
          filter: "blur(60px)",
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 3,
        }}
      />
    </div>
  );
}
