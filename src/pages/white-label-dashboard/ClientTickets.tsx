import { useState, useEffect } from "react";
import { Plus, Search, MessageSquare, ArrowUpRight, Shield } from "lucide-react";
import { WhiteLabelLayout } from "@/components/white-label/WhiteLabelLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useRealtimeWLTickets } from "@/hooks/useRealtimeWLTickets";
import { TicketThread } from "@/components/tickets";

const statusColors: Record<string, string> = {
  open: "bg-primary/10 text-primary",
  in_progress: "bg-yellow-100 text-yellow-800",
  resolved: "bg-cta/10 text-cta",
  closed: "bg-muted text-muted-foreground",
};

export default function WLClientTickets() {
  const { user, roles } = useAuth();
  const { toast } = useToast();
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [newTicket, setNewTicket] = useState({ wl_client_id: "", subject: "", description: "", priority: "medium" });
  const [isEscalating, setIsEscalating] = useState(false);
  const [escalationStatus, setEscalationStatus] = useState<any>(null);

  // Enable realtime for WL tickets
  useRealtimeWLTickets({ partnerId: partnerId || undefined, onUpdate: () => fetchData() });

  useEffect(() => { if (user) fetchData(); }, [user]);

  const fetchData = async () => {
    if (!user) return;
    try {
      const { data: partner } = await supabase.from("white_label_partners").select("id").eq("user_id", user.id).single();
      if (!partner) return;
      setPartnerId(partner.id);

      const [ticketsRes, clientsRes] = await Promise.all([
        supabase.from("wl_client_tickets").select("*, white_label_clients(client_name)")
          .eq("partner_id", partner.id).order("created_at", { ascending: false }),
        supabase.from("white_label_clients").select("id, client_name").eq("partner_id", partner.id),
      ]);

      setTickets(ticketsRes.data || []);
      setClients(clientsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!partnerId || !newTicket.wl_client_id || !newTicket.subject) return;
    try {
      const { error } = await supabase.from("wl_client_tickets").insert({
        partner_id: partnerId,
        wl_client_id: newTicket.wl_client_id,
        subject: newTicket.subject,
        description: newTicket.description,
        priority: newTicket.priority,
        submitted_by_type: "partner",
      });
      if (error) throw error;
      toast({ title: "Ticket Created" });
      setIsCreateOpen(false);
      setNewTicket({ wl_client_id: "", subject: "", description: "", priority: "medium" });
      fetchData();
    } catch (err) {
      toast({ title: "Error", description: "Failed to create ticket", variant: "destructive" });
    }
  };

  const openTicket = async (ticket: any) => {
    setSelectedTicket(ticket);
    setEscalationStatus(null);

    if (ticket.is_escalated_to_24h && ticket.linked_support_ticket_id) {
      const { data: escTicket } = await supabase.from("support_tickets")
        .select("id, status, priority, work_queue, created_at")
        .eq("id", ticket.linked_support_ticket_id)
        .single();
      setEscalationStatus(escTicket);
    }
  };

  const updateStatus = async (ticketId: string, status: string) => {
    await supabase.from("wl_client_tickets").update({ status, ...(status === "resolved" ? { resolved_at: new Date().toISOString() } : {}) }).eq("id", ticketId);
    fetchData();
    if (selectedTicket?.id === ticketId) setSelectedTicket((prev: any) => ({ ...prev, status }));
  };

  const handleEscalate = async () => {
    if (!selectedTicket || !partnerId) return;
    setIsEscalating(true);
    try {
      const { data, error } = await supabase.functions.invoke("escalate-wl-ticket", {
        body: {
          wl_ticket_id: selectedTicket.id,
          partner_id: partnerId,
          target_queue: "supervisor",
        },
      });
      if (error) throw error;
      toast({ title: "Escalated", description: "Ticket has been escalated to operations." });
      // Refresh the ticket
      const { data: refreshed } = await supabase.from("wl_client_tickets")
        .select("*, white_label_clients(client_name)")
        .eq("id", selectedTicket.id)
        .single();
      if (refreshed) {
        setSelectedTicket(refreshed);
        openTicket(refreshed);
      }
      fetchData();
    } catch (err: any) {
      toast({ title: "Escalation Failed", description: err.message || "Please try again", variant: "destructive" });
    } finally {
      setIsEscalating(false);
    }
  };

  const filtered = tickets.filter(t => {
    const matchesSearch = t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t as any).white_label_clients?.client_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <WhiteLabelLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-heading">Client Tickets</h1>
            <p className="text-muted-foreground mt-1">Manage support tickets with your clients</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />New Ticket</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Client Ticket</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Client *</Label>
                  <Select value={newTicket.wl_client_id} onValueChange={v => setNewTicket(p => ({ ...p, wl_client_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                      {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subject *</Label>
                  <Input value={newTicket.subject} onChange={e => setNewTicket(p => ({ ...p, subject: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={newTicket.description} onChange={e => setNewTicket(p => ({ ...p, description: e.target.value }))} rows={4} />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={newTicket.priority} onValueChange={v => setNewTicket(p => ({ ...p, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreate} className="w-full">Create Ticket</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search tickets..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className={selectedTicket ? "lg:col-span-1" : "lg:col-span-3"}>
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <p className="text-center py-8 text-muted-foreground">Loading...</p>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No tickets found</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filtered.map(t => (
                      <button key={t.id} onClick={() => openTicket(t)}
                        className={`w-full text-left p-4 hover:bg-accent/50 transition-colors ${selectedTicket?.id === t.id ? "bg-accent" : ""}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">#{t.ticket_number} {t.subject}</p>
                              {t.is_escalated_to_24h && (
                                <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600 shrink-0">
                                  <ArrowUpRight className="w-3 h-3 mr-0.5" />Escalated
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{(t as any).white_label_clients?.client_name}</p>
                          </div>
                          <Badge variant="secondary" className={statusColors[t.status] || ""}>{t.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{format(new Date(t.created_at), "MMM d, yyyy")}</p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {selectedTicket && (
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>#{selectedTicket.ticket_number} {selectedTicket.subject}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {(selectedTicket as any).white_label_clients?.client_name} · {selectedTicket.priority} priority
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!selectedTicket.is_escalated_to_24h && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleEscalate}
                          disabled={isEscalating}
                          className="text-amber-600 border-amber-300 hover:bg-amber-50"
                        >
                          <ArrowUpRight className="w-4 h-4 mr-1" />
                          {isEscalating ? "Escalating..." : "Escalate to Operations"}
                        </Button>
                      )}
                      <Select value={selectedTicket.status} onValueChange={v => updateStatus(selectedTicket.id, v)}>
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {selectedTicket.is_escalated_to_24h && (
                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                        <Shield className="w-4 h-4" />
                        Escalated to Operations
                      </div>
                      {escalationStatus && (
                        <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                          Status: <span className="font-medium">{escalationStatus.status}</span> · Queue: {escalationStatus.work_queue}
                        </p>
                      )}
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {selectedTicket.description && (
                    <div className="p-3 bg-muted/50 rounded-lg mb-4">
                      <p className="text-sm">{selectedTicket.description}</p>
                    </div>
                  )}

                  <TicketThread
                    ticketId={selectedTicket.id}
                    sourceTable="wl_client_tickets"
                    currentUserId={user?.id ?? ""}
                    currentUserRole={roles[0] ?? ""}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </WhiteLabelLayout>
  );
}
