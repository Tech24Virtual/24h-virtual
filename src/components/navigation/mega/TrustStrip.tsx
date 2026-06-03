import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavigationMenuLink } from "@/components/ui/navigation-menu";

interface TrustStripProps {
  chips: string[];
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
}

export function TrustStrip({
  chips,
  primaryCtaLabel = "Book FREE Consultation",
  primaryCtaHref = "/get-started",
  secondaryCtaLabel,
  secondaryCtaHref,
}: TrustStripProps) {
  return (
    <div className="mt-6 pt-5 border-t border-border/60 flex flex-wrap items-center justify-between gap-4">
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {chips.map((chip) => (
          <li key={chip} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="font-medium">{chip}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        {secondaryCtaLabel && secondaryCtaHref && (
          <NavigationMenuLink asChild>
            <Link
              to={secondaryCtaHref}
              className="text-xs font-semibold text-heading hover:text-primary transition-colors px-3 py-2"
            >
              {secondaryCtaLabel}
            </Link>
          </NavigationMenuLink>
        )}
        <Button variant="cta" size="sm" className="rounded-full group" asChild>
          <Link to={primaryCtaHref}>
            {primaryCtaLabel}
            <ArrowRight className="ml-1.5 w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
