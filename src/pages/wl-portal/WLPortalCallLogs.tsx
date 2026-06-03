import { useState, useEffect } from 'react';
import { Search, Phone, Clock, User, Filter, Mail, Hash } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { WLPortalLayout } from '@/components/wl-portal/WLPortalLayout';
import { useWLPortal } from '@/contexts/WLPortalContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  completed: 'bg-cta/10 text-cta',
  missed: 'bg-destructive/10 text-destructive',
  voicemail: 'bg-brand-rose text-heading',
};

export default function WLPortalCallLogs() {
  const { clientInfo } = useWLPortal();
  const [calls, setCalls] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!clientInfo) return;
    const fetchCalls = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from('wl_call_logs')
        .select('*')
        .eq('wl_client_id', clientInfo.id)
        .order('created_at', { ascending: false });
      if (data) setCalls(data);
      setIsLoading(false);
    };
    fetchCalls();
  }, [clientInfo]);

  const filtered = calls.filter(
    call =>
      call.caller_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      call.caller_phone?.includes(searchQuery) ||
      call.disposition?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <WLPortalLayout title="Call Logs" description="View and search your call history">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <CardTitle className="text-lg">All Calls ({calls.length})</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search calls..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Phone className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium text-heading mb-2">No calls yet</h3>
              <p className="text-sm">Your call history will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Caller</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Disposition</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((call) => (
                    <TableRow key={call.id}>
                      <TableCell><span className="font-medium">{call.caller_name || 'Unknown'}</span></TableCell>
                      <TableCell>{call.caller_phone || '-'}</TableCell>
                      <TableCell>{formatDuration(call.handle_time_seconds)}</TableCell>
                      <TableCell>{call.disposition ? <Badge variant="outline">{call.disposition}</Badge> : '-'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusColors[call.status || 'completed']}>
                          {call.status || 'completed'}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(call.created_at), 'MMM d, yyyy h:mm a')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </WLPortalLayout>
  );
}
