import { useState, useEffect } from "react";
import { Plus, MoreHorizontal, Pencil, Trash2, DollarSign } from "lucide-react";
import { WhiteLabelLayout } from "@/components/white-label/WhiteLabelLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

  useEffect(() => { fetchPartnerAndPlans(); }, [user]);

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-heading">Pricing Plans</h1>
            <p className="text-muted-foreground mt-1">Create and manage pricing plans for your clients.</p>
          </div>
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
