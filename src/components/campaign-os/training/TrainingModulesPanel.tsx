import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, GraduationCap, ChevronDown, ChevronRight, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import {
  useCampaignTrainingModules,
  useUpsertTrainingModule,
  useDeleteTrainingModule,
  type CampaignTrainingModule,
} from '@/hooks/campaign-os/useCampaignTrainingModules';
import { TrainingCoverageCard } from './TrainingCoverageCard';
import { ModuleLessonsList } from './ModuleLessonsList';

interface Props {
  campaignId: string;
}

interface ModuleForm {
  id?: string;
  title: string;
  summary: string;
  body_md: string;
  required: boolean;
  sort_order: number;
  status: 'draft' | 'published' | 'archived';
}

const EMPTY: ModuleForm = {
  title: '',
  summary: '',
  body_md: '',
  required: true,
  sort_order: 100,
  status: 'draft',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'secondary',
  published: 'default',
  archived: 'destructive',
};

export function TrainingModulesPanel({ campaignId }: Props) {
  const modulesQ = useCampaignTrainingModules(campaignId);
  const upsert = useUpsertTrainingModule();
  const del = useDeleteTrainingModule();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ModuleForm>(EMPTY);

  const openCreate = () => {
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (m: CampaignTrainingModule) => {
    setForm({
      id: m.id,
      title: m.title,
      summary: m.summary ?? '',
      body_md: m.body_md,
      required: m.required,
      sort_order: m.sort_order,
      status: m.status,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error('Title is required');
    try {
      await upsert.mutateAsync({
        id: form.id,
        campaign_id: campaignId,
        title: form.title.trim(),
        summary: form.summary.trim() || null,
        body_md: form.body_md,
        required: form.required,
        sort_order: Number(form.sort_order) || 100,
        status: form.status,
      });
      toast.success(form.id ? 'Module updated' : 'Module created');
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async (m: CampaignTrainingModule) => {
    if (!confirm(`Delete "${m.title}"? Completions and signoffs will also be removed.`)) return;
    try {
      await del.mutateAsync({ id: m.id, campaign_id: campaignId });
      toast.success('Module deleted');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <TrainingCoverageCard campaignId={campaignId} />

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Modules</h3>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          New module
        </Button>
      </div>

      {modulesQ.isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (modulesQ.data?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No training modules yet. Create one to require agents to read and sign off before going live.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {modulesQ.data?.map((m) => (
            <ModuleRow
              key={m.id}
              module={m}
              campaignId={campaignId}
              onEdit={openEdit}
              onDelete={remove}
            />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit module' : 'New training module'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Summary</Label>
              <Input value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="One-line description shown in lists" />
            </div>
            <div>
              <Label>Content (markdown)</Label>
              <Textarea
                rows={10}
                value={form.body_md}
                onChange={(e) => setForm({ ...form, body_md: e.target.value })}
                placeholder="# Section&#10;Explain the policy, script, or workflow agents must follow."
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <Label>Status</Label>
                <select
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as ModuleForm['status'] })}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <Label>Sort order</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-end gap-2">
                <Switch checked={form.required} onCheckedChange={(v) => setForm({ ...form, required: v })} />
                <Label className="mb-2">Required for go-live</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={upsert.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface RowProps {
  module: CampaignTrainingModule;
  campaignId: string;
  onEdit: (m: CampaignTrainingModule) => void;
  onDelete: (m: CampaignTrainingModule) => void;
}

function ModuleRow({ module: m, campaignId, onEdit, onDelete }: RowProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card>
      <CardContent className="py-3 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-start gap-2 min-w-0 flex-1 text-left"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{m.title}</span>
                <Badge variant={STATUS_VARIANT[m.status] ?? 'outline'}>{m.status}</Badge>
                {m.required && <Badge variant="outline">Required</Badge>}
                <span className="text-xs text-muted-foreground">order {m.sort_order}</span>
                <Badge variant="outline" className="gap-1">
                  <ListChecks className="h-3 w-3" /> Lessons
                </Badge>
              </div>
              {m.summary && <div className="text-xs text-muted-foreground">{m.summary}</div>}
            </div>
          </button>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onEdit(m)}>
              <Pencil className="h-3.5 w-3.5 mr-1" />Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDelete(m)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {expanded && (
          <div className="border-t pt-3">
            <ModuleLessonsList moduleId={m.id} campaignId={campaignId} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
