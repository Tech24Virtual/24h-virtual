import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp, Check } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { PricingTier, ServicePricing, getAnnualPrice } from "@/lib/pricingData";

interface CalculatorResultsProps {
  monthlyMinutes: number;
  recommendedTier: PricingTier | null;
  service: ServicePricing | null;
  totalMonthlyCost: number;
  overage: number;
  monthlySavings: number;
  annualSavings: number;
  roi: number;
  isAnnual: boolean;
}

export function CalculatorResults({
  monthlyMinutes,
  recommendedTier,
  service,
  totalMonthlyCost,
  overage,
  monthlySavings,
  annualSavings,
  roi,
  isAnnual,
}: CalculatorResultsProps) {
  const tierPrice = recommendedTier
    ? isAnnual
      ? getAnnualPrice(recommendedTier.price)
      : recommendedTier.price
    : 0;

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Your Savings Estimate
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Recommended Plan */}
        <div className="p-4 bg-card rounded-lg border">
          <p className="text-sm text-muted-foreground mb-1">Recommended Plan</p>
          <p className="text-xl font-bold text-heading">
            {service?.name || "Select a service"} - {recommendedTier?.minutes.toLocaleString() || 0} min
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Based on {monthlyMinutes.toLocaleString()} estimated monthly minutes
          </p>
        </div>

        {/* Cost Breakdown */}
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-muted-foreground">Plan Cost</span>
            <span className="font-semibold text-heading">
              ${tierPrice.toLocaleString()}/mo
              {isAnnual && <span className="text-sm text-primary ml-1">(10% off)</span>}
            </span>
          </div>
          {overage > 0 && (
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Est. Overage</span>
              <span className="font-semibold text-heading">${overage.toLocaleString()}/mo</span>
            </div>
          )}
          <div className="flex justify-between items-center py-2 border-b">
            <span className="font-semibold text-heading">Total Monthly Cost</span>
            <span className="text-xl font-bold text-primary">
              <AnimatedCounter value={totalMonthlyCost} prefix="$" duration={0.5} />
            </span>
          </div>
        </div>

        {/* Savings */}
        {monthlySavings > 0 && (
          <motion.div
            className="p-6 bg-primary/10 rounded-xl space-y-4"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center">
              <p className="text-sm text-primary font-medium mb-1">Monthly Savings</p>
              <p className="text-3xl font-bold text-primary">
                <AnimatedCounter value={monthlySavings} prefix="$" suffix="/mo" duration={0.8} />
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-primary/20">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Annual Savings</p>
                <p className="text-xl font-bold text-heading">
                  <AnimatedCounter value={annualSavings} prefix="$" duration={0.8} />
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">ROI</p>
                <p className="text-xl font-bold text-heading">
                  <AnimatedCounter value={roi} suffix="%" duration={0.8} />
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {monthlySavings <= 0 && (
          <div className="p-4 bg-accent/50 rounded-lg text-center">
            <p className="text-muted-foreground">
              Enter your current receptionist cost to see potential savings
            </p>
          </div>
        )}

        {/* Features */}
        <div className="space-y-2">
          <p className="font-medium text-heading">Included with your plan:</p>
          <div className="space-y-1">
            {["Custom scripts & greetings", "Appointment scheduling", "Call transfers", "Message delivery"].map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-primary" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Button variant="cta" className="w-full" size="lg" asChild>
          <Link to={`/get-started?service=${service?.slug || ""}&plan=${recommendedTier?.minutes || 100}`}>
            Get Started Now
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
