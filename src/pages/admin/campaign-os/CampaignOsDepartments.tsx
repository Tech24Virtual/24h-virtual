import { useState } from 'react';
import { useDepartments } from '@/hooks/campaign-os/useDepartments';
import {
  useUpsertDepartment,
  useArchiveDepartment,
} from '@/hooks/campaign-os/useCampaignMutations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Building2, Pencil, Archive, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { DepartmentTypeEnum } from '@/lib/campaign-os/types';

const TYPES: DepartmentTypeEnum[] = ['sales', 'billing', 'customer_service', 'new_claim', 'other_requests', 'dealership', 'general_inquiry', 'custom'];

type DeptFormState = {
  id?: string;
  department_name: string;
  department_type: DepartmentTypeEnum;
  service_type: string;
  notes: string;
};

const EMPTY_FORM: DeptFormState = {
  department_name: '',
  department_type: 'sales',
  service_type: '',
  notes: '',
};

export default function CampaignOsDepartments() {
  const { data: departments = [], isLoading, isError } = useDepartments();
  const upsert = useUpsertDepartment();
  const archive = useArchiveDepartment();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DeptFormState>(EMPTY_FORM);
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (d: any) => {
    setForm({
      id: d.id,
      department_name: d.department_name,
      department_type: d.department_type,
      service_type: d.service_type ?? '',
      notes: d.notes ?? '',
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.department_name.trim()) {
      toast.error('Department name required');
      return;
    }
    try {
      await upsert.mutateAsync({
        id: form.id,
        department_name: form.department_name,
        department_type: form.department_type,
        service_type: form.service_type || null,
        notes: form.notes || null,
      });
      toast.success(form.id ? 'Department updated' : 'Department created — defaults seeded automatically');
      setOpen(false);
      setForm(EMPTY_FORM);
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to save department');
    }
  };

  const doArchive = async () => {
    if (!archiveTarget) return;
    try {
      await archive.mutateAsync(archiveTarget);
      toast.success('Department archived');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to archive department');
    } finally {
      setArchiveTarget(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Departments</h2>
          <p className="text-sm text-muted-foreground">New departments auto-seed fields, FAQs, and Five9 mappings from the type defaults catalog.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />New Department</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? 'Edit Department' : 'Create Department'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Department Name</Label>
                <Input value={form.department_name} onChange={(e) => setForm({ ...form, department_name: e.target.value })} placeholder="e.g. West Coast Sales" />
              </div>
              <div>
                <Label>Department Type</Label>
                <Select value={form.department_type} onValueChange={(v) => setForm({ ...form, department_type: v as DepartmentTypeEnum })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Service Type (optional)</Label>
                <Input value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })} />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={upsert.isPending}>
                {upsert.isPending ? 'Saving…' : form.id ? 'Save changes' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : isError ? (
        <Card className="border-destructive/50">
          <CardContent className="py-12 text-center space-y-2">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
            <p className="text-sm font-medium text-destructive">Failed to load departments</p>
            <p className="text-xs text-muted-foreground">Check your connection or contact support if this persists.</p>
          </CardContent>
        </Card>
      ) : departments.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground"><Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />No departments yet.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {departments.map((d) => (
            <Card key={d.id}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{d.department_name}</CardTitle>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <Badge variant="secondary">{d.department_type}</Badge>
                    <Badge variant="outline">{d.lifecycle}</Badge>
                    <Badge variant="outline">{d.tenant_kind}</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(d)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  {d.lifecycle !== 'archived' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setArchiveTarget(d.id)}
                      disabled={archive.isPending && archiveTarget === d.id}
                    >
                      <Archive className="h-3.5 w-3.5 mr-1" /> Archive
                    </Button>
                  )}
                </div>
              </CardHeader>
              {d.notes && <CardContent className="pt-0 text-sm text-muted-foreground">{d.notes}</CardContent>}
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!archiveTarget} onOpenChange={(o) => { if (!o) setArchiveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this department?</AlertDialogTitle>
            <AlertDialogDescription>
              The department's lifecycle will be set to <strong>archived</strong>. It will no longer appear in active lists but its data is preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doArchive} disabled={archive.isPending}>
              {archive.isPending ? 'Archiving…' : 'Archive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
