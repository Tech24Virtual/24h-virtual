import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { TrustLogosSection } from "@/components/home/TrustLogosSection";
import { FeaturesGridSection } from "@/components/home/FeaturesGridSection";
import { ServicesSection } from "@/components/home/ServicesSection";
import { PricingLadderTeaser } from "@/components/home/PricingLadderTeaser";
import { PlatformProofSection } from "@/components/home/PlatformProofSection";

import { IndustriesSection } from "@/components/home/IndustriesSection";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { StatsSection } from "@/components/home/StatsSection";
import { PromoBannerSection } from "@/components/home/PromoBannerSection";
import { PricingPreviewSection } from "@/components/home/PricingPreviewSection";
import { FAQSection } from "@/components/home/FAQSection";
import { CTASection } from "@/components/home/CTASection";
import { SEO, organizationSchema } from "@/components/SEO";
import { LocationSuggestionPopup } from "@/components/LocationSuggestionPopup";

const Index = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Virtual Receptionists and Receptionist Operations Platform"
        description="Live trilingual receptionists, encoded scripts and routing, per-second billing, and a real client portal. Launch in days. AI and Hybrid coverage launching soon."
        canonical="/"
        jsonLd={organizationSchema}
      />
      <Navigation />
      <LocationSuggestionPopup />
      <main>
        <HeroSection />
        <TrustLogosSection />
        <FeaturesGridSection />
        <ServicesSection />
        <PricingLadderTeaser />
        <PromoBannerSection />
        <PlatformProofSection />
        <IndustriesSection />
        <HowItWorksSection />
        
        <StatsSection />
        <PricingPreviewSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
