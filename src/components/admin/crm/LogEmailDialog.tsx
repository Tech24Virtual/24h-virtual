import { useState, useEffect } from 'react';
import { Mail, Send, Inbox } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { addHours, format } from 'date-fns';

interface LogEmailDialogProps {
  leadId: string;
  leadEmail?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function LogEmailDialog({
  leadId,
  leadEmail,
  open,
  onOpenChange,
  onSuccess,
}: LogEmailDialogProps) {
  const [subject, setSubject] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [direction, setDirection] = useState<'sent' | 'received'>('sent');
  const [followUpAt, setFollowUpAt] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Auto-populate defaults when dialog opens or direction changes
  useEffect(() => {
    if (open) {
      setSubject('');
      setContactEmail(leadEmail || '');
      setDirection('sent');
      setNotes('');
      updateDeadline('sent');
    }
  }, [open, leadEmail]);

  const updateDeadline = (dir: 'sent' | 'received') => {
    const hours = dir === 'received' ? 24 : 48;
    const deadline = addHours(new Date(), hours);
    setFollowUpAt(format(deadline, "yyyy-MM-dd'T'HH:mm"));
  };

  const handleDirectionChange = (value: string) => {
    const dir = value as 'sent' | 'received';
    setDirection(dir);
    updateDeadline(dir);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !contactEmail.trim() || !followUpAt) {
      toast({
        title: 'Missing fields',
        description: 'Subject, contact email, and follow-up deadline are required.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();

    // Insert email follow-up
    const { error: followupError } = await supabase
      .from('email_followups' as any)
      .insert([{
        lead_id: leadId,
        subject: subject.trim(),
        contact_email: contactEmail.trim(),
        direction,
        follow_up_at: new Date(followUpAt).toISOString(),
        notes: notes.trim() || null,
        created_by: user?.id || null,
      }]);

    if (followupError) {
      toast({
        title: 'Error logging email',
        description: followupError.message,
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    // Also log a CRM activity
    await supabase.from('crm_activities').insert([{
      lead_id: leadId,
      activity_type: 'email',
      title: `Email ${direction}: ${subject.trim()}`,
      description: notes.trim() || null,
      created_by: user?.id || null,
      metadata: JSON.parse(JSON.stringify({ contact_email: contactEmail.trim(), direction })),
    }]);

    toast({
      title: 'Email logged',
      description: 'Follow-up has been scheduled.',
    });
    onSuccess();
    onOpenChange(false);
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Log Email Follow-up
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-subject">Subject</Label>
            <Input
              id="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Proposal for virtual receptionist"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-email">Contact Email</Label>
            <Input
              id="contact-email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="contact@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Direction</Label>
            <RadioGroup value={direction} onValueChange={handleDirectionChange} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sent" id="dir-sent" />
                <Label htmlFor="dir-sent" className="flex items-center gap-1 cursor-pointer">
                  <Send className="h-3.5 w-3.5" /> Sent
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="received" id="dir-received" />
                <Label htmlFor="dir-received" className="flex items-center gap-1 cursor-pointer">
                  <Inbox className="h-3.5 w-3.5" /> Received
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="follow-up-at">
              Follow-up Deadline
              <span className="text-xs text-muted-foreground ml-2">
                ({direction === 'received' ? '24h' : '48h'} default)
              </span>
            </Label>
            <Input
              id="follow-up-at"
              type="datetime-local"
              value={followUpAt}
              onChange={(e) => setFollowUpAt(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-notes">Notes (optional)</Label>
            <Textarea
              id="email-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any relevant context..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Log Email'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
