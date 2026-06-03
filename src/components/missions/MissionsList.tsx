import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useState } from 'react';
import { MissionDetail } from './MissionDetail';

const statusColors: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  running: 'bg-blue-100 text-blue-800',
  error: 'bg-red-100 text-red-800',
  blocked: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-gray-100 text-gray-800',
  needs_review: 'bg-orange-100 text-orange-800',
};

interface MissionsListProps {
  title?: string;
  missionTypeFilter?: string;
  limit?: number;
}

export function MissionsList({ title = 'Recent Missions', missionTypeFilter, limit = 20 }: MissionsListProps) {
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);

  const { data: missions, isLoading } = useQuery({
    queryKey: ['missions', missionTypeFilter],
    queryFn: async () => {
      let query = supabase
        .from('missions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (missionTypeFilter) {
        query = query.eq('mission_type', missionTypeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading missions...</p>
          ) : !missions?.length ? (
            <p className="text-muted-foreground text-center py-8">No missions yet. Run your first billing or payroll job to get started.</p>
          ) : (
            <div className="space-y-2">
              {missions.map((m: any) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMissionId(m.id)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {m.mission_type === 'call_billing' ? 'Billing' : m.mission_type === 'payroll_run' ? 'Payroll' : m.mission_type === 'leads_agent' ? 'Leads' : m.mission_type === 'hiring_agent' ? 'Hiring' : m.mission_type === 'identity_sync_fabric' ? 'Identity Sync' : m.mission_type === 'onboarding' ? 'Onboarding' : m.mission_type === 'offboarding' ? 'Offboarding' : m.mission_type}
                      </Badge>
                      <Badge className={statusColors[m.status] || 'bg-gray-100'}>
                        {m.status}
                      </Badge>
                      {m.error_flag && <Badge variant="destructive">Errors</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(m.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 truncate">{m.summary}</p>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <MissionDetail
        missionId={selectedMissionId}
        open={!!selectedMissionId}
        onOpenChange={(open) => !open && setSelectedMissionId(null)}
      />
    </>
  );
}
