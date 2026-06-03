import { useEffect, useMemo, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { History, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ConvertEventRow {
  id: string;
  occurred_at: string;
  persona: string | null;
  surface: string | null;
  user_id: string | null;
  properties: Record<string, unknown> | null;
}

interface ProfileLite {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface LeadLite {
  id: string;
  name: string | null;
  company: string | null;
}

interface WLLeadLite {
  id: string;
  name: string | null;
  company: string | null;
}

const RANGE_DAYS: Record<string, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  all: 3650,
};

const TEMPLATE_LABEL: Record<string, string> = {
  direct_client_default: 'Direct Client Default',
  standard: 'Standard',
  inbound_only: 'Inbound Only',
  outbound_campaign: 'Outbound Campaign',
  hybrid: 'Hybrid',
  custom: 'Custom',
};

function templateLabel(key: string | undefined | null): string {
  if (!key) return '—';
  return TEMPLATE_LABEL[key] ?? key;
}

function personaLabel(persona: string | null): string {
  if (persona === 'wl_partner') return 'WL Partner';
  if (persona === 'admin') return 'Admin';
  return persona ?? 'Unknown';
}

export function ActiveAccountsAuditPanel() {
  const [range, setRange] = useState<keyof typeof RANGE_DAYS>('30d');
  const [events, setEvents] = useState<ConvertEventRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [leads, setLeads] = useState<Record<string, LeadLite>>({});
  const [wlLeads, setWlLeads] = useState<Record<string, WLLeadLite>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const since = new Date(
        Date.now() - RANGE_DAYS[range] * 24 * 60 * 60 * 1000,
      ).toISOString();

      const { data, error } = await supabase
        .from('dashboard_events')
        .select('id, occurred_at, persona, surface, user_id, properties')
        .eq('target', 'convert_lead_to_account')
        .gte('occurred_at', since)
        .order('occurred_at', { ascending: false })
        .limit(200);

      if (cancelled) return;
      if (error) {
        console.warn('audit-panel fetch error', error);
        setEvents([]);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as ConvertEventRow[];
      setEvents(rows);

      // Resolve actor profiles + lead names in batch.
      const userIds = Array.from(
        new Set(rows.map((r) => r.user_id).filter((v): v is string => !!v)),
      );
      const directLeadIds = Array.from(
        new Set(
          rows
            .filter((r) => r.persona !== 'wl_partner')
            .map((r) => (r.properties?.lead_id as string | undefined) ?? null)
            .filter((v): v is string => !!v),
        ),
      );
      const wlLeadIds = Array.from(
        new Set(
          rows
            .filter((r) => r.persona === 'wl_partner')
            .map((r) => (r.properties?.lead_id as string | undefined) ?? null)
            .filter((v): v is string => !!v),
        ),
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const profilesPromise = userIds.length
        ? sb.from('profiles').select('user_id, full_name, email').in('user_id', userIds)
        : Promise.resolve({ data: [] });
      const leadsPromise = directLeadIds.length
        ? sb.from('leads').select('id, name, company').in('id', directLeadIds)
        : Promise.resolve({ data: [] });
      const wlLeadsPromise = wlLeadIds.length
        ? sb.from('wl_partner_leads').select('id, name, company').in('id', wlLeadIds)
        : Promise.resolve({ data: [] });

      const [profilesRes, leadsRes, wlLeadsRes] = (await Promise.all([
        profilesPromise,
        leadsPromise,
        wlLeadsPromise,
      ])) as [
        { data: ProfileLite[] | null },
        { data: LeadLite[] | null },
        { data: WLLeadLite[] | null },
      ];

      if (cancelled) return;

      const profileMap: Record<string, ProfileLite> = {};
      ((profilesRes.data ?? []) as ProfileLite[]).forEach((p) => {
        profileMap[p.user_id] = p;
      });
      setProfiles(profileMap);

      const leadMap: Record<string, LeadLite> = {};
      ((leadsRes.data ?? []) as LeadLite[]).forEach((l) => {
        leadMap[l.id] = l;
      });
      setLeads(leadMap);

      const wlMap: Record<string, WLLeadLite> = {};
      ((wlLeadsRes.data ?? []) as WLLeadLite[]).forEach((l) => {
        wlMap[l.id] = l;
      });
      setWlLeads(wlMap);

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [range]);

  const totalConverted = events.length;

  const rowsView = useMemo(
    () =>
      events.map((e) => {
        const props = e.properties ?? {};
        const leadId = props.lead_id as string | undefined;
        const isWL = e.persona === 'wl_partner';
        const lead = leadId
          ? isWL
            ? wlLeads[leadId]
            : leads[leadId]
          : undefined;
        const actor = e.user_id ? profiles[e.user_id] : undefined;
        const tplKey = (props.template as string | undefined) ??
          (props.tenant_kind === 'direct_24h' ? 'direct_client_default' : undefined);

        return {
          id: e.id,
          occurredAt: e.occurred_at,
          persona: e.persona,
          surface: e.surface,
          actorName:
            actor?.full_name ??
            actor?.email ??
            (e.user_id ? `${e.user_id.slice(0, 8)}…` : 'Unknown'),
          actorEmail: actor?.email ?? null,
          accountName: lead?.company ?? lead?.name ?? leadId ?? '—',
          template: templateLabel(tplKey),
          alreadyExisted: props.already_existed === true,
        };
      }),
    [events, profiles, leads, wlLeads],
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              Conversion Audit Log
            </CardTitle>
            <CardDescription>
              Who turned a lead into an active account, when it happened, and which starter
              template was applied.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={range} onValueChange={(v) => setRange(v as keyof typeof RANGE_DAYS)}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? 'Collapse audit log' : 'Expand audit log'}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : totalConverted === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No conversions recorded in this window. Convert a qualified lead to populate this
              log.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Converted by</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead className="text-right">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rowsView.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[200px]">{r.accountName}</span>
                          {r.alreadyExisted && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1">
                              re-run
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{r.actorName}</div>
                        {r.actorEmail && r.actorEmail !== r.actorName && (
                          <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                            {r.actorEmail}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="text-xs capitalize"
                        >
                          {personaLabel(r.persona)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {r.template}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div
                          className="text-xs"
                          title={format(new Date(r.occurredAt), 'PPpp')}
                        >
                          {formatDistanceToNow(new Date(r.occurredAt), { addSuffix: true })}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {format(new Date(r.occurredAt), 'MMM d, yyyy HH:mm')}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default ActiveAccountsAuditPanel;
