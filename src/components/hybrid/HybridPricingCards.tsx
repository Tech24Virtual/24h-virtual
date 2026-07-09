import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bot, ChevronDown, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { HybridPlan, HybridTier } from "@/lib/hybridPricingData";
import { getPopularTiers, formatSavings, calculateAnnualPrice } from "@/lib/hybridPricingData";

interface HybridPricingCardsProps {
  plan: HybridPlan;
  isAnnual?: boolean;
}

function TierCard({ tier, plan, isAnnual }: { tier: HybridTier; plan: HybridPlan; isAnnual?: boolean }) {
  const displayPrice = isAnnual ? calculateAnnualPrice(tier.bundlePrice) : tier.bundlePrice;
  const isPopular = tier.popular;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative"
    >
      <Card className={`h-full transition-all duration-300 hover:shadow-lg ${
        isPopular ? "border-2 border-secondary shadow-lg" : "border-border"
      }`}>
        {isPopular && (
          <Badge 
            className="absolute -top-3 left-1/2 -translate-x-1/2 bg-secondary text-secondary-foreground animate-float"
          >
            <Sparkles className="w-3 h-3 mr-1" />
            Most Popular
          </Badge>
        )}
        <CardHeader className="text-center pb-2 pt-6">
          <h3 className="text-xl font-bold text-heading">{tier.name}</h3>
          <p className="text-sm text-muted-foreground">
            {tier.aiMinutes} AI + {tier.humanMinutes} Human mins
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pricing */}
          <div className="text-center">
            {tier.savings > 0 && (
              <p className="text-sm text-muted-foreground line-through">
                ${tier.individualPrice}/mo
              </p>
            )}
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold text-primary">${displayPrice}</span>
              <span className="text-muted-foreground">/mo</span>
            </div>
            {tier.savings > 0 && (
              <Badge variant="secondary" className="mt-2">
                {formatSavings(tier.savings)}
              </Badge>
            )}
            {tier.savings <= 0 && (
              <Badge variant="outline" className="mt-2">
                Entry Tier
              </Badge>
            )}
          </div>

          {/* What's included */}
          <div className="space-y-2 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Bot className="w-4 h-4 text-primary" />
              <span>{tier.aiMinutes} AI Receptionist mins</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-[10px] text-primary">+</span>
              </div>
              <span>{tier.humanMinutes} {plan.humanService} mins</span>
            </div>
          </div>

          {/* Overage rates */}
          <div className="text-xs text-muted-foreground pt-2 border-t">
            <p>Overage: AI ${plan.aiOverageRate.toFixed(2)}/min • Human ${plan.humanOverageRate.toFixed(2)}/min</p>
          </div>

          {/* CTA */}
          <Button 
            className="w-full" 
            variant={isPopular ? "cta" : "outline"}
            asChild
          >
            <Link to={`/get-started?service=hybrid-receptionist&type=${plan.id}&tier=${tier.id}`}>
              Get Started
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function HybridPricingCards({ plan, isAnnual }: HybridPricingCardsProps) {
  const [showAllTiers, setShowAllTiers] = useState(false);
  const popularTiers = getPopularTiers(plan);
  const allTiers = plan.tiers;

  return (
    <div className="space-y-8">
      {/* Popular Tiers */}
      <div className="grid md:grid-cols-3 gap-6">
        {popularTiers.map((tier) => (
          <TierCard key={tier.id} tier={tier} plan={plan} isAnnual={isAnnual} />
        ))}
      </div>

      {/* Expandable All Tiers */}
      <Collapsible open={showAllTiers} onOpenChange={setShowAllTiers}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="mx-auto flex items-center gap-2 text-primary hover:text-primary/80"
          >
            <span>View all {allTiers.length} tiers</span>
            <ChevronDown 
              className={`w-4 h-4 transition-transform duration-300 ${
                showAllTiers ? "rotate-180" : ""
              }`} 
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <AnimatePresence>
            {showAllTiers && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6"
              >
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allTiers.map((tier) => (
                    <TierCard key={tier.id} tier={tier} plan={plan} isAnnual={isAnnual} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
