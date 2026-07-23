import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, MoreHorizontal, UserPlus, ShieldCheck, AlertTriangle, SlidersHorizontal } from "lucide-react";
import { WhiteLabelLayout } from "@/components/white-label/WhiteLabelLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import { format } from "date-fns";
import { WLClientModulesDialog } from "@/components/white-label/WLClientModulesDialog";

interface Client {
  id: string;
  client_name: string;
  contact_name: string | null;
  email: string;
  phone: string | null;
  plan: string | null;
  monthly_value: number | null;
  status: string | null;
  service_type: string;
  language_support: string;
  num_campaigns: number;
  billing_verified: boolean;
  created_at: string;
}

const statusColors: Record<string, string> = {
  active: 'bg-cta/10 text-cta',
  pending: 'bg-primary/10 text-primary',
  pending_setup: 'bg-primary/10 text-primary',
  suspended: 'bg-destructive/10 text-destructive',
};

export default function WhiteLabelClients() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [modulesDialogClient, setModulesDialogClient] = useState<{ id: string; name: string } | null>(null);
  const [newClient, setNewClient] = useState({
    client_name: "", contact_name: "", email: "", phone: "",
    service_type: "virtual_receptionist", language_support: "english_only",
    monthly_value: "",
  });

  useEffect(() => { fetchPartnerAndClients(); }, [user]);

  const fetchPartnerAndClients = async () => {
    if (!user) return;
    try {
      const { data: partner } = await supabase.from('white_label_partners').select('id').eq('user_id', user.id).maybeSingle();
      if (partner) {
        setPartnerId(partner.id);
        const { data: clientsData } = await supabase.from('white_label_clients').select('*')
          .eq('partner_id', partner.id).order('created_at', { ascending: false });
        if (clientsData) setClients(clientsData as Client[]);
      }
    } catch (error) { console.error("Error fetching clients:", error); } finally { setIsLoading(false); }
  };

  const handleAddClient = async () => {
    if (!partnerId || !newClient.client_name || !newClient.email) return;
    try {
      const { data: inserted, error } = await supabase.from('white_label_clients').insert({
        partner_id: partnerId,
        client_name: newClient.client_name,
        contact_name: newClient.contact_name || null,
        email: newClient.email,
        phone: newClient.phone || null,
        service_type: newClient.service_type,
        language_support: newClient.language_support,
        monthly_value: Number(newClient.monthly_value) || 0,
        status: 'pending_setup',
      }).select('id').single();
      if (error || !inserted) throw error ?? new Error('Failed to create client');

      // Create service config using the ID returned directly from the insert
      const { error: configError } = await supabase.from('wl_client_service_config').insert({
        partner_id: partnerId,
        wl_client_id: inserted.id,
        service_type: newClient.service_type,
        language_support: newClient.language_support,
      });

      if (configError) {
        console.error("Error creating service config:", configError);
        toast({ title: "Client added", description: "Client created but service config setup failed. Contact support.", variant: "destructive" });
      } else {
        toast({ title: "Client Added", description: "New client has been successfully added." });
      }
      setIsAddDialogOpen(false);
      setNewClient({ client_name: "", contact_name: "", email: "", phone: "", service_type: "virtual_receptionist", language_support: "english_only", monthly_value: "" });
      fetchPartnerAndClients();
    } catch (error) {
      console.error("Error adding client:", error);
      toast({ title: "Error", description: "Failed to add client.", variant: "destructive" });
    }
  };

  const updateClientStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from('white_label_clients').update({ status }).eq('id', id);
      if (error) throw error;
      setClients(prev => prev.map(c => (c.id === id ? { ...c, status } : c)));
      toast({ title: "Status Updated" });
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to update client status.", variant: "destructive" });
    }
  };

  const filtered = clients.filter(c =>
    c.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unverifiedCount = clients.filter(c => !c.billing_verified && c.status === 'active').length;

  return (
    <WhiteLabelLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-heading">Clients</h1>
            <p className="text-muted-foreground mt-1">Manage your white label clients</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Client</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Add New Client</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company Name *</Label>
                    <Input value={newClient.client_name} onChange={e => setNewClient(p => ({ ...p, client_name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Name</Label>
                    <Input value={newClient.contact_name} onChange={e => setNewClient(p => ({ ...p, contact_name: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input type="email" value={newClient.email} onChange={e => setNewClient(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input type="tel" value={newClient.phone} onChange={e => setNewClient(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Service Type</Label>
                  <Select value={newClient.service_type} onValueChange={v => setNewClient(p => ({ ...p, service_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="virtual_receptionist">Virtual Receptionist</SelectItem>
                      <SelectItem value="virtual_secretary">Virtual Secretary (+$0.05/min)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Language Support</Label>
                  <Select value={newClient.language_support} onValueChange={v => setNewClient(p => ({ ...p, language_support: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english_only">English Only</SelectItem>
                      <SelectItem value="spanish">+ Spanish (+$0.05/min)</SelectItem>
                      <SelectItem value="french">+ French (+$0.05/min)</SelectItem>
                      <SelectItem value="both">+ Both Languages (+$0.07/min)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Your Monthly Rate to Client ($)</Label>
                  <Input type="number" placeholder="What you charge this client" value={newClient.monthly_value}
                    onChange={e => setNewClient(p => ({ ...p, monthly_value: e.target.value }))} />
                </div>
                <Button onClick={handleAddClient} className="w-full">Add Client</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {unverifiedCount > 0 && (
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <p className="text-sm">
                <span className="font-medium">{unverifiedCount} client{unverifiedCount > 1 ? "s" : ""}</span> pending billing verification. 
                Our billing team will verify service configurations.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <CardTitle className="text-lg">All Clients ({clients.length})</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search clients..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UserPlus className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-2">No clients yet</p>
                <Button onClick={() => setIsAddDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />Add Your First Client</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Language</TableHead>
                      <TableHead>Your Rate</TableHead>
                      <TableHead>Verified</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(client => (
                      <TableRow
                        key={client.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/white-label-dashboard/clients/${client.id}`)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{client.client_name}</p>
                            <p className="text-sm text-muted-foreground">{client.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{(client.service_type || "receptionist").replace("virtual_", "")}</TableCell>
                        <TableCell className="capitalize">{(client.language_support || "english_only").replace("_", " ")}</TableCell>
                        <TableCell>${client.monthly_value || 0}/mo</TableCell>
                        <TableCell>
                          {client.billing_verified ? (
                            <Badge className="bg-cta/10 text-cta"><ShieldCheck className="w-3 h-3 mr-1" />Verified</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={statusColors[client.status || 'pending']}>
                            {client.status || 'pending'}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setModulesDialogClient({ id: client.id, name: client.client_name })}>
                                <SlidersHorizontal className="w-4 h-4 mr-2" />Manage Modules
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateClientStatus(client.id, 'active')}>Activate</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateClientStatus(client.id, 'suspended')}>Suspend</DropdownMenuItem>
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

      <WLClientModulesDialog
        open={!!modulesDialogClient}
        onOpenChange={(open) => !open && setModulesDialogClient(null)}
        clientId={modulesDialogClient?.id ?? null}
        clientName={modulesDialogClient?.name}
        onSaved={fetchPartnerAndClients}
      />
    </WhiteLabelLayout>
  );
}
