import { useState } from 'react';
import { Send, Bug, HelpCircle, Lightbulb, MessageSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFeedbackContext } from './useFeedbackContext';

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FeedbackType = 'bug' | 'help' | 'idea' | 'feedback';

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const ctx = useFeedbackContext();
  const { toast } = useToast();

  const [type, setType] = useState<FeedbackType>('feedback');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [intent, setIntent] = useState<'product' | 'support'>('product');
  const [submitting, setSubmitting] = useState(false);

  // Brand-aware copy
  const isWLEndClient = ctx.surface === 'wl_end_client';
  const partnerName = ctx.partnerCompanyName ?? 'your provider';
  const showPartnerIntent = ctx.surface === 'wl_partner';

  const destinationLabel =
    isWLEndClient ? `Send to ${partnerName}`
    : showPartnerIntent ? (intent === 'product' ? 'Send product feedback to platform' : 'Add to my queue')
    : 'Submit feedback';

  const headerTitle =
    isWLEndClient ? `Contact ${partnerName}`
    : showPartnerIntent ? 'Send feedback'
    : 'Send feedback';

  const handleSubmit = async () => {
    if (!description.trim()) return;
    setSubmitting(true);
    try {
      const metadata = {
        page_title: typeof document !== 'undefined' ? document.title : null,
        viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        surface: ctx.surface,
      };
      const { data, error } = await supabase.functions.invoke('submit-feedback', {
        body: {
          type,
          title: title.trim() || null,
          description: description.trim(),
          intent: showPartnerIntent ? intent : undefined,
          portal_slug: ctx.portalSlug,
          page: ctx.page,
          metadata,
        },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message || 'Failed');

      toast({
        title: 'Thanks!',
        description: isWLEndClient
          ? `Your message was sent to ${partnerName}.`
          : 'Your feedback was submitted.',
      });
      setTitle(''); setDescription(''); setType('feedback'); setIntent('product');
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Could not submit', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{headerTitle}</DialogTitle>
          <DialogDescription>
            {isWLEndClient
              ? `Bugs, requests, ideas — ${partnerName} will receive this directly.`
              : 'Help us improve. Bug reports, ideas, and general feedback all welcome.'}
          </DialogDescription>
        </DialogHeader>

        {showPartnerIntent && (
          <div className="space-y-2">
            <Label className="text-sm">Where should this go?</Label>
            <RadioGroup value={intent} onValueChange={(v) => setIntent(v as any)} className="space-y-2">
              <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="product" id="intent-product" className="mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Product feedback to the platform</div>
                  <div className="text-xs text-muted-foreground">Bugs or improvement ideas about your partner dashboard.</div>
                </div>
              </label>
              <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="support" id="intent-support" className="mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Log a support item in my queue</div>
                  <div className="text-xs text-muted-foreground">Track an internal note or item raised by one of your clients.</div>
                </div>
              </label>
            </RadioGroup>
          </div>
        )}

        <Tabs value={type} onValueChange={(v) => setType(v as FeedbackType)}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="bug" className="gap-1.5"><Bug className="h-3.5 w-3.5" />Bug</TabsTrigger>
            <TabsTrigger value="help" className="gap-1.5"><HelpCircle className="h-3.5 w-3.5" />Help</TabsTrigger>
            <TabsTrigger value="idea" className="gap-1.5"><Lightbulb className="h-3.5 w-3.5" />Idea</TabsTrigger>
            <TabsTrigger value="feedback" className="gap-1.5"><MessageSquare className="h-3.5 w-3.5" />Other</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-2">
          <Label htmlFor="fb-title" className="text-sm">Title <span className="text-muted-foreground">(optional)</span></Label>
          <Input id="fb-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short summary" maxLength={200} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fb-desc" className="text-sm">Details</Label>
          <Textarea id="fb-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Tell us what happened or what you'd like to see" maxLength={8000} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!description.trim() || submitting}>
            <Send className="h-4 w-4 mr-2" />
            {submitting ? 'Sending…' : destinationLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
