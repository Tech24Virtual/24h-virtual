import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface InlineTicketFormProps {
  clientId?: string;
  clientName?: string;
  leadId?: string;
  onBack: () => void;
  onSuccess?: () => void;
  defaultSource?: string;
}

const departments = [
  { value: 'sales', label: 'Sales Team' },
  { value: 'billing', label: 'Billing Team' },
  { value: 'agent', label: 'Agent Team' },
  { value: 'supervisor', label: 'Supervisors/Managers' },
  { value: 'technical', label: 'IT/Technical Support' },
];

const priorities = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export function InlineTicketForm({
  clientId,
  clientName,
  leadId,
  onBack,
  onSuccess,
  defaultSource = 'agent',
}: InlineTicketFormProps) {
  const { user, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assignedTo, setAssignedTo] = useState('');

  // Fetch staff members for assignment
  const { data: staffMembers } = useQuery({
    queryKey: ['staff-for-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['sales', 'agent', 'supervisor', 'billing', 'admin']);
      
      if (error) throw error;

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
  });

  // Find lead_id from client profile if not provided
  const { data: clientLead } = useQuery({
    queryKey: ['client-lead', clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('leads')
        .select('id')
        .eq('assigned_to', clientId)
        .limit(1)
        .single();
      return data?.id || null;
    },
    enabled: !leadId,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim() || !department) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    // Map department to source for visibility
    const deptToSource: Record<string, string> = {
      'sales': 'sales',
      'agent': 'agent',
      'billing': 'billing',
      'supervisor': 'supervisor',
      'technical': 'agent',
    };
    const finalSource = deptToSource[department] || defaultSource;

    const { error } = await supabase.from('support_tickets').insert({
      title: title.trim(),
      description: clientName ? `[Client: ${clientName}]\n\n${description.trim()}` : description.trim(),
      category: department,
      priority,
      source: finalSource,
      originating_source: defaultSource, // Track where ticket was created
      submitted_by: user?.id,
      submitter_email: user?.email,
      submitter_name: profile?.full_name || user?.email,
      lead_id: leadId || clientLead || null,
      assigned_to: assignedTo || null,
    });

    setIsSubmitting(false);

    if (error) {
      toast.error('Failed to create ticket: ' + error.message);
    } else {
      toast.success('Ticket created successfully');
      onSuccess?.();
      onBack();
    }
  };

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="mb-2 -ml-2"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Details
      </Button>

      {clientName && (
        <p className="text-sm text-muted-foreground">
          Creating ticket for <span className="font-medium text-foreground">{clientName}</span>
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Subject *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief summary of the issue"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Department *</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
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

          <div className="space-y-2">
            <Label>Priority</Label>
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

        <div className="space-y-2">
          <Label>Assign to Individual (Optional)</Label>
          <Select value={assignedTo} onValueChange={setAssignedTo}>
            <SelectTrigger>
              <SelectValue placeholder="Unassigned" />
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

        <div className="space-y-2">
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue in detail..."
            rows={4}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onBack} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Ticket'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
