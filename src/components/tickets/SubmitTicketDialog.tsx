import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

type TicketSource = 
  | 'client_portal' 
  | 'affiliate_portal' 
  | 'white_label_portal' 
  | 'sales' 
  | 'agent' 
  | 'supervisor' 
  | 'billing' 
  | 'tech'
  | 'hr'
  | 'internal';

interface SubmitTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  source: TicketSource;
  leadId?: string;
  partnerId?: string;
  affiliateId?: string;
  showAssignment?: boolean;
}

const categories = [
  { value: 'general', label: 'General Question' },
  { value: 'technical', label: 'Technical Issue' },
  { value: 'billing', label: 'Billing Question' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'sales_inquiry', label: 'Sales Inquiry' },
];

const departments = [
  { value: 'sales', label: 'Sales Team' },
  { value: 'agent', label: 'Agent Team' },
  { value: 'billing', label: 'Billing Team' },
  { value: 'supervisor', label: 'Supervisors' },
  { value: 'tech', label: 'Tech Support' },
  { value: 'hr', label: 'HR' },
];

const priorities = [
  { value: 'low', label: 'Low - Can wait a few days' },
  { value: 'medium', label: 'Medium - Need help soon' },
  { value: 'high', label: 'High - Urgent issue' },
  { value: 'urgent', label: 'Urgent - Critical problem' },
];

export function SubmitTicketDialog({
  open,
  onOpenChange,
  onSuccess,
  source,
  leadId,
  partnerId,
  affiliateId,
  showAssignment = false,
}: SubmitTicketDialogProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('medium');
  const [department, setDepartment] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  // Fetch staff members for assignment dropdown
  const { data: staffMembers } = useQuery({
    queryKey: ['staff-for-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['sales', 'agent', 'supervisor', 'billing', 'admin']);
      
      if (error) throw error;

      // Get profiles for these users
      const userIds = data.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      
      return profiles?.map(p => ({
        id: p.id,
        name: p.full_name || 'Unknown',
      })) || [];
    },
    enabled: showAssignment && open,
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('general');
    setPriority('medium');
    setDepartment('');
    setAssignedTo('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      toast({
        title: 'Required fields missing',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    // Use department as category if selected
    const finalCategory = department || category;
    
    // Determine work_queue (who works on this ticket) and source
    let finalSource: string = source;
    let workQueue: string = source; // default: same department as source
    if (department && showAssignment) {
      // Cross-department routing: work_queue = target department
      workQueue = department;
      // Map department to source for cross-portal visibility
      const deptToSource: Record<string, string> = {
        'sales': 'sales',
        'agent': 'agent',
        'billing': 'billing',
        'supervisor': 'supervisor',
        'tech': 'tech',
        'hr': 'internal',
      };
      finalSource = deptToSource[department] || source;
    }

    const { data, error } = await supabase.from('support_tickets').insert({
      title: title.trim(),
      description: description.trim(),
      category: finalCategory,
      priority,
      source: finalSource,
      work_queue: workQueue,
      originating_source: source, // Track where ticket was created
      submitted_by: user?.id,
      submitter_email: user?.email,
      submitter_name: profile?.full_name || user?.email,
      lead_id: leadId || null,
      partner_id: partnerId || null,
      affiliate_id: affiliateId || null,
      assigned_to: assignedTo || null,
    }).select('id, ticket_number, title, description, source, priority, category').single();

    if (error) {
      toast({
        title: 'Error submitting ticket',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      // Send email notification in background
      try {
        await supabase.functions.invoke('send-ticket-notification', {
          body: {
            type: 'ticket_created',
            ticketId: data.id,
            ticketNumber: data.ticket_number,
            title: data.title,
            description: data.description,
            source: data.source,
            priority: data.priority,
            category: data.category,
            submitterEmail: user?.email,
            submitterName: profile?.full_name || user?.email,
          },
        });
      } catch (emailError) {
        console.error('Failed to send ticket notification email:', emailError);
      }

      toast({
        title: 'Ticket submitted',
        description: 'We\'ll get back to you as soon as possible.',
      });
      onSuccess?.();
      onOpenChange(false);
    }

    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Submit a Support Ticket</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Subject *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of your issue"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {showAssignment ? (
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {showAssignment && (
            <div className="space-y-2">
              <Label htmlFor="assignTo">Assign to Individual (Optional)</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers?.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please describe your issue in detail. Include any relevant information that might help us assist you."
              rows={5}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
