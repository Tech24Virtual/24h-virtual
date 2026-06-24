import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import {
  Users, Search, CheckCircle2, GraduationCap,
  Clock, ChevronRight, UserCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

interface AgentRow {
  userId: string;
  role: 'agent' | 'sales';
  fullName: string | null;
  phone: string | null;
  onShift: boolean;
  clientCount: number;
  trainingPending: number;
  onboardingStatus: string | null;
  lastShiftDate: string | null;
}

// ── Onboarding badge ──────────────────────────────────────────────────────────

const ONBOARDING_STYLES: Record<string, string> = {
  completed:     'bg-green-100 text-green-800 border-green-200',
  hired:         'bg-green-100 text-green-800 border-green-200',
  training:      'bg-amber-100 text-amber-800 border-amber-200',
  offer_pending: 'bg-blue-100 text-blue-800 border-blue-200',
  rejected:      'bg-red-100 text-red-800 border-red-200',
};

function OnboardingBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  const cls = ONBOARDING_STYLES[status] ?? 'bg-muted text-muted-foreground border-border';
  return (
    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border capitalize ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────

function StatPill({
  icon: Icon,
  label,
  value,
  color,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  loading: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm shadow-sm">
      <Icon className={`h-3.5 w-3.5 ${color}`} />
      {loading ? (
        <Skeleton className="h-4 w-20" />
      ) : (
        <>
          <span className={`font-semibold ${color}`}>{value}</span>
          <span className="text-muted-foreground">{label}</span>
        </>
      )}
    </div>
  );
}

// ── Agent row ─────────────────────────────────────────────────────────────────

function AgentRow({ agent }: { agent: AgentRow }) {
  const initials = agent.fullName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?';

  return (
    <Link
      to={`/staff/supervisor/agents/${agent.userId}`}
      className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors group"
    >
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <span className="text-sm font-medium text-primary">{initials}</span>
      </div>

      {/* Name + phone */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{agent.fullName ?? 'Unnamed'}</p>
        {agent.phone && <p className="text-xs text-muted-foreground">{agent.phone}</p>}
      </div>

      {/* On shift */}
      <div className="hidden sm:flex w-20 justify-center shrink-0">
        {agent.onShift ? (
          <Badge className="bg-green-500 hover:bg-green-500 text-white text-[10px] px-2">
            On Shift
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Off</span>
        )}
      </div>

      {/* Clients */}
      <div className="hidden md:flex items-center gap-1 w-16 justify-center shrink-0 text-sm">
        <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
        <span className={agent.clientCount === 0 ? 'text-muted-foreground' : 'font-medium'}>
          {agent.clientCount}
        </span>
      </div>

      {/* Training */}
      <div className="hidden md:flex items-center justify-center w-24 shrink-0">
        {agent.trainingPending > 0 ? (
          <span className="text-xs text-orange-600 font-medium">
            {agent.trainingPending} pending
          </span>
        ) : (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        )}
      </div>

      {/* Onboarding */}
      <div className="hidden lg:flex justify-center w-28 shrink-0">
        <OnboardingBadge status={agent.onboardingStatus} />
      </div>

      {/* Last shift */}
      <div className="hidden lg:block w-28 shrink-0 text-right">
        <span className="text-xs text-muted-foreground">
          {agent.lastShiftDate
            ? formatDistanceToNow(new Date(agent.lastShiftDate), { addSuffix: true })
            : '—'}
        </span>
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
    </Link>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

function AgentSection({
  title,
  agents,
  loading,
}: {
  title: string;
  agents: AgentRow[];
  loading: boolean;
}) {
  if (!loading && agents.length === 0) return null;

  return (
    <div>
      <div className="px-4 py-2 bg-muted/40 border-y">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title} ({loading ? '…' : agents.length})
        </p>
      </div>

      {/* Column headers — md+ only */}
      <div className="hidden md:flex items-center gap-4 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b bg-muted/20">
        <div className="w-9 shrink-0" />
        <div className="flex-1">Name</div>
        <div className="hidden sm:block w-20 text-center shrink-0">Shift</div>
        <div className="w-16 text-center shrink-0">Clients</div>
        <div className="w-24 text-center shrink-0">Training</div>
        <div className="hidden lg:block w-28 text-center shrink-0">Onboarding</div>
        <div className="hidden lg:block w-28 text-right shrink-0">Last Shift</div>
        <div className="w-4 shrink-0" />
      </div>

      <div className="divide-y">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="hidden sm:block h-5 w-16" />
                <Skeleton className="hidden md:block h-4 w-8" />
                <Skeleton className="hidden md:block h-4 w-16" />
              </div>
            ))
          : agents.map((a) => <AgentRow key={a.userId} agent={a} />)}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SupervisorAgents() {
  const [search, setSearch] = useState('');

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['supervisor-agents-full'],
    staleTime: 60_000,
    refetchInterval: 120_000,
    queryFn: async (): Promise<AgentRow[]> => {
      // Step 1: get roles
      const { data: roles, error: rolesErr } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['agent', 'sales']);
      if (rolesErr) throw rolesErr;
      if (!roles || roles.length === 0) return [];

      const userIds = roles.map((r) => r.user_id);

      // Step 2: parallel enrichment
      const [
        profilesResult,
        activeShiftsResult,
        assignmentsResult,
        completionsResult,
        signoffsResult,
        onboardingResult,
        lastShiftsResult,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, phone')
          .in('id', userIds),
        supabase
          .from('agent_shifts')
          .select('agent_id')
          .eq('status', 'active')
          .in('agent_id', userIds),
        supabase
          .from('client_agent_assignments')
          .select('agent_id')
          .in('agent_id', userIds),
        supabase
          .from('campaign_training_completions')
          .select('id, agent_id')
          .in('agent_id', userIds),
        (supabase as any)
          .from('campaign_training_signoffs')
          .select('completion_id'),
        supabase
          .from('agent_onboarding')
          .select('applicant_user_id, status')
          .in('applicant_user_id', userIds),
        supabase
          .from('agent_shifts')
          .select('agent_id, clock_in')
          .in('agent_id', userIds)
          .in('status', ['completed', 'active'])
          .order('clock_in', { ascending: false })
          .limit(1000),
      ]);

      // Build lookup maps
      const profileMap = new Map(
        (profilesResult.data ?? []).map((p) => [p.id, p]),
      );
      const activeSet = new Set(
        (activeShiftsResult.data ?? []).map((s) => s.agent_id),
      );

      const clientCountMap = new Map<string, number>();
      for (const a of assignmentsResult.data ?? []) {
        clientCountMap.set(a.agent_id, (clientCountMap.get(a.agent_id) ?? 0) + 1);
      }

      const signedIds = new Set<string>(
        ((signoffsResult.data ?? []) as Array<{ completion_id: string }>).map(
          (s) => s.completion_id,
        ),
      );
      const pendingTraining = new Map<string, number>();
      for (const c of completionsResult.data ?? []) {
        if (!signedIds.has(c.id)) {
          pendingTraining.set(c.agent_id, (pendingTraining.get(c.agent_id) ?? 0) + 1);
        }
      }

      const onboardingMap = new Map(
        (onboardingResult.data ?? []).map((o) => [o.applicant_user_id, o.status]),
      );

      // First clock_in per agent from the desc-ordered list = most recent shift
      const lastShiftMap = new Map<string, string>();
      for (const s of lastShiftsResult.data ?? []) {
        if (!lastShiftMap.has(s.agent_id)) {
          lastShiftMap.set(s.agent_id, s.clock_in);
        }
      }

      return roles.map((r) => ({
        userId:          r.user_id,
        role:            r.role as 'agent' | 'sales',
        fullName:        profileMap.get(r.user_id)?.full_name ?? null,
        phone:           profileMap.get(r.user_id)?.phone ?? null,
        onShift:         activeSet.has(r.user_id),
        clientCount:     clientCountMap.get(r.user_id) ?? 0,
        trainingPending: pendingTraining.get(r.user_id) ?? 0,
        onboardingStatus: onboardingMap.get(r.user_id) ?? null,
        lastShiftDate:   lastShiftMap.get(r.user_id) ?? null,
      }));
    },
  });

  // Stats (derived from loaded data)
  const stats = useMemo(() => ({
    teamMembers: agents.length,
    agentCount:  agents.filter((a) => a.role === 'agent').length,
    salesCount:  agents.filter((a) => a.role === 'sales').length,
    onShiftNow:  agents.filter((a) => a.onShift).length,
  }), [agents]);

  // Filter (name or role only — no UUID search)
  const filtered = useMemo(() => {
    if (!search.trim()) return agents;
    const q = search.toLowerCase();
    return agents.filter(
      (a) =>
        a.fullName?.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q),
    );
  }, [agents, search]);

  const agentRows = filtered.filter((a) => a.role === 'agent');
  const salesRows = filtered.filter((a) => a.role === 'sales');

  return (
    <StaffLayout role="supervisor">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-muted-foreground">Agents and sales members, live shift status and training health</p>
        </div>

        {/* Stats bar */}
        <div className="flex flex-wrap gap-2">
          <StatPill icon={Users}       label="Team members" value={stats.teamMembers} color="text-primary"   loading={isLoading} />
          <StatPill icon={UserCheck}   label="Agents"       value={stats.agentCount}  color="text-blue-600"  loading={isLoading} />
          <StatPill icon={GraduationCap} label="Sales"      value={stats.salesCount}  color="text-violet-600" loading={isLoading} />
          <StatPill icon={Clock}       label="On shift now" value={stats.onShiftNow}  color="text-green-600" loading={isLoading} />
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Agents + Sales sections */}
        <Card className="overflow-hidden p-0">
          <CardContent className="p-0">
            <AgentSection title="Agents" agents={agentRows} loading={isLoading} />
            <AgentSection title="Sales" agents={salesRows} loading={isLoading} />

            {!isLoading && filtered.length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No team members match "{search}"
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StaffLayout>
  );
}
