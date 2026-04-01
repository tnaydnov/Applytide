/**
 * ScrollWaveReveal Component
 * 
 * Creates a massive wave that "washes over" content as you scroll,
 * revealing new sections with a 3D effect.
 */

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

interface ScrollWaveRevealProps {
  sectionIndex: number;
}

export function ScrollWaveReveal({ sectionIndex }: ScrollWaveRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  // Transform scroll progress to wave movement
  // Wave starts below, rises smoothly to cover content, then drops to reveal
  const waveY = useTransform(
    scrollYProgress,
    [0, 0.25, 0.75, 1],
    ["120%", "-5%", "-5%", "-120%"]
  );

  const waveOpacity = useTransform(
    scrollYProgress,
    [0, 0.15, 0.85, 1],
    [0, 0.9, 0.9, 0]
  );

  const waveScale = useTransform(
    scrollYProgress,
    [0, 0.4, 0.6, 1],
    [0.95, 1.08, 1.08, 0.95]
  );

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Main Wave Layer - Rises and Falls */}
      <motion.div
        className="absolute left-0 right-0 w-full"
        style={{
          y: waveY,
          opacity: waveOpacity,
          scale: waveScale,
          height: "150vh",
          bottom: 0,
        }}
      >
        {/* Wave SVG - Full Width */}
        <svg
          viewBox="0 0 1440 800"
          className="absolute bottom-0 w-full h-full"
          preserveAspectRatio="none"
          style={{ minWidth: "100vw" }}
        >
          <defs>
            <linearGradient id={`wave-gradient-${sectionIndex}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(159, 95, 128, 0.2)" />
              <stop offset="50%" stopColor="rgba(159, 95, 128, 0.15)" />
              <stop offset="100%" stopColor="rgba(159, 95, 128, 0.05)" />
            </linearGradient>
            
            {/* Shadow for 3D effect */}
            <filter id={`wave-shadow-${sectionIndex}`}>
              <feDropShadow dx="0" dy="-20" stdDeviation="30" floodColor="rgba(159, 95, 128, 0.3)" />
            </filter>
          </defs>

          {/* Animated Wave Path */}
          <motion.path
            fill={`url(#wave-gradient-${sectionIndex})`}
            filter={`url(#wave-shadow-${sectionIndex})`}
            initial={{ d: "M0,400 C240,340 480,460 720,400 C960,340 1200,460 1440,400 L1440,800 L0,800 Z" }}
            animate={{
              d: [
                // Wave state 1
                "M0,400 C240,340 480,460 720,400 C960,340 1200,460 1440,400 L1440,800 L0,800 Z",
                // Wave state 2
                "M0,440 C240,500 480,380 720,440 C960,500 1200,380 1440,440 L1440,800 L0,800 Z",
                // Wave state 3
                "M0,420 C240,360 480,480 720,420 C960,360 1200,480 1440,420 L1440,800 L0,800 Z",
                // Back to state 1
                "M0,400 C240,340 480,460 720,400 C960,340 1200,460 1440,400 L1440,800 L0,800 Z",
              ],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: [0.45, 0, 0.55, 1],
            }}
          />

          {/* Secondary Wave Layer for depth */}
          <motion.path
            fill="rgba(90, 94, 106, 0.08)"
            initial={{ d: "M0,500 C320,460 640,540 960,500 C1120,480 1280,520 1440,500 L1440,800 L0,800 Z" }}
            animate={{
              d: [
                "M0,500 C320,460 640,540 960,500 C1120,480 1280,520 1440,500 L1440,800 L0,800 Z",
                "M0,520 C320,560 640,480 960,520 C1120,540 1280,500 1440,520 L1440,800 L0,800 Z",
                "M0,510 C320,470 640,550 960,510 C1120,490 1280,530 1440,510 L1440,800 L0,800 Z",
                "M0,500 C320,460 640,540 960,500 C1120,480 1280,520 1440,500 L1440,800 L0,800 Z",
              ],
            }}
            transition={{
              duration: 14,
              repeat: Infinity,
              ease: [0.45, 0, 0.55, 1],
              delay: 2,
            }}
          />

          {/* Foam/Highlight on top of wave for 3D effect */}
          <motion.path
            fill="rgba(255, 255, 255, 0.1)"
            initial={{ d: "M0,390 C240,330 480,450 720,390 C960,330 1200,450 1440,390 L1440,420 C1200,480 960,360 720,420 C480,480 240,360 0,420 Z" }}
            animate={{
              d: [
                "M0,390 C240,330 480,450 720,390 C960,330 1200,450 1440,390 L1440,420 C1200,480 960,360 720,420 C480,480 240,360 0,420 Z",
                "M0,430 C240,490 480,370 720,430 C960,490 1200,370 1440,430 L1440,460 C1200,400 960,520 720,460 C480,400 240,520 0,460 Z",
                "M0,410 C240,350 480,470 720,410 C960,350 1200,470 1440,410 L1440,440 C1200,500 960,380 720,440 C480,500 240,380 0,440 Z",
                "M0,390 C240,330 480,450 720,390 C960,330 1200,450 1440,390 L1440,420 C1200,480 960,360 720,420 C480,480 240,360 0,420 Z",
              ],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: [0.45, 0, 0.55, 1],
            }}
          />
        </svg>

        {/* Particles in the wave for extra effect */}
        <div className="absolute inset-0">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: Math.random() * 6 + 2,
                height: Math.random() * 6 + 2,
                left: `${Math.random() * 100}%`,
                top: `${30 + Math.random() * 40}%`,
              }}
              animate={{
                y: [0, -35, 0],
                x: [0, Math.random() * 20 - 10, 0],
                opacity: [0.15, 0.35, 0.15],
                scale: [1, 1.3, 1],
              }}
              transition={{
                duration: 4 + Math.random() * 3,
                repeat: Infinity,
                ease: [0.45, 0, 0.55, 1],
                delay: Math.random() * 3,
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
