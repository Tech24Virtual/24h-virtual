import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarOff, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { AgentScheduleView } from '@/components/staff/AgentScheduleView';
import { OpenShiftBoard } from '@/components/staff/OpenShiftBoard';
import { TimeOffRequestDialog } from '@/components/staff/TimeOffRequestDialog';
import { TimeOffRequestsList } from '@/components/staff/TimeOffRequestsList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function AgentSchedule() {
  const { user } = useAuth();
  const [showTimeOff, setShowTimeOff] = useState(false);

  const { data: openShiftCount = 0 } = useQuery({
    queryKey: ['agent-open-shift-count'],
    queryFn: async () => {
      const { data: mySkills } = await supabase.from('agent_skills').select('skill_name').eq('agent_id', user!.id);
      const skills = (mySkills || []).map(s => s.skill_name);
      const { data: shifts } = await supabase.from('open_shifts').select('id, required_skills').eq('status', 'open');
      return (shifts || []).filter(s => (s.required_skills ?? []).length === 0 || (s.required_skills ?? []).some((sk: string) => skills.includes(sk))).length;
    },
    enabled: !!user?.id,
  });

  return (
    <StaffLayout role="agent">
      <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Schedule</h1>
            <p className="text-muted-foreground">View shifts, available coverage, and time off</p>
          </div>
          <Button variant="outline" onClick={() => setShowTimeOff(true)}>
            <CalendarOff className="h-4 w-4 mr-2" /> Request Time Off
          </Button>
        </div>

        <Tabs defaultValue="schedule">
          <TabsList>
            <TabsTrigger value="schedule">My Schedule</TabsTrigger>
            <TabsTrigger value="available">
              Available Shifts {openShiftCount > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{openShiftCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="time-off">Time Off</TabsTrigger>
          </TabsList>
          <TabsContent value="schedule" className="mt-4">
            <AgentScheduleView />
          </TabsContent>
          <TabsContent value="available" className="mt-4">
            <OpenShiftBoard role="agent" />
          </TabsContent>
          <TabsContent value="time-off" className="mt-4">
            <TimeOffRequestsList role="agent" />
          </TabsContent>
        </Tabs>

        <TimeOffRequestDialog open={showTimeOff} onOpenChange={setShowTimeOff} />
      </div>
      </div>
    </StaffLayout>
  );
}
