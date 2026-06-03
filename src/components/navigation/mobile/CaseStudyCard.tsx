import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface CaseStudyCardProps {
  industry: string;
  problem: string;
  result: string;
  metric?: string;
  href: string;
  ctaLabel?: string;
  onClick?: () => void;
}

export function CaseStudyCard({
  industry,
  problem,
  result,
  metric,
  href,
  ctaLabel = "See how it works",
  onClick,
}: CaseStudyCardProps) {
  return (
    <Link
      to={href}
      onClick={onClick}
      className="group block w-[260px] shrink-0 snap-start rounded-2xl border border-border/60 bg-gradient-to-br from-card to-muted/30 p-4 shadow-soft transition-all duration-300 hover:border-primary/40 hover:shadow-elevated"
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
          {industry}
        </span>
        {metric && (
          <span className="text-xs font-bold text-cta">{metric}</span>
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground leading-snug line-clamp-2">{problem}</p>
      <p className="mt-2 text-sm font-semibold text-foreground leading-snug line-clamp-3">{result}</p>
      <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-1.5 transition-all">
        {ctaLabel}
        <ArrowRight className="h-3 w-3" />
      </div>
    </Link>
  );
}
