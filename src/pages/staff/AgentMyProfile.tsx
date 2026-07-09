import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { User, DollarSign, FileCheck, Star, GraduationCap, AlertCircle } from 'lucide-react';

export default function AgentMyProfile() {
  const { user } = useAuth();

  const { data: profile, isLoading: profileLoading, isError: profileError } = useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();
      return data ?? null;
    },
    enabled: !!user?.id,
    retry: 1,
  });

  const { data: banking } = useQuery({
    queryKey: ['my-banking', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('agent_banking')
        .select('hourly_rate, currency, employment_type, break_policy, country')
        .eq('agent_id', user!.id)
        .maybeSingle();
      return data ?? null;
    },
    enabled: !!user?.id,
    retry: 1,
  });

  const { data: onboarding } = useQuery({
    queryKey: ['my-onboarding', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('agent_onboarding')
        .select('status, contract_signed_at, training_completed_at, banking_submitted, training_checklist')
        .eq('applicant_user_id', user!.id)
        .maybeSingle();
      return data ?? null;
    },
    enabled: !!user?.id,
    retry: 1,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['my-performance-reviews', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('agent_performance_reviews')
        .select('*')
        .eq('agent_id', user!.id)
        .eq('status', 'published')
        .order('period_end', { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    retry: 1,
  });

  // training_checklist is JSONB — guard against non-array values
  const trainingChecklist = Array.isArray(onboarding?.training_checklist)
    ? onboarding.training_checklist
    : [];
  const completedItems = trainingChecklist.filter((item: { completed?: boolean }) => item.completed);
  const trainingProgress =
    trainingChecklist.length > 0
      ? Math.round((completedItems.length / trainingChecklist.length) * 100)
      : null;

  if (profileLoading) {
    return (
      <StaffLayout role="agent">
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
          </div>
        </div>
      </StaffLayout>
    );
  }

  if (profileError) {
    return (
      <StaffLayout role="agent">
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm">Unable to load profile. Please refresh the page.</p>
        </div>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout role="agent">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">Your employment information and performance</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Employment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><User className="h-5 w-5" /> Employment Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Name" value={profile?.full_name} />
              <InfoRow label="Company" value={profile?.company_name} />
              <InfoRow label="Phone" value={profile?.phone} />
              <InfoRow label="Status" value={
                <Badge variant={profile?.employment_status === 'active' ? 'default' : 'secondary'} className="capitalize">
                  {profile?.employment_status || 'N/A'}
                </Badge>
              } />
              <InfoRow label="Hire Date" value={profile?.hire_date ? new Date(profile.hire_date).toLocaleDateString() : 'N/A'} />
              <InfoRow label="Department" value={profile?.department} />
              <InfoRow label="Job Title" value={profile?.job_title} />
            </CardContent>
          </Card>

          {/* Pay & Banking */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><DollarSign className="h-5 w-5" /> Pay Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {banking ? (
                <>
                  <InfoRow label="Hourly Rate" value={banking.hourly_rate ? `$${Number(banking.hourly_rate).toFixed(2)}/${banking.currency || 'USD'}` : 'N/A'} />
                  <InfoRow label="Employment Type" value={<Badge variant="outline" className="capitalize">{banking.employment_type}</Badge>} />
                  <InfoRow label="Country" value={banking.country} />
                  <InfoRow label="Break Policy" value={banking.break_policy} />
                  <Separator />
                  <InfoRow label="Banking Status" value={
                    <Badge variant={onboarding?.banking_submitted ? 'default' : 'destructive'}>
                      {onboarding?.banking_submitted ? 'Submitted' : 'Not Submitted'}
                    </Badge>
                  } />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No banking information on file</p>
              )}
            </CardContent>
          </Card>

          {/* Contract & Onboarding */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><FileCheck className="h-5 w-5" /> Contract & Onboarding</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Contract Signed" value={
                onboarding?.contract_signed_at
                  ? new Date(onboarding.contract_signed_at).toLocaleDateString()
                  : <Badge variant="destructive">Not Signed</Badge>
              } />
              <InfoRow label="Training Completed" value={
                onboarding?.training_completed_at
                  ? new Date(onboarding.training_completed_at).toLocaleDateString()
                  : <Badge variant="secondary">In Progress</Badge>
              } />
              <InfoRow label="Onboarding Status" value={
                <Badge variant="outline" className="capitalize">{onboarding?.status || 'N/A'}</Badge>
              } />
              {trainingProgress !== null && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Training Progress: {trainingProgress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${trainingProgress}%` }} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Performance Reviews */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Star className="h-5 w-5" /> Performance Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              {reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">No published reviews yet</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map(r => (
                    <div key={r.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{r.period_start} — {r.period_end}</span>
                        <Badge>{Number(r.overall_score).toFixed(1)}/5</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <span>Quality: {r.quality_score}/5</span>
                        <span>Attendance: {r.attendance_score}/5</span>
                        <span>Comms: {r.communication_score}/5</span>
                      </div>
                      {r.strengths && <p className="text-xs"><span className="font-medium">Strengths:</span> {r.strengths}</p>}
                      {r.areas_for_improvement && <p className="text-xs"><span className="font-medium">Improve:</span> {r.areas_for_improvement}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </StaffLayout>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || 'N/A'}</span>
    </div>
  );
}
