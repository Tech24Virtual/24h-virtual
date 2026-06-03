import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useSaveCampaignAsTemplate } from '@/hooks/campaign-os/useCampaignTemplates';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  defaultName?: string;
}

export function SaveAsTemplateDialog({ open, onOpenChange, campaignId, defaultName }: Props) {
  const [name, setName] = useState(defaultName ?? '');
  const [description, setDescription] = useState('');
  const save = useSaveCampaignAsTemplate();

  const handleSave = async () => {
    if (!name.trim()) return toast.error('Template name required');
    try {
      await save.mutateAsync({
        campaign_id: campaignId,
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast.success('Saved as template');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save campaign as template</DialogTitle>
          <DialogDescription>
            Captures scenarios, script document, and training modules. Same-tenant only.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Template name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={save.isPending}>
            Save template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
