import { Bot, MessageSquare, Phone, Briefcase, Users, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGatedServices } from "@/hooks/useLaunchFlags";
import { ComingSoonBadge } from "@/components/ComingSoonBadge";

export type ServiceId = 
  | "ai-receptionist" 
  | "message-assistant" 
  | "virtual-receptionist" 
  | "virtual-secretary" 
  | "hybrid-receptionist"
  | "virtual-assistants";

interface ServiceTab {
  id: ServiceId;
  label: string;
  icon: React.ElementType;
}

const services: ServiceTab[] = [
  { id: "ai-receptionist", label: "AI Receptionist", icon: Bot },
  { id: "message-assistant", label: "Message Assistant", icon: MessageSquare },
  { id: "virtual-receptionist", label: "Virtual Receptionist", icon: Phone },
  { id: "virtual-secretary", label: "Virtual Secretary", icon: Briefcase },
  { id: "virtual-assistants", label: "Virtual Assistants", icon: Users },
   { id: "hybrid-receptionist", label: "Hybrid Receptionist", icon: Zap },
];

interface PricingTabsProps {
  activeService: ServiceId;
  onServiceChange: (service: ServiceId) => void;
}

export function PricingTabs({ activeService, onServiceChange }: PricingTabsProps) {
  const { isGated } = useGatedServices();

  return (
    <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-sm">
      <div className="container-custom py-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-4 -mx-4 sm:mx-0 sm:px-0 sm:justify-center">
          {services.map((service) => {
            const Icon = service.icon;
            const isActive = activeService === service.id;
            const gated = isGated(service.id);
            
            return (
              <button
                key={service.id}
                onClick={() => !gated && onServiceChange(service.id)}
                disabled={gated}
                aria-disabled={gated}
                title={gated ? `${service.label} is launching soon` : undefined}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap transition-all duration-300 font-medium text-sm",
                  isActive && !gated
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground",
                  gated && "opacity-60 cursor-not-allowed hover:bg-muted/50 hover:text-muted-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{service.label}</span>
                <span className="sm:hidden">{service.label.split(" ")[0]}</span>
                {gated && <ComingSoonBadge className="ml-1" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
