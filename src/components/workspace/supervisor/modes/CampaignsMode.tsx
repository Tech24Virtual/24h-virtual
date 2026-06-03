import { useState } from 'react';
import { useDepartments } from '@/hooks/campaign-os/useDepartments';
import { useCampaignFaqs } from '@/hooks/campaign-os/useCampaignFaqs';
import { useCampaignPolicies } from '@/hooks/campaign-os/useCampaignPolicies';
import { useUpsertFaq, useUpsertPolicy } from '@/hooks/campaign-os/useCampaignMutations';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function CampaignsMode() {
  const { data: departments = [], isLoading } = useDepartments();
  const [selected, setSelected] = useState<string | null>(null);
  const faqs = useCampaignFaqs(selected);
  const policies = useCampaignPolicies(selected);
  const upsertFaq = useUpsertFaq();
  const upsertPolicy = useUpsertPolicy();
  const [faqDialog, setFaqDialog] = useState(false);
  const [policyDialog, setPolicyDialog] = useState(false);
  const [faqForm, setFaqForm] = useState({ question: '', answer_md: '' });
  const [policyForm, setPolicyForm] = useState({ title: '', body_md: '', policy_kind: 'general_policy' as any });

  const submitFaqDraft = async () => {
    if (!selected) return;
    try {
      await upsertFaq.mutateAsync({
        scope: 'department',
        client_department_id: selected,
        question: faqForm.question,
        answer_md: faqForm.answer_md,
        status: 'draft',
      });
      toast.success('FAQ draft submitted for admin review');
      setFaqDialog(false);
      setFaqForm({ question: '', answer_md: '' });
    } catch (e: any) { toast.error(e.message); }
  };

  const submitPolicyDraft = async () => {
    if (!selected) return;
    try {
      await upsertPolicy.mutateAsync({
        scope: 'department',
        client_department_id: selected,
        policy_kind: policyForm.policy_kind,
        title: policyForm.title,
        body_md: policyForm.body_md,
        status: 'draft',
      });
      toast.success('Policy draft submitted for admin review');
      setPolicyDialog(false);
      setPolicyForm({ title: '', body_md: '', policy_kind: 'general_policy' });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left rail: department list */}
      <div className="w-64 shrink-0 border-r bg-muted/20">
        <div className="p-3 border-b">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Departments</h3>
        </div>
        <ScrollArea className="h-[calc(100%-3rem)]">
          {isLoading ? (
            <div className="p-3 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : departments.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              <Building2 className="h-6 w-6 mx-auto mb-2 opacity-40" />No assigned departments.
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {departments.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelected(d.id)}
                  className={cn(
                    'w-full text-left p-2 rounded-md text-sm transition-colors',
                    selected === d.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-background',
                  )}
                >
                  <div className="truncate">{d.department_name}</div>
                  <div className="flex gap-1 mt-1">
                    <Badge variant="outline" className="text-[10px] h-4 px-1">{d.department_type}</Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Detail pane */}
      <div className="flex-1 overflow-auto p-6">
        {!selected ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Select a department to view its effective campaign config.</div>
        ) : (
          <Tabs defaultValue="faqs">
            <TabsList>
              <TabsTrigger value="faqs">FAQs ({faqs.data?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="policies">Policies ({policies.data?.length ?? 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="faqs" className="space-y-3 mt-4">
              <div className="flex justify-end">
                <Dialog open={faqDialog} onOpenChange={setFaqDialog}>
                  <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" />Suggest FAQ Draft</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Submit FAQ Draft</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div><Label>Question</Label><Input value={faqForm.question} onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })} /></div>
                      <div><Label>Answer</Label><Textarea rows={5} value={faqForm.answer_md} onChange={(e) => setFaqForm({ ...faqForm, answer_md: e.target.value })} /></div>
                      <p className="text-xs text-muted-foreground">Drafts go to admin for review and approval.</p>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setFaqDialog(false)}>Cancel</Button><Button onClick={submitFaqDraft} disabled={upsertFaq.isPending}>Submit Draft</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              {faqs.data?.map((f) => (
                <Card key={f.id}>
                  <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-base">{f.question}</CardTitle><Badge variant="secondary">{f.scope}</Badge></div></CardHeader>
                  <CardContent className="pt-0"><p className="text-sm whitespace-pre-wrap">{f.answer_md}</p></CardContent>
                </Card>
              ))}
              {faqs.data?.length === 0 && <p className="text-sm text-muted-foreground">No effective FAQs.</p>}
            </TabsContent>

            <TabsContent value="policies" className="space-y-3 mt-4">
              <div className="flex justify-end">
                <Dialog open={policyDialog} onOpenChange={setPolicyDialog}>
                  <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" />Suggest Policy Draft</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Submit Policy Draft</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div><Label>Title</Label><Input value={policyForm.title} onChange={(e) => setPolicyForm({ ...policyForm, title: e.target.value })} /></div>
                      <div><Label>Body</Label><Textarea rows={5} value={policyForm.body_md} onChange={(e) => setPolicyForm({ ...policyForm, body_md: e.target.value })} /></div>
                      <p className="text-xs text-muted-foreground">Drafts go to admin for review and approval.</p>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setPolicyDialog(false)}>Cancel</Button><Button onClick={submitPolicyDraft} disabled={upsertPolicy.isPending}>Submit Draft</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              {policies.data?.map((p) => (
                <Card key={p.id}>
                  <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-base">{p.title}</CardTitle><div className="flex gap-2"><Badge variant="outline">{p.policy_kind}</Badge><Badge variant="secondary">{p.scope}</Badge></div></div></CardHeader>
                  <CardContent className="pt-0"><p className="text-sm whitespace-pre-wrap">{p.body_md}</p></CardContent>
                </Card>
              ))}
              {policies.data?.length === 0 && <p className="text-sm text-muted-foreground">No effective policies.</p>}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
