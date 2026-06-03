import { Link } from "react-router-dom";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { NavigationMenuLink } from "@/components/ui/navigation-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LeadMagnetCardProps {
  icon: LucideIcon;
  badge?: string;
  title: string;
  valueProp: string;
  ctaLabel: string;
  href: string;
  variant?: "primary" | "secondary";
}

export function LeadMagnetCard({
  icon: Icon,
  badge = "FREE",
  title,
  valueProp,
  ctaLabel,
  href,
  variant = "primary",
}: LeadMagnetCardProps) {
  const isPrimary = variant === "primary";
  return (
    <NavigationMenuLink asChild>
      <Link
        to={href}
        className={cn(
          "group relative block rounded-2xl p-5 overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          isPrimary
            ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
            : "bg-gradient-to-br from-secondary/15 to-secondary/5 border border-secondary/30"
        )}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <div className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center",
              isPrimary ? "bg-primary-foreground/15 text-primary-foreground" : "bg-secondary/20 text-secondary"
            )}>
              <Icon className="w-5 h-5" />
            </div>
            <Badge
              variant="secondary"
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wider",
                isPrimary && "bg-primary-foreground/20 text-primary-foreground border-0"
              )}
            >
              {badge}
            </Badge>
          </div>
          <h5 className={cn(
            "text-base font-bold leading-tight mb-1.5",
            isPrimary ? "text-primary-foreground" : "text-heading"
          )}>
            {title}
          </h5>
          <p className={cn(
            "text-xs leading-relaxed mb-4",
            isPrimary ? "text-primary-foreground/85" : "text-muted-foreground"
          )}>
            {valueProp}
          </p>
          <div className={cn(
            "inline-flex items-center gap-1.5 text-xs font-semibold transition-all",
            isPrimary ? "text-primary-foreground" : "text-secondary"
          )}>
            {ctaLabel}
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
        {isPrimary && (
          <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-primary-foreground/5 blur-2xl" aria-hidden />
        )}
      </Link>
    </NavigationMenuLink>
  );
}
