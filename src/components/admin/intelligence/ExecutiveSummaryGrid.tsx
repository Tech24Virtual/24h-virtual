import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { KpiTile } from "@/lib/governance/intelligence";

const TONE_CLASSES: Record<KpiTile["tone"], string> = {
  neutral: "border-border",
  positive: "border-emerald-500/40",
  attention: "border-amber-500/40",
  warn: "border-destructive/50",
};

export function ExecutiveSummaryGrid({ tiles }: { tiles: KpiTile[] }) {
  if (!tiles.length) {
    return (
      <p className="text-sm text-muted-foreground">Executive summary unavailable.</p>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {tiles.map((t) => (
        <Link key={t.key} to={t.drillRoute} className="block">
          <Card className={cn("border-2 transition-colors hover:bg-accent/30", TONE_CLASSES[t.tone])}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{t.label}</p>
              <p className="mt-1 text-2xl font-bold">{t.value}</p>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{t.sublabel}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
