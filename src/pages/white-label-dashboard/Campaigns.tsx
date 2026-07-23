import { useState, useEffect } from "react";
import { Plus, Megaphone } from "lucide-react";
import { WhiteLabelLayout } from "@/components/white-label/WhiteLabelLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function WLCampaigns() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ wl_client_id: "", campaign_name: "", department: "" });

  useEffect(() => { if (user) fetchData(); }, [user]);

  const fetchData = async () => {
    if (!user) return;
    try {
      const { data: partner } = await supabase.from("white_label_partners").select("id").eq("user_id", user.id).single();
      if (!partner) return;
      setPartnerId(partner.id);

      const [campaignsRes, clientsRes, pricingRes] = await Promise.all([
        supabase.from("wl_client_campaigns").select("*, white_label_clients(client_name)")
          .eq("partner_id", partner.id).order("created_at", { ascending: false }),
        supabase.from("white_label_clients").select("id, client_name").eq("partner_id", partner.id),
        supabase.from("wl_wholesale_pricing").select("campaign_setup_fee, additional_campaign_fee").eq("partner_id", partner.id).maybeSingle(),
      ]);

      setCampaigns(campaignsRes.data || []);
      setClients(clientsRes.data || []);
      setPricing(pricingRes.data);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const handleCreate = async () => {
    if (!partnerId || !newCampaign.wl_client_id || !newCampaign.campaign_name) return;
    try {
      const { error } = await supabase.from("wl_client_campaigns").insert({
        partner_id: partnerId,
        wl_client_id: newCampaign.wl_client_id,
        campaign_name: newCampaign.campaign_name,
        department: newCampaign.department || null,
      });
      if (error) throw error;

      // Update client campaign count
      const clientCampaigns = campaigns.filter(c => c.wl_client_id === newCampaign.wl_client_id && c.is_active).length + 1;
      await supabase.from("white_label_clients").update({ num_campaigns: clientCampaigns }).eq("id", newCampaign.wl_client_id);

      toast({ title: "Campaign Created" });
      setIsCreateOpen(false);
      setNewCampaign({ wl_client_id: "", campaign_name: "", department: "" });
      fetchData();
    } catch (err) {
      toast({ title: "Error", description: "Failed to create campaign", variant: "destructive" });
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase.from("wl_client_campaigns").update({ is_active: !currentActive }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to update campaign status.", variant: "destructive" });
    }
    fetchData();
  };

  // Group campaigns by client for fee calculation
  const clientCampaignCounts: Record<string, { name: string; count: number }> = {};
  campaigns.filter(c => c.is_active).forEach(c => {
    const name = (c as any).white_label_clients?.client_name || "Unknown";
    if (!clientCampaignCounts[c.wl_client_id]) clientCampaignCounts[c.wl_client_id] = { name, count: 0 };
    clientCampaignCounts[c.wl_client_id].count++;
  });

  const setupFee = Number(pricing?.campaign_setup_fee || 100);
  const additionalFee = Number(pricing?.additional_campaign_fee || 25);
  const totalSetupFees = Object.values(clientCampaignCounts).reduce((sum, c) => {
    return sum + setupFee + Math.max(0, c.count - 1) * additionalFee;
  }, 0);

  return (
    <WhiteLabelLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-heading">Outbound Campaigns</h1>
            <p className="text-muted-foreground mt-1">Manage outbound call campaigns for your clients</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Campaign</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Campaign</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Client *</Label>
                  <Select value={newCampaign.wl_client_id} onValueChange={v => setNewCampaign(p => ({ ...p, wl_client_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                      {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Campaign Name *</Label>
                  <Input value={newCampaign.campaign_name} onChange={e => setNewCampaign(p => ({ ...p, campaign_name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input value={newCampaign.department} onChange={e => setNewCampaign(p => ({ ...p, department: e.target.value }))} placeholder="e.g., Sales, Support" />
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-sm">
                  <p className="font-medium">Pricing</p>
                  <p className="text-muted-foreground">First campaign: ${setupFee.toFixed(2)} setup · Additional: ${additionalFee.toFixed(2)} each</p>
                </div>
                <Button onClick={handleCreate} className="w-full">Add Campaign</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Fee Summary */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Megaphone className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Total Campaign Setup Fees</p>
                  <p className="text-sm text-muted-foreground">
                    {Object.values(clientCampaignCounts).map(c => `${c.name}: ${c.count} campaign${c.count > 1 ? "s" : ""}`).join(" · ")}
                  </p>
                </div>
              </div>
              <p className="text-xl font-bold">${totalSetupFees.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">All Campaigns ({campaigns.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : campaigns.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No campaigns yet. Add your first campaign.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-16">Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.campaign_name}</TableCell>
                      <TableCell>{(c as any).white_label_clients?.client_name}</TableCell>
                      <TableCell>{c.department || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={c.is_active ? "bg-cta/10 text-cta" : "bg-muted"}>
                          {c.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c.id, c.is_active)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </WhiteLabelLayout>
  );
}
