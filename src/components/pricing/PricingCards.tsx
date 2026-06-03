import { Link } from "react-router-dom";
import { ArrowRight, Check, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ServicePricing, 
  getAnnualPrice, 
  formatPrice,
  getPopularTiers 
} from "@/lib/pricingData";

interface PricingCardsProps {
  service: ServicePricing;
  isAnnual?: boolean;
}

const tierLabels = ["Starter", "Popular", "Business"];
const tierFeatures = [
  ["Perfect for small businesses", "Basic call handling", "Email notifications"],
  ["Most chosen plan", "Priority support", "Advanced call routing", "Custom scripts"],
  ["High-volume needs", "Dedicated account manager", "Advanced analytics", "Priority queue"],
];

export function PricingCards({ service, isAnnual = false }: PricingCardsProps) {
  const popularTiers = getPopularTiers(service, [0, 2, 5]);

  return (
    <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
      {popularTiers.map((tier, index) => {
        const isMiddle = index === 1;
        const displayPrice = isAnnual ? formatPrice(getAnnualPrice(tier.price)) : tier.priceFormatted;
        
        return (
          <motion.div
            key={tier.minutes}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className={isMiddle ? "md:-mt-4" : ""}
          >
            <Card 
              className={`relative h-full glass-card transition-all duration-300 hover:shadow-elevated ${
                isMiddle 
                  ? "border-2 border-secondary shadow-elevated md:scale-105" 
                  : "hover:-translate-y-1"
              }`}
            >
              {isMiddle && (
                <motion.div
                  className="absolute -top-3 left-1/2 -translate-x-1/2"
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Badge className="bg-secondary text-secondary-foreground px-4 shadow-soft">
                    Most Popular
                  </Badge>
                </motion.div>
              )}
              
              <CardHeader className="text-center pb-2 pt-8">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  {tierLabels[index]}
                </p>
                <h3 className="text-lg font-semibold text-heading mb-4">
                  {tier.minutes.toLocaleString()} minutes
                </h3>
                <div className="space-y-1">
                  <p className="text-4xl font-bold text-heading">
                    {displayPrice}
                    <span className="text-base font-normal text-muted-foreground">/mo</span>
                  </p>
                  {isAnnual && (
                    <p className="text-sm text-muted-foreground line-through">
                      {tier.priceFormatted}/mo
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-center gap-2 mt-3 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{service.coverage}</span>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {tierFeatures[index].map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </li>
                  ))}
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">
                      Overage: {service.overageFormatted}
                    </span>
                  </li>
                </ul>
                
                <Button 
                  className="w-full" 
                  variant={isMiddle ? "cta" : "outline"}
                  asChild
                >
                  <Link to={`/get-started?service=${service.slug}&minutes=${tier.minutes}`}>
                    Get Started
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
