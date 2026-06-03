import { Link } from "react-router-dom";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { ComingSoonBadge } from "@/components/ComingSoonBadge";

interface FeaturedSolutionCardProps {
  title: string;
  tagline: string;
  href: string;
  icon: LucideIcon;
  accent?: "primary" | "cta" | "accent";
  onClick?: () => void;
  comingSoon?: boolean;
}

const accentMap = {
  primary: "from-primary/15 to-primary/5 text-primary",
  cta: "from-cta/15 to-cta/5 text-cta",
  accent: "from-accent/40 to-accent/10 text-accent-foreground",
};

export function FeaturedSolutionCard({
  title,
  tagline,
  href,
  icon: Icon,
  accent = "primary",
  onClick,
  comingSoon,
}: FeaturedSolutionCardProps) {
  return (
    <motion.div whileTap={{ scale: 0.97 }} className="h-full">
      <Link
        to={href}
        onClick={onClick}
        className="group relative flex h-full flex-col gap-2 rounded-2xl border border-border/60 bg-card p-4 shadow-soft transition-all duration-300 hover:border-primary/40 hover:shadow-elevated active:shadow-soft"
      >
        <div className="flex items-start justify-between">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accentMap[accent]}`}
          >
            <Icon className="h-5 w-5" />
          </div>
          {comingSoon ? (
            <ComingSoonBadge />
          ) : (
            <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
          )}
        </div>
        <div className="mt-1">
          <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground leading-snug line-clamp-2">{tagline}</p>
        </div>
      </Link>
    </motion.div>
  );
}
