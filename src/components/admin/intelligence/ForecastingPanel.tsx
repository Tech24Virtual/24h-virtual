/**
 * Phase 10 — Forecasting / Predictive Ops surface.
 *
 * Composes the forecast functions in src/lib/governance/forecasting.ts
 * into a single read-only panel. Distinct from Mission Control (now-state)
 * and Intelligence Executive Summary (current totals).
 *
 * Every forecast is advisory and explainable — each tile carries an
 * inspectable basis (method + inputs + confidence).
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, Info } from "lucide-react";
import { ForecastTile } from "./ForecastTile";
import {
  forecastDomainEventVolume,
  forecastRevenue,
  forecastDelivery,
  forecastVoice,
  forecastWL,
  forecastAutomation,
  type DomainEventForecast,
  type RevenueForecast,
  type DeliveryForecast,
  type VoiceForecast,
  type WLActivationForecast,
  type AutomationForecast,
  type ForecastHorizon,
} from "@/lib/governance/forecasting";
import { DOMAIN_LABEL } from "@/lib/governance/intelligence";

export function ForecastingPanel() {
  const [horizon, setHorizon] = useState<ForecastHorizon>("7d");
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<DomainEventForecast[]>([]);
  const [revenue, setRevenue] = useState<RevenueForecast | null>(null);
  const [delivery, setDelivery] = useState<DeliveryForecast | null>(null);
  const [voice, setVoice] = useState<VoiceForecast | null>(null);
  const [wl, setWl] = useState<WLActivationForecast | null>(null);
  const [automation, setAutomation] = useState<AutomationForecast | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      forecastDomainEventVolume(horizon),
      forecastRevenue(horizon === "7d" ? "7d" : "30d"),
      forecastDelivery(horizon),
      forecastVoice(horizon),
      forecastWL(horizon === "7d" ? "7d" : "30d"),
      forecastAutomation(horizon),
    ])
      .then(([ev, rv, dv, vc, w, au]) => {
        if (cancelled) return;
        setEvents(ev); setRevenue(rv); setDelivery(dv); setVoice(vc); setWl(w); setAutomation(au);
      })
      .catch(() => { /* tiles render their own insufficient state */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [horizon]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-2 text-xs text-muted-foreground max-w-2xl">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            Forecasts are <strong>advisory</strong>. They use trailing averages, stage baselines, and age-based risk over the canonical Phase 1–9 substrate. Click any tile's <em>?</em> to inspect the method, inputs, and confidence.
          </p>
        </div>
        <Tabs value={horizon} onValueChange={(v) => setHorizon(v as ForecastHorizon)}>
          <TabsList>
            <TabsTrigger value="7d">7-day horizon</TabsTrigger>
            <TabsTrigger value="30d">30-day horizon</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {revenue && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Revenue / Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ForecastTile
              label="Expected conversions"
              band={revenue.expected_conversions}
              basis={revenue.basis}
              sublabel={`${revenue.active_leads} active leads`}
            />
            <ForecastTile
              label="Expected pipeline value (USD)"
              band={revenue.expected_value_usd}
              basis={revenue.basis}
              sublabel="Stage-baseline projection"
            />
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-4 space-y-1">
                <div className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> At-risk signals
                </div>
                <div className="text-2xl font-bold">{revenue.overdue_at_risk}</div>
                <div className="text-xs text-muted-foreground">overdue follow-ups · {revenue.unassigned} unassigned</div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}

      {delivery && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Delivery / Activation Capacity</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ForecastTile
              label="Expected activations"
              band={delivery.expected_activations}
              basis={delivery.basis}
              sublabel={`${delivery.open_intakes} open intakes`}
            />
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-4 space-y-1">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Backlog pressure</div>
                <div className="text-2xl font-bold">{delivery.urgent}</div>
                <div className="text-xs text-muted-foreground">urgent · {delivery.unassigned} unassigned</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-muted-foreground/30">
              <CardContent className="p-4 space-y-1">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Oldest open intake</div>
                <div className="text-2xl font-bold">{delivery.oldest_age_days ?? "—"}<span className="text-sm font-normal text-muted-foreground"> days</span></div>
                <div className="text-xs text-muted-foreground">Age-risk signal</div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}

      {voice && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">AI Voice Readiness</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ForecastTile
              label="Expected to go live"
              band={voice.expected_to_go_live}
              basis={voice.basis}
              sublabel={`${voice.ready_to_activate} ready · ${voice.live} live`}
            />
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-4 space-y-1">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Likely to remain blocked</div>
                <div className="text-2xl font-bold">{voice.blocked}</div>
                <div className="text-xs text-muted-foreground">
                  {voice.blocked_reasons.awaiting_script_publish} script · {voice.blocked_reasons.awaiting_number} number · {voice.blocked_reasons.unconfigured} unconfigured
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-1">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Configured but offline</div>
                <div className="text-2xl font-bold">{voice.blocked_reasons.configured_offline}</div>
                <div className="text-xs text-muted-foreground">Operator-toggle dependent</div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}

      {wl && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">White Label Partner Activation</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ForecastTile
              label="Partners likely to go live"
              band={wl.expected_to_go_live}
              basis={wl.basis}
              sublabel={`${wl.live}/${wl.total_partners} live · ${wl.in_progress} in progress`}
            />
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-4 space-y-1">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Stuck (external dep)</div>
                <div className="text-2xl font-bold">{wl.stuck}</div>
                <div className="text-xs text-muted-foreground">DNS verify or pending activation</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-1">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">By state</div>
                <div className="flex flex-wrap gap-1">
                  {wl.by_state.map((s) => (
                    <Badge key={s.state} variant="outline" className="text-[10px]">{s.state}: {s.count}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}

      {automation && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Automation / Recommendation Load</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ForecastTile
              label="Expected new events"
              band={automation.expected_new}
              basis={automation.basis}
              sublabel={`${automation.open_now} open · ${automation.warn_or_critical_now} warn/critical now`}
            />
            <Card className="md:col-span-2">
              <CardContent className="p-4 space-y-2">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Recurring drift patterns</div>
                {automation.recurring_kinds.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No recurring patterns detected.</div>
                ) : (
                  <ul className="text-sm space-y-1">
                    {automation.recurring_kinds.map((k) => (
                      <li key={`${k.domain}:${k.kind}`} className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs">{k.domain} / {k.kind}</span>
                        <Badge variant="secondary" className="text-[10px]">{k.recurrences}d span</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Event Volume Forecast (per domain)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {events.map((f) => (
            <ForecastTile
              key={f.domain}
              label={DOMAIN_LABEL[f.domain]}
              band={f.band}
              basis={f.basis}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
