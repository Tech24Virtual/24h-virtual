import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Circle, ExternalLink, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWLPartnerId } from '@/hooks/wl/useWLPartnerId';
import { ClientCoverageCard } from '@/components/coverage/ClientCoverageCard';

export default function WLClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [slugInput, setSlugInput] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const { data: partnerId } = useWLPartnerId();

  // Fetch client row
  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ['wl-client-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('white_label_clients')
        .select('id, client_name, contact_name, email, phone, status, partner_id, client_portal_slug, user_id, billing_verified, plan_id')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (client) {
      setSlugInput(client.client_portal_slug ?? '');
    }
  }, [client]);

  // Fetch partner's active pricing plans
  const { data: plans } = useQuery({
    queryKey: ['wl-partner-plans', partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wl_partner_plans')
        .select('id, plan_name, plan_type, monthly_cost, included_minutes, overage_cost_per_minute, free_trial, free_trial_days')
        .eq('partner_id', partnerId!)
        .eq('is_active', true)
        .order('plan_name');
      if (error) throw error;
      return data;
    },
    enabled: !!partnerId,
  });

  const selectedPlan = plans?.find((p) => p.id === client?.plan_id) ?? null;

  // Update assigned plan
  const updatePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase
        .from('white_label_clients')
        .update({ plan_id: planId || null })
        .eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wl-client-detail', id] });
      toast({ title: 'Plan updated' });
    },
    onError: (err: Error) => {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    },
  });

  // Fetch service config
  const { data: serviceConfig, isLoading: configLoading } = useQuery({
    queryKey: ['wl-client-service-config', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wl_client_service_config')
        .select('id, estimated_monthly_minutes, partner_retail_rate, service_type, language_support, billing_verified')
        .eq('wl_client_id', id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Save portal slug
  const saveSlugMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('white_label_clients')
        .update({ client_portal_slug: slugInput.trim() || null })
        .eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wl-client-detail', id] });
      toast({ title: 'Portal slug saved' });
    },
    onError: (err: Error) => {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    },
  });

  // Mark as active
  const markActiveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('white_label_clients')
        .update({ status: 'active' })
        .eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wl-client-detail', id] });
      toast({ title: 'Client marked as active' });
    },
    onError: (err: Error) => {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    },
  });

  // Send portal invite
  const inviteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('invite-wl-client', {
        body: { wl_client_id: id, email: client!.email, partner_id: partnerId },
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wl-client-detail', id] });
      setInviteDialogOpen(false);
      toast({ title: 'Invite sent', description: `Portal invite sent to ${client?.email}` });
    },
    onError: (err: Error) => {
      setInviteDialogOpen(false);
      toast({ title: 'Invite failed', description: err.message, variant: 'destructive' });
    },
  });

  // Fetch outbound call requests submitted by this client
  const { data: outboundRequests, isLoading: outboundLoading } = useQuery({
    queryKey: ['wl-client-outbound', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outbound_call_requests')
        .select('id, contact_name, contact_phone, reason, urgency, status, created_at')
        .eq('wl_client_id', id!)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch reviews submitted for this client
  const { data: clientReviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['wl-client-reviews', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wl_client_reviews')
        .select('id, reviewer_name, rating, title, content, is_public, created_at')
        .eq('wl_client_id', id!)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch business hours schedule for this client
  const { data: clientSchedule, isLoading: scheduleLoading } = useQuery({
    queryKey: ['wl-client-schedule', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wl_client_schedules')
        .select('id, day_of_week, start_time, end_time, is_enabled')
        .eq('wl_client_id', id!)
        .order('day_of_week');
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const isLoading = clientLoading || configLoading || !partnerId;

  if (isLoading) {
    return (
        <div className="space-y-4 max-w-3xl">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
    );
  }

  if (!client || client.partner_id !== partnerId) {
    return (
        <div className="max-w-3xl space-y-4">
          <Link
            to="/white-label-dashboard/clients"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Clients
          </Link>
          <p className="text-muted-foreground">Client not found.</p>
        </div>
    );
  }

  // Checklist items
  const checklist = [
    {
      label: 'Service configured',
      done: !!serviceConfig && (serviceConfig.estimated_monthly_minutes ?? 0) > 0,
    },
    {
      label: 'Billing rate set',
      done: serviceConfig?.partner_retail_rate != null,
    },
    {
      label: 'Portal slug set',
      done: !!client.client_portal_slug,
    },
    {
      label: 'Client invited',
      done: !!client.user_id,
    },
    {
      label: 'Billing verified',
      done: !!(serviceConfig?.billing_verified),
    },
  ];
  const completedCount = checklist.filter((c) => c.done).length;
  const allComplete = completedCount === checklist.length;

  const statusBadge =
    client.status === 'active' ? (
      <Badge className="bg-cta/10 text-cta">Active</Badge>
    ) : (
      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
        Setup Incomplete
      </Badge>
    );

  const portalUrl = client.client_portal_slug
    ? `${window.location.origin}/portal/${client.client_portal_slug}/login`
    : null;

  const outboundStatusBadge = (status: string) => {
    if (status === 'completed') {
      return <Badge className="bg-cta/10 text-cta">Completed</Badge>;
    }
    if (status === 'cancelled') {
      return <Badge variant="secondary">Cancelled</Badge>;
    }
    return (
      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
        {status === 'pending' ? 'Pending' : status}
      </Badge>
    );
  };

  const outboundUrgencyBadge = (urgency: string) => {
    if (urgency === 'high') {
      return <Badge variant="destructive">High</Badge>;
    }
    return <Badge variant="secondary">{urgency || 'Normal'}</Badge>;
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const reviewStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`w-4 h-4 ${n <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
        />
      ))}
    </div>
  );

  return (
    <>
      <div className="space-y-6 max-w-3xl">

        <Link
          to="/white-label-dashboard/clients"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Clients
        </Link>

        {/* Header card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <CardTitle className="text-xl">{client.client_name}</CardTitle>
                {client.contact_name && (
                  <p className="text-sm text-muted-foreground mt-0.5">{client.contact_name}</p>
                )}
              </div>
              {statusBadge}
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Email: </span>
              <span>{client.email}</span>
            </div>
            {client.phone && (
              <div>
                <span className="text-muted-foreground">Phone: </span>
                <span>{client.phone}</span>
              </div>
            )}
            <div className="sm:col-span-2 space-y-2">
              <Label>Pricing Plan</Label>
              <Select
                value={client.plan_id ?? undefined}
                onValueChange={(v) => updatePlanMutation.mutate(v)}
                disabled={updatePlanMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No plan assigned" />
                </SelectTrigger>
                <SelectContent>
                  {plans?.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.plan_name} · {plan.plan_type === 'fixed' ? 'Fixed' : 'Custom'} ·{' '}
                      {plan.plan_type === 'fixed'
                        ? `$${Number(plan.monthly_cost ?? 0).toFixed(2)}/mo`
                        : `$${Number(plan.overage_cost_per_minute).toFixed(2)}/min`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedPlan && (
                <div className="mt-2 rounded-md border bg-muted/30 p-3 text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <Badge className={selectedPlan.plan_type === 'fixed' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}>
                      {selectedPlan.plan_type === 'fixed' ? 'Fixed' : 'Custom'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly Cost</span>
                    <span>{selectedPlan.plan_type === 'custom' ? '—' : `$${Number(selectedPlan.monthly_cost ?? 0).toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Included Minutes</span>
                    <span>{selectedPlan.plan_type === 'custom' ? '—' : (selectedPlan.included_minutes ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Overage Rate</span>
                    <span>${Number(selectedPlan.overage_cost_per_minute).toFixed(2)}/min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Free Trial</span>
                    <span>{selectedPlan.free_trial ? `${selectedPlan.free_trial_days ?? 7} days` : 'None'}</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Setup checklist */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {checklist.map((item) => (
                <li key={item.label} className="flex items-center gap-2 text-sm">
                  {item.done ? (
                    <CheckCircle2 className="w-4 h-4 text-cta shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{completedCount} of {checklist.length} complete</span>
                <span>{Math.round((completedCount / checklist.length) * 100)}%</span>
              </div>
              <Progress value={(completedCount / checklist.length) * 100} className="h-2" />
            </div>

            {allComplete && client.status !== 'active' && (
              <div className="rounded-md border border-cta/30 bg-cta/5 p-3 flex items-center justify-between gap-3">
                <p className="text-sm text-cta font-medium">Setup complete — ready to activate</p>
                <Button
                  size="sm"
                  onClick={() => markActiveMutation.mutate()}
                  disabled={markActiveMutation.isPending}
                >
                  {markActiveMutation.isPending ? 'Activating…' : 'Mark as Active'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Portal access */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Portal Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Slug */}
            <div className="space-y-2">
              <Label htmlFor="portal-slug">Portal Slug</Label>
              <div className="flex gap-2">
                <Input
                  id="portal-slug"
                  placeholder="e.g. acme-law"
                  value={slugInput}
                  onChange={(e) => setSlugInput(e.target.value)}
                />
                <Button
                  size="sm"
                  onClick={() => saveSlugMutation.mutate()}
                  disabled={saveSlugMutation.isPending}
                >
                  {saveSlugMutation.isPending ? 'Saving…' : 'Save'}
                </Button>
              </div>
              {portalUrl && (
                <a
                  href={portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  {portalUrl}
                </a>
              )}
            </div>

            {/* Invite */}
            <div className="space-y-2">
              <Label>Client Invite</Label>
              {client.user_id ? (
                <p className="text-sm text-muted-foreground">Client has already been invited and has portal access.</p>
              ) : (
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInviteDialogOpen(true)}
                  >
                    Invite Client
                  </Button>
                  <span className="text-xs text-muted-foreground">{client.email}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Outbound call requests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Outbound Call Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {outboundLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : !outboundRequests || outboundRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No outbound call requests from this client yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outboundRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>{req.contact_name ?? '—'}</TableCell>
                      <TableCell>{req.contact_phone ?? '—'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{req.reason ?? '—'}</TableCell>
                      <TableCell>{outboundUrgencyBadge(req.urgency ?? '')}</TableCell>
                      <TableCell>{outboundStatusBadge(req.status ?? '')}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(req.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Client reviews */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            {reviewsLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : !clientReviews || clientReviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No reviews from this client yet.
              </p>
            ) : (
              <div className="space-y-4">
                {clientReviews.map((review) => (
                  <div key={review.id} className="py-3 border-b last:border-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          {reviewStars(review.rating)}
                          {review.is_public ? (
                            <Badge variant="secondary" className="text-xs">Public</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Private</Badge>
                          )}
                        </div>
                        {review.title && (
                          <p className="font-medium mt-1">{review.title}</p>
                        )}
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {review.reviewer_name || 'Anonymous'}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground shrink-0">
                        {new Date(review.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {review.content && (
                      <p className="text-sm mt-2 line-clamp-2">{review.content}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Business hours */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Business Hours</CardTitle>
          </CardHeader>
          <CardContent>
            {scheduleLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : !clientSchedule || clientSchedule.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No business hours set by this client yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientSchedule.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{dayNames[s.day_of_week]}</TableCell>
                      <TableCell>
                        {s.is_enabled ? (
                          <Badge className="bg-cta/10 text-cta">Enabled</Badge>
                        ) : (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                      </TableCell>
                      <TableCell>{s.is_enabled ? (s.start_time ?? '—') : '—'}</TableCell>
                      <TableCell>{s.is_enabled ? (s.end_time ?? '—') : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Coverage */}
        <ClientCoverageCard wlClientId={id} partnerId={partnerId ?? undefined} />

      </div>

      {/* Invite confirmation dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send portal invite?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will send a portal access invite to <strong>{client.email}</strong>.
            They will receive a link to set up their password and access their portal.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => inviteMutation.mutate()}
              disabled={inviteMutation.isPending}
            >
              {inviteMutation.isPending ? 'Sending…' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
