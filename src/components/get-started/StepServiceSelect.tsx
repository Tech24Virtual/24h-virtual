import { ArrowLeft, ArrowRight, Bot, MessageSquare, Phone, Briefcase, Users, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import type { WizardData } from "@/pages/GetStarted";
import { useGatedServices } from "@/hooks/useLaunchFlags";
import { ComingSoonBadge } from "@/components/ComingSoonBadge";
import {
  aiReceptionistPricing,
  messageAssistantPricing,
  virtualReceptionistPricing,
  virtualSecretaryPricing,
} from "@/lib/pricingData";

interface StepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  nextStep: () => void;
  prevStep: () => void;
}

const services = [
  {
    id: "ai-receptionist",
    icon: Bot,
    name: aiReceptionistPricing.name,
    description: "AI-powered 24/7 call handling with natural conversation",
    coverage: "24/7 Coverage",
    startingPrice: "$49/mo",
  },
  {
    id: "message-assistant",
    icon: MessageSquare,
    name: messageAssistantPricing.name,
    description: "Basic call answering and message taking (max 5 details)",
    coverage: "14hr + Afterhours",
    startingPrice: "$89/mo",
  },
  {
    id: "virtual-receptionist",
    icon: Phone,
    name: virtualReceptionistPricing.name,
    description: "Full call answering, message taking & call transfer",
    coverage: "14hr + Afterhours",
    startingPrice: "$149/mo",
  },
  {
    id: "virtual-secretary",
    icon: Briefcase,
    name: virtualSecretaryPricing.name,
    description: "Complete administrative support for your business",
    coverage: "14hr + Afterhours",
    startingPrice: "$199/mo",
  },
  {
    id: "virtual-assistants",
    icon: Users,
    name: "Virtual Assistants",
    description: "Dedicated remote assistant for ongoing business support",
    coverage: "Full Time",
    startingPrice: "$1,899/mo",
  },
   {
     id: "hybrid-receptionist",
     icon: Layers,
     name: "Hybrid Receptionist",
     description: "AI efficiency + Human expertise combined for perfect coverage",
     coverage: "24/7 AI + 14hr Human",
     startingPrice: "$99/mo",
   },
];

export function StepServiceSelect({ data, updateData, nextStep, prevStep }: StepProps) {
  const { isGated } = useGatedServices();
  const isValid = data.service !== "" && !isGated(data.service);

  return (
    <Card className="border-0 shadow-card">
      <CardHeader>
        <CardTitle>Choose your service</CardTitle>
        <CardDescription>
          Select the answering service that best fits your needs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {services.map((service) => {
            const Icon = service.icon;
            const isSelected = data.service === service.id;
            const gated = isGated(service.id);

            return (
              <button
                key={service.id}
                onClick={() => !gated && updateData({ service: service.id })}
                disabled={gated}
                aria-disabled={gated}
                className={cn(
                  "p-4 rounded-lg border-2 text-left transition-all relative",
                  isSelected && !gated
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card",
                  !gated && "hover:border-primary/50",
                  gated && "opacity-70 cursor-not-allowed"
                )}
              >
                {gated && (
                  <div className="absolute top-2 right-2">
                    <ComingSoonBadge />
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "p-2 rounded-lg",
                      isSelected && !gated ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-heading">{service.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {service.description}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        {service.coverage}
                      </span>
                      {gated ? (
                        <Link
                          to={`/solutions/${service.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs font-semibold text-cta hover:underline"
                        >
                          Notify me →
                        </Link>
                      ) : (
                        <span className="text-sm font-semibold text-primary">
                          From {service.startingPrice}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={prevStep}>
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back
          </Button>
          <Button
            onClick={nextStep}
            disabled={!isValid}
            variant="cta"
          >
            Continue
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
