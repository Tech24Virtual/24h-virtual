import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDepartments } from '@/hooks/campaign-os/useDepartments';
import {
  useUpsertField,
  useArchiveField,
} from '@/hooks/campaign-os/useCampaignMutations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Archive, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { CampaignFieldType, CampaignScope } from '@/lib/campaign-os/types';

const FIELD_TYPES: CampaignFieldType[] = [
  'text', 'long_text', 'number', 'boolean', 'dropdown', 'multi_select',
  'date', 'datetime', 'phone', 'email', 'currency', 'rich_text', 'hidden',
];

type FieldFormState = {
  id?: string;
  field_group_id: string | null;
  field_key: string;
  display_label: string;
  field_type: CampaignFieldType;
  is_required: boolean;
  sort_order: number;
  status: 'draft' | 'approved';
};

const EMPTY_FORM: FieldFormState = {
  field_group_id: null,
  field_key: '',
  display_label: '',
  field_type: 'text',
  is_required: false,
  sort_order: 0,
  status: 'draft',
};

export default function CampaignOsFields() {
  const { data: departments = [] } = useDepartments();
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const upsert = useUpsertField();
  const archive = useArchiveField();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FieldFormState>(EMPTY_FORM);

  const [archiveTarget, setArchiveTarget] = useState<{ id: string; display_label: string } | null>(null);

  const { data: groups = [], isLoading: loadingGroups, error: groupsError } = useQuery({
    queryKey: ['campaign-os', 'field-groups', departmentId],
    enabled: !!departmentId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('campaign_field_groups')
        .select('*')
        .eq('client_department_id', departmentId)
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: fields = [], isLoading: loadingFields, error: fieldsError } = useQuery({
    queryKey: ['campaign-os', 'fields-list', departmentId],
    enabled: !!departmentId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('campaign_fields')
        .select('*')
        .eq('client_department_id', departmentId)
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
  });

  const openCreate = (groupId: string | null) => {
    setForm({ ...EMPTY_FORM, field_group_id: groupId });
    setOpen(true);
  };

  const openEdit = (f: any) => {
    setForm({
      id: f.id,
      field_group_id: f.field_group_id,
      field_key: f.field_key,
      display_label: f.display_label,
      field_type: f.field_type,
      is_required: !!f.is_required,
      sort_order: f.sort_order ?? 0,
      status: f.status === 'approved' ? 'approved' : 'draft',
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!departmentId) return toast.error('Pick a call flow first');
    if (!form.field_key.trim() || !form.display_label.trim()) {
      return toast.error('Field key and display label required');
    }
    try {
      await upsert.mutateAsync({
        id: form.id,
        scope: 'department' as CampaignScope,
        client_department_id: departmentId,
        field_group_id: form.field_group_id,
        field_key: form.field_key,
        display_label: form.display_label,
        field_type: form.field_type,
        is_required: form.is_required,
        sort_order: form.sort_order,
        status: form.status,
      });
      toast.success(form.id ? 'Field updated' : 'Field created');
      setOpen(false);
      setForm(EMPTY_FORM);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to save field');
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    try {
      await archive.mutateAsync(archiveTarget.id);
      toast.success('Field archived');
      setArchiveTarget(null);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to archive field');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Label className="whitespace-nowrap">Call Flow</Label>
          <Select value={departmentId ?? ''} onValueChange={(v) => setDepartmentId(v || null)}>
            <SelectTrigger className="w-[280px]"><SelectValue placeholder="Select a call flow" /></SelectTrigger>
            <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.department_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {departmentId && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openCreate(null)}><Plus className="h-4 w-4 mr-2" />New Field</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{form.id ? 'Edit Field' : 'Create Field'}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Field Key</Label>
                    <Input
                      value={form.field_key}
                      onChange={(e) => setForm({ ...form, field_key: e.target.value })}
                      placeholder="e.g. caller_name"
                      disabled={!!form.id}
                    />
                  </div>
                  <div>
                    <Label>Display Label</Label>
                    <Input
                      value={form.display_label}
                      onChange={(e) => setForm({ ...form, display_label: e.target.value })}
                      placeholder="e.g. Caller name"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Field Type</Label>
                    <Select value={form.field_type} onValueChange={(v) => setForm({ ...form, field_type: v as CampaignFieldType })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{FIELD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Field Group</Label>
                    <Select
                      value={form.field_group_id ?? '__none__'}
                      onValueChange={(v) => setForm({ ...form, field_group_id: v === '__none__' ? null : v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— No group —</SelectItem>
                        {groups.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 items-end">
                  <div>
                    <Label>Sort Order</Label>
                    <Input
                      type="number"
                      value={form.sort_order}
                      onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value, 10) || 0 })}
                    />
                  </div>
                  <div className="flex items-center gap-2 pb-2">
                    <Switch
                      id="required"
                      checked={form.is_required}
                      onCheckedChange={(v) => setForm({ ...form, is_required: v })}
                    />
                    <Label htmlFor="required">Required</Label>
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={upsert.isPending}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!departmentId ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Select a call flow to view its field groups and fields.</CardContent></Card>
      ) : (groupsError || fieldsError) ? (
        <Card>
          <CardContent className="py-8 text-center text-destructive/80">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2 opacity-60" />
            <p className="text-sm font-medium">Failed to load fields</p>
            <p className="text-xs text-muted-foreground mt-1">
              Run: <code className="font-mono">GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_fields TO authenticated</code>
            </p>
          </CardContent>
        </Card>
      ) : (loadingGroups || loadingFields) ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g: any) => (
            <Card key={g.id}>
              <CardHeader>
                <CardTitle className="text-base">{g.name}</CardTitle>
                {g.description && <p className="text-sm text-muted-foreground">{g.description}</p>}
              </CardHeader>
              <CardContent className="space-y-2">
                {fields.filter((f: any) => f.field_group_id === g.id).map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between rounded-md border p-3 gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-medium">{f.display_label}</p>
                      <p className="text-xs text-muted-foreground">{f.field_key}</p>
                    </div>
                    <div className="flex gap-2 items-center flex-wrap">
                      <Badge variant="outline">{f.field_type}</Badge>
                      {f.is_required && <Badge variant="secondary">required</Badge>}
                      <Badge variant="outline">{f.status}</Badge>
                      <Button size="sm" variant="outline" onClick={() => openEdit(f)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      {f.status !== 'archived' && (
                        <Button size="sm" variant="ghost" onClick={() => setArchiveTarget({ id: f.id, display_label: f.display_label })}>
                          <Archive className="h-3.5 w-3.5 mr-1" /> Archive
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {fields.filter((f: any) => f.field_group_id === g.id).length === 0 && (
                  <p className="text-xs text-muted-foreground">No fields in this group.</p>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Ungrouped fields */}
          {fields.filter((f: any) => !f.field_group_id).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ungrouped fields</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {fields.filter((f: any) => !f.field_group_id).map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between rounded-md border p-3 gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-medium">{f.display_label}</p>
                      <p className="text-xs text-muted-foreground">{f.field_key}</p>
                    </div>
                    <div className="flex gap-2 items-center flex-wrap">
                      <Badge variant="outline">{f.field_type}</Badge>
                      {f.is_required && <Badge variant="secondary">required</Badge>}
                      <Badge variant="outline">{f.status}</Badge>
                      <Button size="sm" variant="outline" onClick={() => openEdit(f)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      {f.status !== 'archived' && (
                        <Button size="sm" variant="ghost" onClick={() => setArchiveTarget({ id: f.id, display_label: f.display_label })}>
                          <Archive className="h-3.5 w-3.5 mr-1" /> Archive
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {groups.length === 0 && fields.length === 0 && (
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No field groups for this call flow.</CardContent></Card>
          )}
        </div>
      )}

      <AlertDialog open={!!archiveTarget} onOpenChange={(o) => { if (!o) setArchiveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive field?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{archiveTarget?.display_label}</strong> will stop appearing in the resolver. You can restore it by editing the field status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} disabled={archive.isPending}>
              {archive.isPending ? 'Archiving…' : 'Archive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
