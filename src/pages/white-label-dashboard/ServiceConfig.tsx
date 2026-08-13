import { useState, useEffect } from "react";
import { Pencil, Settings, ShieldCheck } from "lucide-react";
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
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface ServiceConfigRow {
  id: string;
  service_type: string;
  language_support: string;
  estimated_monthly_minutes: number | null;
  partner_retail_rate: number | null;
  billing_verified: boolean;
}

interface ClientRow {
  id: string;
  client_name: string;
  config: ServiceConfigRow | null;
}

interface FormState {
  service_type: string;
  language_support: string;
  estimated_monthly_minutes: string;
  partner_retail_rate: string;
  billing_verified: boolean;
}

const emptyForm: FormState = {
  service_type: "virtual_receptionist",
  language_support: "english_only",
  estimated_monthly_minutes: "",
  partner_retail_rate: "",
  billing_verified: false,
};

const serviceTypeLabels: Record<string, string> = {
  virtual_receptionist: "Virtual Receptionist",
  answering_service: "Answering Service",
  live_chat: "Live Chat",
};

const languageLabels: Record<string, string> = {
  english_only: "English Only",
  bilingual: "Bilingual",
  multilingual: "Multilingual",
};

export default function WLServiceConfig() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<ClientRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { fetchPartnerAndClients(); }, [user]);

  const fetchPartnerAndClients = async () => {
    if (!user) return;
    try {
      const { data: partner } = await supabase.from("white_label_partners").select("id").eq("user_id", user.id).maybeSingle();
      if (!partner) return;
      setPartnerId(partner.id);

      const [clientsRes, configsRes] = await Promise.all([
        supabase.from("white_label_clients").select("id, client_name").eq("partner_id", partner.id).order("client_name"),
        supabase.from("wl_client_service_config").select("*").eq("partner_id", partner.id),
      ]);

      const configsByClientId = new Map<string, ServiceConfigRow>();
      (configsRes.data || []).forEach((c: any) => configsByClientId.set(c.wl_client_id, c));

      const merged: ClientRow[] = (clientsRes.data || []).map((c: any) => ({
        id: c.id,
        client_name: c.client_name,
        config: configsByClientId.get(c.id) ?? null,
      }));
      setClients(merged);
    } catch (error) {
      console.error("Error fetching service configs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const openEdit = (client: ClientRow) => {
    setEditingClient(client);
    setForm(client.config ? {
      service_type: client.config.service_type,
      language_support: client.config.language_support,
      estimated_monthly_minutes: client.config.estimated_monthly_minutes != null ? String(client.config.estimated_monthly_minutes) : "",
      partner_retail_rate: client.config.partner_retail_rate != null ? String(client.config.partner_retail_rate) : "",
      billing_verified: client.config.billing_verified,
    } : emptyForm);
  };

  const closeEdit = () => {
    setEditingClient(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!editingClient || !partnerId) return;
    setIsSaving(true);
    try {
      const payload = {
        wl_client_id: editingClient.id,
        partner_id: partnerId,
        service_type: form.service_type,
        language_support: form.language_support,
        estimated_monthly_minutes: form.estimated_monthly_minutes !== "" ? Number(form.estimated_monthly_minutes) : null,
        partner_retail_rate: form.partner_retail_rate !== "" ? Number(form.partner_retail_rate) : null,
        billing_verified: form.billing_verified,
      };
      const { error } = await supabase.from("wl_client_service_config").upsert(payload, { onConflict: "wl_client_id" });
      if (error) throw error;
      toast({ title: "Service configuration saved" });
      closeEdit();
      fetchPartnerAndClients();
    } catch (error) {
      console.error("Error saving service config:", error);
      toast({ title: "Error", description: "Failed to save service configuration.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <WhiteLabelLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-heading">Service Configuration</h1>
          <p className="text-muted-foreground mt-1">Configure service settings for each of your clients.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">All Clients ({clients.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : clients.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Settings className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-2">No clients yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client Name</TableHead>
                      <TableHead>Service Type</TableHead>
                      <TableHead>Language Support</TableHead>
                      <TableHead>Est. Monthly Minutes</TableHead>
                      <TableHead>Retail Rate</TableHead>
                      <TableHead>Billing Verified</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map(client => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">{client.client_name}</TableCell>
                        <TableCell>{client.config ? (serviceTypeLabels[client.config.service_type] ?? client.config.service_type) : "—"}</TableCell>
                        <TableCell>{client.config ? (languageLabels[client.config.language_support] ?? client.config.language_support) : "—"}</TableCell>
                        <TableCell>{client.config?.estimated_monthly_minutes != null ? client.config.estimated_monthly_minutes.toLocaleString() : "—"}</TableCell>
                        <TableCell>{client.config?.partner_retail_rate != null ? `$${Number(client.config.partner_retail_rate).toFixed(3)}/min` : "—"}</TableCell>
                        <TableCell>
                          {client.config?.billing_verified ? (
                            <Badge className="bg-cta/10 text-cta"><ShieldCheck className="w-3 h-3 mr-1" />Verified</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(client)}>
                            <Pencil className="w-4 h-4" />
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
      </div>

      <Dialog open={!!editingClient} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Service Configuration{editingClient ? ` — ${editingClient.client_name}` : ""}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Service Type</Label>
              <Select value={form.service_type} onValueChange={v => setForm(p => ({ ...p, service_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="virtual_receptionist">Virtual Receptionist</SelectItem>
                  <SelectItem value="answering_service">Answering Service</SelectItem>
                  <SelectItem value="live_chat">Live Chat</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Language Support</Label>
              <Select value={form.language_support} onValueChange={v => setForm(p => ({ ...p, language_support: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="english_only">English Only</SelectItem>
                  <SelectItem value="bilingual">Bilingual</SelectItem>
                  <SelectItem value="multilingual">Multilingual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estimated Monthly Minutes</Label>
                <Input type="number" min={0} value={form.estimated_monthly_minutes}
                  onChange={e => setForm(p => ({ ...p, estimated_monthly_minutes: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Retail Rate ($/min)</Label>
                <Input type="number" min={0} step="0.001" placeholder="e.g. 0.085" value={form.partner_retail_rate}
                  onChange={e => setForm(p => ({ ...p, partner_retail_rate: e.target.value }))} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Billing Verified</Label>
              <Switch checked={form.billing_verified} onCheckedChange={v => setForm(p => ({ ...p, billing_verified: v }))} />
            </div>

            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </WhiteLabelLayout>
  );
}
