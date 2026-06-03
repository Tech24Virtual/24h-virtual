import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MegaColumnProps {
  title: string;
  icon?: LucideIcon;
  className?: string;
  children: React.ReactNode;
}

export function MegaColumn({ title, icon: Icon, className, children }: MegaColumnProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/60">
        {Icon && (
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h4>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
