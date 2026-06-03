/**
 * Phase 12 — Partner-facing aggregated insights.
 * Reuses RLS-scoped Phase 6 views via fetchPartnerInsights. No cross-tenant data.
 * Opinionated copy ("what this means") is included on each tile.
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, PhoneCall, FileText, LifeBuoy } from "lucide-react";
import { fetchPartnerInsights, type PartnerInsights } from "@/lib/governance/partnerExperience";

interface Props {
  partnerId: string;
}

export function WLPartnerInsightsCard({ partnerId }: Props) {
  const [data, setData] = useState<PartnerInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchPartnerInsights(partnerId)
      .then((r) => mounted && setData(r))
      .catch(() => mounted && setData(null))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [partnerId]);

  const tiles = [
    {
      label: "Active Clients",
      value: data ? `${data.activeClients}/${data.totalClients}` : "—",
      meaning: data?.clientsWithPortal
        ? `${data.clientsWithPortal} have portal access provisioned.`
        : "No client portals provisioned yet.",
      icon: Users,
    },
    {
      label: "Live Receptionist Flows",
      value: data ? String(data.liveReceptionists) : "—",
      meaning:
        data && data.pendingReceptionists > 0
          ? `${data.pendingReceptionists} additional flow${data.pendingReceptionists === 1 ? "" : "s"} pending setup.`
          : "All configured receptionist flows are live.",
      icon: PhoneCall,
    },
    {
      label: "Published Scripts",
      value: data ? `${data.publishedScripts}/${data.totalScripts}` : "—",
      meaning:
        data && data.publishedScripts < data.totalScripts
          ? "Some scripts are drafted but not yet published. Calls will not use unpublished scripts."
          : "All client scripts are published and ready for calls.",
      icon: FileText,
    },
    {
      label: "Open Client Tickets",
      value: data ? String(data.openTickets) : "—",
      meaning:
        data && data.openTickets > 0
          ? "Aggregated across your portfolio. Triage to keep client response time low."
          : "No open tickets across your client portfolio.",
      icon: LifeBuoy,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Portfolio Insights</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tiles.map((t) => (
              <div key={t.label} className="rounded-md border p-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <t.icon className="h-3.5 w-3.5" /> {t.label}
                </div>
                <div className="mt-1 text-2xl font-semibold">{t.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{t.meaning}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
