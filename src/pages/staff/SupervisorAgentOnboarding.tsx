import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Plus, Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SendOfferDialog } from '@/components/staff/onboarding/SendOfferDialog';
import { AgentOnboardingDetail } from '@/components/staff/onboarding/AgentOnboardingDetail';
import { format } from 'date-fns';

const statusLabels: Record<string, string> = {
  offer_pending: 'Offer Pending',
  offer_accepted: 'Offer Accepted',
  contract_signed: 'Contract Signed',
  banking_pending: 'Banking Pending',
  provisioning: 'Provisioning',
  training: 'Training',
  live_training: 'Live Training',
  completed: 'Completed',
};

const statusColors: Record<string, string> = {
  offer_pending: 'bg-amber-100 text-amber-800',
  offer_accepted: 'bg-blue-100 text-blue-800',
  contract_signed: 'bg-indigo-100 text-indigo-800',
  banking_pending: 'bg-orange-100 text-orange-800',
  provisioning: 'bg-purple-100 text-purple-800',
  training: 'bg-cyan-100 text-cyan-800',
  live_training: 'bg-teal-100 text-teal-800',
  completed: 'bg-green-100 text-green-800',
};

export default function SupervisorAgentOnboarding() {
  const [showSendOffer, setShowSendOffer] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { data: onboardings, isLoading, refetch } = useQuery({
    queryKey: ['agent-onboardings'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agent_onboarding')
        .select('id, applicant_user_id, supervisor_id, job_application_id, onboarding_template_id, status, pay_rate, pay_type, schedule_type, contract_text, contract_signed_at, banking_submitted, google_email, five9_username, slack_invited, slack_channels_assigned, training_checklist, training_completed_at, live_training_scheduled_at, live_training_completed_at, hr_approved_by, completed_at, created_at, updated_at')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const userIds = [...new Set(data.flatMap((o: any) =>
        [o.applicant_user_id, o.supervisor_id].filter(Boolean)
      ))];

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const profileMap = Object.fromEntries(
        (profilesData || []).map((p: any) => [p.id, p.full_name])
      );

      return data.map((o: any) => ({
        ...o,
        agent_name: profileMap[o.applicant_user_id] || 'Unknown Agent',
        supervisor_name: profileMap[o.supervisor_id] || 'Unknown',
      }));
    },
  });

  const filtered = (onboardings || []).filter((o: any) => {
    const name = o.agent_name || '';
    const matchesSearch = !search || name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || o.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const selected = selectedId ? (onboardings || []).find((o: any) => o.id === selectedId) : null;

  if (selected) {
    return (
    <StaffLayout role="supervisor">
        <AgentOnboardingDetail
          onboarding={selected}
          onBack={() => setSelectedId(null)}
          onRefresh={refetch}
        />
      </StaffLayout>
    );
  }

  return (
    <StaffLayout role="supervisor">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              Agent Onboarding Pipeline
            </h1>
            <p className="text-muted-foreground mt-1">Track and manage new agent onboarding</p>
          </div>
          <Button onClick={() => setShowSendOffer(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Send Offer
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {Object.entries(statusLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">No Onboardings</h3>
              <p className="text-muted-foreground mb-4">Start by sending an offer to a new agent.</p>
              <Button onClick={() => setShowSendOffer(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Send Offer
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((o: any) => (
              <Card
                key={o.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedId(o.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {o.agent_name || 'Unknown Agent'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {o.pay_type === 'hourly' ? `$${o.pay_rate}/hr` : `$${o.pay_rate}/min`}
                        {' · '}
                        {o.schedule_type?.replace('_', ' ')}
                        {' · Started '}
                        {format(new Date(o.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Badge className={statusColors[o.status] || 'bg-muted'}>
                      {statusLabels[o.status] || o.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <SendOfferDialog
        open={showSendOffer}
        onOpenChange={setShowSendOffer}
        onSuccess={() => {
          refetch();
          setShowSendOffer(false);
        }}
      />
    </StaffLayout>
  );
}
