import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCampaigns, useEligibleDepartments } from '@/hooks/campaign-os/useCampaigns';
import { useCreateCampaign, useArchiveCampaign, useUpdateCampaign } from '@/hooks/campaign-os/useCampaignMutations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Archive, ExternalLink, Info, Layers, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { ClientDepartment, Campaign } from '@/lib/campaign-os/types';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'secondary',
  active: 'default',
  paused: 'outline',
  archived: 'destructive',
};

export default function CampaignOsCampaigns() {
  const navigate = useNavigate();
  const campaigns = useCampaigns();
  const eligible = useEligibleDepartments();
  const create = useCreateCampaign();
  const archive = useArchiveCampaign();
  const update = useUpdateCampaign();

  const [createOpen, setCreateOpen] = useState(false);
  const [createDept, setCreateDept] = useState<ClientDepartment | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [notes, setNotes] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Campaign | null>(null);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState<'draft' | 'active' | 'paused' | 'archived'>('draft');

  const [archiveTarget, setArchiveTarget] = useState<Campaign | null>(null);

  const openCreate = (dept: ClientDepartment) => {
    setCreateDept(dept);
    setDisplayName(`${dept.department_name} Campaign`);
    setNotes('');
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!createDept || !displayName.trim()) return toast.error('Display name required');
    try {
      const res = await create.mutateAsync({
        client_department_id: createDept.id,
        display_name: displayName.trim(),
        notes: notes.trim() || undefined,
      });
      toast.success('Campaign created');
      setCreateOpen(false);
      navigate(`/admin/campaign-os/campaigns/${res.id}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const openEdit = (c: Campaign) => {
    setEditTarget(c);
    setEditName(c.display_name);
    setEditStatus(c.status);
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    try {
      await update.mutateAsync({
        id: editTarget.id,
        display_name: editName.trim() || editTarget.display_name,
        status: editStatus,
      });
      toast.success('Campaign updated');
      setEditOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    try {
      await archive.mutateAsync(archiveTarget.id);
      toast.success('Campaign archived');
      setArchiveTarget(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>Active Campaigns</CardTitle>
              <CardDescription>One campaign per call flow. Open a campaign to manage its scenarios, FAQs, policies, fields, and Build Packet.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate('/admin/campaign-os/templates')}>
                <Layers className="h-3.5 w-3.5 mr-1" />
                Templates
              </Button>
              <Badge variant="outline">{campaigns.data?.length ?? 0} total</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {campaigns.isLoading && (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between rounded-md border p-3 gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <Skeleton className="h-4 w-48 mb-1" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-5 w-14" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              ))}
            </>
          )}
          {campaigns.error && (
            <div className="text-center py-6 text-destructive/80">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2 opacity-60" />
              <p className="text-sm font-medium">Failed to load campaigns</p>
              <p className="text-xs text-muted-foreground mt-1">Check GRANT SELECT on public.campaigns</p>
            </div>
          )}
          {!campaigns.isLoading && !campaigns.error && (campaigns.data?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">No campaigns yet. Each call flow gets exactly one campaign — create one from an eligible call flow below, or add a new call flow from a client.</p>
          )}
          {campaigns.data?.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card p-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <div className="font-medium truncate">{c.display_name}</div>
                  <div className="text-xs text-muted-foreground">
                    Updated {new Date(c.updated_at).toLocaleDateString()}
                  </div>
                </div>
                <Badge variant={STATUS_VARIANT[c.status] ?? 'outline'}>{c.status}</Badge>
                <Badge variant="outline">{c.tenant_kind}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(c)}>Edit</Button>
                {c.status !== 'archived' && (
                  <Button size="sm" variant="ghost" onClick={() => setArchiveTarget(c)}>
                    <Archive className="h-3.5 w-3.5 mr-1" />Archive
                  </Button>
                )}
                <Button size="sm" onClick={() => navigate(`/admin/campaign-os/campaigns/${c.id}`)}>
                  Open <ExternalLink className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Call Flows without a Campaign</CardTitle>
          <CardDescription className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Each call flow gets exactly one campaign. Only call flows at lifecycle <strong>Approved for Go-Live</strong> or <strong>Live</strong> without an existing campaign appear here. Move a call flow to one of those lifecycles from its detail page to make it eligible.</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {eligible.isLoading && (
            <>
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between rounded-md border p-3 gap-3">
                  <div>
                    <Skeleton className="h-4 w-40 mb-1" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-8 w-44" />
                </div>
              ))}
            </>
          )}
          {!eligible.isLoading && (eligible.data?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">No eligible call flows. Either every eligible call flow already has a campaign, or no call flows are at the required lifecycle yet.</p>
          )}
          {eligible.data?.map((d) => (
            <div
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card p-3"
            >
              <div>
                <div className="font-medium">{d.department_name}</div>
                <div className="text-xs text-muted-foreground">
                  {d.department_type} · lifecycle: {d.lifecycle}
                </div>
              </div>
              <Button size="sm" onClick={() => openCreate(d)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Create campaign from call flow
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Source call flow</Label>
              <div className="text-sm font-medium">{createDept?.department_name}</div>
            </div>
            <div>
              <Label>Display name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={create.isPending}>
              {create.isPending ? 'Creating…' : 'Create campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Display name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <Label>Status</Label>
              <select
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as any)}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={update.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!archiveTarget} onOpenChange={(o) => { if (!o) setArchiveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This will hide <strong>{archiveTarget?.display_name}</strong> from agents and clients. You can restore it later by editing the campaign status.
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
