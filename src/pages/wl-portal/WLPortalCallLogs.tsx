import { useState, useEffect, useMemo } from 'react';
import { Search, Phone, Clock, User, Filter, Mail, Hash, Download, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WLPortalLayout } from '@/components/wl-portal/WLPortalLayout';
import { useWLPortal } from '@/contexts/WLPortalContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  // NOTE: --cta and --destructive resolve to the identical HSL value in
  // index.css, so 'completed' must use an explicit green rather than the
  // cta token to stay visually distinct from 'missed'.
  completed: 'bg-green-500/10 text-green-700 dark:text-green-400',
  missed: 'bg-destructive/10 text-destructive',
  voicemail: 'bg-brand-rose text-heading',
};

const CLIENT_TIME_ZONE = 'America/Toronto';

/**
 * Calls carry a dedicated call_date/call_time pair (the telephony system's
 * recorded wall-clock time) separate from created_at (DB insert time, which
 * can lag behind the actual call and isn't reliable for display). Prefer
 * call_date/call_time — parsed with no timezone suffix so JS treats it as a
 * literal wall-clock value rather than reinterpreting it through the
 * viewer's browser timezone. Fall back to created_at (a true UTC instant)
 * rendered explicitly in the client's America/Toronto timezone.
 */
function formatCallDateTime(call: any, pattern: string): string {
  if (call.call_date) {
    const local = new Date(`${call.call_date}T${call.call_time || '00:00:00'}`);
    return format(local, pattern);
  }
  return new Intl.DateTimeFormat('en-US', {
    timeZone: CLIENT_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(call.created_at));
}

function callDateKey(call: any): string {
  if (call.call_date) return call.call_date;
  // Derive the Toronto calendar date from created_at for calls without call_date.
  return new Intl.DateTimeFormat('en-CA', { timeZone: CLIENT_TIME_ZONE }).format(new Date(call.created_at));
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export default function WLPortalCallLogs() {
  const { clientInfo } = useWLPortal();
  const [calls, setCalls] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCall, setSelectedCall] = useState<any | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [summaryOpen, setSummaryOpen] = useState(false);

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

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Search + date-range filtered, before excluding missed calls — used for
  // the "Total" stat so it reflects everything in the selected range.
  const dateFiltered = useMemo(() => calls.filter(call => {
    const matchesSearch =
      call.caller_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      call.caller_phone?.includes(searchQuery) ||
      call.disposition?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    const key = callDateKey(call);
    if (dateFrom && key < dateFrom) return false;
    if (dateTo && key > dateTo) return false;
    return true;
  }), [calls, searchQuery, dateFrom, dateTo]);

  // Main log only ever shows completed/answered calls.
  const filtered = useMemo(
    () => dateFiltered.filter(call => (call.status || 'completed') !== 'missed'),
    [dateFiltered]
  );

  const summary = useMemo(() => {
    const total = dateFiltered.length;
    const completed = filtered.length;
    const missed = total - completed;
    const totalHandleSeconds = filtered.reduce((sum, c) => sum + (c.handle_time_seconds || 0), 0);
    const avgHandleSeconds = completed > 0 ? Math.round(totalHandleSeconds / completed) : 0;
    const byDisposition = filtered.reduce<Record<string, number>>((acc, c) => {
      const key = c.disposition || 'Uncategorized';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return { total, completed, missed, avgHandleSeconds, totalHandleSeconds, byDisposition };
  }, [dateFiltered, filtered]);

  const exportCsv = () => {
    const headers = ['Caller', 'Phone', 'Email', 'Handle Time', 'Disposition', 'Date'];
    const rows = filtered.map(call => [
      call.caller_name || 'Unknown',
      call.caller_phone || '',
      call.caller_email || '',
      formatDuration(call.handle_time_seconds),
      call.disposition || '',
      formatCallDateTime(call, 'MMM d, yyyy h:mm a'),
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => csvEscape(String(v))).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `call-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <WLPortalLayout title="Call Logs" description="View and search your call history">
      {/* Summary pills */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total Calls</p>
            <p className="text-2xl font-bold text-heading mt-1">{summary.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-heading mt-1">{summary.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Avg Handle Time</p>
            <p className="text-2xl font-bold text-heading mt-1">{formatDuration(summary.avgHandleSeconds)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <CardTitle className="text-lg">All Calls ({filtered.length})</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search calls..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end sm:justify-between">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                <div className="space-y-1">
                  <Label htmlFor="date-from" className="text-xs text-muted-foreground">From</Label>
                  <Input id="date-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="date-to" className="text-xs text-muted-foreground">To</Label>
                  <Input id="date-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSummaryOpen(true)}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Summary
                </Button>
                <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
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
                    <TableHead>Handle Time</TableHead>
                    <TableHead>Disposition</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((call) => (
                    <TableRow
                      key={call.id}
                      onClick={() => setSelectedCall(call)}
                      className="cursor-pointer"
                    >
                      <TableCell><span className="font-medium">{call.caller_name || 'Unknown'}</span></TableCell>
                      <TableCell>{call.caller_phone || '-'}</TableCell>
                      <TableCell>{formatDuration(call.handle_time_seconds)}</TableCell>
                      <TableCell>{call.disposition ? <Badge variant="outline">{call.disposition}</Badge> : '-'}</TableCell>
                      <TableCell>{formatCallDateTime(call, 'MMM d, yyyy h:mm a')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selectedCall} onOpenChange={(o) => !o && setSelectedCall(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedCall?.caller_name || 'Unknown caller'}</SheetTitle>
            <SheetDescription>
              {selectedCall && formatCallDateTime(selectedCall, 'MMM d, yyyy h:mm a')}
            </SheetDescription>
          </SheetHeader>
          {selectedCall && (
            <div className="mt-6 space-y-4 text-sm">
              <div>
                <Badge variant="secondary" className={statusColors[selectedCall.status || 'completed']}>
                  {selectedCall.status || 'completed'}
                </Badge>
                {selectedCall.disposition && (
                  <Badge variant="outline" className="ml-2">{selectedCall.disposition}</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedCall.caller_phone || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedCall.caller_email || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Handle Time</p>
                  <p className="font-medium">{formatDuration(selectedCall.handle_time_seconds)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Direction</p>
                  <p className="font-medium capitalize">{selectedCall.call_direction || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Agent</p>
                  <p className="font-medium">{selectedCall.agent_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Campaign</p>
                  <p className="font-medium">{selectedCall.campaign_name || '-'}</p>
                </div>
              </div>
              {selectedCall.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="p-3 bg-muted rounded-md whitespace-pre-wrap">{selectedCall.notes}</p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Call Summary</DialogTitle></DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Total Calls</p>
                <p className="text-xl font-bold text-heading">{summary.total}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-xl font-bold text-heading">{summary.completed}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Missed</p>
                <p className="text-xl font-bold text-heading">{summary.missed}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Handle Time</p>
                <p className="text-xl font-bold text-heading">{formatDuration(summary.avgHandleSeconds)}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Handle Time</p>
              <p className="font-medium">{formatDuration(summary.totalHandleSeconds)}</p>
            </div>
            {Object.keys(summary.byDisposition).length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">By Disposition</p>
                <div className="space-y-1.5">
                  {Object.entries(summary.byDisposition).map(([disposition, count]) => (
                    <div key={disposition} className="flex items-center justify-between">
                      <span>{disposition}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </WLPortalLayout>
  );
}
