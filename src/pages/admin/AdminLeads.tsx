import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, MoreHorizontal, Eye, Flame, Thermometer, Snowflake, Sparkles, AlertTriangle, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { calculateLeadScore, getScoreLabel, getScoreBadgeClasses, type ScoringRules, DEFAULT_SCORING_RULES } from '@/lib/leadScoring';
import { ConvertLeadToAccountDialog, type ConvertLeadInput } from '@/components/admin/ConvertLeadToAccountDialog';
import { AddLeadDialog } from '@/components/admin/AddLeadDialog';

// ── Types ──────────────────────────────────────────────────────────────────

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  notes: string | null;
  source: string | null;
  status: string | null;
  score: number | null;
  created_at: string;
  pipeline_stage: string | null;
  service_type: string | null;
  plan_minutes: number | null;
}

// ── Constants ──────────────────────────────────────────────────────────────

const CONVERTIBLE_STAGES = new Set(['qualified', 'sales', 'new']);

const PIPELINE_STAGE_COLORS: Record<string, string> = {
  new: 'bg-primary/10 text-primary',
  qualified: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  sales: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  onboarding: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  ready_for_billing: 'bg-cta/10 text-cta',
  active: 'bg-secondary/10 text-secondary',
  lost: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
  churned: 'bg-muted text-muted-foreground',
};

const PIPELINE_STAGE_LABELS: Record<string, string> = {
  new: 'New',
  qualified: 'Qualified',
  sales: 'Sales',
  onboarding: 'Onboarding',
  ready_for_billing: 'Ready for Billing',
  active: 'Active',
  lost: 'Lost',
  churned: 'Churned',
};

// Defined pipeline order for sorting stage pills
const STAGE_ORDER = ['new', 'qualified', 'sales', 'onboarding', 'ready_for_billing', 'active', 'lost', 'churned'];

// Graceful label for any stage, including unknown ones from DB
const getStageLabel = (stage: string) =>
  PIPELINE_STAGE_LABELS[stage] ?? stage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const SERVICE_LABELS: Record<string, string> = {
  'ai-receptionist': 'AI Receptionist',
  'message-assistant': 'Message Assistant',
  'virtual-receptionist': 'Virtual Receptionist',
  'virtual-secretary': 'Virtual Secretary',
};

// ── Component ──────────────────────────────────────────────────────────────

export default function AdminLeads() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [convertLead, setConvertLead] = useState<ConvertLeadInput | null>(null);
  const [addLeadOpen, setAddLeadOpen] = useState(false);

  // ── Leads query — excludes active accounts (Active tab) and
  // churned/re_engage clients (Re-Engage tab) so this view is the actual
  // pre-activation pipeline, not everything in the leads table. ───────────
  const {
    data: leads = [],
    isLoading,
    error: leadsError,
  } = useQuery({
    queryKey: ['admin-leads'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, email, phone, company, notes, source, status, score, created_at, pipeline_stage, service_type, plan_minutes')
        .not('pipeline_stage', 'in', '(active,churned,re_engage)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Lead[];
    },
  });

  // ── Scoring rules (from admin_settings, falls back to defaults silently) ─
  const { data: scoringRules = DEFAULT_SCORING_RULES } = useQuery({
    queryKey: ['admin-scoring-rules'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'lead_scoring_rules')
        .maybeSingle();
      return (data?.value as unknown as ScoringRules) ?? DEFAULT_SCORING_RULES;
    },
  });

  // ── Stage move — optimistic update, auto-revert on DB failure ─────────
  const updateLeadStage = async (id: string, pipeline_stage: string) => {
    queryClient.setQueryData<Lead[]>(['admin-leads'], (prev) =>
      (prev ?? []).map((l) => (l.id === id ? { ...l, pipeline_stage } : l))
    );
    const { error } = await supabase.from('leads').update({ pipeline_stage }).eq('id', id);
    if (error) queryClient.invalidateQueries({ queryKey: ['admin-leads'] });
  };

  // ── Derived ────────────────────────────────────────────────────────────

  const filteredLeads = leads.filter((lead) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      lead.name.toLowerCase().includes(q) ||
      lead.email.toLowerCase().includes(q) ||
      lead.company?.toLowerCase().includes(q);
    const matchesStage = stageFilter === 'all' || lead.pipeline_stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const stageCounts = leads.reduce((acc, lead) => {
    const stage = lead.pipeline_stage || 'new';
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Only stages with at least one lead, sorted by pipeline order
  const activeStages = Object.keys(stageCounts).sort((a, b) => {
    const ai = STAGE_ORDER.indexOf(a);
    const bi = STAGE_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Gradient header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border p-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-heading">Lead Management</h1>
            <p className="text-muted-foreground mt-1">
              {isLoading
                ? 'Loading…'
                : `${leads.length} leads · ${Object.keys(stageCounts).length} active stages`}
            </p>
          </div>
          <Button onClick={() => setAddLeadOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Pipeline stage stat pills (clickable filters — only stages with leads, plus All) */}
      <div className="flex flex-wrap gap-3">
        {/* All pill — always first */}
        <button
          onClick={() => setStageFilter('all')}
          className={`min-w-[80px] p-3 rounded-lg border transition-all text-left ${
            stageFilter === 'all'
              ? 'ring-2 ring-primary border-primary bg-primary/5'
              : 'hover:border-primary/50 bg-card'
          }`}
        >
          {isLoading ? (
            <Skeleton className="h-7 w-10 mb-1" />
          ) : (
            <div className="text-2xl font-bold">{leads.length}</div>
          )}
          <div className="text-xs text-muted-foreground">All</div>
        </button>

        {/* One pill per stage that actually has leads */}
        {activeStages.map((stage) => (
          <button
            key={stage}
            onClick={() => setStageFilter(stageFilter === stage ? 'all' : stage)}
            className={`min-w-[80px] p-3 rounded-lg border transition-all text-left ${
              stageFilter === stage
                ? 'ring-2 ring-primary border-primary bg-primary/5'
                : 'hover:border-primary/50 bg-card'
            }`}
          >
            <div className="text-2xl font-bold">{stageCounts[stage]}</div>
            <div className="text-xs text-muted-foreground">{getStageLabel(stage)}</div>
          </button>
        ))}
      </div>

      {/* Error state */}
      {!!leadsError && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3 text-destructive">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="text-sm">
              Failed to load leads. Verify{' '}
              <code className="font-mono text-xs">GRANT SELECT ON public.leads TO authenticated</code>{' '}
              has been applied.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Leads table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <CardTitle className="text-lg">
              {stageFilter === 'all'
                ? `All Leads (${leads.length})`
                : `${PIPELINE_STAGE_LABELS[stageFilter]} (${filteredLeads.length})`}
            </CardTitle>
            <div className="flex gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {STAGE_ORDER.map((value) => (
                    <SelectItem key={value} value={value}>{getStageLabel(value)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-md" />
              ))}
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2">No leads found</p>
              <p className="text-sm">
                {stageFilter !== 'all'
                  ? `No leads in the "${getStageLabel(stageFilter)}" stage`
                  : 'Add your first lead to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => {
                    const score = calculateLeadScore(lead, scoringRules);
                    const label = getScoreLabel(score, scoringRules.labels);
                    return (
                      <TableRow
                        key={lead.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/admin/leads/${lead.id}`)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{lead.name}</p>
                            <p className="text-sm text-muted-foreground">{lead.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{lead.company || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={getScoreBadgeClasses(label)}>
                            {label === 'hot' ? (
                              <Flame className="w-3 h-3 mr-1" />
                            ) : label === 'warm' ? (
                              <Thermometer className="w-3 h-3 mr-1" />
                            ) : (
                              <Snowflake className="w-3 h-3 mr-1" />
                            )}
                            {score} · {label.charAt(0).toUpperCase() + label.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={PIPELINE_STAGE_COLORS[lead.pipeline_stage || 'new'] ?? 'bg-muted text-muted-foreground'}
                          >
                            {getStageLabel(lead.pipeline_stage || 'new')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {lead.service_type ? (
                            <div>
                              <p className="text-sm">{SERVICE_LABELS[lead.service_type] || lead.service_type}</p>
                              {lead.plan_minutes && (
                                <p className="text-xs text-muted-foreground">{lead.plan_minutes} min</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{lead.source || 'Unknown'}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(lead.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/admin/leads/${lead.id}`)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {CONVERTIBLE_STAGES.has(lead.pipeline_stage || 'new') && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setConvertLead({
                                      id: lead.id,
                                      name: lead.name,
                                      email: lead.email,
                                      company: lead.company,
                                    })
                                  }
                                >
                                  <Sparkles className="w-4 h-4 mr-2 text-primary" />
                                  Convert to Active Account
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => updateLeadStage(lead.id, 'sales')}>
                                Move to Sales
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateLeadStage(lead.id, 'onboarding')}>
                                Move to Onboarding
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateLeadStage(lead.id, 'ready_for_billing')}>
                                Ready for Billing
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateLeadStage(lead.id, 'active')}>
                                Mark as Active
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateLeadStage(lead.id, 'churned')}>
                                Mark as Churned
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConvertLeadToAccountDialog
        lead={convertLead}
        open={!!convertLead}
        onOpenChange={(v) => !v && setConvertLead(null)}
        onConverted={() => queryClient.invalidateQueries({ queryKey: ['admin-leads'] })}
      />
      <AddLeadDialog
        open={addLeadOpen}
        onOpenChange={setAddLeadOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin-leads'] })}
      />
    </div>
  );
}
