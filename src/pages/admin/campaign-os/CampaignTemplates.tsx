import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Layers, Copy, Plus, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useCampaignTemplates, useCloneTemplate } from '@/hooks/campaign-os/useCampaignTemplates';
import { useEligibleDepartments } from '@/hooks/campaign-os/useCampaigns';
import type { ClientDepartment } from '@/lib/campaign-os/types';

export default function CampaignTemplates() {
  const navigate = useNavigate();
  const templatesQ = useCampaignTemplates();
  const eligible = useEligibleDepartments();
  const clone = useCloneTemplate();

  const [cloneOpen, setCloneOpen] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [targetDept, setTargetDept] = useState<string>('');
  const [newName, setNewName] = useState('');

  const openClone = (templateId: string, defaultName: string) => {
    setActiveTemplateId(templateId);
    setTargetDept('');
    setNewName(`${defaultName} (copy)`);
    setCloneOpen(true);
  };

  const handleClone = async () => {
    if (!activeTemplateId || !targetDept || !newName.trim()) {
      return toast.error('Department and name required');
    }
    try {
      const newId = await clone.mutateAsync({
        template_id: activeTemplateId,
        target_department_id: targetDept,
        new_campaign_name: newName.trim(),
      });
      toast.success('Campaign created from template');
      setCloneOpen(false);
      if (newId) navigate(`/admin/campaign-os/campaigns/${newId}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Campaign templates</h2>
        <p className="text-sm text-muted-foreground">
          Save a campaign as a template, then clone it into another department within the same
          tenant.
        </p>
      </div>

      {templatesQ.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}
        </div>
      ) : templatesQ.isError ? (
        <Card className="border-destructive/50">
          <CardContent className="py-12 text-center space-y-2">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
            <p className="text-sm font-medium text-destructive">Failed to load campaign templates</p>
            <p className="text-xs text-muted-foreground">Check your connection or contact support if this persists.</p>
          </CardContent>
        </Card>
      ) : (templatesQ.data?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No templates yet. Save a campaign as a template from its detail page.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templatesQ.data!.map((t) => (
            <Card key={t.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  {t.name}
                </CardTitle>
                {t.description && (
                  <CardDescription>{t.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">{t.tenant_kind}</Badge>
                  <span className="text-muted-foreground">
                    {new Date(t.created_at).toLocaleDateString()}
                  </span>
                </div>
                <Button size="sm" onClick={() => openClone(t.id, t.name)}>
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Clone
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={cloneOpen} onOpenChange={setCloneOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone template into department</DialogTitle>
            <DialogDescription>
              Creates a new campaign in the chosen department with the template's scenarios,
              script, and training modules.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Target department</Label>
              <select
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                value={targetDept}
                onChange={(e) => setTargetDept(e.target.value)}
              >
                <option value="">Select department…</option>
                {(eligible.data ?? []).map((d: ClientDepartment) => (
                  <option key={d.id} value={d.id}>
                    {d.department_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>New campaign name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Plus className="h-3 w-3" /> A new campaign will be created in draft status.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleClone} disabled={clone.isPending}>
              {clone.isPending ? 'Cloning…' : 'Clone'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
