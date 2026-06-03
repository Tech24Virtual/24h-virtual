import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, MessageCircle } from 'lucide-react';

export default function TechChatDeployments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // create form state
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<'direct' | 'wl' | ''>('');
  const [displayName, setDisplayName] = useState('');
  const [directClientId, setDirectClientId] = useState('');
  const [wlPartnerId, setWlPartnerId] = useState('');
  const [wlClientId, setWlClientId] = useState('');

  const { data: deployments, isLoading } = useQuery({
    queryKey: ['chat-deployments-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('chat_deployments')
        .select('id, display_name, ownership_mode, status, created_at, direct_client_id, wl_partner_id, wl_client_id')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: directClients } = useQuery({
    queryKey: ['active-direct-clients'],
    queryFn: async () => {
      const { data } = await supabase
        .from('leads')
        .select('id, name, company')
        .eq('pipeline_stage', 'active')
        .order('name');
      return data || [];
    },
    enabled: open && mode === 'direct',
  });

  const { data: partners } = useQuery({
    queryKey: ['wl-partners-list'],
    queryFn: async () => {
      const { data } = await supabase.from('white_label_partners').select('id, company_name').order('company_name');
      return data || [];
    },
    enabled: open && mode === 'wl',
  });

  const { data: wlClients } = useQuery({
    queryKey: ['wl-clients', wlPartnerId],
    queryFn: async () => {
      const { data } = await supabase.from('white_label_clients').select('id, client_name').eq('partner_id', wlPartnerId).order('client_name');
      return data || [];
    },
    enabled: open && mode === 'wl' && !!wlPartnerId,
  });

  const reset = () => {
    setStep(1); setMode(''); setDisplayName(''); setDirectClientId(''); setWlPartnerId(''); setWlClientId('');
  };

  const handleCreate = async () => {
    if (!displayName.trim()) { toast({ title: 'Display name required', variant: 'destructive' }); return; }

    const payload: any = {
      ownership_mode: mode,
      display_name: displayName.trim(),
      created_by: user?.id,
    };
    if (mode === 'direct') payload.direct_client_id = directClientId;
    else { payload.wl_partner_id = wlPartnerId; payload.wl_client_id = wlClientId; }

    const { data, error } = await supabase.from('chat_deployments').insert(payload).select('id').single();
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }

    // Create default brand and AI configs
    await Promise.all([
      supabase.from('chat_brand_configs').insert({ deployment_id: data.id }),
      supabase.from('chat_ai_configs').insert({ deployment_id: data.id }),
    ]);

    toast({ title: 'Created', description: 'Chat deployment created' });
    setOpen(false);
    reset();
    queryClient.invalidateQueries({ queryKey: ['chat-deployments-list'] });
  };

  return (
    <StaffLayout role="tech">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Chat Deployments</h1>
            <p className="text-muted-foreground">Configure chat for direct clients and white-label partners</p>
          </div>
          <Button onClick={() => { reset(); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> New Deployment
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All deployments ({deployments?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
            {!isLoading && (deployments?.length || 0) === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No deployments yet
              </div>
            )}
            <div className="space-y-2">
              {deployments?.map(d => (
                <Link key={d.id} to={`/staff/tech/chat-deployments/${d.id}`} className="block">
                  <div className="border rounded-lg p-3 hover:bg-accent transition-colors flex items-center justify-between">
                    <div>
                      <p className="font-medium">{d.display_name}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant={d.ownership_mode === 'wl' ? 'secondary' : 'default'}>
                          {d.ownership_mode === 'wl' ? 'WL Partner Client' : 'Direct Client'}
                        </Badge>
                        <Badge variant="outline" className="capitalize">{d.status}</Badge>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Chat Deployment</DialogTitle>
          </DialogHeader>

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Step 1: Is this for a Direct Client or a White-Label Client?</p>
              <div className="grid grid-cols-2 gap-3">
                <Button variant={mode === 'direct' ? 'default' : 'outline'} onClick={() => setMode('direct')} className="h-auto py-4">
                  Direct Client
                </Button>
                <Button variant={mode === 'wl' ? 'default' : 'outline'} onClick={() => setMode('wl')} className="h-auto py-4">
                  White-Label Client
                </Button>
              </div>
            </div>
          )}

          {step === 2 && mode === 'direct' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g. Acme Corp Chat" />
              </div>
              <div className="space-y-2">
                <Label>Active Direct Client</Label>
                <Select value={directClientId} onValueChange={setDirectClientId}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {directClients?.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 2 && mode === 'wl' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g. Partner X / Client Y" />
              </div>
              <div className="space-y-2">
                <Label>White-Label Partner</Label>
                <Select value={wlPartnerId} onValueChange={v => { setWlPartnerId(v); setWlClientId(''); }}>
                  <SelectTrigger><SelectValue placeholder="Select partner" /></SelectTrigger>
                  <SelectContent>
                    {partners?.map(p => <SelectItem key={p.id} value={p.id}>{p.company_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {wlPartnerId && (
                <div className="space-y-2">
                  <Label>Partner's Client</Label>
                  <Select value={wlClientId} onValueChange={setWlClientId}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                      {wlClients?.map(c => <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {step === 1 ? (
              <Button onClick={() => setStep(2)} disabled={!mode}>Next</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={handleCreate} disabled={
                  !displayName.trim() ||
                  (mode === 'direct' && !directClientId) ||
                  (mode === 'wl' && (!wlPartnerId || !wlClientId))
                }>Create</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StaffLayout>
  );
}
