import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface StaffMember {
  user_id: string;
  role: string;
  profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface StaffAssignmentSelectProps {
  ticketId: string;
  currentAssignee?: string | null;
  ticketNumber?: number;
  ticketTitle?: string;
  disabled?: boolean;
}

const roleColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  supervisor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  agent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  sales: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  billing: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export function StaffAssignmentSelect({
  ticketId,
  currentAssignee,
  ticketNumber,
  ticketTitle,
  disabled = false,
}: StaffAssignmentSelectProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Fetch staff members with their roles
  const { data: staffMembers = [], isLoading } = useQuery({
    queryKey: ['staff-members'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('user_roles')
        .select(`
          user_id,
          role,
          profiles!inner(id, full_name, avatar_url)
        `)
        .in('role', ['admin', 'agent', 'supervisor', 'sales', 'billing']);

      if (error) throw error;
      
      // Deduplicate by user_id (a user might have multiple roles)
      const uniqueStaff = new Map<string, StaffMember>();
      (data as unknown as StaffMember[]).forEach((item) => {
        if (!uniqueStaff.has(item.user_id)) {
          uniqueStaff.set(item.user_id, item);
        }
      });
      
      return Array.from(uniqueStaff.values());
    },
  });

  // Assign ticket mutation
  const assignMutation = useMutation({
    mutationFn: async (assigneeId: string | null) => {
      const { error } = await supabase
        .from('support_tickets')
        .update({ assigned_to: assigneeId })
        .eq('id', ticketId);

      if (error) throw error;

      // Send email notification to assignee
      if (assigneeId) {
        const assignee = staffMembers.find(s => s.user_id === assigneeId);
        try {
          await supabase.functions.invoke('send-ticket-notification', {
            body: {
              type: 'ticket_assigned',
              ticketId,
              ticketNumber,
              ticketTitle,
              assigneeId,
              assigneeName: assignee?.profiles?.full_name || 'Staff Member',
              assignerName: profile?.full_name || 'Admin',
            },
          });
        } catch (emailError) {
          console.error('Failed to send assignment notification:', emailError);
        }
      }
    },
    onSuccess: (_, assigneeId) => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      
      const assignee = staffMembers.find(s => s.user_id === assigneeId);
      toast({
        title: assigneeId ? 'Ticket Assigned' : 'Assignment Removed',
        description: assigneeId 
          ? `Assigned to ${assignee?.profiles?.full_name || 'Staff Member'}`
          : 'Ticket is now unassigned',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Assignment Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAssignment = (value: string) => {
    const assigneeId = value === 'unassigned' ? null : value;
    assignMutation.mutate(assigneeId);
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const currentStaff = staffMembers.find(s => s.user_id === currentAssignee);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Assigned to:</span>
      <Select
        value={currentAssignee || 'unassigned'}
        onValueChange={handleAssignment}
        disabled={disabled || isLoading || assignMutation.isPending}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue>
            {currentStaff ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={currentStaff.profiles.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(currentStaff.profiles.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{currentStaff.profiles.full_name || 'Unknown'}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <UserPlus className="h-4 w-4" />
                <span>Unassigned</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Unassigned</span>
            </div>
          </SelectItem>
          {staffMembers.map((staff) => (
            <SelectItem key={staff.user_id} value={staff.user_id}>
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={staff.profiles.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(staff.profiles.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span>{staff.profiles.full_name || 'Unknown'}</span>
                <Badge variant="outline" className={`text-xs ${roleColors[staff.role] || ''}`}>
                  {staff.role}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
