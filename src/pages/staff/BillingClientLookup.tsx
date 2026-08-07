import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Search, Plus, StickyNote, CreditCard, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function BillingClientLookup() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState('general');
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);

  const { data: leads, isLoading } = useQuery({
    queryKey: ['billing-client-lookup', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%`)
        .order('name')
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: searchTerm.length >= 2,
  });

  const { data: billingNotes } = useQuery({
    queryKey: ['billing-notes', selectedLead?.id],
    queryFn: async () => {
      if (!selectedLead) return [];
      const { data, error } = await supabase
        .from('billing_notes')
        .select('*')
        .eq('lead_id', selectedLead.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedLead,
  });

  const { data: paymentFailures } = useQuery({
    queryKey: ['billing-client-failures', selectedLead?.id],
    queryFn: async () => {
      if (!selectedLead) return [];
      const { data, error } = await supabase
        .from('payment_failures')
        .select('*')
        .eq('lead_id', selectedLead.id)
        .order('failed_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedLead,
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('billing_notes').insert({
        lead_id: selectedLead.id,
        created_by: user!.id,
        note: noteText,
        note_type: noteType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-notes', selectedLead?.id] });
      toast({ title: 'Note added' });
      setNoteText('');
      setNoteDialogOpen(false);
    },
  });

  const noteTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      general: 'bg-muted text-muted-foreground',
      payment_issue: 'bg-destructive/10 text-destructive',
      subscription_change: 'bg-primary/10 text-primary',
      refund: 'bg-orange-100 text-orange-700',
    };
    return <Badge className={colors[type] || colors.general}>{type.replace('_', ' ')}</Badge>;
  };

  return (
    <StaffLayout role="billing">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Client Lookup</h1>
          <p className="text-muted-foreground">Search clients and view billing history</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or company..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setSelectedLead(null); }}
            className="pl-9"
          />
        </div>

        {isLoading && <Skeleton className="h-20 w-full" />}

        {!selectedLead && leads && leads.length > 0 && (
          <Card>
            <CardContent className="p-0">
              {leads.map((lead: any) => (
                <button
                  key={lead.id}
                  className="w-full flex items-center justify-between p-4 border-b last:border-0 hover:bg-muted/50 transition-colors text-left"
                  onClick={() => setSelectedLead(lead)}
                >
                  <div>
                    <div className="font-medium">{lead.name}</div>
                    <div className="text-sm text-muted-foreground">{lead.email} {lead.company && `• ${lead.company}`}</div>
                  </div>
                  <Badge variant={lead.status === 'active' ? 'default' : 'secondary'} className="capitalize">{lead.status}</Badge>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {selectedLead && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Client Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{selectedLead.name}</CardTitle>
                  <Badge variant={selectedLead.status === 'active' ? 'default' : 'secondary'} className="capitalize">{selectedLead.status}</Badge>
                </div>
                <CardDescription>{selectedLead.email} {selectedLead.company && `• ${selectedLead.company}`}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Service:</span> <span className="font-medium">{selectedLead.service_type || '-'}</span></div>
                  <div><span className="text-muted-foreground">Plan:</span> <span className="font-medium">{selectedLead.plan_minutes ? `${selectedLead.plan_minutes} min` : '-'}</span></div>
                  <div><span className="text-muted-foreground">Billing Period:</span> <span className="font-medium">{selectedLead.billing_period || '-'}</span></div>
                  <div><span className="text-muted-foreground">Currency:</span> <span className="font-medium">{selectedLead.billing_currency || 'USD'}</span></div>
                  <div><span className="text-muted-foreground">Payment Method:</span> <span className="font-medium">{selectedLead.payment_method_on_file ? 'On File' : 'None'}</span></div>
                  <div><span className="text-muted-foreground">Last Payment:</span> <span className="font-medium">{selectedLead.last_payment_status || '-'}</span></div>
                </div>
                {selectedLead.stripe_subscription_id && (
                  <div className="flex items-center gap-2 mt-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Active Subscription</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Failures */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Payment Failures
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!paymentFailures?.length ? (
                  <p className="text-sm text-muted-foreground">No payment failures</p>
                ) : (
                  <div className="space-y-2">
                    {paymentFailures.map((f: any) => (
                      <div key={f.id} className="flex items-center justify-between text-sm border-b pb-2">
                        <div>
                          <Badge variant="destructive" className="text-xs">{f.failure_code || 'unknown'}</Badge>
                          <span className="ml-2 text-muted-foreground">{format(new Date(f.failed_at), 'MMM d, yyyy')}</span>
                        </div>
                        {f.resolved_at ? <Badge variant="secondary">Resolved</Badge> : <Badge variant="outline">Open</Badge>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Billing Notes */}
            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <StickyNote className="h-4 w-4" />
                    Billing Notes
                  </CardTitle>
                  <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Note</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Add Billing Note</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <Select value={noteType} onValueChange={setNoteType}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="payment_issue">Payment Issue</SelectItem>
                            <SelectItem value="subscription_change">Subscription Change</SelectItem>
                            <SelectItem value="refund">Refund</SelectItem>
                          </SelectContent>
                        </Select>
                        <Textarea placeholder="Enter note..." value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={4} />
                        <Button onClick={() => addNoteMutation.mutate()} disabled={!noteText.trim() || addNoteMutation.isPending} className="w-full">
                          Save Note
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {!billingNotes?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No billing notes yet</p>
                ) : (
                  <div className="space-y-3">
                    {billingNotes.map((n: any) => (
                      <div key={n.id} className="border rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          {noteTypeBadge(n.note_type)}
                          <span className="text-xs text-muted-foreground">{format(new Date(n.created_at), 'MMM d, yyyy h:mm a')}</span>
                        </div>
                        <p className="text-sm">{n.note}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
