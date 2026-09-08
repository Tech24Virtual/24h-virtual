import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CalendarClock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import { toast } from 'sonner';

interface SendBookingLinkDialogProps {
  open: boolean;
  onClose: () => void;
  recipientEmail: string;
  recipientName: string;
  leadId?: string;
  wlClientId?: string;
}

interface HostOption {
  agentId: string;
  fullName: string;
  bookiiEmbedUrl: string;
}

const MEETING_TYPES = [
  { slug: 'quick-intro', label: 'Quick Intro', durationMinutes: 15 },
  { slug: 'discovery', label: 'Discovery', durationMinutes: 30 },
  { slug: 'client-onboarding', label: 'Client Onboarding', durationMinutes: 60 },
] as const;

type MeetingTypeSlug = (typeof MEETING_TYPES)[number]['slug'];

export function SendBookingLinkDialog({
  open,
  onClose,
  recipientEmail,
  recipientName,
  leadId,
  wlClientId,
}: SendBookingLinkDialogProps) {
  const [hostAgentId, setHostAgentId] = useState<string>('');
  const [meetingType, setMeetingType] = useState<MeetingTypeSlug>('quick-intro');
  const [message, setMessage] = useState('');

  const { data: hosts, isLoading: hostsLoading } = useQuery({
    queryKey: ['bookii-active-hosts'],
    queryFn: async (): Promise<HostOption[]> => {
      const { data: assignments, error: assignmentsError } = await supabase
        .from('agent_bookii_assignments')
        .select('agent_id, bookii_embed_url')
        .eq('is_active', true);
      if (assignmentsError) throw assignmentsError;
      if (!assignments || assignments.length === 0) return [];

      const agentIds = assignments.map((a) => a.agent_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', agentIds);
      if (profilesError) throw profilesError;

      const nameByAgentId = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

      return assignments.map((a) => ({
        agentId: a.agent_id,
        fullName: nameByAgentId.get(a.agent_id) || 'Unnamed host',
        bookiiEmbedUrl: a.bookii_embed_url,
      }));
    },
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setHostAgentId('');
      setMeetingType('quick-intro');
      setMessage('');
    }
  }, [open]);

  useEffect(() => {
    if (!hostAgentId && hosts && hosts.length > 0) {
      setHostAgentId(hosts[0].agentId);
    }
  }, [hosts, hostAgentId]);

  const selectedHost = hosts?.find((h) => h.agentId === hostAgentId) ?? null;
  const selectedMeetingType = MEETING_TYPES.find((m) => m.slug === meetingType)!;

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!selectedHost) throw new Error('Select a host');

      const bookingUrl = `${selectedHost.bookiiEmbedUrl.replace('?embed=true', '')}/${selectedMeetingType.slug}`;

      const { error } = await supabase.functions.invoke('send-booking-link-email', {
        body: {
          to: recipientEmail,
          name: recipientName,
          booking_url: bookingUrl,
          host_name: selectedHost.fullName,
          meeting_type: selectedMeetingType.label,
          message: message.trim() || undefined,
        },
      });
      if (error) throw new Error(error.message);

      if (leadId) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('crm_activities').insert({
          lead_id: leadId,
          activity_type: 'email',
          title: `Booking link sent: ${selectedMeetingType.label}`,
          description: `Sent ${selectedHost.fullName}'s booking link (${selectedMeetingType.label}) to ${recipientEmail}`,
          created_by: user?.id || null,
          metadata: {
            email_type: 'booking_link',
            recipient: recipientEmail,
            host_agent_id: selectedHost.agentId,
            host_name: selectedHost.fullName,
            meeting_type: selectedMeetingType.slug,
            booking_url: bookingUrl,
          },
        });
      }
    },
    onSuccess: () => {
      toast.success('Booking link sent', {
        description: `${recipientName} will receive an email with ${selectedHost?.fullName}'s booking link.`,
      });
      onClose();
    },
    onError: (err: Error) => {
      toast.error('Failed to send booking link', { description: err.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Send Booking Link
          </DialogTitle>
          <DialogDescription>
            Send {recipientName} a personal link to book time on a team member's calendar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="booking-host">Host</Label>
            <Select value={hostAgentId} onValueChange={setHostAgentId} disabled={hostsLoading}>
              <SelectTrigger id="booking-host">
                <SelectValue placeholder={hostsLoading ? 'Loading hosts…' : 'Select a host'} />
              </SelectTrigger>
              <SelectContent>
                {hosts?.map((host) => (
                  <SelectItem key={host.agentId} value={host.agentId}>
                    {host.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!hostsLoading && hosts?.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No active Bookii hosts are configured yet.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="booking-meeting-type">Meeting Type</Label>
            <Select value={meetingType} onValueChange={(v) => setMeetingType(v as MeetingTypeSlug)}>
              <SelectTrigger id="booking-meeting-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEETING_TYPES.map((mt) => (
                  <SelectItem key={mt.slug} value={mt.slug}>
                    {mt.label} ({mt.durationMinutes} min)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="booking-message">Message (optional)</Label>
            <Textarea
              id="booking-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal note to include in the email…"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => sendMutation.mutate()}
            disabled={sendMutation.isPending || !selectedHost}
          >
            {sendMutation.isPending ? 'Sending…' : 'Send Link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
