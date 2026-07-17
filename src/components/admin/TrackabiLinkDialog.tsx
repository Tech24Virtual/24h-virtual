import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface TrackabiMember {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
}

export function trackabiMemberLabel(member: TrackabiMember): string {
  return member.fullName || [member.firstName, member.lastName].filter(Boolean).join(' ') || member.email;
}

interface TrackabiLinkDialogProps {
  agentId: string;
  agentName: string;
  currentTrackabiUserId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrackabiLinkDialog({
  agentId,
  agentName,
  currentTrackabiUserId,
  open,
  onOpenChange,
}: TrackabiLinkDialogProps) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string>(currentTrackabiUserId ?? '');

  const { data: members = [], isLoading, error } = useQuery({
    queryKey: ['trackabi-members'],
    enabled: open,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('trackabi-members');
      if (error) throw error;
      return (data?.members || []) as TrackabiMember[];
    },
  });

  const linkMutation = useMutation({
    mutationFn: async (trackabiUserId: string | null) => {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ trackabi_user_id: trackabiUserId })
        .eq('id', agentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-agents'] });
      toast({ title: 'Saved', description: `Trackabi mapping updated for ${agentName}.` });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err?.message ?? 'Failed to update Trackabi mapping.', variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link Trackabi Member</DialogTitle>
          <DialogDescription>
            Map {agentName} to their Trackabi member for time tracking sync.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Agents must have a Trackabi account before they can be mapped. Add agents to Trackabi at{' '}
            <span className="font-medium">24hvirtual.trackabi.com → Staff → Invite Member</span>, then link them here.
          </AlertDescription>
        </Alert>

        <div className="space-y-1.5 py-1">
          <Label htmlFor="trackabi-member">Trackabi Member</Label>
          {error ? (
            <p className="text-sm text-destructive">Failed to load Trackabi members.</p>
          ) : (
            <Select value={selectedId} onValueChange={setSelectedId} disabled={isLoading}>
              <SelectTrigger id="trackabi-member">
                <SelectValue placeholder={isLoading ? 'Loading members…' : 'Select a member'} />
              </SelectTrigger>
              <SelectContent>
                {members.map(member => (
                  <SelectItem key={member.id} value={String(member.id)}>
                    {trackabiMemberLabel(member)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {currentTrackabiUserId && (
            <Button
              type="button"
              variant="outline"
              className="mr-auto"
              disabled={linkMutation.isPending}
              onClick={() => linkMutation.mutate(null)}
            >
              Unlink
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={linkMutation.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={linkMutation.isPending || !selectedId}
            onClick={() => linkMutation.mutate(selectedId)}
          >
            {linkMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
