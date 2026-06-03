/**
 * Phase 29 — Partner Success & Expansion Operations
 *
 * Partner-facing expansion nudges card. Shows the calling partner's own
 * portfolio health summary and a small set of safe expansion hints.
 *
 * Strict scope:
 *  - Partner-own data only (`v_partner_self_success` filters on auth.uid()).
 *  - No cross-partner data, no internal margin or revenue, no state labels.
 *  - Copy emphasises cooperative growth, not internal economics.
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Heart, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import {
  fetchSelfSuccess,
  type PartnerSelfSuccess,
} from "@/lib/governance/partnerSuccess";

export function WLPartnerExpansionCard() {
  const [data, setData] = useState<PartnerSelfSuccess | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetchSelfSuccess()
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData(null); });
    return () => { cancelled = true; };
  }, []);

  if (data === undefined) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </CardContent>
      </Card>
    );
  }
  if (data === null) return null;

  const hints: { icon: any; tone: "default" | "secondary" | "destructive"; text: string }[] = [];
  if (data.hint_expansion_ready) {
    hints.push({
      icon: Sparkles,
      tone: "default",
      text: `${data.healthy_count} of your clients are healthy and ${data.clients_expansion} are expanding. Consider adding a new line for them.`,
    });
  }
  if (data.hint_strong_portfolio && !data.hint_expansion_ready) {
    hints.push({
      icon: Heart,
      tone: "default",
      text: "Your portfolio health is strong. A great moment to introduce additional services to existing clients.",
    });
  }
  if (data.hint_attention_needed) {
    hints.push({
      icon: AlertCircle,
      tone: "secondary",
      text: `${data.intervention_count} client(s) need attention. Reaching out early helps protect ongoing performance.`,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> Grow with your portfolio
        </CardTitle>
        <CardDescription>
          Suggestions based on your own clients only. No comparisons with other partners.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="default">{data.healthy_count} healthy</Badge>
          <Badge variant="secondary">{data.watch_count} watch</Badge>
          <Badge variant={data.intervention_count > 0 ? "destructive" : "outline"}>
            {data.intervention_count} need attention
          </Badge>
          <Badge variant="outline">{data.active_clients} active</Badge>
        </div>

        {hints.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Keep activating clients fully to unlock expansion suggestions.
          </p>
        ) : (
          <div className="space-y-2">
            {hints.map((h, i) => {
              const Icon = h.icon;
              return (
                <Alert key={i}>
                  <Icon className="h-4 w-4" />
                  <AlertDescription className="text-xs">{h.text}</AlertDescription>
                </Alert>
              );
            })}
          </div>
        )}

        {data.hint_expansion_ready && (
          <div className="flex justify-end">
            <Button asChild size="sm" variant="default">
              <Link to="/wl-partner/clients">Review my clients</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
