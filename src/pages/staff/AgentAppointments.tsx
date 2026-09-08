import { useQuery } from '@tanstack/react-query';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { BookiiEmbed } from '@/components/shared/BookiiEmbed';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function AgentAppointments() {
  const { user } = useAuth();

  const { data: assignment } = useQuery({
    queryKey: ['agent-bookii-assignment', user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_bookii_assignments')
        .select('bookii_embed_url, is_active')
        .eq('agent_id', user!.id)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <StaffLayout role="agent">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-muted-foreground">Schedule and manage your client appointments</p>
        </div>
        <BookiiEmbed title="Appointments" url={assignment?.bookii_embed_url} />
      </div>
    </StaffLayout>
  );
}
