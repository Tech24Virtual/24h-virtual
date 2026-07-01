import { useState, useEffect } from 'react';
import { Search, Phone, Clock, User, Filter, Mail, Hash } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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

const statusColors: Record<string, string> = {
  completed: 'bg-cta/10 text-cta',
  missed: 'bg-destructive/10 text-destructive',
  voicemail: 'bg-brand-rose text-heading',
};

export default function CallLogs() {
  const { user } = useAuth();
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) return;

    const fetchCalls = async () => {
      setIsLoading(true);

      // call_logs.client_id is FK to leads.id, not auth.uid() — resolve first
      const { data: leadRow } = await supabase
        .from('leads')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      const leadId = leadRow?.id ?? null;

      if (!leadId) {
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from('call_logs')
        .select('id, caller_name, caller_phone, caller_email, caller_number, handle_time_seconds, call_type, status, disposition, campaign_name, dnis, notes, created_at')
        .eq('client_id', leadId)
        .order('created_at', { ascending: false });

      if (data) setCalls(data);
      setIsLoading(false);
    };

    fetchCalls();
  }, [user]);

  const filteredCalls = calls.filter(
    call =>
      call.caller_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      call.caller_phone?.includes(searchQuery) ||
      call.disposition?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      call.campaign_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      call.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <DashboardLayout
      title="Call Logs"
      description="View and search your call history"
    >
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <CardTitle className="text-lg">All Calls ({calls.length})</CardTitle>
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
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
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
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Caller
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Phone
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Handle Time
                      </div>
                    </TableHead>
                    <TableHead>Disposition</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCalls.map((call) => (
                    <TableRow key={call.id}>
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
                          <Badge variant="outline" className="text-xs">
                            {call.disposition}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {call.campaign_name || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={statusColors[call.status || 'completed']}
                        >
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
    </DashboardLayout>
  );
}
