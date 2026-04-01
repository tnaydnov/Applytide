/**
 * HeroSection Component
 * 
 * Epic hero section with floating job cards, particle effects, and live stats.
 * Features: Product mockup, 3D effects, gradient animations, counter stats.
 */

import { motion, useMotionValue, useTransform } from "motion/react";
import { ArrowRight, Sparkles, Briefcase, Users, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import { heroContent } from "../../constants/homePageContent";
import { useState, useEffect } from "react";
const logo = "/images/logomark.png";

interface HeroSectionProps {
  scrollVelocity: number;
}

// Massive job pool - diverse industries and roles
const JOB_POOL = [
  // Tech
  { company: "Google", role: "Senior Developer", status: "offer" },
  { company: "Meta", role: "Product Manager", status: "interview" },
  { company: "Apple", role: "UX Designer", status: "applied" },
  { company: "Amazon", role: "Data Scientist", status: "interview" },
  { company: "Microsoft", role: "Cloud Architect", status: "applied" },
  { company: "Netflix", role: "ML Engineer", status: "offer" },
  { company: "Salesforce", role: "DevOps Engineer", status: "interview" },
  { company: "Adobe", role: "UI Designer", status: "applied" },
  
  // Finance
  { company: "Goldman Sachs", role: "Financial Analyst", status: "interview" },
  { company: "JP Morgan", role: "Investment Banking", status: "applied" },
  { company: "Deloitte", role: "Strategy Consultant", status: "offer" },
  { company: "KPMG", role: "Tax Advisor", status: "interview" },
  { company: "BlackRock", role: "Portfolio Manager", status: "applied" },
  
  // Healthcare
  { company: "Pfizer", role: "Clinical Researcher", status: "interview" },
  { company: "Mayo Clinic", role: "Nurse Practitioner", status: "applied" },
  { company: "Johnson & Johnson", role: "Medical Writer", status: "offer" },
  { company: "CVS Health", role: "Pharmacy Manager", status: "interview" },
  
  // Education
  { company: "Khan Academy", role: "Curriculum Designer", status: "applied" },
  { company: "Coursera", role: "Learning Specialist", status: "interview" },
  { company: "MIT", role: "Research Assistant", status: "offer" },
  { company: "Duolingo", role: "Content Creator", status: "applied" },
  
  // Marketing & Media
  { company: "Ogilvy", role: "Creative Director", status: "interview" },
  { company: "WPP", role: "Brand Strategist", status: "applied" },
  { company: "The New York Times", role: "Journalist", status: "offer" },
  { company: "Spotify", role: "Content Manager", status: "interview" },
  { company: "TikTok", role: "Social Media Lead", status: "applied" },
  
  // Retail & Consumer
  { company: "Nike", role: "Product Designer", status: "offer" },
  { company: "IKEA", role: "Store Manager", status: "interview" },
  { company: "Starbucks", role: "District Manager", status: "applied" },
  { company: "Unilever", role: "Brand Manager", status: "interview" },
  
  // Engineering
  { company: "Tesla", role: "Mechanical Engineer", status: "offer" },
  { company: "SpaceX", role: "Aerospace Engineer", status: "interview" },
  { company: "Boeing", role: "Systems Engineer", status: "applied" },
  { company: "GE", role: "Electrical Engineer", status: "interview" },
  
  // Creative & Design
  { company: "Pixar", role: "3D Animator", status: "offer" },
  { company: "Airbnb", role: "Design Lead", status: "interview" },
  { company: "IDEO", role: "Design Researcher", status: "applied" },
  { company: "Pentagram", role: "Graphic Designer", status: "interview" },
  
  // Non-profit & Government
  { company: "UN", role: "Program Coordinator", status: "applied" },
  { company: "Red Cross", role: "Relief Worker", status: "interview" },
  { company: "NASA", role: "Space Scientist", status: "offer" },
  { company: "WHO", role: "Health Policy Analyst", status: "applied" },
  
  // Hospitality & Travel
  { company: "Marriott", role: "Hotel Manager", status: "interview" },
  { company: "Delta Airlines", role: "Operations Manager", status: "applied" },
  { company: "Hilton", role: "Event Coordinator", status: "offer" },
  
  // Legal
  { company: "Baker McKenzie", role: "Corporate Lawyer", status: "interview" },
  { company: "Latham & Watkins", role: "Legal Counsel", status: "applied" },
  
  // Science & Research
  { company: "MIT Media Lab", role: "Research Scientist", status: "offer" },
  { company: "CERN", role: "Particle Physicist", status: "interview" },
  { company: "Moderna", role: "Biotech Researcher", status: "applied" },
] as const;

// Floating Job Card Component with auto-refresh
function FloatingJobCard({ 
  initialDelay,
  cardIndex,
}: { 
  initialDelay: number;
  cardIndex: number;
}) {
  const statusColors = {
    applied: "#60a5fa",
    interview: "#fb923c",
    offer: "#34d399",
  };

  // Helper to get random position ensuring no overlap
  const getRandomPosition = () => {
    const positionPool = [
      // Top left area
      { x: 5, y: 10 }, { x: 8, y: 18 }, { x: 12, y: 12 }, { x: 15, y: 22 },
      { x: 18, y: 15 }, { x: 10, y: 25 }, { x: 20, y: 8 },
      
      // Top right area
      { x: 75, y: 12 }, { x: 78, y: 20 }, { x: 82, y: 15 }, { x: 72, y: 18 },
      { x: 85, y: 10 }, { x: 88, y: 22 }, { x: 80, y: 8 },
      
      // Middle left area
      { x: 8, y: 40 }, { x: 12, y: 45 }, { x: 15, y: 38 }, { x: 10, y: 48 },
      { x: 18, y: 42 }, { x: 5, y: 50 },
      
      // Middle right area
      { x: 80, y: 38 }, { x: 76, y: 42 }, { x: 82, y: 45 }, { x: 78, y: 48 },
      { x: 85, y: 40 }, { x: 88, y: 50 },
      
      // Bottom left area
      { x: 10, y: 62 }, { x: 15, y: 68 }, { x: 12, y: 65 }, { x: 18, y: 70 },
      { x: 8, y: 75 }, { x: 20, y: 72 }, { x: 14, y: 78 },
      
      // Bottom right area
      { x: 72, y: 60 }, { x: 75, y: 65 }, { x: 78, y: 62 }, { x: 70, y: 68 },
      { x: 82, y: 70 }, { x: 76, y: 75 }, { x: 88, y: 72 },
      
      // Center variations
      { x: 30, y: 30 }, { x: 35, y: 45 }, { x: 40, y: 35 }, { x: 45, y: 50 },
      { x: 50, y: 40 }, { x: 55, y: 30 }, { x: 60, y: 45 }, { x: 65, y: 35 },
    ];
    
    return positionPool[Math.floor(Math.random() * positionPool.length)];
  };

  const getRandomJob = () => {
    return JOB_POOL[Math.floor(Math.random() * JOB_POOL.length)];
  };

  // State for current job and position
  const [currentJob, setCurrentJob] = useState(getRandomJob);
  const [position, setPosition] = useState(getRandomPosition);

  // Auto-refresh every 8 seconds with staggered timing
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentJob(getRandomJob());
      setPosition(getRandomPosition());
    }, 8000 + cardIndex * 500); // Stagger by card index

    return () => clearInterval(interval);
  }, [cardIndex]);

  return (
    <motion.div
      key={`${currentJob.company}-${currentJob.role}-${position.x}-${position.y}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ 
        opacity: [0, 0.6, 0.6, 0],
        scale: [0.95, 1, 1, 0.95],
        y: [0, -15, -15, -30],
      }}
      transition={{
        duration: 8,
        delay: initialDelay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className="absolute pointer-events-none"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
      }}
    >
      <div
        className="rounded-xl p-3 shadow-sm"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.35)",
          border: "1px solid rgba(159, 95, 128, 0.15)",
          width: 240,
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="flex items-start gap-2.5">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: `${statusColors[currentJob.status as keyof typeof statusColors]}18`,
              border: `1px solid ${statusColors[currentJob.status as keyof typeof statusColors]}35`,
            }}
          >
            <Briefcase className="w-4.5 h-4.5" style={{ color: statusColors[currentJob.status as keyof typeof statusColors], opacity: 0.75 }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm truncate" style={{ color: "#383e4e", opacity: 0.85, fontWeight: 600 }}>
              {currentJob.role}
            </div>
            <div className="text-xs truncate mt-0.5" style={{ color: "#5a5e6a", opacity: 0.65 }}>
              {currentJob.company}
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div 
            className="text-xs px-2 py-0.5 rounded-full capitalize"
            style={{
              backgroundColor: `${statusColors[currentJob.status as keyof typeof statusColors]}20`,
              color: statusColors[currentJob.status as keyof typeof statusColors],
              fontWeight: 500,
              opacity: 0.8,
            }}
          >
            {currentJob.status}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Animated Counter Component
function AnimatedStat({ value, label, delay, icon: Icon }: { 
  value: number; 
  label: string; 
  delay: number; 
  icon: React.ElementType;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    const timer = setTimeout(() => {
      let start = 0;
      const increment = value / 50;
      intervalId = setInterval(() => {
        start += increment;
        if (start >= value) {
          setCount(value);
          clearInterval(intervalId);
        } else {
          setCount(Math.floor(start));
        }
      }, 30);
    }, delay);
    return () => {
      clearTimeout(timer);
      if (intervalId !== undefined) clearInterval(intervalId);
    };
  }, [value, delay]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="text-center"
    >
      <div className="flex items-center justify-center gap-2 mb-1">
        <Icon className="w-5 h-5" style={{ color: "#9F5F80" }} />
        <div className="text-3xl md:text-4xl" style={{ color: "#383e4e", fontWeight: 700 }}>
          {count.toLocaleString()}+
        </div>
      </div>
      <div className="text-sm" style={{ color: "#5a5e6a", opacity: 0.8 }}>
        {label}
      </div>
    </motion.div>
  );
}

// Particle Background
function ParticleField() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(25)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            backgroundColor: i % 3 === 0 ? "#9F5F80" : "#383e4e",
            opacity: 0.08,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.08, 0.2, 0.08],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 3.5 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
}

export function HeroSection({ scrollVelocity }: HeroSectionProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();

  // Mouse tracking for 3D effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [10, -10]);
  const rotateY = useTransform(mouseX, [-300, 300], [-10, 10]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set(e.clientX - centerX);
    mouseY.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  // 4 cards with staggered initial delays
  const delays = [0, 1.5, 3, 4.5];

  return (
    <motion.section
      id="hero"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: false, amount: 0.3 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen flex items-center justify-center relative px-4 sm:px-8 overflow-hidden"
      style={{ scrollSnapAlign: "start" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Particle Background */}
      <ParticleField />

      {/* Animated Gradient Orbs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 50, 0],
          y: [0, 30, 0],
        }}
        transition={{ duration: 8, repeat: Infinity }}
        style={{
          background: "radial-gradient(circle, #9F5F80, transparent)",
        }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl"
        animate={{
          scale: [1, 1.3, 1],
          x: [0, -50, 0],
          y: [0, -30, 0],
        }}
        transition={{ duration: 10, repeat: Infinity }}
        style={{
          background: "radial-gradient(circle, #383e4e, transparent)",
        }}
      />

      {/* Floating Job Cards - Self-Refreshing */}
      <div className="absolute inset-0 pointer-events-none hidden lg:block">
        {delays.map((delay, i) => (
          <FloatingJobCard 
            key={i} 
            initialDelay={delay}
            cardIndex={i}
          />
        ))}
      </div>

      {/* Main Content */}
      <motion.div
        className="relative z-10 max-w-6xl mx-auto text-center"
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Beta Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
          style={{
            backgroundColor: "rgba(159, 95, 128, 0.1)",
            border: "1px solid rgba(159, 95, 128, 0.2)",
          }}
        >
          <Sparkles className="w-4 h-4" style={{ color: "#9F5F80" }} />
          <span style={{ color: "#9F5F80" }}>
            {heroContent.badge[language]}
          </span>
        </motion.div>

        {/* Animated Logo */}
        <motion.div
          className="flex items-center justify-center mb-8 relative"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
        >
          <motion.div
            whileHover={{ scale: 1.1, rotateZ: 5 }}
            transition={{ duration: 0.4 }}
            className="relative"
          >
            <img src={logo} alt="Applytide" className="w-24 h-24 relative z-10" />
            
            {/* Pulsing Glow */}
            <motion.div
              className="absolute inset-0 -z-10"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
              }}
              style={{
                background: "radial-gradient(circle, rgba(159, 95, 128, 0.6), transparent 70%)",
                filter: "blur(30px)",
              }}
            />
          </motion.div>
        </motion.div>

        {/* Epic Title */}
        <motion.h1
          className="mb-4 relative"
          style={{
            fontSize: "clamp(2.5rem, 10vw, 6rem)",
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
          >
            <span
              style={{
                background: "linear-gradient(135deg, #383e4e 0%, #5a5e6a 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                display: "block",
              }}
            >
              {heroContent.title.line1[language]}
            </span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
          >
            <span
              style={{
                background: "linear-gradient(135deg, #9F5F80 0%, #c77a9f 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                display: "block",
              }}
            >
              {heroContent.title.line2[language]}
            </span>
          </motion.div>
        </motion.h1>

        {/* Power Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mb-10 max-w-2xl mx-auto"
          style={{
            fontSize: "clamp(1rem, 2vw, 1.25rem)",
            color: "#5a5e6a",
            lineHeight: 1.6,
          }}
        >
          {heroContent.subtitle[language]}
        </motion.p>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mb-12"
        >
          <AnimatedStat 
            value={150} 
            label={heroContent.stats.users[language]} 
            delay={1.2} 
            icon={Users}
          />
          <AnimatedStat 
            value={800} 
            label={heroContent.stats.applications[language]} 
            delay={1.4} 
            icon={Briefcase}
          />
          <AnimatedStat 
            value={45} 
            label={heroContent.stats.offers[language]} 
            delay={1.6} 
            icon={CheckCircle2}
          />
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <motion.button
            whileHover={{ 
              scale: 1.05, 
              boxShadow: "0 20px 60px rgba(159, 95, 128, 0.4)",
            }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/signup")}
            className="group px-10 py-5 rounded-2xl flex items-center gap-3 transition-all relative overflow-hidden"
            style={{
              backgroundColor: "#9F5F80",
              color: "#ffffff",
              fontSize: "1.25rem",
              fontWeight: 600,
            }}
          >
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 -z-10"
              animate={{
                x: ["-200%", "200%"],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 1,
              }}
              style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
              }}
            />
            {heroContent.cta.primary[language]}
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ArrowRight className="w-5 h-5" />
            </motion.div>
          </motion.button>
        </motion.div>

        {/* Trust Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="mt-8 flex items-center justify-center gap-2"
          style={{ color: "#5a5e6a", fontSize: "0.875rem" }}
        >
          <CheckCircle2 className="w-4 h-4" style={{ color: "#34d399" }} />
          <span>
            {heroContent.trustBadge[language]}
          </span>
        </motion.div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: scrollVelocity > 0.5 ? 0 : 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="flex flex-col items-center gap-2"
        >
          <span style={{ color: "#9F5F80", fontSize: "0.75rem", opacity: 0.7 }}>
            {language === "en" ? "Scroll" : "גלילה"}
          </span>
          <div
            style={{
              width: 2,
              height: 30,
              backgroundColor: "#9F5F80",
              borderRadius: 1,
              opacity: 0.5,
            }}
          />
        </motion.div>
      </motion.div>
    </motion.section>
  );
}
