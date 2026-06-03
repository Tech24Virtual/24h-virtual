import { useState, useEffect } from 'react';
import { Bot, LifeBuoy, Plus, Send } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WLPortalLayout } from '@/components/wl-portal/WLPortalLayout';
import { useWLPortal } from '@/contexts/WLPortalContext';
import { PiPAssistant } from '@/components/pip/PiPAssistant';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  closed: 'bg-muted text-muted-foreground',
};

export default function WLPortalSupport() {
  const { clientInfo, branding, partnerId } = useWLPortal();
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: '', description: '', priority: 'medium' });
  const [submitting, setSubmitting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    if (clientInfo) fetchTickets();
  }, [clientInfo]);

  const fetchTickets = async () => {
    if (!clientInfo) return;
    setIsLoading(true);
    const { data } = await supabase
      .from('wl_client_tickets')
      .select('*')
      .eq('wl_client_id', clientInfo.id)
      .order('created_at', { ascending: false });
    if (data) setTickets(data);
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!clientInfo || !newTicket.subject) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('wl_client_tickets').insert({
        partner_id: clientInfo.partner_id,
        wl_client_id: clientInfo.id,
        subject: newTicket.subject,
        description: newTicket.description,
        priority: newTicket.priority,
        status: 'open',
        submitted_by_type: 'client',
        submitted_by_name: clientInfo.contact_name || clientInfo.client_name,
        submitted_by_email: clientInfo.email,
      });
      if (error) throw error;
      toast.success('Ticket submitted');
      setDialogOpen(false);
      setNewTicket({ subject: '', description: '', priority: 'medium' });
      fetchTickets();
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchReplies = async (ticketId: string) => {
    const { data } = await supabase
      .from('wl_client_ticket_replies')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    if (data) setReplies(data);
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    setSendingReply(true);
    try {
      const { error } = await supabase.from('wl_client_ticket_replies').insert({
        ticket_id: selectedTicket.id,
        message: replyText.trim(),
        author_type: 'client',
        author_name: clientInfo?.contact_name || clientInfo?.client_name || 'Client',
      });
      if (error) throw error;
      setReplyText('');
      fetchReplies(selectedTicket.id);
    } catch (err) {
      toast.error('Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const brandName = branding?.company_name || undefined;

  return (
    <WLPortalLayout title="Support" description={`Get help from ${branding?.company_name || 'your provider'}`}>
      <Tabs defaultValue="ai-support">
        <TabsList>
          <TabsTrigger value="ai-support" className="gap-2"><Bot className="h-4 w-4" />AI Assistant</TabsTrigger>
          <TabsTrigger value="tickets" className="gap-2"><LifeBuoy className="h-4 w-4" />Tickets</TabsTrigger>
        </TabsList>

        <TabsContent value="ai-support" className="mt-4">
          <PiPAssistant
            dashboardContext="wl_client"
            partnerId={partnerId || undefined}
            brandName={brandName}
          />
        </TabsContent>

        <TabsContent value="tickets" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <LifeBuoy className="h-5 w-5" />
                  Support Tickets
                </CardTitle>
                <CardDescription>View and manage your support requests</CardDescription>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" />New Ticket</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Submit Support Ticket</DialogTitle></DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Subject *</Label>
                      <Input value={newTicket.subject} onChange={(e) => setNewTicket(p => ({ ...p, subject: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea value={newTicket.description} onChange={(e) => setNewTicket(p => ({ ...p, description: e.target.value }))} rows={4} />
                    </div>
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select value={newTicket.priority} onValueChange={(v) => setNewTicket(p => ({ ...p, priority: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                      <Send className="w-4 h-4 mr-2" />
                      {submitting ? 'Submitting...' : 'Submit Ticket'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <LifeBuoy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No tickets yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => { setSelectedTicket(ticket); fetchReplies(ticket.id); }}>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-muted-foreground">#{ticket.ticket_number}</span>
                          <h4 className="font-medium">{ticket.subject}</h4>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(ticket.created_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                      <Badge className={statusColors[ticket.status || 'open']}>
                        {(ticket.status || 'open').replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={!!selectedTicket} onOpenChange={(o) => { if (!o) { setSelectedTicket(null); setReplies([]); setReplyText(''); } }}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selectedTicket?.subject}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Status: {selectedTicket?.status}
            </p>
            <p className="text-sm text-muted-foreground">
              Opened: {selectedTicket?.created_at ? format(new Date(selectedTicket.created_at), 'MMM d, yyyy') : ''}
            </p>
            {selectedTicket?.description && (
              <p className="text-sm">{selectedTicket.description}</p>
            )}
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">Replies</p>
              {replies.length === 0 ? (
                <p className="text-xs text-muted-foreground">No replies yet.</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {replies.map((r) => (
                    <div key={r.id} className={`p-3 rounded-lg text-sm ${r.author_type === 'client' ? 'bg-muted ml-4' : 'bg-primary/10 mr-4'}`}>
                      <p className="font-medium text-xs mb-1">{r.author_name}</p>
                      <p>{r.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{format(new Date(r.created_at), 'MMM d, h:mm a')}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type a reply..."
                  rows={2}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleSendReply} disabled={sendingReply || !replyText.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </WLPortalLayout>
  );
}
