import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ExternalLink, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SupervisorContextDrawer, DrawerSection } from '../SupervisorContextDrawer';
import { useMockableQuery } from '@/hooks/useMockableQuery';
import { useMockMode } from '@/hooks/useMockMode';
import { MOCK_SCRIPT_REVIEWS, MOCK_SHIFT_INVOICES, MOCK_PERF_REVIEWS } from '@/lib/mockData';
import type { ReviewsSubMode } from '@/hooks/useSupervisorWorkspaceMode';

interface Props {
  sub: ReviewsSubMode;
  onSubChange: (s: ReviewsSubMode) => void;
  itemId: string | null;
  onSelect: (id: string) => void;
}

const subTabs: { id: ReviewsSubMode; label: string }[] = [
  { id: 'scripts', label: 'Script Reviews' },
  { id: 'shifts', label: 'Shift Reviews' },
  { id: 'performance', label: 'Performance' },
];

export function ReviewsMode({ sub, onSubChange, itemId, onSelect }: Props) {
  return (
    <>
      <aside className="w-44 shrink-0 h-full flex flex-col border-r bg-card overflow-hidden">
        <div className="h-9 px-3 flex items-center border-b shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Section
          </p>
        </div>
        <nav className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {subTabs.map((s) => (
            <button
              key={s.id}
              onClick={() => onSubChange(s.id)}
              className={cn(
                'w-full text-left px-2 py-1.5 rounded text-xs transition-colors',
                sub === s.id
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'hover:bg-accent text-foreground',
              )}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </aside>

      {sub === 'scripts' && <ScriptReviewsPane itemId={itemId} onSelect={onSelect} />}
      {sub === 'shifts' && <ShiftReviewsPane itemId={itemId} onSelect={onSelect} />}
      {sub === 'performance' && <PerformancePane itemId={itemId} onSelect={onSelect} />}
    </>
  );
}

/* ---------------- Script Reviews (default, realtime) ---------------- */

function ScriptReviewsPane({ itemId, onSelect }: { itemId: string | null; onSelect: (id: string) => void }) {
  const qc = useQueryClient();
  const mockOn = useMockMode();

  const { data: rows = [], isLoading } = useMockableQuery({
    queryKey: ['sup-ws-script-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('script_change_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const clientIds = [...new Set((data || []).map((r) => r.client_id))];
      const { data: profiles } = clientIds.length
        ? await supabase.from('profiles').select('id, full_name').in('id', clientIds)
        : { data: [] };
      const map = new Map((profiles || []).map((p) => [p.id, p.full_name]));
      return (data || []).map((r) => ({ ...r, client_name: map.get(r.client_id) || 'Unknown' }));
    },
    mockData: () => MOCK_SCRIPT_REVIEWS as any[],
  });

  useEffect(() => {
    if (mockOn) return; // No realtime in mock mode
    const channel = supabase
      .channel('sup-ws-script-reviews-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'script_change_requests' }, () => {
        qc.invalidateQueries({ queryKey: ['sup-ws-script-reviews'] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, mockOn]);

  const selected = rows.find((r) => r.id === itemId);
  const pending = rows.filter((r) => ['pending', 'in_review', 'needs_info'].includes(r.status));

  return (
    <>
      <div className="w-80 shrink-0 border-r bg-card flex flex-col overflow-hidden">
        <div className="h-9 px-3 flex items-center justify-between border-b shrink-0">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Scripts · {pending.length} pending
          </h3>
          <span className="text-[10px] text-muted-foreground">{rows.length}</span>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-1.5 space-y-1">
            {isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            {!isLoading && rows.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-8">No requests</div>
            )}
            {rows.map((r) => (
              <button
                key={r.id}
                onClick={() => onSelect(r.id)}
                className={cn(
                  'w-full text-left p-2 rounded-md border transition-colors',
                  itemId === r.id ? 'bg-primary/10 border-primary' : 'hover:bg-accent border-transparent',
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-[10px] capitalize h-4 px-1">
                    {r.status.replace('_', ' ')}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs font-medium line-clamp-2 leading-tight">{r.title}</p>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">{r.client_name}</p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Select a script change request
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-4 max-w-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">{selected.title}</h2>
                  <p className="text-xs text-muted-foreground">
                    {selected.client_name} · {format(new Date(selected.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/staff/supervisor/script-reviews" className="gap-1">
                    Open full
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
              {selected.description && (
                <p className="text-sm whitespace-pre-wrap border rounded-md p-3 bg-muted/30">
                  {selected.description}
                </p>
              )}
              <div className="text-xs text-muted-foreground">
                Use the Script Reviews page for full approve/reject actions and review messages.
              </div>
            </div>
          </ScrollArea>
        )}
      </div>

      <SupervisorContextDrawer title="Script Request">
        {selected ? (
          <>
            <DrawerSection title="Type">
              <Badge variant="outline" className="capitalize">
                {selected.request_type?.replace(/_/g, ' ')}
              </Badge>
            </DrawerSection>
            <DrawerSection title="Status">
              <Badge variant="outline" className="capitalize">
                {selected.status?.replace('_', ' ')}
              </Badge>
            </DrawerSection>
            <DrawerSection title="Source">
              <Badge variant="outline" className="capitalize">
                {selected.source}
              </Badge>
            </DrawerSection>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Select a request to see details.</p>
        )}
      </SupervisorContextDrawer>
    </>
  );
}

/* ---------------- Shift Reviews ---------------- */

function ShiftReviewsPane({ itemId, onSelect }: { itemId: string | null; onSelect: (id: string) => void }) {
  const { data: invoices = [], isLoading } = useMockableQuery({
    queryKey: ['sup-ws-shift-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_invoices')
        .select('*')
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      const ids = [...new Set((data || []).map((i) => i.agent_id))];
      const { data: profiles } = ids.length
        ? await supabase.from('profiles').select('id, full_name').in('id', ids)
        : { data: [] };
      const map = new Map((profiles || []).map((p) => [p.id, p.full_name]));
      return (data || []).map((i) => ({ ...i, agent_name: map.get(i.agent_id) || 'Unknown' }));
    },
    mockData: () => MOCK_SHIFT_INVOICES as any[],
  });

  const selected = invoices.find((i) => i.id === itemId);

  return (
    <>
      <div className="w-80 shrink-0 border-r bg-card flex flex-col overflow-hidden">
        <div className="h-9 px-3 flex items-center justify-between border-b shrink-0">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Shift Invoices
          </h3>
          <span className="text-[10px] text-muted-foreground">{invoices.length}</span>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-1.5 space-y-1">
            {isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            {!isLoading && invoices.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-8">No invoices</div>
            )}
            {invoices.map((inv) => (
              <button
                key={inv.id}
                onClick={() => onSelect(inv.id)}
                className={cn(
                  'w-full text-left p-2 rounded-md border transition-colors',
                  itemId === inv.id ? 'bg-primary/10 border-primary' : 'hover:bg-accent border-transparent',
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium truncate">{inv.agent_name}</p>
                  <Badge variant="outline" className="text-[10px] capitalize h-4 px-1">
                    {inv.status?.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {format(new Date(inv.period_start), 'MMM d')} – {format(new Date(inv.period_end), 'MMM d')}
                  {' · '}
                  {Number(inv.net_hours).toFixed(1)}h
                </p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Select a shift invoice
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-4 max-w-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">{selected.agent_name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(selected.period_start), 'MMM d')} – {format(new Date(selected.period_end), 'MMM d, yyyy')}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/staff/supervisor/shift-reviews" className="gap-1">
                    Approve / Reject
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <Stat label="Total hours" value={Number(selected.total_hours).toFixed(2)} />
                <Stat label="Net hours" value={Number(selected.net_hours).toFixed(2)} />
                <Stat label="Break (min)" value={String(selected.total_break_minutes)} />
              </div>
              {selected.agent_notes && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Agent notes
                  </p>
                  <p className="text-sm whitespace-pre-wrap border rounded-md p-3 bg-muted/30">
                    {selected.agent_notes}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      <SupervisorContextDrawer title="Invoice">
        {selected ? (
          <>
            <DrawerSection title="Status">
              <Badge variant="outline" className="capitalize">
                {selected.status?.replace('_', ' ')}
              </Badge>
            </DrawerSection>
            <DrawerSection title="Submitted">
              <p>{format(new Date(selected.submitted_at), 'MMM d, h:mm a')}</p>
            </DrawerSection>
            {selected.payout_date && (
              <DrawerSection title="Payout date">
                <p>{format(new Date(selected.payout_date), 'MMM d, yyyy')}</p>
              </DrawerSection>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Select a shift invoice.</p>
        )}
      </SupervisorContextDrawer>
    </>
  );
}

/* ---------------- Performance ---------------- */

function PerformancePane({ itemId, onSelect }: { itemId: string | null; onSelect: (id: string) => void }) {
  const { data: reviews = [], isLoading } = useMockableQuery({
    queryKey: ['sup-ws-perf-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_performance_reviews')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const ids = [...new Set((data || []).map((r) => r.agent_id))];
      const { data: profiles } = ids.length
        ? await supabase.from('profiles').select('id, full_name').in('id', ids)
        : { data: [] };
      const map = new Map((profiles || []).map((p) => [p.id, p.full_name]));
      return (data || []).map((r) => ({ ...r, agent_name: map.get(r.agent_id) || 'Unknown' }));
    },
    mockData: () => MOCK_PERF_REVIEWS as any[],
  });

  const selected = reviews.find((r) => r.id === itemId);

  return (
    <>
      <div className="w-80 shrink-0 border-r bg-card flex flex-col overflow-hidden">
        <div className="h-9 px-3 flex items-center justify-between border-b shrink-0">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Reviews
          </h3>
          <span className="text-[10px] text-muted-foreground">{reviews.length}</span>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-1.5 space-y-1">
            {isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            {!isLoading && reviews.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-8">No reviews</div>
            )}
            {reviews.map((r) => (
              <button
                key={r.id}
                onClick={() => onSelect(r.id)}
                className={cn(
                  'w-full text-left p-2 rounded-md border transition-colors',
                  itemId === r.id ? 'bg-primary/10 border-primary' : 'hover:bg-accent border-transparent',
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium truncate">{r.agent_name}</p>
                  <Badge variant={r.status === 'published' ? 'default' : 'outline'} className="text-[10px] h-4 px-1 capitalize">
                    {r.status}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {Number(r.overall_score).toFixed(1)} · {r.period_start} → {r.period_end}
                </p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Select a performance review
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-4 max-w-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">{selected.agent_name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {selected.period_start} → {selected.period_end}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/staff/supervisor/performance" className="gap-1">
                    Open full
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-3 text-sm">
                <Stat label="Quality" value={`${selected.quality_score}/5`} />
                <Stat label="Attendance" value={`${selected.attendance_score}/5`} />
                <Stat label="Communication" value={`${selected.communication_score}/5`} />
                <Stat label="Overall" value={Number(selected.overall_score).toFixed(1)} />
              </div>
              {selected.strengths && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Strengths
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{selected.strengths}</p>
                </div>
              )}
              {selected.areas_for_improvement && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Areas for improvement
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{selected.areas_for_improvement}</p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      <SupervisorContextDrawer title="Review">
        {selected ? (
          <DrawerSection title="Status">
            <Badge variant={selected.status === 'published' ? 'default' : 'outline'} className="capitalize">
              {selected.status}
            </Badge>
          </DrawerSection>
        ) : (
          <p className="text-xs text-muted-foreground">Select a review.</p>
        )}
      </SupervisorContextDrawer>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded-md p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold mt-0.5">{value}</p>
    </div>
  );
}
