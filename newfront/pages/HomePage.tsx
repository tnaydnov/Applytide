/**
 * HomePage Component
 * 
 * Main landing page for Applytide.
 * Orchestrates all home page sections with smooth scrolling and navigation.
 * 
 * Sections:
 * - Hero: Main intro with logo and CTA
 * - Features: Key features grid
 * - Stats: Platform statistics
 * - Reviews: User testimonials
 * - CTA: Final call-to-action
 */

import { useState, useRef, useEffect } from "react";
import { useScroll } from "motion/react";
import { useLanguage } from "../contexts/LanguageContext";
import { HeroSection } from "./home/HeroSection";
import { FeaturesSection } from "./home/FeaturesSection";
import { StatsSection } from "./home/StatsSection";
import { ReviewsSection } from "./home/ReviewsSection";
import { CTASection } from "./home/CTASection";
import { NavigationDots } from "./home/NavigationDots";
import { LandingBackground } from "../components/background/LandingBackground";

export function HomePage() {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState(0);
  const [scrollVelocity, setScrollVelocity] = useState(0);

  const { scrollY } = useScroll();

  // Track scroll velocity for animations
  useEffect(() => {
    let lastScrollY = 0;
    let lastTime = Date.now();

    const unsubscribe = scrollY.on("change", (latest) => {
      const now = Date.now();
      const deltaY = latest - lastScrollY;
      const deltaTime = now - lastTime;
      const velocity = Math.abs(deltaY / deltaTime);

      setScrollVelocity(velocity);
      lastScrollY = latest;
      lastTime = now;
    });

    return () => unsubscribe();
  }, [scrollY]);

  // Track active section based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight / 2;
      const vh = window.innerHeight;

      // Define section boundaries
      const sectionBoundaries = [
        { start: 0, end: vh * 0.9 }, // Hero
        { start: vh * 0.9, end: vh * 2.3 }, // Features
        { start: vh * 2.3, end: vh * 3.3 }, // Stats
        { start: vh * 3.3, end: vh * 4.3 }, // Reviews
        { start: vh * 4.3, end: Infinity }, // CTA
      ];

      const current = sectionBoundaries.findIndex(
        (section) => scrollPosition >= section.start && scrollPosition < section.end
      );
      if (current !== -1) setActiveSection(current);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Define navigation sections
  const sections = [
    { label: t("Home", "בית"), id: "hero" },
    { label: t("Features", "יכולות"), id: "features" },
    { label: t("Stats", "נתונים"), id: "stats" },
    { label: t("Reviews", "ביקורות"), id: "reviews" },
    { label: t("Start", "התחל"), id: "cta" },
  ];

  const scrollToSection = (index: number) => {
    const sectionIds = ["hero", "features", "stats", "reviews", "cta"];
    const element = document.getElementById(sectionIds[index]);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      {/* Global Animated Background */}
      <LandingBackground />
      
      <div ref={containerRef} className="relative">
        {/* Navigation Dots */}
        <NavigationDots
          sections={sections}
          activeSection={activeSection}
          onSectionClick={scrollToSection}
        />

        {/* Page Sections */}
        <HeroSection scrollVelocity={scrollVelocity} />
        <FeaturesSection />
        <StatsSection />
        <ReviewsSection />
        <CTASection />
      </div>
    </>
  );
}
