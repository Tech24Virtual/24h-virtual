import { Link } from "react-router-dom";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { NavigationMenuLink } from "@/components/ui/navigation-menu";
import { ComingSoonBadge } from "@/components/ComingSoonBadge";

interface OutcomeCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  priceAnchor?: string;
  href: string;
  comingSoon?: boolean;
}

export function OutcomeCard({ icon: Icon, title, description, priceAnchor, href, comingSoon }: OutcomeCardProps) {
  return (
    <NavigationMenuLink asChild>
      <Link
        to={href}
        className="group relative block rounded-xl border border-border/60 bg-background p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center text-primary transition-all duration-300 group-hover:from-primary group-hover:to-primary/90 group-hover:text-primary-foreground">
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h5 className="text-sm font-semibold text-heading group-hover:text-primary transition-colors leading-tight flex items-center gap-1.5">
                {title}
                {comingSoon && <ComingSoonBadge />}
              </h5>
              <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 -translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 shrink-0" />
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-snug">{description}</p>
            {priceAnchor && (
              <p className="mt-2 text-xs font-semibold text-primary">{priceAnchor}</p>
            )}
          </div>
        </div>
      </Link>
    </NavigationMenuLink>
  );
}
