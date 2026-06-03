/**
 * Phase 24 — Partner-facing self performance card (WL Partner Dashboard).
 *
 * Strict scope: shows only the calling partner's OWN portfolio metrics.
 * No cross-partner comparison. Admin-only fields are not projected by the
 * underlying view (servicing cost, partner-side CAC, partial margin).
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Info, TrendingUp, Users } from "lucide-react";
import {
  fetchWLPartnerSelfEconomics,
  fetchWLPartnerSelfPortfolioHealth,
  formatUsd,
  type WLPartnerSelfEconomics,
  type WLPartnerSelfPortfolioHealthRow,
} from "@/lib/governance/wlPartnerSelf";

export function WLPartnerEconomicsCard() {
  const [econ, setEcon] = useState<WLPartnerSelfEconomics | null | undefined>(undefined);
  const [health, setHealth] = useState<WLPartnerSelfPortfolioHealthRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchWLPartnerSelfEconomics(), fetchWLPartnerSelfPortfolioHealth()])
      .then(([e, h]) => { if (!cancelled) { setEcon(e); setHealth(h); } })
      .catch(() => { if (!cancelled) setEcon(null); });
    return () => { cancelled = true; };
  }, []);

  if (econ === undefined) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </CardContent>
      </Card>
    );
  }
  if (econ === null) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" /> Your portfolio performance
        </CardTitle>
        <CardDescription>
          Your own clients only. Cross-partner data is never shown here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Tile label="Active clients" value={`${econ.active_clients}`} sub={`${econ.total_clients} total`} />
          <Tile label="Recurring (90d avg proxy)" value={formatUsd(econ.recurring_value_proxy_usd)} sub={`${econ.paid_invoices_90d ?? 0} paid invoices`} />
          <Tile label="Expansion / contraction" value={`${econ.clients_expansion} / ${econ.clients_contraction}`} sub={`${econ.clients_with_signal} with signal`} />
          <Tile label="Tier" value={econ.tier ?? "—"} sub={econ.partner_status ?? ""} />
        </div>

        {health.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Portfolio health:</span>
            {health.map((h) => (
              <Badge key={h.health_band} variant="outline" className="text-[11px] capitalize">
                {h.health_band}: {h.client_count}
              </Badge>
            ))}
          </div>
        )}

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Recurring is a labeled 90-day paid-invoice average proxy, not a contractual amount.
            Health bands come from the platform success layer, scoped to your portfolio only.
            Internal cost, margin, and cross-partner comparisons are not shown.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold mt-1">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}
