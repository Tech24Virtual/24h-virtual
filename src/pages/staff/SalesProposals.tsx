import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plus, Send, Eye, Check, X, Mail, Loader2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const statusStyles: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
  expired: 'bg-yellow-100 text-yellow-800',
};

export default function SalesProposals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [previewProposal, setPreviewProposal] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Form state
  const [form, setForm] = useState({
    title: '', service_type: '', plan_minutes: '', billing_period: 'monthly',
    billing_currency: 'USD', monthly_price: '', setup_fee: '0', custom_terms: '',
    lead_id: '',
  });

  const { data: proposals, isLoading } = useQuery({
    queryKey: ['sales-proposals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_proposals')
        .select('*, leads(name, email, company)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: leads } = useQuery({
    queryKey: ['proposal-leads'],
    queryFn: async () => {
      const { data } = await supabase
        .from('leads')
        .select('id, name, email, company, service_type, plan_minutes, billing_period, billing_currency')
        .in('pipeline_stage', ['new', 'contacted', 'qualified', 'proposal'])
        .order('name');
      return data || [];
    },
  });

  const createProposal = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('sales_proposals').insert({
        lead_id: form.lead_id || null,
        created_by: user!.id,
        title: form.title,
        service_type: form.service_type || null,
        plan_minutes: form.plan_minutes ? parseInt(form.plan_minutes) : null,
        billing_period: form.billing_period,
        billing_currency: form.billing_currency,
        monthly_price: parseFloat(form.monthly_price) || 0,
        setup_fee: parseFloat(form.setup_fee) || 0,
        custom_terms: form.custom_terms || null,
        status: 'draft',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-proposals'] });
      setOpen(false);
      resetForm();
      toast({ title: 'Proposal created', description: 'Draft proposal saved.' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to create proposal.', variant: 'destructive' }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, extra }: { id: string; status: string; extra?: Record<string, any> }) => {
      const { error } = await supabase.from('sales_proposals').update({ status, ...extra }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-proposals'] });
      toast({ title: 'Updated', description: 'Proposal status updated.' });
    },
  });

  const sendEmail = useMutation({
    mutationFn: async (proposalId: string) => {
      const { error } = await supabase.functions.invoke('send-proposal-email', {
        body: { proposal_id: proposalId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Email queued', description: 'The client will receive this proposal shortly.' });
    },
    onError: () => {
      toast({ title: 'Email failed to send', description: 'Proposal status was not affected.', variant: 'destructive' });
    },
  });

  const resetForm = () => setForm({
    title: '', service_type: '', plan_minutes: '', billing_period: 'monthly',
    billing_currency: 'USD', monthly_price: '', setup_fee: '0', custom_terms: '', lead_id: '',
  });

  const handleLeadSelect = (leadId: string) => {
    const lead = leads?.find(l => l.id === leadId);
    if (lead) {
      setForm(f => ({
        ...f,
        lead_id: leadId,
        title: `Proposal for ${lead.name}`,
        service_type: lead.service_type || '',
        plan_minutes: lead.plan_minutes?.toString() || '',
        billing_period: lead.billing_period || 'monthly',
        billing_currency: lead.billing_currency?.toUpperCase() || 'USD',
      }));
    }
  };

  const filteredProposals = useMemo(() => {
    if (!proposals) return [];
    const q = search.trim().toLowerCase();
    return proposals.filter((p: any) => {
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesSearch = !q
        || p.title?.toLowerCase().includes(q)
        || p.leads?.name?.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [proposals, search, statusFilter]);

  return (
    <StaffLayout role="sales">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Proposals</h1>
            <p className="text-muted-foreground">Create and manage sales proposals</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Proposal</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Proposal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Link to Lead (optional)</Label>
                  <Select value={form.lead_id} onValueChange={handleLeadSelect}>
                    <SelectTrigger><SelectValue placeholder="Select a lead..." /></SelectTrigger>
                    <SelectContent>
                      {leads?.map(l => (
                        <SelectItem key={l.id} value={l.id}>{l.name} — {l.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Title</Label>
                  <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Service Type</Label>
                    <Select value={form.service_type} onValueChange={v => setForm(f => ({ ...f, service_type: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ai-receptionist">AI Receptionist</SelectItem>
                        <SelectItem value="message-assistant">Message Assistant</SelectItem>
                        <SelectItem value="virtual-receptionist">Virtual Receptionist</SelectItem>
                        <SelectItem value="virtual-secretary">Virtual Secretary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Plan Minutes</Label>
                    <Input type="number" value={form.plan_minutes} onChange={e => setForm(f => ({ ...f, plan_minutes: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Monthly Price</Label>
                    <Input type="number" value={form.monthly_price} onChange={e => setForm(f => ({ ...f, monthly_price: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Setup Fee</Label>
                    <Input type="number" value={form.setup_fee} onChange={e => setForm(f => ({ ...f, setup_fee: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Currency</Label>
                    <Select value={form.billing_currency} onValueChange={v => setForm(f => ({ ...f, billing_currency: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="CAD">CAD</SelectItem>
                        <SelectItem value="PHP">PHP — Philippine Peso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Custom Terms</Label>
                  <Textarea value={form.custom_terms} onChange={e => setForm(f => ({ ...f, custom_terms: e.target.value }))} placeholder="Any special terms or conditions..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={() => createProposal.mutate()} disabled={!form.title || createProposal.isPending}>
                  Create Draft
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {['draft', 'sent', 'accepted', 'declined', 'expired'].map(status => (
            <Card key={status}>
              <CardContent className="pt-4 pb-4 text-center">
                <div className="text-2xl font-bold">{proposals?.filter(p => p.status === status).length || 0}</div>
                <div className="text-xs text-muted-foreground capitalize">{status}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search + Status Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or lead name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Proposals Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Proposals</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : !proposals?.length ? (
              <div className="text-center py-12 text-muted-foreground">No proposals yet. Create your first one above.</div>
            ) : !filteredProposals.length ? (
              <div className="text-center py-12 text-muted-foreground">No proposals match your search or filter.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProposals.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.title}</TableCell>
                      <TableCell>{p.leads?.name || '—'}</TableCell>
                      <TableCell className="capitalize">{p.service_type?.replace('-', ' ') || '—'}</TableCell>
                      <TableCell>{p.billing_currency} {Number(p.monthly_price).toFixed(2)}/mo</TableCell>
                      <TableCell>
                        <Badge className={statusStyles[p.status] || ''}>{p.status}</Badge>
                      </TableCell>
                      <TableCell>{format(new Date(p.created_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setPreviewProposal(p)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(p.status === 'draft' || p.status === 'sent') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Send Email"
                              onClick={() => sendEmail.mutate(p.id)}
                              disabled={sendEmail.isPending && sendEmail.variables === p.id}
                            >
                              {sendEmail.isPending && sendEmail.variables === p.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Mail className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {p.status === 'draft' && (
                            <Button variant="ghost" size="sm" onClick={() => updateStatus.mutate({ id: p.id, status: 'sent', extra: { sent_at: new Date().toISOString() } })}>
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          {p.status === 'sent' && (
                            <>
                              <Button variant="ghost" size="sm" className="text-green-600" onClick={() => updateStatus.mutate({ id: p.id, status: 'accepted', extra: { accepted_at: new Date().toISOString() } })}>
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-600" onClick={() => updateStatus.mutate({ id: p.id, status: 'declined' })}>
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Preview Dialog — proposal document */}
        <Dialog open={!!previewProposal} onOpenChange={() => setPreviewProposal(null)}>
          <DialogContent className="max-w-2xl">
            {previewProposal && (
              <div className="space-y-6">
                {/* Letterhead */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-bold tracking-wide">PROPOSAL</h2>
                    <p className="text-lg text-muted-foreground mt-1">{previewProposal.title}</p>
                  </div>
                  {['sent', 'accepted', 'declined'].includes(previewProposal.status) && (
                    <div className="text-right space-y-1 shrink-0">
                      <Badge className={statusStyles[previewProposal.status]}>{previewProposal.status}</Badge>
                      {previewProposal.sent_at && (
                        <p className="text-xs text-muted-foreground">
                          Sent {format(new Date(previewProposal.sent_at), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Prepared for:</span>{' '}
                    <span className="font-medium">
                      {previewProposal.leads?.name || 'N/A'} — {previewProposal.leads?.company || 'No company'}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Date:</span>{' '}
                    <span className="font-medium">{format(new Date(previewProposal.created_at), 'MMM d, yyyy')}</span>
                  </p>
                </div>

                <Separator />

                {/* Service Details */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Service Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Service:</span> <span className="capitalize font-medium">{previewProposal.service_type?.replace('-', ' ') || '—'}</span></div>
                    <div><span className="text-muted-foreground">Plan Minutes:</span> <span className="font-medium">{previewProposal.plan_minutes || '—'}</span></div>
                    <div><span className="text-muted-foreground">Billing Period:</span> <span className="font-medium capitalize">{previewProposal.billing_period}</span></div>
                  </div>
                </div>

                <Separator />

                {/* Pricing */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Pricing</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Monthly Price:</span> <span className="font-medium">{previewProposal.billing_currency} {Number(previewProposal.monthly_price).toFixed(2)}</span></div>
                    <div><span className="text-muted-foreground">Setup Fee:</span> <span className="font-medium">{previewProposal.billing_currency} {Number(previewProposal.setup_fee).toFixed(2)}</span></div>
                    <div><span className="text-muted-foreground">Currency:</span> <span className="font-medium">{previewProposal.billing_currency}</span></div>
                    <div>
                      <span className="text-muted-foreground">Total first payment:</span>{' '}
                      <span className="font-semibold">
                        {previewProposal.billing_currency} {(Number(previewProposal.monthly_price) + Number(previewProposal.setup_fee)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {previewProposal.custom_terms && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Terms &amp; Conditions</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{previewProposal.custom_terms}</p>
                    </div>
                  </>
                )}

                <Separator />
                <p className="text-xs text-center text-muted-foreground">24H Virtual — Confidential</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </StaffLayout>
  );
}
