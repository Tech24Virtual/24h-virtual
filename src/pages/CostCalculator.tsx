import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ServiceCTA } from "@/components/services/ServiceCTA";
import { CalculatorInputs } from "@/components/calculator/CalculatorInputs";
import { CalculatorResults } from "@/components/calculator/CalculatorResults";
import { CostBreakdown } from "@/components/calculator/CostBreakdown";
import { ReportCaptureForm } from "@/components/calculator/ReportCaptureForm";
import { SEO } from "@/components/SEO";
import {
  allServicesPricing,
  ServicePricing,
  PricingTier,
  getAnnualPrice,
} from "@/lib/pricingData";

function getRecommendedTier(service: ServicePricing, minutes: number): PricingTier {
  return (
    service.tiers.find((t) => t.minutes >= minutes) ||
    service.tiers[service.tiers.length - 1]
  );
}

function calculateOverage(
  tier: PricingTier,
  actualMinutes: number,
  overageRate: number
): number {
  const overageMinutes = Math.max(0, actualMinutes - tier.minutes);
  return Math.round(overageMinutes * overageRate);
}

export default function CostCalculator() {
  const [callVolume, setCallVolume] = useState(200);
  const [avgDuration, setAvgDuration] = useState(3);
  const [currentCost, setCurrentCost] = useState(3500);
  const [serviceType, setServiceType] = useState("virtual-receptionist");
  const [isAnnual, setIsAnnual] = useState(false);

  const calculations = useMemo(() => {
    const monthlyMinutes = callVolume * avgDuration;
    const service = allServicesPricing.find((s) => s.slug === serviceType) || null;

    if (!service) {
      return {
        monthlyMinutes,
        recommendedTier: null,
        service: null,
        tierPrice: 0,
        overage: 0,
        totalMonthlyCost: 0,
        monthlySavings: 0,
        annualSavings: 0,
        roi: 0,
      };
    }

    const recommendedTier = getRecommendedTier(service, monthlyMinutes);
    const tierPrice = isAnnual
      ? getAnnualPrice(recommendedTier.price)
      : recommendedTier.price;
    const overage = calculateOverage(recommendedTier, monthlyMinutes, service.overage);
    const totalMonthlyCost = tierPrice + overage;
    const monthlySavings = Math.max(0, currentCost - totalMonthlyCost);
    const annualSavings = monthlySavings * 12;
    const roi = currentCost > 0 ? Math.round((monthlySavings / currentCost) * 100) : 0;

    return {
      monthlyMinutes,
      recommendedTier,
      service,
      tierPrice,
      overage,
      totalMonthlyCost,
      monthlySavings,
      annualSavings,
      roi,
    };
  }, [callVolume, avgDuration, currentCost, serviceType, isAnnual]);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Cost Calculator - Discover Your Savings"
        description="Most businesses save 40-70% compared to hiring in-house. Calculate your potential savings with our virtual receptionist cost calculator."
        canonical="/cost-calculator"
      />
      <Navigation />

      {/* Hero */}
      <section className="gradient-hero pt-32 pb-20">
        <div className="container-custom">
          <motion.div
            className="max-w-4xl mx-auto text-center space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-balance">Discover How Much You Could Save</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Most businesses save 40-70% compared to hiring in-house. See your numbers.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Calculator */}
      <section className="section-spacing bg-background">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <CalculatorInputs
                callVolume={callVolume}
                setCallVolume={setCallVolume}
                avgDuration={avgDuration}
                setAvgDuration={setAvgDuration}
                currentCost={currentCost}
                setCurrentCost={setCurrentCost}
                serviceType={serviceType}
                setServiceType={setServiceType}
                isAnnual={isAnnual}
                setIsAnnual={setIsAnnual}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <CalculatorResults
                monthlyMinutes={calculations.monthlyMinutes}
                recommendedTier={calculations.recommendedTier}
                service={calculations.service}
                totalMonthlyCost={calculations.totalMonthlyCost}
                overage={calculations.overage}
                monthlySavings={calculations.monthlySavings}
                annualSavings={calculations.annualSavings}
                roi={calculations.roi}
                isAnnual={isAnnual}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Lead-Gated Report */}
      <section className="section-spacing bg-background">
        <div className="container-custom max-w-3xl mx-auto">
          <ReportCaptureForm
            callVolume={callVolume}
            avgDuration={avgDuration}
            currentCost={currentCost}
            serviceType={serviceType}
            isAnnual={isAnnual}
            monthlyMinutes={calculations.monthlyMinutes}
            recommendedTier={calculations.recommendedTier}
            service={calculations.service}
            tierPrice={calculations.tierPrice}
            overage={calculations.overage}
            totalMonthlyCost={calculations.totalMonthlyCost}
            monthlySavings={calculations.monthlySavings}
            annualSavings={calculations.annualSavings}
            roi={calculations.roi}
          />
        </div>
      </section>

      {/* Cost Breakdown */}
      <section className="section-spacing bg-accent/30">
        <div className="container-custom">
          <CostBreakdown
            currentCost={currentCost}
            virtualCost={calculations.totalMonthlyCost}
          />
        </div>
      </section>

      <ServiceCTA
        title="Ready to Cut Costs and Capture More Leads?"
        subtitle="See real savings while improving caller experience"
        ctaText="Get Started Now"
        ctaLink="/get-started"
      />

      <Footer />
    </div>
  );
}
