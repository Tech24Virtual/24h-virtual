import { Bot, MessageSquare, Headphones, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HybridPlanType } from "@/lib/hybridPricingData";
import { Badge } from "@/components/ui/badge";

interface HybridPlanSelectorProps {
  activePlan: HybridPlanType;
  onPlanChange: (plan: HybridPlanType) => void;
}

const plans = [
  {
    id: "lite" as HybridPlanType,
    name: "Hybrid Lite",
    shortName: "Lite",
    description: "AI + Message Assistant",
    icon: MessageSquare,
  },
  {
    id: "pro" as HybridPlanType,
    name: "Hybrid Pro",
    shortName: "Pro",
    description: "AI + Virtual Receptionist",
    icon: Headphones,
    popular: true,
  },
  {
    id: "executive" as HybridPlanType,
    name: "Hybrid Executive",
    shortName: "Executive",
    description: "AI + Virtual Secretary",
    icon: Briefcase,
  },
];

export function HybridPlanSelector({ activePlan, onPlanChange }: HybridPlanSelectorProps) {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {plans.map((plan) => {
        const Icon = plan.icon;
        const isActive = activePlan === plan.id;

        return (
          <button
            key={plan.id}
            onClick={() => onPlanChange(plan.id)}
            className={cn(
              "relative flex flex-col items-center gap-2 px-6 py-4 rounded-xl transition-all duration-300 min-w-[140px]",
              isActive
                ? "bg-primary text-primary-foreground shadow-lg scale-105"
                : "bg-card hover:bg-accent border border-border hover:border-primary/30"
            )}
          >
            {plan.popular && (
              <Badge 
                className={cn(
                  "absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] px-2",
                  isActive 
                    ? "bg-secondary text-secondary-foreground" 
                    : "bg-secondary text-secondary-foreground"
                )}
              >
                Most Popular
              </Badge>
            )}
            <div className={cn(
              "flex items-center gap-2",
              isActive ? "text-primary-foreground" : "text-foreground"
            )}>
              <Bot className="w-4 h-4" />
              <span className="text-xs">+</span>
              <Icon className="w-4 h-4" />
            </div>
            <span className={cn(
              "font-semibold text-sm",
              isActive ? "text-primary-foreground" : "text-heading"
            )}>
              {plan.shortName}
            </span>
            <span className={cn(
              "text-xs text-center",
              isActive ? "text-primary-foreground/80" : "text-muted-foreground"
            )}>
              {plan.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
