import { useState, useEffect } from "react";
import { DollarSign, Calculator, Zap } from "lucide-react";
import { WhiteLabelLayout } from "@/components/white-label/WhiteLabelLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function WLWholesalePricing() {
  const { user } = useAuth();
  const [pricing, setPricing] = useState<any>(null);
  const [addons, setAddons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Calculator state
  const [calcMinutes, setCalcMinutes] = useState(500);
  const [calcCampaigns, setCalcCampaigns] = useState(1);
  const [calcServiceType, setCalcServiceType] = useState("virtual_receptionist");
  const [calcLanguage, setCalcLanguage] = useState("english_only");

  useEffect(() => { if (user) fetchData(); }, [user]);

  const fetchData = async () => {
    if (!user) return;
    try {
      const { data: partner } = await supabase.from("white_label_partners").select("id").eq("user_id", user.id).single();
      if (!partner) return;

      const [pricingRes, addonsRes] = await Promise.all([
        supabase.from("wl_wholesale_pricing").select("*").eq("partner_id", partner.id).maybeSingle(),
        supabase.from("wl_addon_pricing").select("*, addon_products(name, description, unit)")
          .eq("partner_id", partner.id).eq("is_available", true),
      ]);

      setPricing(pricingRes.data);
      setAddons(addonsRes.data || []);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  // Calculate projected cost
  const getBaseRate = () => {
    if (!pricing) return 0;
    if (calcMinutes < 100) return Number(pricing.tier_under_100_rate);
    if (calcMinutes < 500) return Number(pricing.tier_under_500_rate);
    if (calcMinutes < 1000) return Number(pricing.tier_under_1000_rate);
    return Number(pricing.tier_over_1000_rate);
  };

  const baseRate = getBaseRate();
  const secretarySurcharge = calcServiceType === "virtual_secretary" ? Number(pricing?.secretary_surcharge || 0.05) : 0;
  const langSurcharge = calcLanguage === "spanish" ? Number(pricing?.spanish_surcharge || 0.05)
    : calcLanguage === "french" ? Number(pricing?.french_surcharge || 0.05)
    : calcLanguage === "both" ? Number(pricing?.both_languages_surcharge || 0.07) : 0;
  const effectiveRate = baseRate + secretarySurcharge + langSurcharge;
  const minuteCost = calcMinutes * effectiveRate;
  const setupFee = Number(pricing?.campaign_setup_fee || 100);
  const additionalFee = Number(pricing?.additional_campaign_fee || 25);
  const campaignFees = setupFee + Math.max(0, calcCampaigns - 1) * additionalFee;
  const totalProjected = minuteCost + campaignFees;

  return (
    <WhiteLabelLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-heading">Wholesale Pricing</h1>
          <p className="text-muted-foreground mt-1">Your wholesale rates, set by your partnership agreement</p>
        </div>

        {isLoading ? (
          <p className="text-center py-12 text-muted-foreground">Loading...</p>
        ) : !pricing ? (
          <Card>
            <CardContent className="text-center py-12">
              <DollarSign className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
              <p className="text-lg font-medium">Pricing not configured yet</p>
              <p className="text-muted-foreground">Contact your account manager to set up wholesale pricing.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Per-Minute Tiers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Per-Minute Rates
                </CardTitle>
                <CardDescription>Tiered wholesale pricing based on total monthly volume</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Under 100 min", rate: pricing.tier_under_100_rate },
                  { label: "100 – 499 min", rate: pricing.tier_under_500_rate },
                  { label: "500 – 999 min", rate: pricing.tier_under_1000_rate },
                  { label: "1,000+ min", rate: pricing.tier_over_1000_rate },
                ].map(tier => (
                  <div key={tier.label} className="flex justify-between items-center py-2 border-b last:border-0">
                    <span className="text-muted-foreground">{tier.label}</span>
                    <span className="font-bold text-lg">${Number(tier.rate).toFixed(2)}/min</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Surcharges & Fees */}
            <Card>
              <CardHeader>
                <CardTitle>Surcharges & Setup Fees</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Virtual Secretary</span>
                  <span className="font-medium">+${Number(pricing.secretary_surcharge).toFixed(2)}/min</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Spanish Support</span>
                  <span className="font-medium">+${Number(pricing.spanish_surcharge).toFixed(2)}/min</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">French Support</span>
                  <span className="font-medium">+${Number(pricing.french_surcharge).toFixed(2)}/min</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Both Languages</span>
                  <span className="font-medium">+${Number(pricing.both_languages_surcharge).toFixed(2)}/min</span>
                </div>
                <Separator />
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Campaign Setup (first)</span>
                  <span className="font-medium">${Number(pricing.campaign_setup_fee).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Additional Campaign</span>
                  <span className="font-medium">${Number(pricing.additional_campaign_fee).toFixed(2)} each</span>
                </div>
              </CardContent>
            </Card>

            {/* Volume Discount */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  Volume Discount
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Minutes Threshold</span>
                  <span className="font-medium">{Number(pricing.volume_discount_min_minutes).toLocaleString()} min/mo</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Fixed Rate</span>
                  <span className="font-bold text-lg text-primary">
                    {pricing.volume_discount_fixed_rate
                      ? `$${Number(pricing.volume_discount_fixed_rate).toFixed(2)}/min`
                      : "Contact admin"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Reach the minutes threshold to get the fixed rate across all clients (surcharges still apply).
                </p>
              </CardContent>
            </Card>

            {/* Cost Calculator */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-primary" />
                  Cost Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Est. Minutes</Label>
                    <Input type="number" value={calcMinutes} onChange={e => setCalcMinutes(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Campaigns</Label>
                    <Input type="number" value={calcCampaigns} onChange={e => setCalcCampaigns(Number(e.target.value))} min={1} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Service Type</Label>
                  <Select value={calcServiceType} onValueChange={setCalcServiceType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="virtual_receptionist">Virtual Receptionist</SelectItem>
                      <SelectItem value="virtual_secretary">Virtual Secretary (+${Number(pricing.secretary_surcharge).toFixed(2)})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={calcLanguage} onValueChange={setCalcLanguage}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english_only">English Only</SelectItem>
                      <SelectItem value="spanish">+ Spanish (+${Number(pricing.spanish_surcharge).toFixed(2)})</SelectItem>
                      <SelectItem value="french">+ French (+${Number(pricing.french_surcharge).toFixed(2)})</SelectItem>
                      <SelectItem value="both">+ Both (+${Number(pricing.both_languages_surcharge).toFixed(2)})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base rate</span>
                    <span>${baseRate.toFixed(2)}/min</span>
                  </div>
                  {secretarySurcharge > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Secretary surcharge</span>
                      <span>+${secretarySurcharge.toFixed(2)}/min</span>
                    </div>
                  )}
                  {langSurcharge > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Language surcharge</span>
                      <span>+${langSurcharge.toFixed(2)}/min</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium">
                    <span>Effective rate</span>
                    <span>${effectiveRate.toFixed(2)}/min</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Minute cost ({calcMinutes} × ${effectiveRate.toFixed(2)})</span>
                    <span>${minuteCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Campaign fees</span>
                    <span>${campaignFees.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Projected Monthly</span>
                    <span className="text-primary">${totalProjected.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Add-ons */}
            {addons.length > 0 && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Available Add-ons (Wholesale)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {addons.map(a => (
                      <div key={a.id} className="p-4 border rounded-lg">
                        <p className="font-medium">{(a as any).addon_products?.name}</p>
                        <p className="text-sm text-muted-foreground">{(a as any).addon_products?.description}</p>
                        <p className="mt-2 font-bold text-primary">
                          ${Number(a.wholesale_price).toFixed(2)}/{(a as any).addon_products?.unit || "unit"}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </WhiteLabelLayout>
  );
}
