import { Link } from "react-router-dom";
import { ChevronDown, ArrowRight, type LucideIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface FunnelItemProps {
  title: string;
  icon: LucideIcon;
  audience: string;
  pain: string;
  solution: string;
  ctaLabel: string;
  ctaHref: string;
  onCtaClick?: () => void;
}

export function FunnelItem({
  title,
  icon: Icon,
  audience,
  pain,
  solution,
  ctaLabel,
  ctaHref,
  onCtaClick,
}: FunnelItemProps) {
  return (
    <Collapsible className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <CollapsibleTrigger className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors group">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{audience}</p>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
        <div className="px-3 pb-3 pt-1 space-y-3 border-t border-border/60">
          <div className="grid grid-cols-1 gap-2 pt-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">The Pain</p>
              <p className="text-xs text-foreground/80 mt-0.5">{pain}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">How We Help</p>
              <p className="text-xs text-foreground/80 mt-0.5">{solution}</p>
            </div>
          </div>
          <Link
            to={ctaHref}
            onClick={onCtaClick}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:gap-2 transition-all"
          >
            {ctaLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
