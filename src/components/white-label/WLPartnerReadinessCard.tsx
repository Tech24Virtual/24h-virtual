/**
 * Phase 6 — Partner-facing readiness summary.
 * Mounted on the WL partner dashboard. Tenant-safe: uses RLS-scoped
 * v_wl_partner_readiness via fetchPartnerReadiness.
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Clock, Globe, Palette, Users } from "lucide-react";
import {
  fetchPartnerReadiness,
  readinessLabel,
  type WLPartnerReadinessRow,
} from "@/lib/governance/wlOverview";

interface Props {
  partnerId: string;
}

export function WLPartnerReadinessCard({ partnerId }: Props) {
  const [row, setRow] = useState<WLPartnerReadinessRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchPartnerReadiness(partnerId)
      .then((r) => mounted && setRow(r))
      .catch(() => mounted && setRow(null))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [partnerId]);

  const variant =
    row?.readiness_state === "live" ? "default"
    : row?.readiness_state === "pending" ? "destructive"
    : "secondary";

  const checks: { label: string; ok: boolean; icon: typeof CheckCircle2 }[] = [
    { label: "Account Activated", ok: row?.partner_status === "active", icon: CheckCircle2 },
    { label: "Branding Configured", ok: !!row?.has_branding, icon: Palette },
    { label: "Custom Domain Connected", ok: !!row?.has_custom_domain, icon: Globe },
    { label: "Domain Verified", ok: !!row?.domain_verified, icon: CheckCircle2 },
    { label: "Active Clients", ok: (row?.active_clients ?? 0) > 0, icon: Users },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Partner Readiness</CardTitle>
          {row && (
            <Badge variant={variant as any}>{readinessLabel(row.readiness_state)}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !row ? (
          <p className="text-sm text-muted-foreground">No partner record found.</p>
        ) : (
          <ul className="space-y-2">
            {checks.map((c) => {
              const Icon = c.ok ? CheckCircle2 : c.label.includes("Domain Verified") && row.has_custom_domain ? Clock : AlertCircle;
              return (
                <li key={c.label} className="flex items-center gap-2 text-sm">
                  <Icon className={`h-4 w-4 ${c.ok ? "text-green-600" : "text-muted-foreground"}`} />
                  <span className={c.ok ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
                </li>
              );
            })}
            <li className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
              <span>{row.total_clients} clients</span>
              <span>·</span>
              <span>{row.active_clients} active</span>
              <span>·</span>
              <span>{row.clients_with_portal} with portal</span>
              <span>·</span>
              <span>{row.alias_count} domain aliases</span>
            </li>
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
