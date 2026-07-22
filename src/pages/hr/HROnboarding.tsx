import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { HRLayout } from '@/components/hr/HRLayout';
import { SendOfferDialog } from '@/components/staff/onboarding/SendOfferDialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Plus, CheckCircle, Trash2, GripVertical } from 'lucide-react';

const statusToStep: Record<string, number> = {
  offer_pending: 0, offer_accepted: 1, contract_signed: 2, banking_pending: 3,
  provisioning: 4, training: 5, live_training: 6, activation_in_progress: 7, completed: 8,
};

export default function HROnboarding() {
  const { user } = useAuth();
  const [onboardings, setOnboardings] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [sendOfferOpen, setSendOfferOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [templateForm, setTemplateForm] = useState({ name: '', description: '', steps: [{ label: '', who: 'HR', required: true }] });

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    const [onbRes, tplRes] = await Promise.all([
      (supabase as any).from('agent_onboarding').select('id, applicant_user_id, supervisor_id, job_application_id, onboarding_template_id, status, pay_rate, pay_type, schedule_type, contract_text, contract_signed_at, banking_submitted, google_email, five9_username, slack_invited, slack_channels_assigned, training_checklist, training_completed_at, live_training_scheduled_at, live_training_completed_at, hr_approved_by, completed_at, created_at, updated_at, profiles:applicant_user_id(full_name)').order('created_at', { ascending: false }),
      (supabase as any).from('onboarding_templates').select('*').order('created_at', { ascending: false }),
    ]);
    setOnboardings(onbRes.data || []);
    setTemplates(tplRes.data || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleHRApproval = async (id: string) => {
    const { error } = await supabase.from('agent_onboarding').update({ hr_approved_by: user!.id, status: 'activation_in_progress' }).eq('id', id);
    if (error) { toast.error('Failed to approve'); return; }
    await supabase.from('agent_onboarding_log').insert({ onboarding_id: id, action: 'hr_approved', performed_by: user!.id });
    toast.success('Onboarding approved by HR');
    fetchData();
  };

  const handleSaveTemplate = async () => {
    const validSteps = templateForm.steps.filter(s => s.label.trim());
    if (!templateForm.name.trim() || validSteps.length === 0) { toast.error('Name and at least one step required'); return; }
    const payload = { name: templateForm.name, description: templateForm.description, steps: validSteps, created_by: user!.id };
    
    if (editingTemplate) {
      const { error } = await supabase.from('onboarding_templates').update(payload).eq('id', editingTemplate.id);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Template updated');
    } else {
      const { error } = await supabase.from('onboarding_templates').insert(payload);
      if (error) { toast.error('Failed to create'); return; }
      toast.success('Template created');
    }
    setTemplateDialogOpen(false);
    setEditingTemplate(null);
    setTemplateForm({ name: '', description: '', steps: [{ label: '', who: 'HR', required: true }] });
    fetchData();
  };

  const handleDeleteTemplate = async (id: string) => {
    const { error } = await supabase.from('onboarding_templates').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Template deleted');
    fetchData();
  };

  const openEditTemplate = (t: any) => {
    setEditingTemplate(t);
    setTemplateForm({ name: t.name, description: t.description || '', steps: (t.steps as any[]) || [] });
    setTemplateDialogOpen(true);
  };

  const addStep = () => setTemplateForm(p => ({ ...p, steps: [...p.steps, { label: '', who: 'HR', required: true }] }));
  const removeStep = (i: number) => setTemplateForm(p => ({ ...p, steps: p.steps.filter((_, idx) => idx !== i) }));
  const updateStep = (i: number, field: string, value: any) => setTemplateForm(p => ({ ...p, steps: p.steps.map((s, idx) => idx === i ? { ...s, [field]: value } : s) }));

  const filtered = onboardings.filter(o => filter === 'all' || o.status === filter);

  return (
    <HRLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Onboarding Pipeline</h1>
            <p className="text-muted-foreground mt-1">Manage new hire onboarding from offer to completion</p>
          </div>
          <Button onClick={() => setSendOfferOpen(true)}><Plus className="w-4 h-4 mr-2" /> Send Offer</Button>
        </div>

        <Tabs defaultValue="pipeline">
          <TabsList>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="space-y-4 mt-4">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="offer_pending">Offer Pending</SelectItem>
                <SelectItem value="offer_accepted">Offer Accepted</SelectItem>
                <SelectItem value="contract_signed">Contract Signed</SelectItem>
                <SelectItem value="banking_pending">Banking Pending</SelectItem>
                <SelectItem value="provisioning">Provisioning</SelectItem>
                <SelectItem value="training">Training</SelectItem>
                <SelectItem value="live_training">Live Training</SelectItem>
                <SelectItem value="activation_in_progress">Activation In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            {isLoading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <Card><CardContent className="p-12 text-center text-muted-foreground">No onboarding records found.</CardContent></Card>
            ) : (
              <div className="space-y-4">
                {filtered.map(ob => {
                  const step = statusToStep[ob.status] ?? 0;
                  const steps = ['Offer Sent', 'Accepted', 'Contract Signed', 'Banking', 'Provisioning', 'Training', 'Live Training', 'Activation', 'Complete'];
                  const progress = ((step + 1) / steps.length) * 100;
                  return (
                    <Card key={ob.id}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <p className="font-medium">{ob.profiles?.full_name || 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground">Started {format(new Date(ob.created_at), 'MMM d, yyyy')}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={ob.status === 'completed' ? 'default' : 'secondary'} className="capitalize">
                              {ob.status?.replace(/_/g, ' ')}
                            </Badge>
                            {ob.hr_approved_by && <Badge variant="outline" className="text-green-700 border-green-300"><CheckCircle className="w-3 h-3 mr-1" /> HR Approved</Badge>}
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>{steps[step]}</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          {ob.pay_rate && <span>Pay: ${Number(ob.pay_rate).toFixed(2)}/{ob.pay_type === 'hourly' ? 'hr' : 'min'}</span>}
                          {ob.schedule_type && <span className="capitalize">Schedule: {ob.schedule_type?.replace('_', ' ')}</span>}
                          {ob.banking_submitted && <span className="text-primary">Banking ✓</span>}
                        </div>
                        {ob.status === 'live_training' && !ob.hr_approved_by && (
                          <Button size="sm" onClick={() => handleHRApproval(ob.id)}>
                            <CheckCircle className="w-4 h-4 mr-2" /> HR Final Sign-off
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Define reusable onboarding step sequences</p>
              <Button size="sm" onClick={() => { setEditingTemplate(null); setTemplateForm({ name: '', description: '', steps: [{ label: '', who: 'HR', required: true }] }); setTemplateDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" /> New Template
              </Button>
            </div>
            {templates.map(t => (
              <Card key={t.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{t.name}</p>
                      {t.is_default && <Badge variant="outline">Default</Badge>}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEditTemplate(t)}>Edit</Button>
                      {!t.is_default && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteTemplate(t.id)}><Trash2 className="w-4 h-4" /></Button>}
                    </div>
                  </div>
                  {t.description && <p className="text-sm text-muted-foreground mb-2">{t.description}</p>}
                  <div className="flex flex-wrap gap-1">
                    {((t.steps as any[]) || []).map((s: any, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">{i + 1}. {s.label} ({s.who})</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      <SendOfferDialog open={sendOfferOpen} onOpenChange={setSendOfferOpen} onSuccess={() => { setSendOfferOpen(false); fetchData(); }} />

      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input value={templateForm.name} onChange={e => setTemplateForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Standard Onboarding" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={templateForm.description} onChange={e => setTemplateForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Steps</Label>
              {templateForm.steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <Input className="flex-1" value={step.label} onChange={e => updateStep(i, 'label', e.target.value)} placeholder={`Step ${i + 1}`} />
                  <Select value={step.who} onValueChange={v => updateStep(i, 'who', v)}>
                    <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HR">HR</SelectItem>
                      <SelectItem value="Supervisor">Supervisor</SelectItem>
                      <SelectItem value="Agent">Agent</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1">
                    <Checkbox checked={step.required} onCheckedChange={v => updateStep(i, 'required', v)} />
                    <span className="text-xs">Req</span>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removeStep(i)} className="shrink-0"><Trash2 className="w-3 h-3" /></Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={addStep}><Plus className="w-4 h-4 mr-2" /> Add Step</Button>
            </div>
            <Button className="w-full" onClick={handleSaveTemplate}>{editingTemplate ? 'Update Template' : 'Create Template'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </HRLayout>
  );
}
