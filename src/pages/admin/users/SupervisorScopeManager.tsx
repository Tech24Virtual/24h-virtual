import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useSupervisorAssignments,
  useGrantSupervisorAssignment,
  useRevokeSupervisorAssignment,
} from '@/hooks/campaign-os/useSupervisorAssignments';

interface Supervisor { id: string; full_name: string | null }
interface Lead { id: string; full_name: string | null; company_name: string | null }
interface Partner { id: string; partner_name: string }
interface WLClient { id: string; client_name: string; partner_id: string }

type Kind = 'direct_lead' | 'wl_partner' | 'wl_client';

/**
 * Phase G — Admin-only supervisor scope manager.
 * Grants supervisors per-tenant Campaign OS access. Backed by
 * supervisor_tenant_assignments + the is_tenant_member helper.
 */
export default function SupervisorScopeManager() {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [supervisorId, setSupervisorId] = useState<string>('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [wlClients, setWlClients] = useState<WLClient[]>([]);
  const [kind, setKind] = useState<Kind>('direct_lead');
  const [targetId, setTargetId] = useState<string>('');

  const { data: assignments, isLoading } = useSupervisorAssignments(supervisorId || null);
  const grant = useGrantSupervisorAssignment();
  const revoke = useRevokeSupervisorAssignment();

  useEffect(() => {
    (async () => {
      const [supRes, leadRes, partnerRes, wlRes] = await Promise.all([
        (supabase as any)
          .from('user_roles').select('user_id, profiles:profiles!inner(id, full_name)')
          .eq('role', 'supervisor'),
        (supabase as any).from('leads').select('id, full_name, company_name').limit(500),
        (supabase as any).from('white_label_partners').select('id, partner_name'),
        (supabase as any).from('white_label_clients').select('id, client_name, partner_id'),
      ]);
      setSupervisors(((supRes.data as any[]) ?? []).map((r) => ({
        id: r.user_id, full_name: r.profiles?.full_name ?? null,
      })));
      setLeads((leadRes.data as Lead[]) ?? []);
      setPartners((partnerRes.data as Partner[]) ?? []);
      setWlClients((wlRes.data as WLClient[]) ?? []);
    })();
  }, []);

  const onGrant = async () => {
    if (!supervisorId || !targetId) {
      toast.error('Pick a supervisor and a target');
      return;
    }
    try {
      await grant.mutateAsync({
        supervisor_user_id: supervisorId,
        tenant_kind: kind === 'direct_lead' ? 'direct_24h' : 'wl_partner',
        client_lead_id: kind === 'direct_lead' ? targetId : null,
        wl_partner_id: kind === 'wl_partner' ? targetId : null,
        wl_client_id: kind === 'wl_client' ? targetId : null,
      });
      toast.success('Assignment granted');
      setTargetId('');
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to grant');
    }
  };

  const labelFor = (a: any): string => {
    if (a.client_lead_id) {
      const l = leads.find((x) => x.id === a.client_lead_id);
      return `Direct: ${l?.company_name ?? l?.full_name ?? a.client_lead_id}`;
    }
    if (a.wl_client_id) {
      const c = wlClients.find((x) => x.id === a.wl_client_id);
      return `WL Client: ${c?.client_name ?? a.wl_client_id}`;
    }
    if (a.wl_partner_id) {
      const p = partners.find((x) => x.id === a.wl_partner_id);
      return `WL Partner (all clients): ${p?.partner_name ?? a.wl_partner_id}`;
    }
    return 'Unknown';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Supervisor Scope</h1>
        <p className="text-muted-foreground">
          Grant supervisors read access to campaign data for specific tenants. With scope
          enforcement on, supervisors only see tenants they are explicitly assigned to.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Grant access</CardTitle>
          <CardDescription>Pick a supervisor, then a tenant target.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Select value={supervisorId} onValueChange={setSupervisorId}>
            <SelectTrigger><SelectValue placeholder="Supervisor" /></SelectTrigger>
            <SelectContent>
              {supervisors.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.full_name ?? s.id}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={kind} onValueChange={(v) => { setKind(v as Kind); setTargetId(''); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="direct_lead">Direct Client (Lead)</SelectItem>
              <SelectItem value="wl_partner">WL Partner (all clients)</SelectItem>
              <SelectItem value="wl_client">WL End-Client</SelectItem>
            </SelectContent>
          </Select>

          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger><SelectValue placeholder="Target" /></SelectTrigger>
            <SelectContent>
              {kind === 'direct_lead' && leads.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.company_name ?? l.full_name ?? l.id}
                </SelectItem>
              ))}
              {kind === 'wl_partner' && partners.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.partner_name}</SelectItem>
              ))}
              {kind === 'wl_client' && wlClients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={onGrant} disabled={grant.isPending || !supervisorId || !targetId}>
            <Plus className="mr-2 h-4 w-4" />
            {grant.isPending ? 'Granting…' : 'Grant'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Assignments {supervisorId ? '' : <span className="text-sm text-muted-foreground font-normal">(pick a supervisor to filter)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (assignments?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No assignments yet.</p>
          ) : (
            <ul className="divide-y">
              {assignments!.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2">
                  <div className="text-sm">
                    {labelFor(a)}{' '}
                    <Badge variant="outline" className="ml-2 text-[10px]">{a.tenant_kind}</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={revoke.isPending}
                    onClick={async () => {
                      try {
                        await revoke.mutateAsync(a.id);
                        toast.success('Revoked');
                      } catch (e: any) {
                        toast.error(e?.message ?? 'Failed');
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
