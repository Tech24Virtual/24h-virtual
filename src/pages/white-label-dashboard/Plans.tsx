import { useState, useEffect } from "react";
import { Plus, MoreHorizontal, Pencil, Trash2, DollarSign, Package } from "lucide-react";
import { WhiteLabelLayout } from "@/components/white-label/WhiteLabelLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Plan {
  id: string;
  partner_id: string;
  plan_name: string;
  plan_type: string;
  monthly_cost: number | null;
  included_minutes: number | null;
  overage_cost_per_minute: number;
  free_trial: boolean;
  free_trial_days: number | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

interface PlanFormState {
  plan_name: string;
  plan_type: string;
  monthly_cost: string;
  included_minutes: string;
  overage_cost_per_minute: string;
  free_trial: boolean;
  free_trial_days: string;
  is_active: boolean;
}

const emptyForm: PlanFormState = {
  plan_name: "",
  plan_type: "fixed",
  monthly_cost: "",
  included_minutes: "",
  overage_cost_per_minute: "",
  free_trial: false,
  free_trial_days: "7",
  is_active: true,
};

const planToForm = (plan: Plan): PlanFormState => ({
  plan_name: plan.plan_name,
  plan_type: plan.plan_type,
  monthly_cost: plan.monthly_cost != null ? String(plan.monthly_cost) : "",
  included_minutes: plan.included_minutes != null ? String(plan.included_minutes) : "",
  overage_cost_per_minute: String(plan.overage_cost_per_minute),
  free_trial: plan.free_trial,
  free_trial_days: plan.free_trial_days != null ? String(plan.free_trial_days) : "7",
  is_active: plan.is_active,
});

interface AddonProduct {
  id: string;
  name: string;
  description: string | null;
  default_price: number;
  billing_type: string;
  unit: string | null;
}

interface AddonPricingRow {
  id: string;
  partner_id: string;
  addon_product_id: string;
  wholesale_price: number;
  retail_price: number | null;
  is_available: boolean;
  billing_cycle: string;
}

const billingCycleFor = (billingType: string) =>
  billingType === "usage_based" ? "per_minute" : billingType === "recurring" ? "monthly" : "one_time";

const formatWholesaleCost = (p: AddonProduct) => {
  const price = Number(p.default_price).toFixed(2);
  if (p.billing_type === "usage_based") return `$${price}/${p.unit || "min"}`;
  if (p.billing_type === "recurring") return `$${price}/mo`;
  return `$${price} one-time`;
};

export default function WLPlans() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<PlanFormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const [addonProducts, setAddonProducts] = useState<AddonProduct[]>([]);
  const [addonPricingByProduct, setAddonPricingByProduct] = useState<Record<string, AddonPricingRow>>({});
  const [addonAvailable, setAddonAvailable] = useState<Record<string, boolean>>({});
  const [addonRetailPrice, setAddonRetailPrice] = useState<Record<string, string>>({});
  const [addonsLoading, setAddonsLoading] = useState(true);
  const [savingAddonId, setSavingAddonId] = useState<string | null>(null);

  useEffect(() => { fetchPartnerAndPlans(); }, [user]);
  useEffect(() => { if (partnerId) fetchAddons(partnerId); }, [partnerId]);

  const fetchPartnerAndPlans = async () => {
    if (!user) return;
    try {
      const { data: partner } = await supabase.from("white_label_partners").select("id").eq("user_id", user.id).maybeSingle();
      if (partner) {
        setPartnerId(partner.id);
        const { data: plansData } = await supabase.from("wl_partner_plans").select("*")
          .eq("partner_id", partner.id).order("created_at", { ascending: false });
        if (plansData) setPlans(plansData as Plan[]);
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAddons = async (partner: string) => {
    setAddonsLoading(true);
    try {
      const [productsRes, pricingRes] = await Promise.all([
        supabase.from("addon_products").select("id, name, description, default_price, billing_type, unit").eq("is_active", true).order("name"),
        supabase.from("wl_addon_pricing").select("*").eq("partner_id", partner),
      ]);
      const products = (productsRes.data || []) as AddonProduct[];
      setAddonProducts(products);

      const pricingByProduct: Record<string, AddonPricingRow> = {};
      (pricingRes.data || []).forEach((row: any) => { pricingByProduct[row.addon_product_id] = row; });
      setAddonPricingByProduct(pricingByProduct);

      const availableInit: Record<string, boolean> = {};
      const retailInit: Record<string, string> = {};
      products.forEach((p) => {
        availableInit[p.id] = pricingByProduct[p.id]?.is_available ?? true;
        const existingRetail = pricingByProduct[p.id]?.retail_price;
        retailInit[p.id] = existingRetail != null ? String(existingRetail) : "";
      });
      setAddonAvailable(availableInit);
      setAddonRetailPrice(retailInit);
    } catch (error) {
      console.error("Error fetching add-ons:", error);
      toast({ title: "Error", description: "Failed to load add-ons.", variant: "destructive" });
    } finally {
      setAddonsLoading(false);
    }
  };

  const handleSaveAddon = async (product: AddonProduct) => {
    if (!partnerId) return;
    setSavingAddonId(product.id);
    try {
      const retailInput = addonRetailPrice[product.id];
      const payload = {
        partner_id: partnerId,
        addon_product_id: product.id,
        wholesale_price: product.default_price,
        retail_price: retailInput !== undefined && retailInput !== "" ? Number(retailInput) : null,
        is_available: addonAvailable[product.id] ?? true,
        billing_cycle: billingCycleFor(product.billing_type),
      };
      const { error } = await supabase.from("wl_addon_pricing").upsert(payload, { onConflict: "partner_id,addon_product_id" });
      if (error) throw error;
      toast({ title: "Add-on saved" });
      fetchAddons(partnerId);
    } catch (error) {
      console.error("Error saving add-on:", error);
      toast({ title: "Error", description: "Failed to save add-on.", variant: "destructive" });
    } finally {
      setSavingAddonId(null);
    }
  };

  const resetForm = () => setForm(emptyForm);

  const buildPayload = (partner: string) => ({
    partner_id: partner,
    plan_name: form.plan_name,
    plan_type: form.plan_type,
    monthly_cost: form.plan_type === "fixed" && form.monthly_cost !== "" ? Number(form.monthly_cost) : null,
    included_minutes: form.plan_type === "fixed" && form.included_minutes !== "" ? Number(form.included_minutes) : null,
    overage_cost_per_minute: Number(form.overage_cost_per_minute) || 0,
    free_trial: form.free_trial,
    free_trial_days: form.free_trial ? Number(form.free_trial_days) : null,
    is_active: form.is_active,
  });

  const handleCreate = async () => {
    if (!partnerId || !form.plan_name || form.overage_cost_per_minute === "") return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from("wl_partner_plans").insert(buildPayload(partnerId));
      if (error) throw error;
      toast({ title: "Plan Created", description: "New pricing plan has been created." });
      setIsCreateOpen(false);
      resetForm();
      fetchPartnerAndPlans();
    } catch (error) {
      console.error("Error creating plan:", error);
      toast({ title: "Error", description: "Failed to create plan.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingPlan || !form.plan_name || form.overage_cost_per_minute === "") return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from("wl_partner_plans").update(buildPayload(editingPlan.partner_id)).eq("id", editingPlan.id);
      if (error) throw error;
      toast({ title: "Plan Updated" });
      setEditingPlan(null);
      resetForm();
      fetchPartnerAndPlans();
    } catch (error) {
      console.error("Error updating plan:", error);
      toast({ title: "Error", description: "Failed to update plan.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (plan: Plan) => {
    if (!window.confirm(`Delete plan "${plan.plan_name}"? This cannot be undone.`)) return;
    try {
      const { error } = await supabase.from("wl_partner_plans").delete().eq("id", plan.id);
      if (error) throw error;
      setPlans(prev => prev.filter(p => p.id !== plan.id));
      toast({ title: "Plan Deleted" });
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast({ title: "Error", description: "Failed to delete plan.", variant: "destructive" });
    }
  };

  const toggleActive = async (plan: Plan) => {
    try {
      const { error } = await supabase.from("wl_partner_plans").update({ is_active: !plan.is_active }).eq("id", plan.id);
      if (error) throw error;
      setPlans(prev => prev.map(p => (p.id === plan.id ? { ...p, is_active: !p.is_active } : p)));
    } catch (error) {
      console.error("Error toggling plan status:", error);
      toast({ title: "Error", description: "Failed to update plan status.", variant: "destructive" });
    }
  };

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setForm(planToForm(plan));
  };

  const closeEdit = () => {
    setEditingPlan(null);
    resetForm();
  };

  const renderFormFields = () => (
    <div className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label>Plan Name *</Label>
        <Input value={form.plan_name} onChange={e => setForm(p => ({ ...p, plan_name: e.target.value }))} />
      </div>

      <div className="space-y-2">
        <Label>Plan Type</Label>
        <Select value={form.plan_type} onValueChange={v => setForm(p => ({ ...p, plan_type: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">Fixed</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {form.plan_type === "fixed" ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Monthly Cost ($)</Label>
            <Input type="number" value={form.monthly_cost} onChange={e => setForm(p => ({ ...p, monthly_cost: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Included Minutes</Label>
            <Input type="number" value={form.included_minutes} onChange={e => setForm(p => ({ ...p, included_minutes: e.target.value }))} />
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Custom plans bill at a per-minute rate only</p>
      )}

      <div className="space-y-2">
        <Label>Overage Cost Per Minute ($) *</Label>
        <Input type="number" step="0.01" value={form.overage_cost_per_minute}
          onChange={e => setForm(p => ({ ...p, overage_cost_per_minute: e.target.value }))} />
      </div>

      <div className="flex items-center justify-between">
        <Label>Free Trial</Label>
        <Switch checked={form.free_trial} onCheckedChange={v => setForm(p => ({ ...p, free_trial: v }))} />
      </div>

      {form.free_trial && (
        <div className="space-y-2">
          <Label>Free Trial Days</Label>
          <Select value={form.free_trial_days} onValueChange={v => setForm(p => ({ ...p, free_trial_days: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="14">14 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Label>Active</Label>
        <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
      </div>
    </div>
  );

  return (
    <WhiteLabelLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-heading">Pricing Plans</h1>
          <p className="text-muted-foreground mt-1">Create and manage pricing plans for your clients.</p>
        </div>

        <Tabs defaultValue="plans">
          <TabsList>
            <TabsTrigger value="plans">My Plans</TabsTrigger>
            <TabsTrigger value="addons">Add-Ons</TabsTrigger>
            <TabsTrigger value="wholesale">Wholesale Rates</TabsTrigger>
          </TabsList>

          {/* Tab 1: My Plans */}
          <TabsContent value="plans" className="space-y-6">
            <div className="flex justify-end">
              <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button onClick={() => resetForm()}><Plus className="w-4 h-4 mr-2" />Create Plan</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>Create Pricing Plan</DialogTitle></DialogHeader>
                  {renderFormFields()}
                  <Button onClick={handleCreate} disabled={isSaving} className="w-full mt-2">
                    {isSaving ? "Creating..." : "Create Plan"}
                  </Button>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">All Plans ({plans.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : plans.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium mb-2">No pricing plans yet</p>
                    <Button onClick={() => setIsCreateOpen(true)}><Plus className="w-4 h-4 mr-2" />Create Your First Plan</Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Plan Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Monthly Cost</TableHead>
                          <TableHead>Included Minutes</TableHead>
                          <TableHead>Overage Rate</TableHead>
                          <TableHead>Free Trial</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {plans.map(plan => (
                          <TableRow key={plan.id}>
                            <TableCell className="font-medium">{plan.plan_name}</TableCell>
                            <TableCell>
                              {plan.plan_type === "fixed" ? (
                                <Badge className="bg-blue-100 text-blue-800">Fixed</Badge>
                              ) : (
                                <Badge className="bg-purple-100 text-purple-800">Custom</Badge>
                              )}
                            </TableCell>
                            <TableCell>{plan.plan_type === "custom" ? "—" : `$${Number(plan.monthly_cost ?? 0).toFixed(2)}`}</TableCell>
                            <TableCell>{plan.plan_type === "custom" ? "—" : (plan.included_minutes ?? 0).toLocaleString()}</TableCell>
                            <TableCell>${Number(plan.overage_cost_per_minute).toFixed(2)}/min</TableCell>
                            <TableCell>
                              {plan.free_trial ? (
                                <Badge variant="secondary">{plan.free_trial_days ?? 7} days</Badge>
                              ) : (
                                <Badge variant="outline">None</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Switch checked={plan.is_active} onCheckedChange={() => toggleActive(plan)} />
                                <span className="text-sm text-muted-foreground">{plan.is_active ? "Active" : "Inactive"}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEdit(plan)}>
                                    <Pencil className="w-4 h-4 mr-2" />Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDelete(plan)} className="text-destructive">
                                    <Trash2 className="w-4 h-4 mr-2" />Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Add-Ons */}
          <TabsContent value="addons" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Available Add-Ons</CardTitle>
                <CardDescription>Choose which add-ons to offer your clients and set your retail price.</CardDescription>
              </CardHeader>
              <CardContent>
                {addonsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : addonProducts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">No add-ons available</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Wholesale Cost</TableHead>
                          <TableHead>Partner Retail Price</TableHead>
                          <TableHead>Available</TableHead>
                          <TableHead className="w-24"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {addonProducts.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell className="max-w-[240px] truncate text-muted-foreground">{product.description || "—"}</TableCell>
                            <TableCell>{formatWholesaleCost(product)}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                className="w-28"
                                placeholder="0.00"
                                value={addonRetailPrice[product.id] ?? ""}
                                onChange={(e) => setAddonRetailPrice((prev) => ({ ...prev, [product.id]: e.target.value }))}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={addonAvailable[product.id] ?? true}
                                onCheckedChange={(v) => setAddonAvailable((prev) => ({ ...prev, [product.id]: v }))}
                              />
                            </TableCell>
                            <TableCell>
                              <Button size="sm" onClick={() => handleSaveAddon(product)} disabled={savingAddonId === product.id}>
                                {savingAddonId === product.id ? "Saving..." : "Save"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Wholesale Rates */}
          <TabsContent value="wholesale" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">24H Virtual Wholesale Rates</CardTitle>
                <CardDescription>For reference only — your cost from 24H Virtual</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2 text-sm">Plan Tiers</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plan</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Included Minutes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Starter</TableCell>
                        <TableCell>$125</TableCell>
                        <TableCell>100 min</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Growth</TableCell>
                        <TableCell>$312</TableCell>
                        <TableCell>250 min</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Professional</TableCell>
                        <TableCell>$500</TableCell>
                        <TableCell>500 min</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Scale</TableCell>
                        <TableCell>$1000</TableCell>
                        <TableCell>1000 min</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div>
                  <h3 className="font-medium mb-2 text-sm">Per-Minute Rates</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between border-b py-2">
                      <span className="text-muted-foreground">Under 500 min</span>
                      <span className="font-medium">$1.25/min</span>
                    </div>
                    <div className="flex justify-between border-b py-2">
                      <span className="text-muted-foreground">500 min+</span>
                      <span className="font-medium">$1.00/min</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2 text-sm">Language Add-Ons</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b py-2">
                      <span className="text-muted-foreground">English Only</span>
                      <span className="font-medium">Included</span>
                    </div>
                    <div className="flex justify-between border-b py-2">
                      <span className="text-muted-foreground">+ Spanish</span>
                      <span className="font-medium">$0.05/min</span>
                    </div>
                    <div className="flex justify-between border-b py-2">
                      <span className="text-muted-foreground">+ French</span>
                      <span className="font-medium">$0.05/min</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">+ Spanish + French</span>
                      <span className="font-medium">$0.07/min</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground italic">
                  These are your wholesale costs. Your retail prices should include your margin.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!editingPlan} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Pricing Plan</DialogTitle></DialogHeader>
          {renderFormFields()}
          <Button onClick={handleUpdate} disabled={isSaving} className="w-full mt-2">
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogContent>
      </Dialog>
    </WhiteLabelLayout>
  );
}
