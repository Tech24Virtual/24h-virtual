/**
 * Phase 27 — Admin Offer Ops Panel
 * Surfaces the offer registry and exposure summary. Admin-only.
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Power, PowerOff } from "lucide-react";
import {
  fetchOffers,
  fetchOfferExposureSummary,
  createOffer,
  setOfferActive,
  acceptanceRate,
  completionRate,
  type Offer,
  type OfferExposureSummary,
  type OfferSurface,
  type OfferAudience,
} from "@/lib/governance/offers";

function pct(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

export default function OffersOpsPanel() {
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [summary, setSummary] = useState<OfferExposureSummary[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    key: "",
    label: "",
    surface: "signup" as OfferSurface,
    audience: "all" as OfferAudience,
    plan_key: "",
    stripe_price_id: "",
    is_baseline: false,
    experiment_id: "",
    variant_key: "",
  });

  async function reload() {
    const [o, s] = await Promise.all([fetchOffers(), fetchOfferExposureSummary()]);
    setOffers(o);
    setSummary(s);
  }
  useEffect(() => { reload(); }, []);

  async function handleCreate() {
    if (!form.key || !form.label || !form.plan_key) return;
    setCreating(true);
    await createOffer({
      key: form.key,
      label: form.label,
      surface: form.surface,
      audience: form.audience,
      plan_key: form.plan_key,
      stripe_price_id: form.stripe_price_id || null,
      experiment_id: form.experiment_id || null,
      variant_key: form.variant_key || null,
      is_baseline: form.is_baseline,
    });
    setCreating(false);
    setForm({ ...form, key: "", label: "" });
    reload();
  }

  async function handleToggle(o: Offer) {
    await setOfferActive(o.id, !o.active);
    reload();
  }

  if (offers === null || summary === null) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const summaryByOffer = new Map(summary.map((s) => [s.offer_id, s]));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Phase 27 · Checkout & Offer Delivery</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>
            Offers are a thin lens over canonical plans/prices. Variants influence selection;
            billing truth always comes from <code>plan_key</code> + <code>stripe_price_id</code>.
          </p>
          <p>
            All offers are admin-managed. WL partners only see offers scoped to their own
            <code> partner_id</code>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Offer
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Key</Label>
            <Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="signup-baseline-v1" />
          </div>
          <div>
            <Label>Label</Label>
            <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Signup baseline" />
          </div>
          <div>
            <Label>Plan Key (canonical)</Label>
            <Input value={form.plan_key} onChange={(e) => setForm({ ...form, plan_key: e.target.value })} placeholder="ai-receptionist-250" />
          </div>
          <div>
            <Label>Stripe Price ID</Label>
            <Input value={form.stripe_price_id} onChange={(e) => setForm({ ...form, stripe_price_id: e.target.value })} placeholder="price_..." />
          </div>
          <div>
            <Label>Surface</Label>
            <Select value={form.surface} onValueChange={(v) => setForm({ ...form, surface: v as OfferSurface })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="signup">signup</SelectItem>
                <SelectItem value="upgrade">upgrade</SelectItem>
                <SelectItem value="wl_partner">wl_partner</SelectItem>
                <SelectItem value="in_app">in_app</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Audience</Label>
            <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v as OfferAudience })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">all</SelectItem>
                <SelectItem value="direct">direct</SelectItem>
                <SelectItem value="wl_end_client">wl_end_client</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Experiment ID (optional)</Label>
            <Input value={form.experiment_id} onChange={(e) => setForm({ ...form, experiment_id: e.target.value })} />
          </div>
          <div>
            <Label>Variant Key (optional)</Label>
            <Input value={form.variant_key} onChange={(e) => setForm({ ...form, variant_key: e.target.value })} />
          </div>
          <div className="flex items-end gap-2">
            <Button variant={form.is_baseline ? "default" : "outline"} onClick={() => setForm({ ...form, is_baseline: !form.is_baseline })}>
              {form.is_baseline ? "Baseline ✓" : "Mark as Baseline"}
            </Button>
            <Button onClick={handleCreate} disabled={creating || !form.key || !form.label || !form.plan_key}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Offers ({offers.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b">
              <tr>
                <th className="py-2 pr-3">Key / Label</th>
                <th className="py-2 pr-3">Surface</th>
                <th className="py-2 pr-3">Audience</th>
                <th className="py-2 pr-3">Plan</th>
                <th className="py-2 pr-3">Variant</th>
                <th className="py-2 pr-3">Shown</th>
                <th className="py-2 pr-3">Accept</th>
                <th className="py-2 pr-3">Complete</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => {
                const s = summaryByOffer.get(o.id);
                return (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="py-2 pr-3">
                      <div className="font-medium">{o.label}</div>
                      <div className="text-xs text-muted-foreground">{o.key}</div>
                    </td>
                    <td className="py-2 pr-3"><Badge variant="outline">{o.surface}</Badge></td>
                    <td className="py-2 pr-3">{o.audience}</td>
                    <td className="py-2 pr-3">
                      <div>{o.plan_key}</div>
                      {o.stripe_price_id && <div className="text-xs text-muted-foreground">{o.stripe_price_id}</div>}
                    </td>
                    <td className="py-2 pr-3">
                      {o.is_baseline ? <Badge>baseline</Badge> : o.variant_key ? <Badge variant="secondary">{o.variant_key}</Badge> : "—"}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{s?.shown_count ?? 0}</td>
                    <td className="py-2 pr-3 tabular-nums">{pct(s ? acceptanceRate(s) : null)}</td>
                    <td className="py-2 pr-3 tabular-nums">{pct(s ? completionRate(s) : null)}</td>
                    <td className="py-2 pr-3">
                      {o.active ? <Badge className="bg-green-600">active</Badge> : <Badge variant="secondary">paused</Badge>}
                    </td>
                    <td className="py-2 pr-3">
                      <Button variant="ghost" size="sm" onClick={() => handleToggle(o)}>
                        {o.active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {offers.length === 0 && (
                <tr><td colSpan={10} className="py-6 text-center text-muted-foreground">No offers yet. Create a baseline for each surface to start.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
