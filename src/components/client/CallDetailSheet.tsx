import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Phone, Clock, Hash, User, FileText, Mic, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

interface CallDetail {
  id: string;
  caller_name: string | null;
  caller_phone: string | null;
  caller_email: string | null;
  caller_number: string | null;
  handle_time_seconds: number | null;
  call_type: string | null;
  status: string | null;
  disposition: string | null;
  campaign_name: string | null;
  agent_name: string | null;
  dnis: string | null;
  notes: string | null;
  billable_minutes: number | null;
  created_at: string;
}

interface RelatedCall {
  id: string;
  caller_name: string | null;
  created_at: string;
  status: string | null;
  handle_time_seconds: number | null;
}

interface CallDetailSheetProps {
  callId: string | null;
  leadId: string | null;
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  missed: 'bg-red-100 text-red-700',
  voicemail: 'bg-yellow-100 text-yellow-700',
  transferred: 'bg-blue-100 text-blue-700',
};

function formatDuration(secs: number | null) {
  if (!secs) return '—';
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="text-sm text-muted-foreground w-28 shrink-0">{label}</span>
      <span className="text-sm font-medium break-words min-w-0">{value || '—'}</span>
    </div>
  );
}

export function CallDetailSheet({ callId, leadId, onClose }: CallDetailSheetProps) {
  const { data: call, isLoading } = useQuery({
    queryKey: ['call-detail', callId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('call_logs')
        .select(
          'id, caller_name, caller_phone, caller_email, caller_number, handle_time_seconds, call_type, status, disposition, campaign_name, agent_name, dnis, notes, billable_minutes, created_at',
        )
        .eq('id', callId!)
        .maybeSingle();
      if (error) throw error;
      return data as CallDetail | null;
    },
    enabled: !!callId,
    staleTime: 60_000,
  });

  const { data: relatedCalls = [] } = useQuery({
    queryKey: ['call-related', callId, call?.caller_phone, leadId],
    queryFn: async () => {
      const { data } = await supabase
        .from('call_logs')
        .select('id, caller_name, created_at, status, handle_time_seconds')
        .eq('client_id', leadId!)
        .eq('caller_phone', call!.caller_phone!)
        .neq('id', callId!)
        .order('created_at', { ascending: false })
        .limit(3);
      return (data ?? []) as RelatedCall[];
    },
    enabled: !!callId && !!leadId && !!call?.caller_phone,
    staleTime: 60_000,
  });

  return (
    <Sheet open={!!callId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">Call Details</SheetTitle>
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-md" />
            ))}
          </div>
        ) : !call ? (
          <p className="text-sm text-muted-foreground py-4">Call not found.</p>
        ) : (
          <div className="space-y-6 py-2">
            {/* Caller section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{call.caller_name || 'Unknown Caller'}</p>
                  <p className="text-sm text-muted-foreground">{call.caller_phone || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="secondary"
                  className={STATUS_COLORS[call.status ?? ''] ?? ''}
                >
                  {call.status || 'unknown'}
                </Badge>
                {call.disposition && (
                  <Badge variant="outline" className="text-xs">{call.disposition}</Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Call details */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />Call Info
              </p>
              <DetailRow
                label="Date & Time"
                value={format(new Date(call.created_at), 'MMM d, yyyy h:mm a')}
              />
              <DetailRow
                label="Duration"
                value={
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    {formatDuration(call.handle_time_seconds)}
                    {call.billable_minutes != null && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({call.billable_minutes} billable min)
                      </span>
                    )}
                  </span>
                }
              />
              <DetailRow label="Call Type" value={call.call_type} />
              <DetailRow label="Campaign" value={call.campaign_name} />
              <DetailRow label="Agent" value={call.agent_name} />
              {call.caller_email && (
                <DetailRow label="Email" value={call.caller_email} />
              )}
              {call.dnis && (
                <DetailRow
                  label="DNIS"
                  value={
                    <span className="flex items-center gap-1 font-mono text-xs">
                      <Hash className="w-3 h-3" />{call.dnis}
                    </span>
                  }
                />
              )}
            </div>

            {/* Notes */}
            {call.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />Agent Notes
                  </p>
                  <div className="bg-muted/40 rounded-md p-3">
                    <p className="text-sm whitespace-pre-wrap">{call.notes}</p>
                  </div>
                </div>
              </>
            )}

            {/* Related calls */}
            {relatedCalls.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5" />Previous Calls from This Number
                  </p>
                  <div className="space-y-2">
                    {relatedCalls.map((rc) => (
                      <div
                        key={rc.id}
                        className="flex items-center justify-between py-1.5 px-3 rounded-md bg-muted/30 text-sm"
                      >
                        <span className="text-muted-foreground">
                          {format(new Date(rc.created_at), 'MMM d, yyyy')}
                        </span>
                        <span>{formatDuration(rc.handle_time_seconds)}</span>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${STATUS_COLORS[rc.status ?? ''] ?? ''}`}
                        >
                          {rc.status || 'unknown'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
