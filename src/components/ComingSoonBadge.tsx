import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface ComingSoonBadgeProps {
  className?: string;
  showIcon?: boolean;
  label?: string;
}

/**
 * Small, brand-consistent "Soon" pill used to mark gated features
 * across nav menus, footer links, pricing tabs, cards, and wizards.
 */
export function ComingSoonBadge({
  className,
  showIcon = false,
  label = "Soon",
}: ComingSoonBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-cta/30 bg-cta/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cta leading-none",
        className,
      )}
    >
      {showIcon && <Sparkles className="h-2.5 w-2.5" />}
      {label}
    </span>
  );
}
