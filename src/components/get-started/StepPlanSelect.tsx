import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, Check, AlertCircle, Bot, User, Sparkles, Globe, MapPin, Building2, Info, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { useGatedServices } from "@/hooks/useLaunchFlags";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import type { WizardData } from "@/pages/GetStarted";
import {
  aiReceptionistPricing,
  messageAssistantPricing,
  virtualReceptionistPricing,
  virtualSecretaryPricing,
  getAnnualPrice,
  formatPrice,
  type ServicePricing,
} from "@/lib/pricingData";
import {
  hybridProPricing,
  calculateAnnualPrice,
} from "@/lib/hybridPricingData";

// VA location-based plans
const vaPlans = [
  {
    type: "offshore" as const,
    name: "Offshore",
    price: 1899,
    tag: "Maximum Value",
    icon: Globe,
    description: "Your most cost-effective option for a dedicated full-time assistant. Whether you need coverage during your business hours or prefer asynchronous workflows with overnight task completion, offshore VAs provide flexible scheduling to match your needs.",
    features: ["Full-time (40 hrs/wk)", "Flexible scheduling", "No set-up fee"],
  },
  {
    type: "nearshore" as const,
    name: "Nearshore",
    price: 2499,
    tag: "Best Value",
    icon: MapPin,
    popular: true,
    description: "Based in Mexico or Latin America with same or similar time zones for seamless real-time collaboration. Perfect for live project coordination, customer support, and tasks requiring quick back-and-forth communication throughout your business day.",
    features: ["Full-time (40 hrs/wk)", "Real-time collaboration", "Statutory holiday coverage"],
  },
  {
    type: "onshore" as const,
    name: "Onshore",
    price: 4899,
    tag: "Premium Support",
    icon: Building2,
    description: "US or Canada-based assistant in your time zone. Ideal for executive-level support, client-facing work, and businesses requiring deep familiarity with local practices and culture.",
    features: ["Full-time (40 hrs/wk)", "Same time zone", "Premium local support"],
  },
];

interface StepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  nextStep: () => void;
  prevStep: () => void;
}

const servicePricingMap: Record<string, ServicePricing> = {
  "ai-receptionist": aiReceptionistPricing,
  "message-assistant": messageAssistantPricing,
  "virtual-receptionist": virtualReceptionistPricing,
  "virtual-secretary": virtualSecretaryPricing,
};

// Tier guidance for standard services
const tierGuidance: Record<number, { name: string; stage: string; description: string; popular?: boolean }> = {
  50: { 
    name: "Starter", 
    stage: "Just Starting Out",
    description: "Perfect for solo entrepreneurs testing the service or businesses with very low call volume."
  },
  100: { 
    name: "Basic", 
    stage: "Early Growth",
    description: "Great for small teams with occasional overflow calls or part-time coverage needs."
  },
  250: { 
    name: "Growth", 
    stage: "Scaling Up",
    description: "Ideal for growing businesses needing reliable daily coverage and consistent support.",
    popular: true
  },
  500: { 
    name: "Professional", 
    stage: "Established",
    description: "Built for established businesses with consistent daily call traffic."
  },
  750: { 
    name: "Business", 
    stage: "High Volume",
    description: "Designed for busy practices requiring robust, dependable support."
  },
  1000: { 
    name: "Enterprise", 
    stage: "Peak Demand",
    description: "Enterprise-grade coverage for large operations with heavy call traffic."
  },
  1250: { 
    name: "Enterprise Plus", 
    stage: "Heavy Traffic",
    description: "For operations with sustained high call volumes requiring maximum capacity."
  },
  1500: { 
    name: "Premium", 
    stage: "Enterprise Scale",
    description: "Premium tier for large-scale operations with demanding call requirements."
  },
  2000: { 
    name: "Elite", 
    stage: "Maximum Capacity",
    description: "Elite coverage for the most demanding enterprise environments."
  },
  2500: { 
    name: "Ultimate", 
    stage: "Unlimited Growth",
    description: "Top-tier solution for businesses with exceptional call handling needs."
  },
  5000: { 
    name: "Unlimited", 
    stage: "No Limits",
    description: "Our highest tier for enterprises requiring maximum capacity and flexibility."
  },
};

// Hybrid tier guidance
const hybridTierGuidance: Record<string, { stage: string; description: string }> = {
  essential: { 
    stage: "Just Starting Out",
    description: "Entry-level hybrid coverage for testing AI + human support together."
  },
  starter: { 
    stage: "Early Growth",
    description: "Balanced coverage for small teams starting with hybrid call handling."
  },
  growth: { 
    stage: "Scaling Up",
    description: "Ideal for growing businesses needing reliable AI and human support daily."
  },
  business: { 
    stage: "Established",
    description: "Built for established businesses with consistent hybrid coverage needs."
  },
  professional: { 
    stage: "High Volume",
    description: "Professional-grade hybrid support for busy practices."
  },
  enterprise: { 
    stage: "Peak Demand",
    description: "Enterprise-level hybrid coverage for large-scale operations."
  },
};

// Slot machine animation configuration - FASTER
const slotMachineVariants = {
  initial: (direction: number) => ({
    y: direction > 0 ? 60 : -60,
    opacity: 0,
    scale: 0.95,
  }),
  animate: {
    y: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    y: direction > 0 ? -60 : 60,
    opacity: 0,
    scale: 0.95,
  }),
};

// Landing pulse animation for haptic-style feedback
const landingVariants = {
  idle: {
    scale: 1,
    boxShadow: "0 0 0 0 rgba(0, 91, 170, 0)",
  },
  land: {
    scale: [1, 1.02, 1],
    boxShadow: [
      "0 0 0 0 rgba(0, 91, 170, 0)",
      "0 0 20px 4px rgba(0, 91, 170, 0.3)",
      "0 0 0 0 rgba(0, 91, 170, 0)"
    ],
  },
};

const slotMachineTransition = {
  type: "spring" as const,
  stiffness: 500,
  damping: 30,
  mass: 0.5,
};

const landingTransition = {
  scale: { duration: 0.25, ease: "easeOut" as const },
  boxShadow: { duration: 0.4, ease: "easeOut" as const },
};

export function StepPlanSelect({ data, updateData, nextStep, prevStep }: StepProps) {
  const isHybrid = data.service === "hybrid-receptionist";
  const isVirtualAssistants = data.service === "virtual-assistants";
  const isAnnual = data.billingPeriod === "annual";
  const { isGated, loading: gatingLoading } = useGatedServices();

  // Guard: if user lands here with a gated service (e.g., flag flipped off mid-flow,
  // or deep link), bounce back to service selection with a friendly toast.
  useEffect(() => {
    if (gatingLoading) return;
    if (data.service && isGated(data.service)) {
      toast.info(`${data.service.replace(/-/g, " ")} is launching soon — please pick another service.`);
      updateData({ service: "" });
      prevStep();
    }
  }, [gatingLoading, isGated, data.service, updateData, prevStep]);
  
  // Get the appropriate pricing data
  const standardPricing = servicePricingMap[data.service] || aiReceptionistPricing;
  const hybridPlan = hybridProPricing;
  
  // Build the plans array based on service type
  const getPlans = () => {
    if (isVirtualAssistants) {
      return vaPlans.map((plan, idx) => ({
        id: plan.type,
        popular: plan.popular || false,
        index: idx,
      }));
    }
    if (isHybrid) {
      return hybridPlan.tiers.map((tier, idx) => ({
        id: tier.id,
        popular: tier.popular || false,
        index: idx,
      }));
    }
    return standardPricing.tiers.map((tier, idx) => ({
      id: tier.minutes,
      popular: tierGuidance[tier.minutes]?.popular || false,
      index: idx,
    }));
  };

  const plans = getPlans();
  
  // Find the initial focused index (popular tier or first)
  const getInitialFocusedIndex = () => {
    const popularIdx = plans.findIndex(p => p.popular);
    return popularIdx !== -1 ? popularIdx : 0;
  };

  const [focusedIndex, setFocusedIndex] = useState(getInitialFocusedIndex);
  const [direction, setDirection] = useState(0); // -1 up, 1 down
  const [isLanding, setIsLanding] = useState(false); // For haptic-style landing feedback
  
  // Check if the continue button should be enabled
  const canContinue = isVirtualAssistants 
    ? !!data.vaType 
    : (!isAnnual || data.annualCommitmentAcknowledged);

  // Handle billing period change
  const handleBillingPeriodChange = (checked: boolean) => {
    updateData({ 
      billingPeriod: checked ? "annual" : "monthly",
      annualCommitmentAcknowledged: checked ? data.annualCommitmentAcknowledged : false
    });
  };

  // Navigation handlers with direction tracking
  const handleNavigateUp = () => {
    if (focusedIndex > 0) {
      setDirection(-1);
      setFocusedIndex(prev => prev - 1);
    }
  };

  const handleNavigateDown = () => {
    if (focusedIndex < plans.length - 1) {
      setDirection(1);
      setFocusedIndex(prev => prev + 1);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleNavigateUp();
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleNavigateDown();
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectCurrentPlan();
    }
  };

  // Swipe gesture handler for mobile
  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const threshold = 50; // minimum distance to trigger navigation
    const velocityThreshold = 200; // minimum velocity to trigger navigation
    
    if (info.offset.y < -threshold || info.velocity.y < -velocityThreshold) {
      // Swiped up = go to next plan (higher tier)
      handleNavigateDown();
    } else if (info.offset.y > threshold || info.velocity.y > velocityThreshold) {
      // Swiped down = go to previous plan (lower tier)
      handleNavigateUp();
    }
  };

  // Trigger landing animation after card settles
  const handleAnimationComplete = () => {
    setIsLanding(true);
    setTimeout(() => setIsLanding(false), 400);
  };

  // Select the currently focused plan
  const selectCurrentPlan = () => {
    if (isVirtualAssistants) {
      updateData({ vaType: vaPlans[focusedIndex].type });
    } else if (isHybrid) {
      const tier = hybridPlan.tiers[focusedIndex];
      updateData({ minutes: tier.aiMinutes + tier.humanMinutes });
    } else {
      updateData({ minutes: standardPricing.tiers[focusedIndex].minutes });
    }
  };

  // Get plan info for shadow cards
  const getPlanInfo = (index: number) => {
    if (index < 0 || index >= plans.length) return null;
    
    if (isVirtualAssistants) {
      const plan = vaPlans[index];
      return { name: plan?.name || '', price: `$${plan?.price?.toLocaleString()}/mo` };
    }
    if (isHybrid) {
      const tier = hybridPlan.tiers[index];
      const price = isAnnual ? calculateAnnualPrice(tier?.bundlePrice) : tier?.bundlePrice;
      return { 
        name: tier?.name || '', 
        price: `$${price}/mo`
      };
    }
    const tier = standardPricing.tiers[index];
    const guidance = tierGuidance[tier?.minutes];
    return { 
      name: guidance?.name || `${tier?.minutes} min`, 
      price: isAnnual ? formatPrice(getAnnualPrice(tier?.price)) : tier?.priceFormatted 
    };
  };

  // Render shadow plan preview
  const renderShadowPlan = (index: number) => {
    const planInfo = getPlanInfo(index);
    if (!planInfo) return null;
    
    return (
      <div 
        className={cn(
          "px-4 py-3 rounded-lg border border-border/30 bg-card/50",
          "opacity-40 scale-[0.97]",
          "pointer-events-none select-none"
        )}
      >
        <div className="flex justify-between items-center">
          <span className="font-semibold text-sm text-muted-foreground">
            {planInfo.name}
          </span>
          <span className="text-sm text-muted-foreground">
            {planInfo.price}
          </span>
        </div>
      </div>
    );
  };

  // Render VA plan card
  const renderVAPlanCard = () => {
    const plan = vaPlans[focusedIndex];
    const isSelected = data.vaType === plan.type;
    const IconComponent = plan.icon;

    return (
      <button
        onClick={() => updateData({ vaType: plan.type })}
        className={cn(
          "w-full p-5 rounded-lg border-2 text-left transition-all",
          isSelected
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:border-primary/50",
          plan.popular && "ring-2 ring-secondary ring-offset-2"
        )}
      >
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <IconComponent className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-bold text-heading uppercase tracking-wide">
                {plan.name}
              </span>
              <Badge variant="outline" className="text-xs">
                {plan.tag}
              </Badge>
              {plan.popular && (
                <Badge className="bg-secondary text-secondary-foreground">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Popular
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
              {plan.description}
            </p>
            <ul className="space-y-1 mb-3">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-cta shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-muted-foreground">Starting at</span>
              <span className="text-2xl font-bold text-primary">
                ${plan.price.toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground">/mo</span>
            </div>
          </div>
          {isSelected && (
            <div className="shrink-0">
              <Check className="w-6 h-6 text-primary" />
            </div>
          )}
        </div>
      </button>
    );
  };

  // Render Hybrid plan card
  const renderHybridPlanCard = () => {
    const tier = hybridPlan.tiers[focusedIndex];
    const totalMinutes = tier.aiMinutes + tier.humanMinutes;
    const isSelected = data.minutes === totalMinutes;
    const guidance = hybridTierGuidance[tier.id];
    const displayPrice = isAnnual 
      ? `$${calculateAnnualPrice(tier.bundlePrice)}`
      : `$${tier.bundlePrice}`;

    return (
      <button
        onClick={() => updateData({ minutes: totalMinutes })}
        className={cn(
          "w-full p-4 rounded-lg border-2 text-left transition-all",
          isSelected
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:border-primary/50",
          tier.popular && "ring-2 ring-secondary ring-offset-2"
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-heading uppercase tracking-wide">
                {tier.name}
              </span>
              {tier.popular && (
                <Badge className="bg-secondary text-secondary-foreground">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Most Popular
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
              <span className="flex items-center gap-1">
                <Bot className="w-3.5 h-3.5" />
                {tier.aiMinutes} AI min
              </span>
              <span className="text-border">+</span>
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {tier.humanMinutes} Human min
              </span>
            </div>
            {guidance && (
              <>
                <Badge variant="outline" className="mb-2 text-xs">
                  {guidance.stage}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  {guidance.description}
                </p>
              </>
            )}
            {tier.savings > 0 && (
              <p className="text-xs text-cta mt-2">
                Save ${tier.savings}/mo vs individual services
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-primary">
              {displayPrice}
            </div>
            <div className="text-xs text-muted-foreground">/month</div>
            {isAnnual && (
              <div className="text-xs text-muted-foreground line-through">
                ${tier.bundlePrice}
              </div>
            )}
            {isSelected && (
              <div className="mt-2 flex justify-end">
                <Check className="w-5 h-5 text-primary" />
              </div>
            )}
          </div>
        </div>
      </button>
    );
  };

  // Render Standard plan card
  const renderStandardPlanCard = () => {
    const tier = standardPricing.tiers[focusedIndex];
    const isSelected = data.minutes === tier.minutes;
    const guidance = tierGuidance[tier.minutes];
    const displayPrice = isAnnual
      ? formatPrice(getAnnualPrice(tier.price))
      : tier.priceFormatted;

    return (
      <button
        onClick={() => updateData({ minutes: tier.minutes })}
        className={cn(
          "w-full p-4 rounded-lg border-2 text-left transition-all",
          isSelected
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:border-primary/50",
          guidance?.popular && "ring-2 ring-secondary ring-offset-2"
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-heading uppercase tracking-wide">
                {guidance?.name || `${tier.minutes} Minutes`}
              </span>
              {guidance?.popular && (
                <Badge className="bg-secondary text-secondary-foreground">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Most Popular
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground mb-2">
              {tier.minutes.toLocaleString()} minutes/month
            </div>
            {guidance && (
              <>
                <Badge variant="outline" className="mb-2 text-xs">
                  {guidance.stage}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  {guidance.description}
                </p>
              </>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-primary">
              {displayPrice}
            </div>
            <div className="text-xs text-muted-foreground">/month</div>
            {isAnnual && (
              <div className="text-xs text-muted-foreground line-through">
                {tier.priceFormatted}
              </div>
            )}
            {isSelected && (
              <div className="mt-2 flex justify-end">
                <Check className="w-5 h-5 text-primary" />
              </div>
            )}
          </div>
        </div>
      </button>
    );
  };

  // Render the appropriate plan card based on service type
  const renderPlanCard = () => {
    if (isVirtualAssistants) return renderVAPlanCard();
    if (isHybrid) return renderHybridPlanCard();
    return renderStandardPlanCard();
  };

  return (
    <Card className="border-0 shadow-card">
      <CardHeader>
        <CardTitle>
          {isVirtualAssistants ? "Select your Virtual Assistant" : "Select your plan"}
        </CardTitle>
        <CardDescription>
          {isVirtualAssistants
            ? "Choose the option that best fits your needs"
            : isHybrid 
              ? "Choose the hybrid package that fits your business stage"
              : `Choose the minutes package for ${standardPricing.name}`
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Billing Toggle - Hide for Virtual Assistants */}
        {!isVirtualAssistants && (
          <div className="flex flex-col items-center gap-2 py-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-4">
              <span
                className={cn(
                  "text-sm font-medium",
                  !isAnnual ? "text-heading" : "text-muted-foreground"
                )}
              >
                Monthly
              </span>
              <Switch
                checked={isAnnual}
                onCheckedChange={handleBillingPeriodChange}
              />
              <span
                className={cn(
                  "text-sm font-medium",
                  isAnnual ? "text-heading" : "text-muted-foreground"
                )}
              >
                Annual
                <Badge className="ml-2 bg-cta/10 text-cta border-cta/20">
                  Save 10%
                </Badge>
              </span>
            </div>
            {isAnnual && (
              <p className="text-xs text-muted-foreground">
                Billed monthly with a 1-year commitment
              </p>
            )}
          </div>
        )}

        {/* Slot Machine Carousel */}
        <div 
          className="flex border-2 border-primary/20 rounded-xl bg-card overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary/50"
          tabIndex={0}
          onKeyDown={handleKeyDown}
        >
          {/* Slot Machine Viewport */}
          <div className="flex-1 relative overflow-hidden">
            {/* Top gradient fade */}
            <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-card to-transparent z-10 pointer-events-none" />
            
            {/* Slot machine content */}
            <div className="py-4 px-4 space-y-2">
              {/* Previous plan shadow */}
              <motion.div
                key={`prev-${focusedIndex}`}
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {renderShadowPlan(focusedIndex - 1)}
              </motion.div>
              
              {/* Current plan - main slot with dramatic animation + swipe gestures */}
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={focusedIndex}
                  custom={direction}
                  variants={slotMachineVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={slotMachineTransition}
                  onAnimationComplete={handleAnimationComplete}
                  // Swipe gestures for mobile
                  drag="y"
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={0.2}
                  onDragEnd={handleDragEnd}
                  className="cursor-grab active:cursor-grabbing touch-pan-x"
                >
                  {/* Landing pulse wrapper for haptic-style feedback */}
                  <motion.div
                    variants={landingVariants}
                    initial="idle"
                    animate={isLanding ? "land" : "idle"}
                    transition={landingTransition}
                    className="rounded-lg"
                  >
                    {renderPlanCard()}
                  </motion.div>
                </motion.div>
              </AnimatePresence>
              
              {/* Next plan shadow */}
              <motion.div
                key={`next-${focusedIndex}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {renderShadowPlan(focusedIndex + 1)}
              </motion.div>
            </div>
            
            {/* Bottom gradient fade */}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent z-10 pointer-events-none" />
          </div>

          {/* Right Arrow Column - CENTERED and GROUPED */}
          <div className="flex flex-col justify-center items-center gap-1 border-l border-border bg-muted/30 px-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNavigateUp}
              disabled={focusedIndex === 0}
              className="h-8 w-8"
            >
              <ChevronUp className="w-5 h-5" />
            </Button>
            
            <span className="text-xs text-muted-foreground font-medium py-1">
              {focusedIndex + 1}/{plans.length}
            </span>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNavigateDown}
              disabled={focusedIndex === plans.length - 1}
              className="h-8 w-8"
            >
              <ChevronDown className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Overage info - Hide for Virtual Assistants */}
        {!isVirtualAssistants && (
          <p className="text-center text-sm text-muted-foreground">
            {isHybrid ? (
              <>
                AI overage: ${hybridPlan.aiOverageRate.toFixed(2)}/min • Human overage: ${hybridPlan.humanOverageRate.toFixed(2)}/min
              </>
            ) : (
              <>
                Overage: {standardPricing.overageFormatted}
              </>
            )}
          </p>
        )}

        {/* VA info note */}
        {isVirtualAssistants && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              All VA plans include a dedicated assistant who learns your business. 
              Custom pricing available based on skill requirements.
            </p>
          </div>
        )}

        {/* Annual Commitment Legal Acknowledgment - Hide for Virtual Assistants */}
        {!isVirtualAssistants && isAnnual && (
          <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900">
            <div className="flex items-start gap-3">
              <Checkbox
                id="annual-commitment"
                checked={data.annualCommitmentAcknowledged}
                onCheckedChange={(checked) => 
                  updateData({ annualCommitmentAcknowledged: checked === true })
                }
                className="mt-1"
              />
              <label 
                htmlFor="annual-commitment" 
                className="text-sm text-foreground cursor-pointer leading-relaxed"
              >
                <span className="font-semibold">I understand and agree</span> that by selecting 
                the Annual plan, I am committing to a 12-month service agreement.
                <ul className="mt-2 space-y-1 text-muted-foreground list-disc list-inside">
                  <li>Billed monthly at the discounted rate shown above</li>
                  <li>Early cancellation may require payment of the remaining contract balance</li>
                  <li>This acknowledgment serves as a legally binding agreement</li>
                </ul>
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  By checking this box, I confirm I have read and agree to these terms.
                </p>
              </label>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={prevStep}>
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back
          </Button>
          <Button 
            onClick={nextStep} 
            variant="cta"
            disabled={!canContinue}
          >
            Continue
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>

        {!isVirtualAssistants && isAnnual && !data.annualCommitmentAcknowledged && (
          <p className="text-center text-xs text-amber-600 dark:text-amber-400">
            Please acknowledge the annual commitment terms to continue
          </p>
        )}
      </CardContent>
    </Card>
  );
}
