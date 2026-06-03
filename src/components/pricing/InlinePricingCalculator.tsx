import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Calculator, TrendingUp, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type ServicePricing, getAnnualPrice, formatPrice } from "@/lib/pricingData";

interface Props {
  service: ServicePricing;
  isAnnual: boolean;
}

export function InlinePricingCalculator({ service, isAnnual }: Props) {
  const [callVolume, setCallVolume] = useState(100);
  const [avgDuration, setAvgDuration] = useState(3);

  const calculation = useMemo(() => {
    const monthlyMinutes = callVolume * avgDuration;
    
    // Find the best tier
    const recommendedTier = service.tiers.find(tier => tier.minutes >= monthlyMinutes) 
      || service.tiers[service.tiers.length - 1];
    
    const basePrice = isAnnual ? getAnnualPrice(recommendedTier.price) : recommendedTier.price;
    
    // Calculate overage if needed
    const overageMinutes = Math.max(0, monthlyMinutes - recommendedTier.minutes);
    const overageCost = overageMinutes * service.overage;
    const totalCost = basePrice + overageCost;
    
    // Calculate cost per minute
    const costPerMinute = totalCost / Math.max(monthlyMinutes, 1);
    
    // Estimated savings vs in-house (assume $25/hr for receptionist = $0.42/min)
    const inHouseCostPerMin = 0.42;
    const inHouseCost = monthlyMinutes * inHouseCostPerMin;
    const savingsPercent = Math.round(((inHouseCost - totalCost) / inHouseCost) * 100);
    
    return {
      monthlyMinutes,
      recommendedTier,
      basePrice,
      overageMinutes,
      overageCost,
      totalCost,
      costPerMinute,
      savingsPercent: Math.max(0, savingsPercent),
    };
  }, [callVolume, avgDuration, service, isAnnual]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card className="glass-card border-primary/10 overflow-hidden">
        <CardContent className="p-4 sm:p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-heading">Estimate Your Cost</h3>
              <p className="text-sm text-muted-foreground">Based on your call volume</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Inputs */}
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-heading">
                    Monthly Calls
                  </label>
                  <span className="text-lg font-bold text-primary">{callVolume}</span>
                </div>
                <Slider
                  value={[callVolume]}
                  onValueChange={([value]) => setCallVolume(value)}
                  min={10}
                  max={500}
                  step={10}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>10</span>
                  <span>500+</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-heading">
                    Avg. Call Duration
                  </label>
                  <span className="text-lg font-bold text-primary">{avgDuration} min</span>
                </div>
                <Slider
                  value={[avgDuration]}
                  onValueChange={([value]) => setAvgDuration(value)}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 min</span>
                  <span>10 min</span>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="bg-accent/30 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Est. Monthly Minutes</span>
                <span className="font-semibold text-heading">{calculation.monthlyMinutes} min</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Recommended Plan</span>
                <Badge variant="secondary" className="font-semibold">
                  {calculation.recommendedTier.minutes} min
                </Badge>
              </div>

              <div className="border-t border-border/50 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Base Price</span>
                  <span className="font-medium">{formatPrice(calculation.basePrice)}/mo</span>
                </div>
                
                {calculation.overageMinutes > 0 && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      Est. Overage ({calculation.overageMinutes} min)
                    </span>
                    <span className="font-medium text-amber-600">
                      +{formatPrice(Math.round(calculation.overageCost))}
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t border-border/50 pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-heading">Est. Total</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatPrice(Math.round(calculation.totalCost))}/mo
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  ~${calculation.costPerMinute.toFixed(2)}/minute
                </p>
              </div>

              {calculation.savingsPercent > 0 && (
                <div className={cn(
                  "flex items-center gap-2 p-3 rounded-lg",
                  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                )}>
                  <TrendingUp className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium">
                    Save ~{calculation.savingsPercent}% vs. in-house staff
                  </span>
                </div>
              )}

              <Button variant="cta" className="w-full" asChild>
                <Link to="/get-started">
                  Get Started
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
