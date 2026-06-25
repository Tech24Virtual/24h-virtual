import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  Phone, Clock, User, FileText, Plus, MessageSquare, AlertCircle,
} from 'lucide-react';

interface OutboundCallDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  requestId: string | null;
  role: 'agent' | 'supervisor' | 'admin';
}

const OUTCOME_META: Record<string, { label: string; icon: string; colorClass: string }> = {
  completed:    { label: 'Call Complete',  icon: '✅', colorClass: 'text-green-600 dark:text-green-400' },
  connected:    { label: 'Call Complete',  icon: '✅', colorClass: 'text-green-600 dark:text-green-400' },
  no_answer:    { label: 'No Answer',      icon: '📵', colorClass: 'text-yellow-600 dark:text-yellow-400' },
  voicemail:    { label: 'Voicemail Left', icon: '📬', colorClass: 'text-blue-600 dark:text-blue-400' },
  busy:         { label: 'Busy',           icon: '🔄', colorClass: 'text-orange-600 dark:text-orange-400' },
  wrong_number: { label: 'Wrong Number',   icon: '❌', colorClass: 'text-red-600 dark:text-red-400' },
  follow_up:    { label: 'Follow Up',      icon: '📋', colorClass: 'text-purple-600 dark:text-purple-400' },
  note:         { label: 'Note',           icon: '📝', colorClass: 'text-muted-foreground' },
};

function RequestStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'completed':   return <Badge className="bg-green-500/10 text-green-700 border border-green-300 dark:text-green-400 dark:border-green-700">Completed</Badge>;
    case 'failed':      return <Badge variant="destructive">Failed</Badge>;
    case 'in_progress': return <Badge className="bg-blue-500/10 text-blue-700 border border-blue-300 dark:text-blue-400 dark:border-blue-700">In Progress</Badge>;
    case 'claimed':     return <Badge className="bg-blue-500/10 text-blue-700 border border-blue-300 dark:text-blue-400 dark:border-blue-700">Claimed</Badge>;
    case 'retry_pending': return <Badge variant="secondary">Retry Pending</Badge>;
    default:            return <Badge variant="outline" className="capitalize">{status}</Badge>;
  }
}

function OutcomeLabel({ outcome }: { outcome: string }) {
  const meta = OUTCOME_META[outcome] ?? { label: outcome, icon: '•', colorClass: 'text-muted-foreground' };
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium ${meta.colorClass}`}>
      <span aria-hidden>{meta.icon}</span>
      {meta.label}
    </span>
  );
}

export function OutboundCallDetailDrawer({ open, onClose, requestId, role }: OutboundCallDetailDrawerProps) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteText, setNoteText] = useState('');

  const { data: req, isLoading: reqLoading } = useQuery({
    queryKey: ['outbound-request-detail', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outbound_call_requests')
        .select('*, leads(name, company)')
        .eq('id', requestId!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!requestId && open,
  });

  const { data: attempts = [], isLoading: attemptsLoading } = useQuery<any[]>({
    queryKey: ['outbound-attempts', requestId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('outbound_call_attempts')
        .select('*')
        .eq('request_id', requestId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!requestId && open,
  });

  const addNoteMutation = useMutation({
    mutationFn: async (text: string) => {
      const { error } = await (supabase as any).from('outbound_call_attempts').insert({
        request_id: requestId!,
        agent_id: user!.id,
        agent_name: profile?.full_name || user!.email || 'Agent',
        attempt_number: attempts.length + 1,
        outcome: 'note',
        notes: text.trim(),
        handler_id: user!.id,
        handler_name: profile?.full_name || null,
        handler_role: role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outbound-attempts', requestId] });
      setNoteText('');
      setShowNoteForm(false);
      toast.success('Note added');
    },
    onError: () => toast.error('Failed to add note'),
  });

  const isLoading = reqLoading || attemptsLoading;
  const leadInfo = req?.leads as { name: string; company: string | null } | null;
  const canAddNote = role === 'supervisor' || role === 'admin' || req?.claimed_by === user?.id;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0 gap-0 overflow-hidden">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Phone className="h-4 w-4 text-primary" />
            Call Details
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : !req ? (
            <div className="p-8 text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Failed to load call details</p>
            </div>
          ) : (
            <>
              {/* Contact header */}
              <div className="px-6 py-4 border-b bg-muted/20">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-lg leading-tight">{req.contact_name}</h3>
                    <p className="text-sm font-mono text-muted-foreground">{req.contact_phone}</p>
                    {leadInfo && (
                      <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                        <User className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {leadInfo.name}{leadInfo.company ? ` — ${leadInfo.company}` : ''}
                        </span>
                      </p>
                    )}
                    {req.reason && (
                      <p className="text-sm text-muted-foreground mt-1">{req.reason}</p>
                    )}
                  </div>
                  <div className="shrink-0">
                    <RequestStatusBadge status={req.status} />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                  </span>
                  <span>{req.attempt_count} of {req.max_attempts} attempts</span>
                  {req.source && <Badge variant="outline" className="text-xs h-5">{req.source}</Badge>}
                  {req.urgency === 'urgent' && (
                    <Badge variant="destructive" className="text-xs h-5">Urgent</Badge>
                  )}
                </div>

                {req.scheduled_callback_at && req.status === 'pending' && (
                  <div className="mt-3 rounded-md bg-primary/10 border border-primary/20 px-3 py-2 text-xs font-medium text-primary">
                    Callback scheduled for {format(new Date(req.scheduled_callback_at), 'MMM d, h:mm a')}
                  </div>
                )}
              </div>

              {/* History timeline */}
              <div className="px-6 py-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Call History
                    {attempts.length > 0 && (
                      <Badge variant="secondary" className="text-xs">{attempts.length}</Badge>
                    )}
                  </h4>
                  {canAddNote && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 h-7 text-xs"
                      onClick={() => setShowNoteForm((v) => !v)}
                    >
                      <Plus className="h-3 w-3" />
                      Add Note
                    </Button>
                  )}
                </div>

                {/* Add note form */}
                {showNoteForm && (
                  <div className="mb-4 rounded-lg border bg-muted/20 p-3 space-y-2">
                    <Label className="text-xs font-medium">Add a note</Label>
                    <Textarea
                      rows={3}
                      placeholder="Add a note to this call..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      className="resize-none text-sm"
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setShowNoteForm(false); setNoteText(''); }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        disabled={!noteText.trim() || addNoteMutation.isPending}
                        onClick={() => addNoteMutation.mutate(noteText)}
                      >
                        {addNoteMutation.isPending ? 'Saving...' : 'Save Note'}
                      </Button>
                    </div>
                  </div>
                )}

                {attempts.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="h-10 w-10 mx-auto mb-2 rounded-full bg-muted flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm text-muted-foreground">No attempts logged yet</p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-[15px] top-4 bottom-4 w-px bg-border" />

                    <div className="space-y-5">
                      {attempts.map((attempt: any) => {
                        const isNote = attempt.outcome === 'note';
                        const meta = OUTCOME_META[attempt.outcome];
                        const agentName = attempt.handler_name || attempt.agent_name || 'Agent';
                        const agentRole = attempt.handler_role as string | null;

                        return (
                          <div key={attempt.id} className="flex gap-3">
                            {/* Timeline dot */}
                            <div
                              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-base ${
                                isNote
                                  ? 'bg-muted border-muted-foreground/30'
                                  : attempt.outcome === 'completed' || attempt.outcome === 'connected'
                                  ? 'bg-green-100 border-green-400 dark:bg-green-900/40 dark:border-green-600'
                                  : attempt.outcome === 'wrong_number'
                                  ? 'bg-red-100 border-red-400 dark:bg-red-900/40 dark:border-red-600'
                                  : 'bg-background border-border'
                              }`}
                            >
                              {meta?.icon ?? '•'}
                            </div>

                            <div className="flex-1 min-w-0 pt-0.5">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <OutcomeLabel outcome={attempt.outcome} />
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(attempt.created_at), 'MMM d, h:mm a')}
                                  </p>
                                </div>
                                {!isNote && (
                                  <Badge variant="outline" className="text-xs shrink-0">
                                    Attempt {attempt.attempt_number}
                                  </Badge>
                                )}
                              </div>

                              {attempt.notes && (
                                <div className="mt-2 rounded-md bg-muted/40 border px-3 py-2 text-sm whitespace-pre-wrap">
                                  {attempt.notes}
                                </div>
                              )}

                              {/* Digital signature */}
                              <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1">
                                <span className="h-3 w-3 rounded-full bg-muted-foreground/25 shrink-0 inline-block" />
                                Logged by{' '}
                                <span className="font-medium text-foreground">{agentName}</span>
                                {agentRole && (
                                  <span className="capitalize">({agentRole})</span>
                                )}
                                {' · '}
                                {format(new Date(attempt.created_at), 'h:mm a')}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
