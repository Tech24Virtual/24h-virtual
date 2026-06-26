import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { format } from 'date-fns';
import { User, Calendar, MessageSquare, Send } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  created_at: string;
  created_by: string | null;
  assigned_to: string | null;
  lead_id: string | null;
  lead?: { name: string; company: string | null } | null;
}

interface TaskNote {
  id: string;
  task_id: string;
  author_id: string | null;
  author_name: string | null;
  message: string;
  created_at: string;
}

interface TaskDetailDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailDialog({ task, open, onOpenChange }: TaskDetailDialogProps) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'pending',
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        status: task.status,
      });
      setIsEditing(false);
      setNewNote('');
    }
  }, [task]);

  const isCreator = task?.created_by === user?.id;
  const isAssignee = task?.assigned_to === user?.id;
  const canComplete = isCreator || isAssignee;

  // Fetch task notes
  const { data: notes = [] } = useQuery({
    queryKey: ['task-notes', task?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_notes')
        .select('*')
        .eq('task_id', task!.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as TaskNote[];
    },
    enabled: !!task?.id && open,
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (message: string) => {
      const { error } = await supabase.from('task_notes').insert({
        task_id: task!.id,
        author_id: user?.id,
        author_name: profile?.full_name || user?.email || 'Unknown',
        message,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-notes', task?.id] });
      setNewNote('');
      toast.success('Note added');
    },
    onError: (error) => {
      toast.error('Failed to add note: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (data.status === 'completed' && !canComplete) {
        throw new Error('Only the task creator can mark this task as completed');
      }

      const updateData: Record<string, unknown> = {
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
      };

      if (data.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else if (task?.status === 'completed' && data.status !== 'completed') {
        updateData.completed_at = null;
      }

      const { data: updateResult, error } = await supabase
        .from('crm_tasks')
        .update(updateData)
        .eq('id', task!.id)
        .select();

      if (error) {
        console.error('crm_tasks UPDATE error:', error);
        throw error;
      }
      if (!updateResult || updateResult.length === 0) {
        throw new Error('Task not found or you do not have permission to edit it');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['supervisor-tasks'] });
      toast.success('Task updated successfully');
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update task');
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === 'completed' && !canComplete) {
      toast.error('Only the task creator can mark this task as completed');
      return;
    }
    setFormData(prev => ({ ...prev, status: newStatus }));
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      addNoteMutation.mutate(newNote.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddNote();
    }
  };

  if (!task) return null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'medium': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'low': return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      default: return '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'in_progress': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'pending': return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      default: return '';
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Task Details</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={handleStatusChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed" disabled={!canComplete}>
                        Completed
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-lg">{task.title}</h3>
                {task.description && (
                  <p className="text-muted-foreground mt-1 text-sm">{task.description}</p>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                <Badge className={getPriorityColor(task.priority)}>
                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                </Badge>
                <Badge className={getStatusColor(task.status)}>
                  {task.status === 'in_progress' ? 'In Progress' : 
                   task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                </Badge>
                {isCreator && (
                  <Badge variant="outline" className="text-xs">Creator</Badge>
                )}
              </div>

              {task.lead && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Lead: {task.lead.name}</span>
                  {task.lead.company && (
                    <span className="text-muted-foreground">• {task.lead.company}</span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Created: {format(new Date(task.created_at), 'MMM d, yyyy')}</span>
                </div>
                {task.due_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Due: {format(new Date(task.due_date), 'MMM d, yyyy')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes Section */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium text-sm">Discussion ({notes.length})</h4>
            </div>

            <div className="space-y-3">
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No notes yet. Add a note to start the discussion.
                </p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="flex gap-3">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="text-xs">
                        {getInitials(note.author_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{note.author_name || 'Unknown'}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(note.created_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">
                        {note.message}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Note input - always visible at bottom */}
        <div className="flex gap-2 pt-4 border-t shrink-0">
          <Input
            placeholder="Add a note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <Button 
            size="icon" 
            onClick={handleAddNote} 
            disabled={!newNote.trim() || addNoteMutation.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <DialogFooter className="shrink-0">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={() => setIsEditing(true)}>
                Edit Task
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
