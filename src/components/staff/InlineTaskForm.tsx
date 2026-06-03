import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { ArrowLeft } from 'lucide-react';
import { getPriorityDueDate, getPriorityTimeFrame } from '@/lib/taskPriority';

interface InlineTaskFormProps {
  clientId?: string;
  clientName?: string;
  onBack: () => void;
  onSuccess?: () => void;
}

export function InlineTaskForm({ clientId, clientName, onBack, onSuccess }: InlineTaskFormProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    task_type: 'general',
    lead_id: '',
    visibility: 'universal',
  });

  const { data: leads } = useQuery({
    queryKey: ['leads-for-inline-task'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, company')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: formData.task_type === 'lead',
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const dueDate = getPriorityDueDate(formData.priority);
      
      const { error } = await supabase.from('crm_tasks').insert({
        title: formData.title,
        description: formData.description || null,
        priority: formData.priority,
        lead_id: formData.task_type === 'lead' && formData.lead_id ? formData.lead_id : null,
        assigned_to: user?.id,
        created_by: user?.id,
        due_date: dueDate.toISOString(),
        visibility: formData.visibility,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-tasks'] });
      toast.success('Task created successfully');
      onSuccess?.();
      onBack();
    },
    onError: () => {
      toast.error('Failed to create task');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Please enter a task title');
      return;
    }
    createMutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium">Create Task</span>
        {clientName && (
          <span className="text-sm text-muted-foreground">for {clientName}</span>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="task-title">Title *</Label>
        <Input
          id="task-title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Task title"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="task-description">Description</Label>
        <Textarea
          id="task-description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Task description (optional)"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Task Type</Label>
          <Select
            value={formData.task_type}
            onValueChange={(v) => setFormData(prev => ({ ...prev, task_type: v, lead_id: '' }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General Task</SelectItem>
              <SelectItem value="lead">Lead Follow-up</SelectItem>
              <SelectItem value="internal">Internal Task</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Priority</Label>
          <Select
            value={formData.priority}
            onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low - {getPriorityTimeFrame('low')}</SelectItem>
              <SelectItem value="medium">Medium - {getPriorityTimeFrame('medium')}</SelectItem>
              <SelectItem value="high">High - {getPriorityTimeFrame('high')}</SelectItem>
              <SelectItem value="urgent">Urgent - {getPriorityTimeFrame('urgent')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg border">
        <div className="space-y-0.5">
          <Label htmlFor="task-visibility">Self Task Only</Label>
          <p className="text-xs text-muted-foreground">
            {formData.visibility === 'self' ? 'Only visible to you' : 'Visible to all team members'}
          </p>
        </div>
        <Switch
          id="task-visibility"
          checked={formData.visibility === 'self'}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, visibility: checked ? 'self' : 'universal' }))}
        />
      </div>

      {formData.task_type === 'lead' && (
        <div className="space-y-2">
          <Label>Link to Lead</Label>
          <Select
            value={formData.lead_id}
            onValueChange={(v) => setFormData(prev => ({ ...prev, lead_id: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a lead" />
            </SelectTrigger>
            <SelectContent>
              {leads?.map(lead => (
                <SelectItem key={lead.id} value={lead.id}>
                  {lead.name} {lead.company && `(${lead.company})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={createMutation.isPending} className="flex-1">
          {createMutation.isPending ? 'Creating...' : 'Create Task'}
        </Button>
      </div>
    </form>
  );
}
