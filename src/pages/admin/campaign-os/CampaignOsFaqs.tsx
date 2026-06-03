import { useState } from 'react';
import { useDepartments } from '@/hooks/campaign-os/useDepartments';
import { useCampaignFaqs, useCampaignFaqsCandidates } from '@/hooks/campaign-os/useCampaignFaqs';
import {
  useUpsertFaq,
  useApproveFaq,
  useArchiveFaq,
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

type FaqFormState = {
  id?: string;
  scope: CampaignScope;
  question: string;
  answer_md: string;
  status: 'draft' | 'approved';
};

const EMPTY_FORM: FaqFormState = { scope: 'department', question: '', answer_md: '', status: 'draft' };

export default function CampaignOsFaqs() {
  const { data: departments = [] } = useDepartments();
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const effective = useCampaignFaqs(departmentId);
  const candidates = useCampaignFaqsCandidates(departmentId);
  const upsert = useUpsertFaq();
  const approve = useApproveFaq();
  const archive = useArchiveFaq();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FaqFormState>(EMPTY_FORM);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (row: any) => {
    setForm({
      id: row.id,
      scope: row.scope,
      question: row.question,
      answer_md: row.answer_md,
      status: row.status === 'approved' ? 'approved' : 'draft',
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.question.trim() || !form.answer_md.trim()) return toast.error('Question and answer required');
    if (form.scope === 'department' && !departmentId) return toast.error('Pick a call flow first');
    try {
      await upsert.mutateAsync({
        id: form.id,
        scope: form.scope,
        client_department_id: form.scope === 'department' ? departmentId : null,
        question: form.question,
        answer_md: form.answer_md,
        status: form.status,
      });
      toast.success(form.id ? 'FAQ updated' : 'FAQ saved');
      setOpen(false);
      setForm(EMPTY_FORM);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approve.mutateAsync(id);
      toast.success('FAQ approved');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Archive this FAQ? It will stop appearing in the resolver.')) return;
    try {
      await archive.mutateAsync(id);
      toast.success('FAQ archived');
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
            <SelectTrigger className="w-[280px]"><SelectValue placeholder="Select a call flow to view its FAQs" /></SelectTrigger>
            <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.department_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />New FAQ</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? 'Edit FAQ' : 'Create FAQ'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Scope</Label>
                <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v as CampaignScope })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SCOPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Question</Label><Input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} /></div>
              <div><Label>Answer (markdown)</Label><Textarea rows={6} value={form.answer_md} onChange={(e) => setForm({ ...form, answer_md: e.target.value })} /></div>
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
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Select a call flow to see its FAQs and the merge preview.</CardContent></Card>
      ) : (
        <Tabs defaultValue="effective">
          <TabsList>
            <TabsTrigger value="effective">Effective ({effective.data?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="candidates">All Candidates ({candidates.data?.length ?? 0})</TabsTrigger>
          </TabsList>
          <TabsContent value="effective" className="space-y-2 mt-4">
            {effective.data?.map((f) => (
              <Card key={f.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="text-base">{f.question}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{SCOPE_LABELS[f.scope] ?? f.scope}</Badge>
                      <Badge variant="outline">{f.status}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <p className="text-sm whitespace-pre-wrap">{f.answer_md}</p>
                  {renderRowActions(f)}
                </CardContent>
              </Card>
            ))}
            {effective.data?.length === 0 && <p className="text-sm text-muted-foreground">No effective FAQs.</p>}
          </TabsContent>
          <TabsContent value="candidates" className="space-y-2 mt-4">
            {candidates.data?.map((f) => (
              <Card key={f.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="text-base">{f.question}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="outline">rank {f.precedence_rank}</Badge>
                      <Badge variant="secondary">{SCOPE_LABELS[f.scope] ?? f.scope}</Badge>
                      <Badge variant="outline">{f.status}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">{f.answer_md}</p>
                  {renderRowActions(f)}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
