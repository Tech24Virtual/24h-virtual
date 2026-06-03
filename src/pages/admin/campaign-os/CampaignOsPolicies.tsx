import { useState } from 'react';
import { useDepartments } from '@/hooks/campaign-os/useDepartments';
import { useCampaignPolicies, useCampaignPoliciesCandidates } from '@/hooks/campaign-os/useCampaignPolicies';
import {
  useUpsertPolicy,
  useApprovePolicy,
  useArchivePolicy,
} from '@/hooks/campaign-os/useCampaignMutations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Check, Archive, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import type { CampaignScope } from '@/lib/campaign-os/types';

const SCOPES: { value: CampaignScope; label: string }[] = [
  { value: 'department', label: 'Call Flow' },
  { value: 'client', label: 'Client' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'global', label: 'Global' },
];

const SCOPE_LABELS: Record<string, string> = {
  department: 'Call Flow',
  call_flow: 'Call Flow',
  location: 'Location',
  client: 'Client',
  tenant: 'Tenant',
  global: 'Global',
};
const POLICY_KINDS = ['service_rule', 'restricted_disclosure', 'escalation_rule', 'general_policy'] as const;

type PolicyFormState = {
  id?: string;
  scope: CampaignScope;
  policy_kind: typeof POLICY_KINDS[number];
  title: string;
  body_md: string;
  status: 'draft' | 'approved';
};

const EMPTY_FORM: PolicyFormState = {
  scope: 'department',
  policy_kind: 'general_policy',
  title: '',
  body_md: '',
  status: 'draft',
};

export default function CampaignOsPolicies() {
  const { data: departments = [] } = useDepartments();
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const effective = useCampaignPolicies(departmentId);
  const candidates = useCampaignPoliciesCandidates(departmentId);
  const upsert = useUpsertPolicy();
  const approve = useApprovePolicy();
  const archive = useArchivePolicy();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PolicyFormState>(EMPTY_FORM);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (row: any) => {
    setForm({
      id: row.id,
      scope: row.scope,
      policy_kind: row.policy_kind,
      title: row.title,
      body_md: row.body_md,
      status: row.status === 'approved' ? 'approved' : 'draft',
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.body_md.trim()) return toast.error('Title and body required');
    if (form.scope === 'department' && !departmentId) return toast.error('Pick a call flow first');
    try {
      await upsert.mutateAsync({
        id: form.id,
        scope: form.scope,
        client_department_id: form.scope === 'department' ? departmentId : null,
        policy_kind: form.policy_kind,
        title: form.title,
        body_md: form.body_md,
        status: form.status,
      });
      toast.success(form.id ? 'Policy updated' : 'Policy saved');
      setOpen(false);
      setForm(EMPTY_FORM);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approve.mutateAsync(id);
      toast.success('Policy approved');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Archive this policy? It will stop appearing in the resolver.')) return;
    try {
      await archive.mutateAsync(id);
      toast.success('Policy archived');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const renderRowActions = (row: any) => (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
      </Button>
      {row.status === 'draft' && (
        <Button size="sm" variant="default" onClick={() => handleApprove(row.id)} disabled={approve.isPending}>
          <Check className="h-3.5 w-3.5 mr-1" /> Approve
        </Button>
      )}
      {row.status !== 'archived' && (
        <Button size="sm" variant="ghost" onClick={() => handleArchive(row.id)} disabled={archive.isPending}>
          <Archive className="h-3.5 w-3.5 mr-1" /> Archive
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Label className="whitespace-nowrap">Call Flow</Label>
          <Select value={departmentId ?? ''} onValueChange={(v) => setDepartmentId(v || null)}>
            <SelectTrigger className="w-[280px]"><SelectValue placeholder="Select a call flow" /></SelectTrigger>
            <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.department_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />New Policy</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? 'Edit Policy' : 'Create Policy'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Scope</Label>
                  <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v as CampaignScope })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SCOPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Kind</Label>
                  <Select value={form.policy_kind} onValueChange={(v) => setForm({ ...form, policy_kind: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{POLICY_KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Body (markdown)</Label><Textarea rows={6} value={form.body_md} onChange={(e) => setForm({ ...form, body_md: e.target.value })} /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="approved">Approved</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={upsert.isPending}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!departmentId ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Select a call flow to see its policies.</CardContent></Card>
      ) : (
        <Tabs defaultValue="effective">
          <TabsList>
            <TabsTrigger value="effective">Effective ({effective.data?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="candidates">Candidates ({candidates.data?.length ?? 0})</TabsTrigger>
          </TabsList>
          <TabsContent value="effective" className="space-y-2 mt-4">
            {effective.data?.map((p) => (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="text-base">{p.title}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="outline">{p.policy_kind}</Badge>
                      <Badge variant="secondary">{SCOPE_LABELS[p.scope] ?? p.scope}</Badge>
                      <Badge variant="outline">{p.status}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <p className="text-sm whitespace-pre-wrap">{p.body_md}</p>
                  {renderRowActions(p)}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          <TabsContent value="candidates" className="space-y-2 mt-4">
            {candidates.data?.map((p) => (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="text-base">{p.title}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="outline">rank {p.precedence_rank}</Badge>
                      <Badge variant="secondary">{SCOPE_LABELS[p.scope] ?? p.scope}</Badge>
                      <Badge variant="outline">{p.status}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">{p.body_md}</p>
                  {renderRowActions(p)}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
