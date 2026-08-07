import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Radio, Plus, Pencil, Trash2, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFive9Campaigns } from '@/hooks/campaign-os/useFive9CampaignMapping';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface Lead {
  id: string;
  name: string;
}

interface WlClient {
  id: string;
  client_name: string;
  partner_id: string;
}

interface Mapping {
  id: string;
  lead_id: string | null;
  match_type: string;
  match_value: string;
  is_active: boolean;
  wl_client_id: string | null;
  partner_id: string | null;
  created_at: string;
  lead: { name: string } | null;
  wl_client: { client_name: string } | null;
}

export default function AdminFive9Routing() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<Mapping | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: mappings = [], isLoading, isError } = useQuery({
    queryKey: ['admin-five9-routing-mappings'],
    queryFn: async (): Promise<Mapping[]> => {
      const { data, error } = await supabase
        .from('client_report_mappings')
        .select('*, lead:leads(name), wl_client:white_label_clients(client_name)')
        .in('match_type', ['campaign', 'wl_campaign'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Mapping[];
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('client_report_mappings')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-five9-routing-mappings'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update mapping'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('client_report_mappings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Mapping deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-five9-routing-mappings'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete mapping'),
    onSettled: () => setDeleteId(null),
  });

  const handleAdd = () => {
    setEditingMapping(null);
    setDialogOpen(true);
  };

  const handleEdit = (mapping: Mapping) => {
    setEditingMapping(mapping);
    setDialogOpen(true);
  };

  const handleDialogClose = (refresh?: boolean) => {
    setDialogOpen(false);
    setEditingMapping(null);
    if (refresh) {
      queryClient.invalidateQueries({ queryKey: ['admin-five9-routing-mappings'] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading flex items-center gap-2">
            <Radio className="w-6 h-6" />
            Five9 Call Routing
          </h1>
          <p className="text-muted-foreground">
            Map Five9 campaign names to clients so incoming calls are routed to the correct dashboard.
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Mapping
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Mappings</CardTitle>
          <CardDescription>
            Every incoming call is routed by matching its Five9 campaign name against this list.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : isError ? (
            <div className="text-center py-12 space-y-2">
              <AlertTriangle className="h-6 w-6 text-destructive mx-auto" />
              <p className="text-sm text-destructive">Failed to load mappings.</p>
            </div>
          ) : mappings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No campaign mappings configured yet. Add one to start routing calls automatically.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping) => {
                  const isWl = mapping.match_type === 'wl_campaign';
                  const clientName = isWl
                    ? mapping.wl_client?.client_name || 'Unknown WL client'
                    : mapping.lead?.name || 'Unknown client';
                  return (
                    <TableRow key={mapping.id}>
                      <TableCell className="font-mono text-sm">{mapping.match_value}</TableCell>
                      <TableCell>
                        <Badge variant={isWl ? 'secondary' : 'outline'}>
                          {isWl ? 'WL Client' : 'Direct Client'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{clientName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={mapping.is_active}
                            disabled={toggleActiveMutation.isPending}
                            onCheckedChange={(checked) =>
                              toggleActiveMutation.mutate({ id: mapping.id, is_active: checked })
                            }
                          />
                          {mapping.is_active ? (
                            <Badge variant="default" className="bg-green-500">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(mapping)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(mapping.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <MappingDialog open={dialogOpen} onClose={handleDialogClose} mapping={editingMapping} />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Mapping</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this mapping? Future calls for this campaign will no longer
              be routed automatically until a new mapping is created.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface MappingDialogProps {
  open: boolean;
  onClose: (refresh?: boolean) => void;
  mapping: Mapping | null;
}

function MappingDialog({ open, onClose, mapping }: MappingDialogProps) {
  const [clientType, setClientType] = useState<'direct' | 'wl'>('direct');
  const [campaignName, setCampaignName] = useState('');
  const [leadId, setLeadId] = useState('');
  const [wlClientId, setWlClientId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const {
    data: five9Campaigns = [],
    isFetching: five9Loading,
    isError: five9Error,
    refetch: loadFive9Campaigns,
  } = useFive9Campaigns();

  const { data: leads = [] } = useQuery({
    queryKey: ['admin-five9-routing-leads'],
    enabled: open && clientType === 'direct',
    queryFn: async (): Promise<Lead[]> => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name')
        .eq('pipeline_stage', 'active')
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: wlClients = [] } = useQuery({
    queryKey: ['admin-five9-routing-wl-clients'],
    enabled: open && clientType === 'wl',
    queryFn: async (): Promise<WlClient[]> => {
      const { data, error } = await supabase
        .from('white_label_clients')
        .select('id, client_name, partner_id')
        .order('client_name');
      if (error) throw error;
      return data ?? [];
    },
  });

  // Sync form state whenever the dialog is (re)opened for a given mapping.
  const formKey = `${open}-${mapping?.id ?? 'new'}`;
  const [lastFormKey, setLastFormKey] = useState(formKey);
  if (formKey !== lastFormKey) {
    setLastFormKey(formKey);
    if (mapping) {
      const isWl = mapping.match_type === 'wl_campaign';
      setClientType(isWl ? 'wl' : 'direct');
      setCampaignName(mapping.match_value);
      setLeadId(mapping.lead_id ?? '');
      setWlClientId(mapping.wl_client_id ?? '');
      setIsActive(mapping.is_active);
    } else {
      setClientType('direct');
      setCampaignName('');
      setLeadId('');
      setWlClientId('');
      setIsActive(true);
    }
  }

  const selectedWlClient = wlClients.find((c) => c.id === wlClientId) ?? null;

  const handleSave = async () => {
    if (!campaignName.trim()) {
      toast.error('Enter a campaign name');
      return;
    }
    if (clientType === 'direct' && !leadId) {
      toast.error('Select a client');
      return;
    }
    if (clientType === 'wl' && !wlClientId) {
      toast.error('Select a WL client');
      return;
    }

    setIsSaving(true);

    const payload =
      clientType === 'direct'
        ? {
            match_type: 'campaign',
            match_value: campaignName.trim(),
            is_active: isActive,
            lead_id: leadId,
            wl_client_id: null,
            partner_id: null,
          }
        : {
            match_type: 'wl_campaign',
            match_value: campaignName.trim(),
            is_active: isActive,
            lead_id: null,
            wl_client_id: wlClientId,
            partner_id: selectedWlClient?.partner_id ?? null,
          };

    const { error } = mapping
      ? await supabase.from('client_report_mappings').update(payload).eq('id', mapping.id)
      : await supabase.from('client_report_mappings').insert(payload);

    setIsSaving(false);

    if (error) {
      toast.error(error.message || 'Failed to save mapping');
      return;
    }

    toast.success(mapping ? 'Mapping updated' : 'Mapping created');
    onClose(true);
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mapping ? 'Edit' : 'Add'} Campaign Mapping</DialogTitle>
          <DialogDescription>
            Map a Five9 campaign name to the client it should route calls to.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Campaign Name</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Exact Five9 campaign name"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => loadFive9Campaigns()}
                disabled={five9Loading}
              >
                {five9Loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Load from Five9
              </Button>
            </div>
            {five9Error && (
              <p className="text-sm text-destructive">Five9 API unavailable — enter the campaign name manually.</p>
            )}
            {five9Campaigns.length > 0 && (
              <Select value={campaignName} onValueChange={setCampaignName}>
                <SelectTrigger>
                  <SelectValue placeholder="Or pick from live Five9 campaigns" />
                </SelectTrigger>
                <SelectContent>
                  {five9Campaigns.map((c) => (
                    <SelectItem key={c.name} value={c.name}>
                      {c.name} <span className="text-xs text-muted-foreground">({c.type})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label>Client Type</Label>
            <Select value={clientType} onValueChange={(v) => setClientType(v as 'direct' | 'wl')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="direct">Direct Client</SelectItem>
                <SelectItem value="wl">WL Client</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {clientType === 'direct' ? (
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={leadId} onValueChange={setLeadId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>WL Client</Label>
              <Select value={wlClientId} onValueChange={setWlClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a WL client" />
                </SelectTrigger>
                <SelectContent>
                  {wlClients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedWlClient && (
                <p className="text-xs text-muted-foreground">
                  Partner ID auto-filled: {selectedWlClient.partner_id}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Active</Label>
              <p className="text-sm text-muted-foreground">Enable or disable this mapping</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose()}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mapping ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
