import { Link } from "react-router-dom";
import { ArrowRight, Quote } from "lucide-react";
import { NavigationMenuLink } from "@/components/ui/navigation-menu";
import { Badge } from "@/components/ui/badge";

interface MiniCaseStudyCardProps {
  industry: string;
  problem: string;
  outcome: string;
  metric?: string;
  href: string;
  ctaLabel?: string;
}

export function MiniCaseStudyCard({
  industry,
  problem,
  outcome,
  metric,
  href,
  ctaLabel = "Read Story",
}: MiniCaseStudyCardProps) {
  return (
    <NavigationMenuLink asChild>
      <Link
        to={href}
        className="group block h-full rounded-2xl border border-border/60 bg-gradient-to-br from-accent/30 to-background p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="flex items-center justify-between mb-3">
          <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider border-primary/30 text-primary">
            {industry}
          </Badge>
          <Quote className="w-4 h-4 text-primary/30" aria-hidden />
        </div>
        <p className="text-xs text-muted-foreground leading-snug mb-2">
          <span className="font-semibold text-heading/80">Challenge: </span>
          {problem}
        </p>
        <p className="text-xs text-muted-foreground leading-snug mb-3">
          <span className="font-semibold text-heading/80">Outcome: </span>
          {outcome}
        </p>
        {metric && (
          <div className="rounded-lg bg-primary/5 border border-primary/15 px-3 py-2 mb-3">
            <p className="text-xs font-bold text-primary text-center">{metric}</p>
          </div>
        )}
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary group-hover:gap-2.5 transition-all">
          {ctaLabel}
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
        </div>
      </Link>
    </NavigationMenuLink>
  );
}
