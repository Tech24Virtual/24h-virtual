import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, UserPlus, Users, User as UserIcon, Flame } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { SALES_BOARD_STAGES, PIPELINE_STAGE_LABELS } from '@/lib/revenue/pipeline';

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  qualified: 'bg-purple-100 text-purple-800',
  proposal: 'bg-orange-100 text-orange-800',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
  active: 'bg-green-100 text-green-800',
};

const tempColors: Record<string, string> = {
  hot: 'bg-green-100 text-green-800',
  warm: 'bg-yellow-100 text-yellow-800',
  cold: 'bg-muted text-muted-foreground',
};

export default function SalesLeads() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'my' | 'all'>('all');
  const [followUpFilter, setFollowUpFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const { data: leads, isLoading } = useQuery({
    queryKey: ['sales-leads', stageFilter, sourceFilter, dateRange],
    queryFn: async () => {
      let query = supabase.from('leads').select('*').order('created_at', { ascending: false });
      if (stageFilter !== 'all') query = query.eq('pipeline_stage', stageFilter);
      if (sourceFilter !== 'all') query = query.eq('source', sourceFilter);
      if (dateRange.from) query = query.gte('created_at', dateRange.from.toISOString());
      if (dateRange.to) query = query.lte('created_at', dateRange.to.toISOString());
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const assignToMe = useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase.from('leads').update({ assigned_sales_rep: user!.id, last_contacted_at: new Date().toISOString() }).eq('id', leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-leads'] });
      toast({ title: 'Assigned', description: 'Lead assigned to you.' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to assign lead.', variant: 'destructive' }),
  });

  let filteredLeads = leads?.filter(
    (lead) =>
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.email.toLowerCase().includes(search.toLowerCase()) ||
      (lead.company?.toLowerCase().includes(search.toLowerCase()) ?? false)
  ) || [];

  if (viewMode === 'my') {
    filteredLeads = filteredLeads.filter(l => l.assigned_sales_rep === user?.id);
  }

  if (followUpFilter === 'due_today') {
    const today = format(new Date(), 'yyyy-MM-dd');
    filteredLeads = filteredLeads.filter(l => l.next_follow_up && format(new Date(l.next_follow_up), 'yyyy-MM-dd') === today);
  } else if (followUpFilter === 'overdue') {
    filteredLeads = filteredLeads.filter(l => l.next_follow_up && new Date(l.next_follow_up) < new Date());
  } else if (followUpFilter === 'none') {
    filteredLeads = filteredLeads.filter(l => !l.next_follow_up);
  }

  const sources = [...new Set(leads?.map((l) => l.source).filter(Boolean) || [])];

  return (
    <StaffLayout role="sales">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Leads</h1>
            <p className="text-muted-foreground">View and manage all sales leads</p>
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button variant={viewMode === 'my' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('my')}>
              <UserIcon className="h-4 w-4 mr-1" />My Leads
            </Button>
            <Button variant={viewMode === 'all' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('all')}>
              <Users className="h-4 w-4 mr-1" />All Leads
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name, email, or company..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-full md:w-[150px]"><SelectValue placeholder="Stage" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {SALES_BOARD_STAGES.map((s) => <SelectItem key={s} value={s}>{PIPELINE_STAGE_LABELS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-full md:w-[150px]"><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {sources.map((s) => <SelectItem key={s} value={s!}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={followUpFilter} onValueChange={setFollowUpFilter}>
                <SelectTrigger className="w-full md:w-[150px]"><SelectValue placeholder="Follow-ups" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Follow-ups</SelectItem>
                  <SelectItem value="due_today">Due Today</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="none">No Follow-up Set</SelectItem>
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full md:w-auto">
                    <Calendar className="h-4 w-4 mr-2" />
                    {dateRange.from ? dateRange.to ? `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}` : format(dateRange.from, 'MMM d, yyyy') : 'Date Range'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent mode="range" selected={{ from: dateRange.from, to: dateRange.to }} onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })} initialFocus />
                </PopoverContent>
              </Popover>
              {(stageFilter !== 'all' || sourceFilter !== 'all' || dateRange.from || followUpFilter !== 'all') && (
                <Button variant="ghost" onClick={() => { setStageFilter('all'); setSourceFilter('all'); setDateRange({}); setFollowUpFilter('all'); }}>Clear</Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Leads Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{viewMode === 'my' ? 'My Leads' : 'All Leads'}</span>
              <Badge variant="secondary">{filteredLeads.length} leads</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No leads found matching your criteria</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Temp</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Follow-up</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead) => (
                      <TableRow
                        key={lead.id}
                        onClick={() => navigate(`/staff/sales/pipeline/leads/${lead.id}`)}
                        className="cursor-pointer"
                      >
                        <TableCell>
                          <div>
                            <div className="font-medium">{lead.name}</div>
                            <div className="text-sm text-muted-foreground">{lead.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{lead.company || '-'}</TableCell>
                        <TableCell><Badge className={statusColors[lead.pipeline_stage || 'new'] || 'bg-muted text-muted-foreground'}>{PIPELINE_STAGE_LABELS[lead.pipeline_stage as keyof typeof PIPELINE_STAGE_LABELS] || lead.pipeline_stage || 'New'}</Badge></TableCell>
                        <TableCell>
                          {lead.lead_temperature ? (
                            <Badge className={tempColors[lead.lead_temperature] || ''} variant="secondary">
                              <Flame className="h-3 w-3 mr-1" />{lead.lead_temperature}
                            </Badge>
                          ) : '—'}
                        </TableCell>
                        <TableCell>{lead.source || '-'}</TableCell>
                        <TableCell>{lead.service_type || '-'}</TableCell>
                        <TableCell>
                          {lead.next_follow_up ? (
                            <span className={`text-xs ${new Date(lead.next_follow_up) < new Date() ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                              {format(new Date(lead.next_follow_up), 'MMM d')}
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell>{lead.created_at ? format(new Date(lead.created_at), 'MMM d, yyyy') : '-'}</TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {lead.assigned_sales_rep !== user?.id && (
                              <Button variant="ghost" size="sm" onClick={() => assignToMe.mutate(lead.id)} title="Assign to me">
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StaffLayout>
  );
}
