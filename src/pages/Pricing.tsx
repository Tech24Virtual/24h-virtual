import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import { ArrowRight, ChevronDown, LayoutGrid, Clock, CheckCircle, Calculator, PhoneOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { PricingTabs, type ServiceId } from "@/components/pricing/PricingTabs";
import { PricingCards } from "@/components/pricing/PricingCards";
import { PricingTable } from "@/components/pricing/PricingTable";
import { CompactComparisonTable } from "@/components/pricing/CompactComparisonTable";
import { BillingToggle } from "@/components/pricing/BillingToggle";
import { VirtualAssistantsSection } from "@/components/pricing/VirtualAssistantsSection";
import { HybridPricingSection } from "@/components/pricing/HybridPricingSection";
import { AddOnsSection } from "@/components/pricing/AddOnsSection";
import { InlinePricingCalculator } from "@/components/pricing/InlinePricingCalculator";
import { PricingLadderExplainer } from "@/components/pricing/PricingLadderExplainer";
import { SEO } from "@/components/SEO";
import { useGatedServices } from "@/hooks/useLaunchFlags";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  aiReceptionistPricing,
  messageAssistantPricing,
  virtualReceptionistPricing,
  virtualSecretaryPricing,
  type ServicePricing,
} from "@/lib/pricingData";

const serviceMap: Record<string, ServicePricing> = {
  "ai-receptionist": aiReceptionistPricing,
  "message-assistant": messageAssistantPricing,
  "virtual-receptionist": virtualReceptionistPricing,
  "virtual-secretary": virtualSecretaryPricing,
};

// Order to fall back to when the preferred service is gated
const FALLBACK_ORDER: ServiceId[] = [
  "virtual-receptionist",
  "message-assistant",
  "virtual-secretary",
  "virtual-assistants",
];

const handleTimePoints = [
  {
    icon: PhoneOff,
    title: "No Charge for Ringing",
    description: "We do not bill you for the seconds a phone is ringing or sitting in a queue. The clock only starts when our team or AI actually picks up.",
  },
  {
    icon: Clock,
    title: "Billed Per Second of Handle Time",
    description: "Handle time means the live conversation plus any after call wrap up. We round to the second, not to the minute, so a 47 second call costs 47 seconds.",
  },
  {
    icon: Calculator,
    title: "Predictable Monthly Caps",
    description: "Pick a tier that includes a generous bundle of monthly minutes. Stay inside it and your bill is fixed. Go over and overage is transparent and rate locked.",
  },
  {
    icon: CheckCircle,
    title: "No Hidden Fees",
    description: "No setup fees, no per call fees, no after hours surcharges, no language premiums. The per minute rate on your plan is the rate you pay, full stop.",
  },
];

const Pricing = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isAnnual, setIsAnnual] = useState(false);
  const { isGated, loading: gatingLoading } = useGatedServices();

  // Resolve initial service: honor URL param unless gated; otherwise fall back.
  const requestedService = (searchParams.get("service") as ServiceId) || "virtual-receptionist";
  const resolveService = (slug: ServiceId): ServiceId => {
    if (!isGated(slug)) return slug;
    const fallback = FALLBACK_ORDER.find((s) => !isGated(s));
    return fallback ?? "virtual-receptionist";
  };

  const [activeService, setActiveService] = useState<ServiceId>(() =>
    resolveService(requestedService)
  );
  const [showAllTiers, setShowAllTiers] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const pricingContentRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // If the active service becomes gated (flag flipped off, or flags loaded later),
  // automatically swap to a non-gated fallback.
  useEffect(() => {
    if (gatingLoading) return;
    if (isGated(activeService)) {
      const fallback = FALLBACK_ORDER.find((s) => !isGated(s)) ?? "virtual-receptionist";
      setActiveService(fallback);
    }
  }, [gatingLoading, isGated, activeService]);

  // Scroll to anchor when arriving with a hash like #handle-time
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 150);
      }
    }
  }, [location.hash]);

  const handleServiceChange = (service: ServiceId) => {
    if (isGated(service)) return; // Defensive guard; tabs already block this.
    setActiveService(service);
    setShowAllTiers(false);
    // Smooth scroll to content
    setTimeout(() => {
      pricingContentRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }, 50);
  };

  // Update URL when service changes
  useEffect(() => {
    setSearchParams({ service: activeService }, { replace: true });
  }, [activeService, setSearchParams]);

  const currentService = serviceMap[activeService];
  const isVirtualAssistants = activeService === "virtual-assistants";
  const isHybridReceptionist = activeService === "hybrid-receptionist";

  return (
    <div className="min-h-screen">
      <SEO
        title="Affordable Virtual Receptionist Plans"
        description="Simple, transparent pricing. Save 40-70% vs in-house staff. No contracts, cancel anytime. Plans start at $49/month."
        canonical="/pricing"
      />
      <Navigation />
      <main>
        {/* Hero Section */}
        <section className="gradient-hero pt-32 pb-20">
          <div className="container-custom">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-3xl mx-auto"
            >
              <h1 className="mb-4">Simple Transparent Pricing</h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8">
                Only pay for what you need. All plans include professional service, 
                no long-term contracts, and a dedicated onboarding specialist.
              </p>
              <BillingToggle isAnnual={isAnnual} setIsAnnual={setIsAnnual} />
            </motion.div>
          </div>
        </section>

        {/* Capability Ladder Explainer */}
        <PricingLadderExplainer />

        {/* Sticky Tab Navigation */}
        <PricingTabs 
          activeService={activeService} 
          onServiceChange={handleServiceChange} 
        />

        {/* Main Pricing Content */}
        <section ref={pricingContentRef} className="section-spacing bg-background scroll-mt-32">
          <div className="container-custom">
            <AnimatePresence mode="wait">
              {isVirtualAssistants ? (
                <motion.div
                  key="virtual-assistants"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <VirtualAssistantsSection />
                </motion.div>
              ) : isHybridReceptionist ? (
                <motion.div
                  key="hybrid-receptionist"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <HybridPricingSection isAnnual={isAnnual} />
                </motion.div>
              ) : (
                <motion.div
                  key={activeService}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  {/* Service Info */}
                  <div className="text-center mb-8">
                    <h2 className="text-2xl md:text-3xl font-bold text-heading mb-2">
                      {currentService.name}
                    </h2>
                    <p className="text-muted-foreground">{currentService.tagline}</p>
                  </div>

                  {/* Pricing Cards (3 popular tiers) */}
                  <PricingCards service={currentService} isAnnual={isAnnual} />

                  {/* Inline Pricing Calculator */}
                  <InlinePricingCalculator service={currentService} isAnnual={isAnnual} />

                  {/* Expandable Full Pricing Table */}
                  <Collapsible open={showAllTiers} onOpenChange={setShowAllTiers}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="mx-auto flex items-center gap-2 text-primary hover:text-primary/80"
                      >
                        <span>View all {currentService.tiers.length} plans</span>
                        <ChevronDown 
                          className={`w-4 h-4 transition-transform duration-300 ${
                            showAllTiers ? "rotate-180" : ""
                          }`} 
                        />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-6">
                      <PricingTable 
                        service={currentService} 
                        popularIndex={2} 
                        isAnnual={isAnnual} 
                      />
                    </CollapsibleContent>
                  </Collapsible>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Quick Compare Section */}
        <section className="py-8 bg-muted/30">
          <div className="container-custom">
            <Collapsible open={showComparison} onOpenChange={setShowComparison}>
              <CollapsibleTrigger asChild>
                <button className="w-full glass-card p-5 flex items-center justify-between rounded-xl hover:shadow-elevated transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <LayoutGrid className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <span className="font-semibold text-heading">Quick Compare All Services</span>
                      <p className="text-sm text-muted-foreground">
                        Side-by-side pricing comparison
                      </p>
                    </div>
                  </div>
                  <ChevronDown 
                    className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${
                      showComparison ? "rotate-180" : ""
                    }`} 
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CompactComparisonTable isAnnual={isAnnual} />
              </CollapsibleContent>
            </Collapsible>
          </div>
        </section>

        {/* Pay Only For Handle Time (anchor target from mega menu) */}
        <section id="handle-time" className="section-spacing bg-accent/30 scroll-mt-24">
          <div className="container-custom">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-5">
                <Clock className="w-7 h-7" />
              </div>
              <h2 className="mb-4">Pay Only for Handle Time</h2>
              <p className="text-lg text-muted-foreground">
                The fairest billing model in the industry. You only pay for the seconds we spend actively handling your calls. No charge while phones ring, no minimum minute padding, no surprise fees.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {handleTimePoints.map((p, idx) => {
                const Icon = p.icon;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: idx * 0.08 }}
                    className="glass-card p-6 rounded-2xl hover:shadow-elevated transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="space-y-1.5">
                        <h3 className="font-semibold text-heading">{p.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="text-center mt-10">
              <Button variant="cta" size="lg" asChild>
                <Link to="/cost-calculator">
                  Estimate Your Monthly Cost
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Add-Ons Section */}
        <section className="section-spacing bg-background">
          <div className="container-custom">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <h2 className="mb-3">Features & Add-Ons</h2>
              <p className="text-muted-foreground">
                Customize your service with additional features
              </p>
            </div>
            <AddOnsSection />
          </div>
        </section>

        {/* CTA Section */}
        <section className="section-spacing bg-primary text-primary-foreground">
          <div className="container-custom text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-primary-foreground mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-lg text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
                Join hundreds of businesses that trust 24H Virtual for their communication needs. 
                No contracts, no hidden fees, cancel anytime.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button size="lg" variant="cta" asChild>
                  <Link to="/get-started">
                    Book FREE Consultation
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
                  asChild
                >
                  <Link to="/demo">Watch Demo</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
