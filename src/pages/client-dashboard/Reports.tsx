import { useState, useEffect } from 'react';
import { Phone, Clock, TrendingDown, BarChart3, Download, FileText, Table2, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { downloadCallReportXlsx } from '@/lib/callReportXlsx';
import { downloadCallReportPdf } from '@/lib/callReportPdf';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { useClientCallSummary, useClientCallLogs, useCallDispositionBreakdown } from '@/hooks/useCallReport';

const PAGE_SIZE = 20;
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const statusColors: Record<string, string> = {
  completed: 'bg-cta/10 text-cta',
  missed: 'bg-destructive/10 text-destructive',
  voicemail: 'bg-brand-rose text-heading',
  transferred: 'bg-blue-100 text-blue-700',
};

function formatDuration(seconds: number | null) {
  if (!seconds) return '–';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function currentPeriod() {
  return format(new Date(), 'yyyy-MM');
}

function periodLabel(period: string) {
  return format(parseISO(`${period}-01`), 'MMMM yyyy');
}

function buildPeriodOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({ value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy') });
  }
  return options;
}

export default function Reports() {
  const { user } = useAuth();
  const [leadId, setLeadId] = useState<string | null>(null);

  // Resolve the leads.id for this auth user — call_logs.client_id is a FK to leads.id, not auth.uid()
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('leads')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => { if (data) setLeadId(data.id); });
  }, [user?.id]);

  const [period, setPeriod] = useState(currentPeriod());
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dispositionFilter, setDispositionFilter] = useState('');
  const [page, setPage] = useState(0);
  const [dailyData, setDailyData] = useState<{ day: string; calls: number }[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(0); }, [period, debouncedSearch, dispositionFilter]);

  const summary = useClientCallSummary(leadId, period);
  const logs = useClientCallLogs(leadId, period, {
    disposition: dispositionFilter || undefined,
    search: debouncedSearch || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const disposition = useCallDispositionBreakdown(leadId, period);

  // Build daily chart
  useEffect(() => {
    if (!leadId || !period) return;
    const start = startOfMonth(parseISO(`${period}-01`));
    const end = endOfMonth(start);
    supabase
      .from('call_logs')
      .select('call_date')
      .eq('client_id', leadId)
      .gte('call_date', format(start, 'yyyy-MM-dd'))
      .lte('call_date', format(end, 'yyyy-MM-dd'))
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        for (const row of data ?? []) {
          if (row.call_date) counts[row.call_date] = (counts[row.call_date] ?? 0) + 1;
        }
        const days = eachDayOfInterval({ start, end }).map((d) => {
          const key = format(d, 'yyyy-MM-dd');
          return { day: format(d, 'MMM d'), calls: counts[key] ?? 0 };
        });
        setDailyData(days);
      });
  }, [leadId, period]);

  const totalPages = Math.ceil((logs.data?.count ?? 0) / PAGE_SIZE);
  const periodOptions = buildPeriodOptions();
  const s = summary.data;

  const hasData = !logs.isLoading && (logs.data?.count ?? 0) > 0;

  const handleExportCsv = async () => {
    if (!leadId) return;
    const start = format(startOfMonth(parseISO(`${period}-01`)), 'yyyy-MM-dd');
    const end = format(endOfMonth(parseISO(`${period}-01`)), 'yyyy-MM-dd');
    const { data } = await (supabase as any)
      .from('call_logs')
      .select('call_date, call_time, caller_name, caller_phone, agent_name, campaign_name, handle_time_seconds, billable_minutes, disposition, status')
      .eq('client_id', leadId)
      .gte('call_date', start)
      .lte('call_date', end)
      .order('call_date', { ascending: false });

    if (!data?.length) return;
    const headers = ['Date', 'Time', 'Caller', 'Phone', 'Agent', 'Campaign', 'Duration (s)', 'Billable Min', 'Disposition', 'Status'];
    const rows = data.map((r: any) => [
      r.call_date ?? '', r.call_time ?? '', r.caller_name ?? '', r.caller_phone ?? '',
      r.agent_name ?? '', r.campaign_name ?? '', r.handle_time_seconds ?? '',
      r.billable_minutes ?? '', r.disposition ?? '', r.status ?? '',
    ]);
    const csv = [headers, ...rows].map((row) => row.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-call-report-${period}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const handleExportXlsx = async () => {
    if (!leadId) return;
    const start = format(startOfMonth(parseISO(`${period}-01`)), 'yyyy-MM-dd');
    const end = format(endOfMonth(parseISO(`${period}-01`)), 'yyyy-MM-dd');
    const { data } = await (supabase as any)
      .from('call_logs')
      .select('call_date, call_time, caller_phone, agent_name, campaign_name, handle_time_seconds, billable_minutes, disposition, status, call_direction, notes')
      .eq('client_id', leadId)
      .gte('call_date', start)
      .lte('call_date', end)
      .order('call_date', { ascending: false });
    downloadCallReportXlsx(data ?? [], summary.data ?? null, 'my-call-report', period);
  };

  const handleExportPdf = async () => {
    if (!leadId) return;
    const start = format(startOfMonth(parseISO(`${period}-01`)), 'yyyy-MM-dd');
    const end = format(endOfMonth(parseISO(`${period}-01`)), 'yyyy-MM-dd');
    const { data } = await (supabase as any)
      .from('call_logs')
      .select('call_date, call_time, caller_name, caller_phone, agent_name, disposition, handle_time_seconds, status')
      .eq('client_id', leadId)
      .gte('call_date', start)
      .lte('call_date', end)
      .order('call_date', { ascending: false });
    await downloadCallReportPdf(data ?? [], summary.data ?? null, 'my-call-report', period);
  };

  return (
    <DashboardLayout
      title="Call Reports"
      description={`Monthly call activity — ${periodLabel(period)}`}
    >
      <div className="space-y-6" data-testid="client-reports-page">
        {/* Period picker + export */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-44" data-testid="client-period-picker">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={handleExportCsv} disabled={!hasData} data-testid="client-export-csv-btn">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={handleExportXlsx} disabled={!hasData} data-testid="client-export-xlsx-btn">
              <Table2 className="w-4 h-4 mr-2" />
              Export XLSX
            </Button>
            <Button variant="outline" onClick={handleExportPdf} disabled={!hasData} data-testid="client-export-pdf-btn">
              <FileText className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="client-summary-cards">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full p-2 bg-blue-100">
                  <Phone className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Calls</p>
                  <p className="text-2xl font-bold">{summary.isLoading ? '–' : (s?.total_calls ?? 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full p-2 bg-green-100">
                  <BarChart3 className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Minutes</p>
                  <p className="text-2xl font-bold">{summary.isLoading ? '–' : (s?.total_minutes ? Number(s.total_minutes).toFixed(0) : '0')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full p-2 bg-red-100">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Missed Calls</p>
                  <p className="text-2xl font-bold">{summary.isLoading ? '–' : (s?.missed_calls ?? 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full p-2 bg-purple-100">
                  <Clock className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Handle Time</p>
                  <p className="text-2xl font-bold">{summary.isLoading ? '–' : formatDuration(s?.avg_handle_seconds ? Math.round(s.avg_handle_seconds) : null)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">Calls per Day — {periodLabel(period)}</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyData.every((d) => d.calls === 0) ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No calls this period</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dailyData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                    <Tooltip />
                    <Bar dataKey="calls" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Disposition Breakdown</CardTitle>
            </CardHeader>
            <CardContent data-testid="client-disposition-chart">
              {disposition.isLoading ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
              ) : !disposition.data?.length ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={disposition.data}
                      dataKey="count"
                      nameKey="disposition"
                      cx="50%"
                      cy="45%"
                      outerRadius={70}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {disposition.data.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Call Log Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <CardTitle className="text-base">
                Call Logs
                {logs.data?.count != null && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">({logs.data.count})</span>
                )}
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 w-48"
                  />
                </div>
                <Select value={dispositionFilter || 'all'} onValueChange={(v) => setDispositionFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-40">
                    <Filter className="w-3 h-3 mr-1" />
                    <SelectValue placeholder="Disposition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dispositions</SelectItem>
                    {disposition.data?.map((d) => (
                      <SelectItem key={d.disposition} value={d.disposition}>{d.disposition}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {logs.isLoading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Loading…</div>
            ) : !logs.data?.rows.length ? (
              <div className="text-center py-12">
                <Phone className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-sm text-muted-foreground">No call logs for this period</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Caller</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Disposition</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.data.rows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {row.call_date ? format(parseISO(row.call_date), 'MMM d, yyyy') : '–'}
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{row.call_time ?? '–'}</TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{row.caller_name || 'Unknown'}</div>
                            {row.caller_phone && (
                              <div className="text-xs text-muted-foreground">{row.caller_phone}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{row.agent_name || '–'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{row.campaign_name || '–'}</TableCell>
                          <TableCell className="text-sm">{formatDuration(row.handle_time_seconds)}</TableCell>
                          <TableCell>
                            {row.disposition ? (
                              <Badge variant="outline" className="text-xs">{row.disposition}</Badge>
                            ) : '–'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`text-xs ${statusColors[row.status ?? ''] ?? ''}`}>
                              {row.status ?? 'unknown'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
