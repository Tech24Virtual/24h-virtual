import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Script } from '@/pages/client-dashboard/Scripts';

const REQUEST_TYPES = [
  { value: 'greeting_change', label: 'Change Greeting' },
  { value: 'faq_update', label: 'Edit Existing FAQ' },
  { value: 'new_faq', label: 'Add New FAQ' },
  { value: 'remove_faq', label: 'Remove FAQ' },
  { value: 'call_rules', label: 'Call Handling Rules' },
  { value: 'full_script', label: 'Full Script Update' },
  { value: 'other', label: 'Other' },
];

interface ScriptChangeRequestDialogProps {
  open: boolean;
  onClose: (saved: boolean) => void;
  script: Script | null;
}

export function ScriptChangeRequestDialog({ open, onClose, script }: ScriptChangeRequestDialogProps) {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [requestType, setRequestType] = useState('other');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [proposedGreeting, setProposedGreeting] = useState('');
  const [proposedFaqQuestion, setProposedFaqQuestion] = useState('');
  const [proposedFaqAnswer, setProposedFaqAnswer] = useState('');

  const resetForm = () => {
    setRequestType('other');
    setTitle('');
    setDescription('');
    setProposedGreeting('');
    setProposedFaqQuestion('');
    setProposedFaqAnswer('');
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!title.trim()) {
      toast.error('Please enter a title for your request');
      return;
    }

    setIsSaving(true);
    try {
      const proposedChanges: Record<string, unknown> = {};

      if (requestType === 'greeting_change') {
        proposedChanges.greeting = proposedGreeting;
        proposedChanges.current_greeting = script?.greeting || '';
      } else if (requestType === 'new_faq' || requestType === 'faq_update') {
        proposedChanges.faq = { question: proposedFaqQuestion, answer: proposedFaqAnswer };
      } else if (requestType === 'full_script') {
        if (proposedGreeting) proposedChanges.greeting = proposedGreeting;
        if (proposedFaqQuestion) {
          proposedChanges.faq = { question: proposedFaqQuestion, answer: proposedFaqAnswer };
        }
      }

      const { error } = await supabase.from('script_change_requests').insert([{
        client_id: user.id,
        script_id: script?.id || null,
        request_type: requestType,
        title: title.trim(),
        description: description.trim() || null,
        proposed_changes: proposedChanges as unknown as import('@/integrations/supabase/types').Json,
        source: 'portal',
      }]);

      if (error) throw error;

      toast.success('Change request submitted! Your supervisor will review it shortly.');
      resetForm();
      onClose(true);
    } catch (error) {
      console.error('Error submitting change request:', error);
      toast.error('Failed to submit change request');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { resetForm(); onClose(false); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Script Change</DialogTitle>
          {script && (
            <p className="text-sm text-muted-foreground">For: {script.name}</p>
          )}
        </DialogHeader>

        <div className="space-y-5 py-4">
          <div className="space-y-2">
            <Label>What do you want to change? *</Label>
            <Select value={requestType} onValueChange={setRequestType}>
              <SelectTrigger>
                <SelectValue placeholder="Select change type" />
              </SelectTrigger>
              <SelectContent>
                {REQUEST_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Update greeting for holiday hours"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what you'd like changed and why..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Contextual fields based on request type */}
          {(requestType === 'greeting_change' || requestType === 'full_script') && (
            <div className="space-y-2">
              {script?.greeting && (
                <div className="p-3 rounded-lg bg-muted text-sm">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Current Greeting:</p>
                  <p>{script.greeting}</p>
                </div>
              )}
              <Label htmlFor="proposed-greeting">New Greeting</Label>
              <Textarea
                id="proposed-greeting"
                placeholder="Enter the new greeting you'd like..."
                rows={3}
                value={proposedGreeting}
                onChange={(e) => setProposedGreeting(e.target.value)}
              />
            </div>
          )}

          {(requestType === 'new_faq' || requestType === 'faq_update' || requestType === 'full_script') && (
            <div className="space-y-3">
              <Label>FAQ Details</Label>
              <Input
                placeholder="Question"
                value={proposedFaqQuestion}
                onChange={(e) => setProposedFaqQuestion(e.target.value)}
              />
              <Textarea
                placeholder="Answer"
                rows={2}
                value={proposedFaqAnswer}
                onChange={(e) => setProposedFaqAnswer(e.target.value)}
              />
            </div>
          )}

          {requestType === 'remove_faq' && script?.faqs && script.faqs.length > 0 && (
            <div className="space-y-2">
              <Label>Current FAQs (reference which ones to remove in description)</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {script.faqs.map((faq, i) => (
                  <div key={i} className="p-2 rounded bg-muted text-sm">
                    <p className="font-medium">{faq.question}</p>
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onClose(false); }}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
