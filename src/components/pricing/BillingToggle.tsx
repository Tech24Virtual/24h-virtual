import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface BillingToggleProps {
  isAnnual: boolean;
  setIsAnnual: (value: boolean) => void;
}

export function BillingToggle({ isAnnual, setIsAnnual }: BillingToggleProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center justify-center gap-4">
        <span
          className={`text-sm font-medium transition-colors ${
            !isAnnual ? "text-heading" : "text-muted-foreground"
          }`}
        >
          Monthly
        </span>
        <Switch
          checked={isAnnual}
          onCheckedChange={setIsAnnual}
          className="data-[state=checked]:bg-primary"
        />
        <span
          className={`text-sm font-medium transition-colors ${
            isAnnual ? "text-heading" : "text-muted-foreground"
          }`}
        >
          Annual
          <Badge className="ml-2 bg-cta/10 text-cta border-cta/20">
            Save 10%
          </Badge>
        </span>
      </div>
      {isAnnual && (
        <p className="text-sm text-muted-foreground text-center">
          Billed monthly with a 1-year commitment
        </p>
      )}
    </div>
  );
}
