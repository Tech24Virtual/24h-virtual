import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface OutboundCallRequestDialogProps {
  open: boolean;
  onClose: (saved: boolean) => void;
}

export function OutboundCallRequestDialog({ open, onClose }: OutboundCallRequestDialogProps) {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    contact_name: '',
    contact_phone: '',
    reason: '',
    urgency: 'normal',
    max_attempts: '3',
  });

  const handleSave = async () => {
    if (!user) return;
    if (!formData.contact_name.trim()) {
      toast.error('Please enter the contact name');
      return;
    }
    if (!formData.contact_phone.trim()) {
      toast.error('Please enter the phone number');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('outbound_call_requests')
        .insert({
          client_id: user.id,
          contact_name: formData.contact_name.trim(),
          contact_phone: formData.contact_phone.trim(),
          reason: formData.reason.trim() || null,
          urgency: formData.urgency,
          max_attempts: parseInt(formData.max_attempts, 10),
          source: 'portal',
        });

      if (error) throw error;
      toast.success('Outbound call request submitted!');
      setFormData({ contact_name: '', contact_phone: '', reason: '', urgency: 'normal', max_attempts: '3' });
      onClose(true);
    } catch (error) {
      console.error('Error submitting outbound call request:', error);
      toast.error('Failed to submit request');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose(false)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Outbound Call</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="contact_name">Contact Name *</Label>
            <Input
              id="contact_name"
              placeholder="e.g., John Smith"
              value={formData.contact_name}
              onChange={(e) => setFormData(prev => ({ ...prev, contact_name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_phone">Phone Number *</Label>
            <Input
              id="contact_phone"
              placeholder="e.g., +1 (555) 123-4567"
              value={formData.contact_phone}
              onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason / Notes</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Follow up on invoice #1234"
              rows={3}
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Urgency</Label>
            <RadioGroup
              value={formData.urgency}
              onValueChange={(value) => setFormData(prev => ({ ...prev, urgency: value }))}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="normal" id="normal" />
                <Label htmlFor="normal" className="cursor-pointer">Normal</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="urgent" id="urgent" />
                <Label htmlFor="urgent" className="cursor-pointer text-destructive">Urgent</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Follow-up attempts if no answer</Label>
            <Select
              value={formData.max_attempts}
              onValueChange={(value) => setFormData(prev => ({ ...prev, max_attempts: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select attempts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 attempt (no follow-up)</SelectItem>
                <SelectItem value="2">2 attempts</SelectItem>
                <SelectItem value="3">3 attempts</SelectItem>
                <SelectItem value="5">5 attempts</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              If the contact doesn't answer, our agents will follow up this many times before closing the request.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
