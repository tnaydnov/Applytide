/**
 * Pricing Page - Main orchestrator for the pricing page
 * 
 * @module pages/pricing/PricingPage
 * @description Main pricing page component that composes all pricing sections.
 * Manages the billing period state (monthly/yearly) and passes it down to child components.
 * 
 * @architecture
 * - Uses PageContainer for consistent page layout
 * - PricingBackground provides animated background effects
 * - Manages billing period state at the top level
 * - All content/translations are in /constants/pricingContent.ts
 * 
 * @responsive
 * - All child components are fully responsive
 * - Mobile-first design approach
 * - Supports all screen sizes from 320px to 4K
 * 
 * @bilingual
 * - Full English and Hebrew support
 * - RTL layout for Hebrew
 * - Context-aware text alignment
 */

import { useState } from "react";
import { PageContainer } from "../../components/layout/PageContainer";
import { PricingBackground } from "../../components/background/PricingBackground";
import { PricingHero } from "./PricingHero";
import { PricingCards } from "./PricingCards";
import { PricingComparison } from "./PricingComparison";
import { PricingFAQ } from "./PricingFAQ";
import { PricingFeatures } from "./PricingFeatures";

/**
 * Billing period type - determines pricing display and calculations
 */
export type BillingPeriod = "monthly" | "yearly";

/**
 * Main Pricing Page Component
 * 
 * @returns {JSX.Element} Complete pricing page with all sections
 * 
 * @example
 * ```tsx
 * // In router configuration
 * <Route path="/pricing" element={<PricingPage />} />
 * ```
 */
export default function PricingPage() {
  // State: billing period toggle (monthly vs yearly)
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");

  return (
    <>
      {/* Animated background with gradient orbs */}
      <PricingBackground />
      
      {/* Main content container with proper spacing */}
      <PageContainer size="full">
        {/* Hero section with title and billing toggle */}
        <PricingHero 
          billingPeriod={billingPeriod} 
          onToggle={setBillingPeriod} 
        />
        
        {/* Pricing cards for all three plans */}
        <PricingCards billingPeriod={billingPeriod} />
        
        {/* Feature highlights section */}
        <PricingFeatures />
        
        {/* Detailed feature comparison table */}
        <PricingComparison />
        
        {/* FAQ section with contact CTA */}
        <PricingFAQ />
      </PageContainer>
    </>
  );
}
