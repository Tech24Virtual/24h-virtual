/**
 * Phase 13 — Growth Intelligence admin panel
 *
 * Three honest read-only views:
 *  1) Channel performance (last 365d)
 *  2) Direct vs WL motion comparison
 *  3) Lead-month cohorts (trailing 12 months)
 *
 * Distinct from Mission Control (operational) and Reporting/Forecasts.
 * Admin scope; backed by RLS-safe canonical views.
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Info, TrendingUp, Users, Building2 } from "lucide-react";
import {
  fetchGrowthIntelligence,
  topChannels,
  channelLabel,
  type GrowthIntelligenceBundle,
} from "@/lib/governance/growthIntelligence";

function fmtPct(n: number) { return `${n.toFixed(1)}%`; }
function fmtDays(n: number | null) { return n == null ? "—" : `${n.toFixed(1)}d`; }
function fmtMonth(s: string) {
  try { return new Date(s).toLocaleDateString(undefined, { year: "numeric", month: "short" }); }
  catch { return s; }
}

export function GrowthIntelligencePanel() {
  const [data, setData] = useState<GrowthIntelligenceBundle | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetchGrowthIntelligence()
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData(null); });
    return () => { cancelled = true; };
  }, []);

  if (data === undefined) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (!data) {
    return <p className="text-sm text-muted-foreground">Growth intelligence unavailable.</p>;
  }

  const channels = topChannels(data.channels);
  const totalLeads = data.directVsWl.reduce((a, r) => a + r.leads, 0);

  return (
    <div className="space-y-6">
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="pt-4 flex gap-3 items-start text-sm text-muted-foreground">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <strong className="text-foreground">Honest first-touch attribution.</strong>{" "}
            Channel is normalized from <code>leads.source</code>. Acquisition type is
            binary (direct vs WL) based on whether a partner intake exists for the lead.
            Multi-touch attribution is intentionally not modeled. Missing sources are
            shown as <em>Unknown</em> rather than guessed.
          </div>
        </CardContent>
      </Card>

      {/* Direct vs WL */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Direct vs White Label (last 365d)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.directVsWl.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leads in window.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {data.directVsWl.map((r) => (
                <div key={r.acquisition_type} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium capitalize">
                      {r.acquisition_type === "wl" ? "White Label" : "Direct"}
                    </span>
                    <Badge variant="secondary">
                      {totalLeads ? Math.round((r.leads / totalLeads) * 100) : 0}% of leads
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <Stat label="Leads" value={r.leads} />
                    <Stat label="Conversions" value={r.conversions} />
                    <Stat label="Conversion" value={fmtPct(r.conversion_rate_pct)} />
                    <Stat label="Activation" value={fmtPct(r.activation_rate_pct)} />
                    <Stat label="Avg days to convert" value={fmtDays(r.avg_days_to_convert)} />
                    <Stat label="Activations" value={r.activations} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Channels */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Top Channels (last 365d)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {channels.length === 0 ? (
            <p className="text-sm text-muted-foreground">No channels in window.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2 font-medium">Channel</th>
                    <th className="py-2 font-medium text-right">Leads</th>
                    <th className="py-2 font-medium text-right">Conv.</th>
                    <th className="py-2 font-medium text-right">Conv. rate</th>
                    <th className="py-2 font-medium text-right">Avg days</th>
                    <th className="py-2 font-medium text-right">Direct / WL</th>
                  </tr>
                </thead>
                <tbody>
                  {channels.map((c) => (
                    <tr key={c.channel} className="border-t">
                      <td className="py-2">{channelLabel(c.channel)}</td>
                      <td className="py-2 text-right">{c.leads}</td>
                      <td className="py-2 text-right">{c.conversions}</td>
                      <td className="py-2 text-right">{fmtPct(c.conversion_rate_pct)}</td>
                      <td className="py-2 text-right">{fmtDays(c.avg_days_to_convert)}</td>
                      <td className="py-2 text-right text-muted-foreground">
                        {c.direct_leads} / {c.wl_leads}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cohorts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Lead-Month Cohorts (trailing 12 months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.cohorts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cohorts in window.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2 font-medium">Cohort</th>
                    <th className="py-2 font-medium text-right">Leads</th>
                    <th className="py-2 font-medium text-right">Conv.</th>
                    <th className="py-2 font-medium text-right">Activated</th>
                    <th className="py-2 font-medium text-right">Conv. %</th>
                    <th className="py-2 font-medium text-right">Activation %</th>
                    <th className="py-2 font-medium text-right">Direct / WL</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cohorts.map((c) => (
                    <tr key={c.cohort_month} className="border-t">
                      <td className="py-2">{fmtMonth(c.cohort_month)}</td>
                      <td className="py-2 text-right">{c.leads}</td>
                      <td className="py-2 text-right">{c.conversions}</td>
                      <td className="py-2 text-right">{c.activations}</td>
                      <td className="py-2 text-right">{fmtPct(c.conversion_rate_pct)}</td>
                      <td className="py-2 text-right">{fmtPct(c.activation_rate_pct)}</td>
                      <td className="py-2 text-right text-muted-foreground">
                        {c.direct_leads} / {c.wl_leads}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

export default GrowthIntelligencePanel;
