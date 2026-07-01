import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Phone, Clock, User, Filter, Mail, Hash } from 'lucide-react';
import { CallDetailSheet } from '@/components/client/CallDetailSheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface CallLog {
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
  dnis: string | null;
  notes: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-cta/10 text-cta',
  missed:    'bg-destructive/10 text-destructive',
  voicemail: 'bg-brand-rose text-heading',
};

function formatDuration(seconds: number | null) {
  if (!seconds) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function CallLogs() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  // 1. Resolve leadId (call_logs.client_id is FK to leads.id)
  const { data: lead } = useQuery({
    queryKey: ['client-lead', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('leads')
        .select('id, pipeline_stage')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // 2. Fetch call logs
  const { data: calls = [], isLoading } = useQuery({
    queryKey: ['client-call-logs', lead?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('call_logs')
        .select('id, caller_name, caller_phone, caller_email, caller_number, handle_time_seconds, call_type, status, disposition, campaign_name, dnis, notes, created_at')
        .eq('client_id', lead!.id)
        .order('created_at', { ascending: false });
      return (data || []) as CallLog[];
    },
    enabled: !!lead?.id,
    staleTime: 60_000,
  });

  const filteredCalls = calls.filter(call =>
    call.caller_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    call.caller_phone?.includes(searchQuery) ||
    call.disposition?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    call.campaign_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    call.notes?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <DashboardLayout>
      {/* Gradient header */}
      <div className="rounded-2xl border border-border p-6 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 mb-6">
        <h1 className="text-2xl font-bold text-heading">Call Logs</h1>
        <p className="text-muted-foreground mt-0.5">View and search your full call history</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <CardTitle className="text-lg">
              All Calls {!isLoading && `(${calls.length})`}
            </CardTitle>
            <div className="flex gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search calls..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : filteredCalls.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Phone className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium text-heading mb-2">No calls yet</h3>
              <p className="text-sm max-w-md mx-auto">
                Once you start receiving calls through 24H Virtual, they'll appear here
                with full details including caller info, duration, and notes.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><div className="flex items-center gap-2"><User className="w-4 h-4" />Caller</div></TableHead>
                    <TableHead><div className="flex items-center gap-2"><Phone className="w-4 h-4" />Phone</div></TableHead>
                    <TableHead><div className="flex items-center gap-2"><Clock className="w-4 h-4" />Handle Time</div></TableHead>
                    <TableHead>Disposition</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCalls.map((call) => (
                    <TableRow
                      key={call.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedCallId(call.id)}
                    >
                      <TableCell>
                        <div>
                          <span className="font-medium">{call.caller_name || 'Unknown'}</span>
                          {call.caller_email && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Mail className="w-3 h-3" />
                              {call.caller_email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span>{call.caller_phone || '-'}</span>
                          {call.dnis && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Hash className="w-3 h-3" />
                              DNIS: {call.dnis}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatDuration(call.handle_time_seconds)}</TableCell>
                      <TableCell>
                        {call.disposition ? (
                          <Badge variant="outline" className="text-xs">{call.disposition}</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {call.campaign_name || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={STATUS_COLORS[call.status || 'completed']}>
                          {call.status || 'completed'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(call.created_at), 'MMM d, yyyy h:mm a')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CallDetailSheet
        callId={selectedCallId}
        leadId={lead?.id ?? null}
        onClose={() => setSelectedCallId(null)}
      />
    </DashboardLayout>
  );
}
