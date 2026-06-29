import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Search, Phone, Clock, PhoneIncoming, PhoneOutgoing,
  Calendar, MessageSquare, User, Building2, PhoneCall,
} from 'lucide-react';
import { format } from 'date-fns';

// agent_notes is a shared column across both agent and supervisor call log views
interface CallLog {
  id: string;
  client_id: string;
  created_at: string;
  acw_seconds: number | null;
  agent_name: string | null;
  agent_notes: string | null;
  billable_minutes: number | null;
  call_date: string | null;
  call_direction: string | null;
  call_duration: number | null;
  call_time: string | null;
  call_type: string | null;
  caller_email: string | null;
  caller_name: string | null;
  caller_number: string | null;
  caller_phone: string | null;
  campaign_name: string | null;
  disposition: string | null;
  dnis: string | null;
  external_call_id: string | null;
  handle_time_seconds: number | null;
  import_id: string | null;
  notes: string | null;
  status: string | null;
  talk_time_seconds: number | null;
}

interface RelatedCall {
  id: string;
  call_date: string | null;
  call_time: string | null;
  disposition: string | null;
  status: string | null;
  agent_name: string | null;
  talk_time_seconds: number | null;
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getStatusBadge(status: string | null) {
  switch (status) {
    case 'completed':
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Completed</Badge>;
    case 'missed':
      return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Missed</Badge>;
    case 'voicemail':
      return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Voicemail</Badge>;
    default:
      return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
  }
}

function getDispositionBadge(disposition: string | null) {
  if (!disposition) return null;
  return (
    <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20 max-w-full truncate">
      {disposition}
    </Badge>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || <span className="text-muted-foreground font-normal">—</span>}</p>
    </div>
  );
}

export default function SupervisorCallLogs() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);

  const { data: calls, isLoading } = useQuery({
    queryKey: ['supervisor-call-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('call_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as unknown as CallLog[];
    },
  });

  const { data: relatedCalls = [], isFetching: relatedLoading } = useQuery({
    queryKey: ['supervisor-call-logs-related', selectedCall?.caller_phone],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('call_logs')
        .select('id, call_date, call_time, disposition, status, agent_name, talk_time_seconds')
        .eq('caller_phone', selectedCall!.caller_phone!)
        .neq('id', selectedCall!.id)
        .order('call_date', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as RelatedCall[];
    },
    enabled: !!selectedCall?.caller_phone,
  });

  const saveNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { data, error } = await supabase
        .from('call_logs')
        .update({ agent_notes: notes } as any)
        .eq('id', id)
        .select('id');
      if (error) {
        console.error('call_logs agent_notes update error:', error);
        throw error;
      }
      if (!data || data.length === 0) {
        throw new Error('No permission to update this call log');
      }
    },
    onSuccess: (_, variables) => {
      setSelectedCall(prev => prev ? { ...prev, agent_notes: variables.notes } : null);
      queryClient.setQueryData<CallLog[]>(['supervisor-call-logs'], (old) =>
        old?.map(c => c.id === variables.id ? { ...c, agent_notes: variables.notes } : c)
      );
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
      toast.success('Notes saved');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save notes');
    },
  });

  const handleOpenCall = (call: CallLog) => {
    setSelectedCall(call);
    setNotesDraft(call.agent_notes || '');
    setNoteSaved(false);
  };

  const filteredCalls = calls?.filter(call => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || (
      call.caller_name?.toLowerCase().includes(q) ||
      call.caller_phone?.toLowerCase().includes(q) ||
      call.caller_number?.toLowerCase().includes(q) ||
      call.disposition?.toLowerCase().includes(q) ||
      call.agent_name?.toLowerCase().includes(q)
    );
    const matchesStatus = statusFilter === 'all' || call.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: calls?.length ?? 0,
    completed: calls?.filter(c => c.status === 'completed').length ?? 0,
    missed: calls?.filter(c => c.status === 'missed').length ?? 0,
  };

  const callDateTime = (call: CallLog) => {
    const date = call.call_date ?? call.created_at;
    const time = call.call_time;
    try {
      if (time) return format(new Date(`${date}T${time}`), 'MMM d, yyyy h:mm a');
      return format(new Date(date), 'MMM d, yyyy');
    } catch {
      return date ?? '—';
    }
  };

  return (
    <StaffLayout role="supervisor">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Call Logs</h1>
          <p className="text-muted-foreground">
            All calls across the team
            {!isLoading && calls !== undefined && (
              <span className="ml-1 text-foreground font-medium">
                — {calls.length} call{calls.length !== 1 ? 's' : ''} found
              </span>
            )}
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <PhoneIncoming className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.completed}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Missed</CardTitle>
              <PhoneOutgoing className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.missed}</div></CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, agent, or disposition..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="missed">Missed</SelectItem>
              <SelectItem value="voicemail">Voicemail</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Caller</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Disposition</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredCalls?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Phone className="w-8 h-8 text-muted-foreground/40" />
                        <p className="font-medium">
                          {searchQuery || statusFilter !== 'all'
                            ? 'No calls match your filters'
                            : 'No calls recorded yet'}
                        </p>
                        <p className="text-sm text-muted-foreground max-w-xs">
                          {searchQuery || statusFilter !== 'all'
                            ? 'Try clearing the search or status filter.'
                            : 'Calls will appear here once recorded in Five9.'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCalls?.map((call) => (
                    <TableRow
                      key={call.id}
                      className="cursor-pointer hover:bg-muted/60 transition-colors"
                      onClick={() => handleOpenCall(call)}
                    >
                      <TableCell className="font-medium">{call.caller_name || 'Unknown'}</TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">{call.caller_phone || '—'}</TableCell>
                      <TableCell>{call.agent_name || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDuration(call.talk_time_seconds)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {call.disposition
                          ? <span className="text-sm text-muted-foreground truncate max-w-[160px] block">{call.disposition}</span>
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>{getStatusBadge(call.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{callDateTime(call)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedCall} onOpenChange={(open) => { if (!open) setSelectedCall(null); }}>
        <SheetContent className="w-full sm:max-w-[480px] flex flex-col p-0 gap-0">
          {selectedCall && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 shrink-0 border-b">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <SheetTitle className="text-lg font-semibold truncate">
                      {selectedCall.caller_name || 'Unknown Caller'}
                    </SheetTitle>
                    {selectedCall.caller_phone && (
                      <p className="text-sm text-muted-foreground tabular-nums mt-0.5">
                        {selectedCall.caller_phone}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {getStatusBadge(selectedCall.status)}
                    {getDispositionBadge(selectedCall.disposition)}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{callDateTime(selectedCall)}</span>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <DetailRow
                    label="Agent"
                    value={
                      <span className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        {selectedCall.agent_name}
                      </span>
                    }
                  />
                  <DetailRow
                    label="Campaign"
                    value={
                      <span className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        {selectedCall.campaign_name}
                      </span>
                    }
                  />
                  <DetailRow label="Direction" value={selectedCall.call_direction} />
                  <DetailRow label="DNIS" value={selectedCall.dnis} />
                  <DetailRow
                    label="Talk Time"
                    value={
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        {formatDuration(selectedCall.talk_time_seconds)}
                      </span>
                    }
                  />
                  <DetailRow label="Handle Time" value={formatDuration(selectedCall.handle_time_seconds)} />
                  {selectedCall.acw_seconds != null && (
                    <DetailRow label="ACW" value={formatDuration(selectedCall.acw_seconds)} />
                  )}
                  {selectedCall.call_type && (
                    <DetailRow label="Call Type" value={selectedCall.call_type} />
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-semibold">Call Notes</h4>
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">from Five9</span>
                  </div>
                  {selectedCall.notes ? (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap rounded-md border bg-muted/30 px-3 py-2">
                      {selectedCall.notes}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No call notes recorded.</p>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-semibold">Supervisor Notes</Label>
                  </div>
                  <Textarea
                    placeholder="Add notes about this call..."
                    value={notesDraft}
                    onChange={(e) => {
                      setNotesDraft(e.target.value);
                      if (noteSaved) setNoteSaved(false);
                    }}
                    rows={4}
                    className="resize-none"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => saveNotesMutation.mutate({ id: selectedCall.id, notes: notesDraft })}
                      disabled={saveNotesMutation.isPending || (!noteSaved && notesDraft === (selectedCall.agent_notes || ''))}
                      className={noteSaved ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                    >
                      {saveNotesMutation.isPending ? 'Saving...' : noteSaved ? 'Saved ✓' : 'Save Notes'}
                    </Button>
                  </div>
                </div>

                {selectedCall.caller_phone && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <h4 className="text-sm font-semibold">
                          Related Calls from {selectedCall.caller_phone}
                        </h4>
                      </div>
                      {relatedLoading ? (
                        <div className="space-y-2">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                          ))}
                        </div>
                      ) : relatedCalls.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">No other calls from this number.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {relatedCalls.map((rc) => {
                            const rcDate = rc.call_date ? format(new Date(rc.call_date), 'MMM d, yyyy') : '—';
                            return (
                              <div
                                key={rc.id}
                                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
                              >
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{rc.disposition || rc.status || 'Unknown'}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {rcDate} · {rc.agent_name || 'Unknown agent'} · {formatDuration(rc.talk_time_seconds)}
                                  </p>
                                </div>
                                {getStatusBadge(rc.status)}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </StaffLayout>
  );
}
