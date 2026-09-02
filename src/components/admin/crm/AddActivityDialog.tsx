import { useState } from 'react';
import { Phone, Mail, FileText, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AddActivityDialogProps {
  leadId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: string;
  onSuccess: () => void;
}

const activityTypes = [
  { value: 'note', label: 'Note', icon: FileText },
  { value: 'call', label: 'Phone Call', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'meeting', label: 'Meeting', icon: Users },
];

export function AddActivityDialog({
  leadId,
  open,
  onOpenChange,
  defaultType = 'note',
  onSuccess,
}: AddActivityDialogProps) {
  const [activityType, setActivityType] = useState(defaultType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [callDuration, setCallDuration] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Reset form when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setActivityType(defaultType);
      setTitle('');
      setDescription('');
      setCallDuration('');
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a title for this activity.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();

    const metadata: { duration?: number } = {};
    if (activityType === 'call' && callDuration) {
      metadata.duration = parseInt(callDuration, 10);
    }

    const { error } = await supabase.from('crm_activities').insert([{
      lead_id: leadId,
      activity_type: activityType,
      title: title.trim(),
      description: description.trim() || null,
      created_by: user?.id || null,
      metadata: JSON.parse(JSON.stringify(metadata)),
    }]);

    if (error) {
      toast({
        title: 'Error adding activity',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Activity added',
        description: 'The activity has been logged successfully.',
      });
      onSuccess();
    }

    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log Activity</DialogTitle>
          <DialogDescription>Record a note, call, email, or meeting on this lead's timeline.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="activity-type">Type</Label>
            <Select value={activityType} onValueChange={setActivityType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {activityTypes.map(({ value, label, icon: Icon }) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                activityType === 'call' 
                  ? 'e.g., Discussed pricing options'
                  : activityType === 'email'
                  ? 'e.g., Sent proposal'
                  : activityType === 'meeting'
                  ? 'e.g., Onboarding call'
                  : 'e.g., Updated contact info'
              }
            />
          </div>

          {activityType === 'call' && (
            <div className="space-y-2">
              <Label htmlFor="duration">Call Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={callDuration}
                onChange={(e) => setCallDuration(e.target.value)}
                placeholder="15"
                min="1"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Notes</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any relevant details..."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Activity'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
