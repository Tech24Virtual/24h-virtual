import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock3, CheckCircle2, RotateCcw, UserCheck, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────────────

interface ReEngageLead {
  id: string;
  name: string;
  email: string;
  company: string | null;
  service_type: string | null;
  pipeline_stage: string | null;
  churned_at: string | null;
  churn_reason: string | null;
  wl_partner_id: string | null;
  wl_churn_contact_eligible_at: string | null;
  white_label_partners: { company_name: string | null } | null;
}

type SubTab = 'churned' | 're_engage';

// ── Component ──────────────────────────────────────────────────────────────

export default function AdminReEngage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState<SubTab>('churned');
  const [busyId, setBusyId] = useState<string | null>(null);

  const {
    data: leads = [],
    isLoading,
  } = useQuery({
    queryKey: ['admin-reengage-clients'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select(
          'id, name, email, company, service_type, pipeline_stage, churned_at, churn_reason, wl_partner_id, wl_churn_contact_eligible_at, white_label_partners(company_name)',
        )
        .in('pipeline_stage', ['churned', 're_engage'])
        .order('churned_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as unknown as ReEngageLead[];
    },
  });

  const churnedCount = leads.filter((l) => l.pipeline_stage === 'churned').length;
  const reEngageCount = leads.filter((l) => l.pipeline_stage === 're_engage').length;

  const filtered = useMemo(
    () => leads.filter((l) => l.pipeline_stage === subTab),
    [leads, subTab],
  );

  function isEligible(lead: ReEngageLead): boolean {
    if (!lead.wl_partner_id) return true;
    if (!lead.wl_churn_contact_eligible_at) return false;
    return new Date(lead.wl_churn_contact_eligible_at) <= new Date();
  }

  async function handleMoveToReEngage(lead: ReEngageLead) {
    setBusyId(lead.id);
    try {
      const { error } = await supabase
        .from('leads')
        .update({ pipeline_stage: 're_engage' })
        .eq('id', lead.id);
      if (error) throw error;
      toast.success(`${lead.name} moved to Re-Engage`);
      queryClient.invalidateQueries({ queryKey: ['admin-reengage-clients'] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to move client to Re-Engage');
    } finally {
      setBusyId(null);
    }
  }

  async function handleMarkWonBack(lead: ReEngageLead) {
    setBusyId(lead.id);
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          pipeline_stage: 'active',
          churned_at: null,
          churn_reason: null,
          wl_churn_contact_eligible_at: null,
        })
        .eq('id', lead.id);
      if (error) throw error;
      toast.success(`${lead.name} marked as won back`);
      queryClient.invalidateQueries({ queryKey: ['admin-reengage-clients'] });
      queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark client as won back');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-heading">Re-Engage</h1>
        <p className="text-muted-foreground mt-1">
          Churned clients and win-back candidates. WL-partner clients carry a 3-month exclusivity
          window before they're eligible for direct re-engagement.
        </p>
      </div>

      <Tabs value={subTab} onValueChange={(v) => setSubTab(v as SubTab)}>
        <TabsList>
          <TabsTrigger value="churned">Churned ({churnedCount})</TabsTrigger>
          <TabsTrigger value="re_engage">Re-Engage ({reEngageCount})</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {subTab === 'churned' ? `Churned (${filtered.length})` : `Re-Engage (${filtered.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-md" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2">
                {subTab === 'churned' ? 'No churned clients' : 'No clients ready to re-engage'}
              </p>
              <p className="text-sm">
                {subTab === 'churned'
                  ? 'Clients marked as churned from the Active tab appear here.'
                  : 'Move eligible churned clients here when you\'re ready to reach back out.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Churned</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>WL Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((lead) => {
                    const eligible = isEligible(lead);
                    const busy = busyId === lead.id;
                    return (
                      <TableRow
                        key={lead.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/admin/leads/${lead.id}`)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{lead.name}</p>
                            <p className="text-xs text-muted-foreground">{lead.email}</p>
                            {lead.company && (
                              <p className="text-xs text-muted-foreground">{lead.company}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{lead.service_type || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {lead.churned_at ? format(new Date(lead.churned_at), 'MMM d, yyyy') : '—'}
                        </TableCell>
                        <TableCell className="text-sm max-w-[240px] truncate" title={lead.churn_reason || ''}>
                          {lead.churn_reason || '—'}
                        </TableCell>
                        <TableCell>
                          {!lead.wl_partner_id ? (
                            <span className="text-xs text-muted-foreground">Direct</span>
                          ) : eligible ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Eligible to Contact
                            </Badge>
                          ) : (
                            <Badge variant="outline" title={lead.white_label_partners?.company_name || undefined}>
                              <Clock3 className="w-3 h-3 mr-1" />
                              WL Restricted
                              {lead.wl_churn_contact_eligible_at &&
                                ` — eligible ${format(new Date(lead.wl_churn_contact_eligible_at), 'MMM d, yyyy')}`}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            {subTab === 'churned' && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!eligible || busy}
                                onClick={() => handleMoveToReEngage(lead)}
                              >
                                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                                Move to Re-Engage
                              </Button>
                            )}
                            <Button
                              size="sm"
                              disabled={busy}
                              onClick={() => handleMarkWonBack(lead)}
                            >
                              <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                              Mark as Won Back
                            </Button>
                          </div>
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
    </div>
  );
}
