import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Circle, ExternalLink } from 'lucide-react';
import { WhiteLabelLayout } from '@/components/white-label/WhiteLabelLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function WLClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [serviceForm, setServiceForm] = useState({
    estimated_monthly_minutes: '',
    partner_retail_rate: '',
    service_type: 'virtual_receptionist',
    language_support: 'english_only',
  });
  const [slugInput, setSlugInput] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Fetch partner ID for the current user
  const { data: partner } = useQuery({
    queryKey: ['wl-partner-id', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('white_label_partners')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const partnerId = partner?.id ?? null;

  // Fetch client row
  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ['wl-client-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('white_label_clients')
        .select('id, client_name, contact_name, email, phone, status, partner_id, client_portal_slug, user_id, billing_verified')
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

  useEffect(() => {
    if (serviceConfig) {
      setServiceForm({
        estimated_monthly_minutes: String(serviceConfig.estimated_monthly_minutes ?? ''),
        partner_retail_rate: serviceConfig.partner_retail_rate != null
          ? String(serviceConfig.partner_retail_rate)
          : '',
        service_type: serviceConfig.service_type ?? 'virtual_receptionist',
        language_support: serviceConfig.language_support ?? 'english_only',
      });
    }
  }, [serviceConfig]);

  // Save service config
  const saveServiceMutation = useMutation({
    mutationFn: async () => {
      const patch = {
        estimated_monthly_minutes: Number(serviceForm.estimated_monthly_minutes) || 0,
        partner_retail_rate: serviceForm.partner_retail_rate !== '' ? Number(serviceForm.partner_retail_rate) : null,
        service_type: serviceForm.service_type,
        language_support: serviceForm.language_support,
      };
      if (serviceConfig?.id) {
        const { error } = await supabase
          .from('wl_client_service_config')
          .update(patch)
          .eq('id', serviceConfig.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('wl_client_service_config')
          .insert({ ...patch, wl_client_id: id!, partner_id: partnerId! });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wl-client-service-config', id] });
      toast({ title: 'Service config saved' });
    },
    onError: (err: Error) => {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    },
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

  const isLoading = clientLoading || configLoading || !partner;

  if (isLoading) {
    return (
      <WhiteLabelLayout>
        <div className="space-y-4 max-w-3xl">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      </WhiteLabelLayout>
    );
  }

  if (!client || client.partner_id !== partnerId) {
    return (
      <WhiteLabelLayout>
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
      </WhiteLabelLayout>
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
    ? `${window.location.origin}/c/${client.client_portal_slug}`
    : null;

  return (
    <WhiteLabelLayout>
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

        {/* Service configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Service Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="est-minutes">Estimated Monthly Minutes</Label>
                <Input
                  id="est-minutes"
                  type="number"
                  min={0}
                  value={serviceForm.estimated_monthly_minutes}
                  onChange={(e) => setServiceForm((p) => ({ ...p, estimated_monthly_minutes: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="retail-rate">Retail Rate ($/min)</Label>
                <Input
                  id="retail-rate"
                  type="number"
                  min={0}
                  step="0.001"
                  placeholder="e.g. 0.085"
                  value={serviceForm.partner_retail_rate}
                  onChange={(e) => setServiceForm((p) => ({ ...p, partner_retail_rate: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Service Type</Label>
                <Select
                  value={serviceForm.service_type}
                  onValueChange={(v) => setServiceForm((p) => ({ ...p, service_type: v }))}
                >
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
                <Select
                  value={serviceForm.language_support}
                  onValueChange={(v) => setServiceForm((p) => ({ ...p, language_support: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english_only">English Only</SelectItem>
                    <SelectItem value="bilingual">Bilingual</SelectItem>
                    <SelectItem value="multilingual">Multilingual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={() => saveServiceMutation.mutate()}
              disabled={saveServiceMutation.isPending}
              size="sm"
            >
              {saveServiceMutation.isPending ? 'Saving…' : 'Save Configuration'}
            </Button>
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
    </WhiteLabelLayout>
  );
}
