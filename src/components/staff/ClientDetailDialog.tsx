import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { InlineTaskForm } from './InlineTaskForm';
import { InlineTicketForm } from './InlineTicketForm';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Phone, Building2, Calendar, PhoneCall, ClipboardList, Mail, Ticket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ClientProfile {
  id: string;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  email?: string | null;
}

interface ClientDetailDialogProps {
  client: ClientProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DialogMode = 'details' | 'task' | 'ticket';

export function ClientDetailDialog({ client, open, onOpenChange }: ClientDetailDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<DialogMode>('details');

  // Reset mode when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setMode('details');
    }
    onOpenChange(newOpen);
  };

  // Same five9_username lookup AgentCallLogs.tsx uses — keeps "Total calls" here
  // consistent with what /staff/agent/calls actually shows for this agent.
  const { data: onboarding, isLoading: onboardingLoading } = useQuery({
    queryKey: ['agent-onboarding-username', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_onboarding')
        .select('five9_username')
        .eq('applicant_user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && open,
    staleTime: 5 * 60_000,
  });
  const five9Username = onboarding?.five9_username ?? null;

  const { data: callStats, isLoading: callStatsLoading } = useQuery({
    queryKey: ['client-call-stats', client?.id, five9Username],
    queryFn: async () => {
      if (!client?.id || !five9Username) return null;

      const { data, error } = await supabase
        .from('call_logs')
        .select('id, created_at')
        .eq('client_id', client.id)
        .eq('agent_name', five9Username)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const totalCalls = data?.length || 0;
      const lastCall = data?.[0]?.created_at;

      return { totalCalls, lastCall };
    },
    enabled: !!client?.id && !!five9Username && open,
  });

  // Fetch email and lead_id from leads table if client is a lead
  const { data: leadData } = useQuery({
    queryKey: ['client-lead-data', client?.id],
    queryFn: async () => {
      if (!client?.id) return null;
      
      const { data: lead } = await supabase
        .from('leads')
        .select('id, email, phone, company')
        .eq('assigned_to', client.id)
        .limit(1)
        .single();
      
      return lead || null;
    },
    enabled: !!client?.id && open && !client?.email,
  });

  if (!client) return null;

  const displayEmail = client.email || leadData?.email;
  const displayPhone = client.phone || leadData?.phone;
  const displayCompany = client.company_name || leadData?.company;

  const getDialogTitle = () => {
    switch (mode) {
      case 'task': return 'Create Task';
      case 'ticket': return 'Create Ticket';
      default: return 'Client Details';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
        </DialogHeader>
        
        {mode === 'task' && (
          <InlineTaskForm
            clientId={client.id}
            clientName={client.full_name || 'Unknown'}
            onBack={() => setMode('details')}
            onSuccess={() => setMode('details')}
          />
        )}

        {mode === 'ticket' && (
          <InlineTicketForm
            clientId={client.id}
            clientName={client.full_name || 'Unknown'}
            leadId={leadData?.id}
            onBack={() => setMode('details')}
            onSuccess={() => setMode('details')}
          />
        )}

        {mode === 'details' && (
          <div className="space-y-6 py-4">
            {/* Avatar and Name */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={client.avatar_url || undefined} />
                <AvatarFallback className="text-lg">
                  {client.full_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">{client.full_name || 'Unknown'}</h3>
                {displayCompany && (
                  <Badge variant="secondary" className="mt-1">
                    {displayCompany}
                  </Badge>
                )}
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-3">
              {displayEmail && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${displayEmail}`} className="text-primary hover:underline">
                    {displayEmail}
                  </a>
                </div>
              )}
              {displayCompany && (
                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{displayCompany}</span>
                </div>
              )}
              {displayPhone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${displayPhone}`} className="text-primary hover:underline">
                    {displayPhone}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Joined {format(new Date(client.created_at), 'MMM d, yyyy')}</span>
              </div>
            </div>

            {/* Activity Stats */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Recent Activity</h4>
              {onboardingLoading || callStatsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ) : !five9Username ? (
                <p className="text-sm text-muted-foreground">
                  Your Five9 account hasn't been provisioned yet. Contact your supervisor.
                </p>
              ) : (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Total calls: <span className="font-medium text-foreground">{callStats?.totalCalls || 0}</span></p>
                  <p>Last call: <span className="font-medium text-foreground">
                    {callStats?.lastCall
                      ? format(new Date(callStats.lastCall), 'MMM d, yyyy')
                      : 'Never'}
                  </span></p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    onOpenChange(false);
                    navigate('/staff/agent/calls');
                  }}
                >
                  <PhoneCall className="h-4 w-4 mr-2" />
                  View Calls
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setMode('task')}
                >
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Create Task
                </Button>
              </div>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setMode('ticket')}
              >
                <Ticket className="h-4 w-4 mr-2" />
                Create Ticket
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
