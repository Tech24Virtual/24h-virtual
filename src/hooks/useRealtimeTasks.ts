import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface UseRealtimeTasksOptions {
  assignedTo?: string;
  visibility?: 'self' | 'universal';
  showNotifications?: boolean;
}

export function useRealtimeTasks(options: UseRealtimeTasksOptions = {}) {
  const { assignedTo, visibility, showNotifications = true } = options;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    // Build a unique channel name based on filters
    const channelName = `tasks-${assignedTo || 'all'}-${visibility || 'all'}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_tasks',
        },
        (payload) => {
          const newRecord = payload.new as Record<string, unknown> | null;
          
          // Filter based on visibility if specified
          if (visibility === 'self' && newRecord?.visibility !== 'self') {
            // For self visibility, only show tasks assigned to current user
            if (assignedTo && newRecord?.assigned_to !== assignedTo) {
              return;
            }
          }

          // Invalidate task queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['agent-tasks'] });
          queryClient.invalidateQueries({ queryKey: ['crm-tasks'] });
          queryClient.invalidateQueries({ queryKey: ['global-tasks'] });

          // Show notification for new tasks assigned to current user
          if (payload.eventType === 'INSERT' && showNotifications) {
            if (newRecord?.assigned_to === user?.id) {
              toast({
                title: '📋 New Task Assigned',
                description: `${newRecord?.title || 'New task'}`,
              });
            }
          }

          // Show notification for status changes on tasks you created or are assigned to
          if (payload.eventType === 'UPDATE' && showNotifications) {
            const oldRecord = payload.old as Record<string, unknown>;
            if (oldRecord?.status !== newRecord?.status) {
              // Only notify if you're involved with the task
              if (newRecord?.assigned_to === user?.id || newRecord?.created_by === user?.id) {
                toast({
                  title: 'Task Updated',
                  description: `Status changed to ${newRecord?.status}`,
                });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [assignedTo, visibility, showNotifications, queryClient, toast, user?.id]);
}

interface UseRealtimeTaskNotesOptions {
  taskId: string;
  onNewNote?: () => void;
}

export function useRealtimeTaskNotes({ taskId, onNewNote }: UseRealtimeTaskNotesOptions) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!taskId) return;

    const channel = supabase
      .channel(`task-notes-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_notes',
          filter: `task_id=eq.${taskId}`,
        },
        (payload) => {
          // Invalidate notes query
          queryClient.invalidateQueries({ queryKey: ['task-notes', taskId] });
          
          const newNote = payload.new as Record<string, unknown>;
          toast({
            title: 'New Note Added',
            description: `${newNote?.author_name || 'Someone'} added a note`,
          });

          onNewNote?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, queryClient, toast, onNewNote]);
}
