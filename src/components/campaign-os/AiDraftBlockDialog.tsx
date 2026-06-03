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
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  contextMd?: string;
  onAccept: (draft: { title: string; body_md: string }) => void;
}

interface AiDraft {
  title: string;
  body_md: string;
  suggested_branches: Array<{ label: string; reason: string }>;
}

export function AiDraftBlockDialog({ open, onOpenChange, campaignId, contextMd, onAccept }: Props) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<AiDraft | null>(null);

  const generate = async () => {
    if (!prompt.trim()) return toast.error('Describe what to draft');
    setLoading(true);
    setDraft(null);
    try {
      const { data, error } = await supabase.functions.invoke('ai-draft-script-block', {
        body: { prompt: prompt.trim(), campaign_id: campaignId, context_md: contextMd },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setDraft(data as AiDraft);
    } catch (e: any) {
      toast.error(e.message ?? 'Draft failed');
    } finally {
      setLoading(false);
    }
  };

  const accept = () => {
    if (!draft) return;
    onAccept({ title: draft.title, body_md: draft.body_md });
    onOpenChange(false);
    setDraft(null);
    setPrompt('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Draft block with AI
          </DialogTitle>
          <DialogDescription>
            Admin only · 30 drafts per hour · Review and edit before saving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>What should this block cover?</Label>
            <Textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Draft a refund-policy block that handles customers asking for partial refunds…"
            />
          </div>
          <Button onClick={generate} disabled={loading}>
            {loading ? 'Drafting…' : 'Generate draft'}
          </Button>

          {draft && (
            <Card>
              <CardContent className="py-3 space-y-3">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Body (markdown)</Label>
                  <Textarea
                    rows={10}
                    value={draft.body_md}
                    onChange={(e) => setDraft({ ...draft, body_md: e.target.value })}
                  />
                </div>
                {draft.suggested_branches.length > 0 && (
                  <div>
                    <Label>Suggested branches</Label>
                    <ul className="text-xs space-y-1 mt-1">
                      {draft.suggested_branches.map((b, i) => (
                        <li key={i} className="text-muted-foreground">
                          <span className="font-medium text-foreground">{b.label}</span> — {b.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={accept} disabled={!draft}>
            Use draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
