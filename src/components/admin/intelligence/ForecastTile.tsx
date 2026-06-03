/**
 * Phase 10 — Forecast tile.
 * Displays a single forecast metric with band, confidence, and an
 * inspectable "Why?" popover that exposes the basis (method + inputs).
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HelpCircle, TrendingUp } from "lucide-react";
import { CONFIDENCE_LABEL, CONFIDENCE_TONE, formatBand, type ForecastBand, type ForecastBasis } from "@/lib/governance/forecasting";

interface Props {
  label: string;
  band: ForecastBand;
  basis: ForecastBasis;
  sublabel?: string;
}

const TONE_BORDER: Record<string, string> = {
  positive: "border-l-4 border-l-green-500",
  neutral: "border-l-4 border-l-muted-foreground/30",
  attention: "border-l-4 border-l-amber-500",
  warn: "border-l-4 border-l-destructive",
};

export function ForecastTile({ label, band, basis, sublabel }: Props) {
  const tone = CONFIDENCE_TONE[basis.confidence];
  return (
    <Card className={TONE_BORDER[tone]}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> {label}
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="text-muted-foreground hover:text-foreground transition" aria-label="Forecast basis">
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 text-xs space-y-2">
              <div className="font-semibold text-sm">How this was calculated</div>
              <div className="text-muted-foreground">{basis.explanation}</div>
              <div className="grid grid-cols-2 gap-1 pt-2 border-t">
                <div className="text-muted-foreground">Method</div>
                <div className="font-mono">{basis.method}</div>
                <div className="text-muted-foreground">Horizon</div>
                <div>{basis.horizon}</div>
                <div className="text-muted-foreground">Confidence</div>
                <div>{CONFIDENCE_LABEL[basis.confidence]}</div>
              </div>
              <div className="pt-2 border-t">
                <div className="text-muted-foreground mb-1">Inputs</div>
                <pre className="bg-muted p-2 rounded text-[10px] overflow-x-auto">
{JSON.stringify(basis.inputs, null, 2)}
                </pre>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="text-2xl font-bold">{formatBand(band)}</div>
        <div className="flex items-center justify-between gap-2">
          {sublabel && <div className="text-xs text-muted-foreground">{sublabel}</div>}
          <Badge variant="outline" className="text-[10px] ml-auto">
            {basis.horizon} · {CONFIDENCE_LABEL[basis.confidence]}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
