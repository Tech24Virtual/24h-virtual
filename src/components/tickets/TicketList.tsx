import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { MessageSquare, Loader2, User, Search, X, CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SourceBadge, PriorityBadge, StatusBadge, OriginBadge } from './SourceBadge';
import { TicketDetailDialog } from './TicketDetailDialog';
import { useRealtimeTickets } from '@/hooks/useRealtimeTickets';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SavedFilters, type FilterState } from '@/components/filters/SavedFilters';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TicketListProps {
  title?: string;
  sourceFilter?: string;
  workQueueFilter?: string;
  categoryFilter?: string;
  showSourceBadge?: boolean;
  limit?: number;
  showFilters?: boolean;
  showGroupFilter?: boolean;
  linkPrefix?: string;
}

const TICKET_GROUPS = [
  { value: 'all', label: 'All Groups' },
  { value: 'client', label: 'Clients' },
  { value: 'white_label', label: 'WL Partner' },
  { value: 'wl_escalation', label: 'WL Escalation' },
  { value: 'wl_forward', label: 'WL Forward' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'agent', label: 'Team — Agent' },
  { value: 'billing', label: 'Team — Billing' },
  { value: 'tech', label: 'Team — IT/Tech' },
  { value: 'hr', label: 'Team — HR' },
  { value: 'sales', label: 'Team — Sales' },
  { value: 'admin', label: 'Admin' },
] as const;

// Maps each group to the actual `source` / `work_queue` values found on
// support_tickets (verified via SELECT DISTINCT — see AdminTickets.tsx audit).
// agent/tech/hr/sales/admin have no tickets yet but are mapped to their real
// column-naming convention so the filter works once those queues are used.
const GROUP_SOURCE_MAP: Record<string, string[]> = {
  client: ['client_portal'],
  white_label: ['white_label_portal'],
  wl_escalation: ['white_label_escalation'],
  wl_forward: ['wl_forward'],
  supervisor: ['supervisor'],
  agent: ['agent'],
  billing: ['billing'],
  tech: ['tech'],
  hr: ['hr'],
  sales: ['sales'],
  admin: ['admin'],
};

type Ticket = {
  id: string;
  ticket_number: number;
  title: string;
  priority: string;
  status: string;
  source: string;
  category: string | null;
  originating_source: string | null;
  submitter_name: string | null;
  submitter_email: string | null;
  created_at: string;
  lead_id: string | null;
  assigned_to: string | null;
  last_activity_at: string | null;
  last_activity_by: string | null;
};

type AssigneeProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type TicketView = {
  ticket_id: string;
  last_viewed_at: string;
};

export function TicketList({
  title = 'Support Tickets',
  sourceFilter,
  workQueueFilter,
  categoryFilter,
  showSourceBadge = true,
  limit = 20,
  showFilters = true,
  showGroupFilter = false,
  linkPrefix = '/admin/tickets',
}: TicketListProps) {
  const viewContext = workQueueFilter ? `dept:${workQueueFilter}` : sourceFilter ? `dept:${sourceFilter}` : 'default';
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const currentFilters: FilterState = useMemo(() => ({
    searchText: searchQuery || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    priority: priorityFilter !== 'all' ? priorityFilter : undefined,
    assignee: assigneeFilter !== 'all' ? assigneeFilter : undefined,
    dateFrom: dateFrom?.toISOString(),
    dateTo: dateTo?.toISOString(),
  }), [searchQuery, statusFilter, priorityFilter, assigneeFilter, dateFrom, dateTo]);

  const applyFilters = useCallback((filters: FilterState) => {
    setSearchQuery(filters.searchText || '');
    setStatusFilter(filters.status || 'all');
    setPriorityFilter(filters.priority || 'all');
    setAssigneeFilter(filters.assignee || 'all');
    setDateFrom(filters.dateFrom ? new Date(filters.dateFrom) : undefined);
    setDateTo(filters.dateTo ? new Date(filters.dateTo) : undefined);
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setAssigneeFilter('all');
    setGroupFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
  }, []);

  // Enable real-time updates
  useRealtimeTickets({ sourceFilter, workQueueFilter, categoryFilter });

  // Fetch assignee profiles for display
  const { data: assigneeProfiles = {} } = useQuery({
    queryKey: ['assignee-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url');
      
      if (error) throw error;
      
      const profileMap: Record<string, AssigneeProfile> = {};
      data?.forEach((profile) => {
        profileMap[profile.id] = profile;
      });
      return profileMap;
    },
  });

  const { data: tickets = [], isLoading, error } = useQuery({
    queryKey: ['tickets', sourceFilter, workQueueFilter, categoryFilter, statusFilter, priorityFilter, assigneeFilter, groupFilter, limit, dateFrom?.toISOString(), dateTo?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from('support_tickets')
        .select('id, ticket_number, title, priority, status, source, category, submitter_name, submitter_email, created_at, lead_id, assigned_to, originating_source, last_activity_at, last_activity_by, work_queue')
        .order('created_at', { ascending: false })
        .limit(limit);

      // Use work_queue for department isolation when available, fall back to source
      if (workQueueFilter) {
        query = query.eq('work_queue', workQueueFilter);
      } else if (sourceFilter) {
        query = query.eq('source', sourceFilter);
      } else if (groupFilter !== 'all') {
        const groupValues = GROUP_SOURCE_MAP[groupFilter] ?? [];
        if (groupValues.length > 0) {
          const inList = groupValues.join(',');
          query = query.or(`source.in.(${inList}),work_queue.in.(${inList})`);
        }
      }
      if (categoryFilter) {
        query = query.eq('category', categoryFilter);
      }
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (priorityFilter && priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter);
      }
      if (assigneeFilter === 'unassigned') {
        query = query.is('assigned_to', null);
      } else if (assigneeFilter && assigneeFilter !== 'all') {
        query = query.eq('assigned_to', assigneeFilter);
      }
      if (dateFrom) {
        query = query.gte('created_at', dateFrom.toISOString());
      }
      if (dateTo) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endOfDay.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Ticket[];
    },
  });

  // Fetch user's ticket views for highlighting (filtered by view context)
  const ticketIds = tickets.map(t => t.id);
  const { data: ticketViews = [] } = useQuery({
    queryKey: ['ticket-views', user?.id, ticketIds, viewContext],
    queryFn: async () => {
      if (!user?.id || ticketIds.length === 0) return [];
      const { data, error } = await supabase
        .from('ticket_views')
        .select('ticket_id, last_viewed_at')
        .eq('user_id', user.id)
        .eq('view_context', viewContext)
        .in('ticket_id', ticketIds);
      if (error) throw error;
      return data as TicketView[];
    },
    enabled: !!user?.id && ticketIds.length > 0,
  });

  const viewMap = useMemo(() => {
    const map: Record<string, string> = {};
    ticketViews.forEach(v => { map[v.ticket_id] = v.last_viewed_at; });
    return map;
  }, [ticketViews]);

  const isTicketHighlighted = useCallback((ticket: Ticket): boolean => {
    if (!user?.id) return false;
    if (!ticket.last_activity_at) return false;
    
    const lastViewed = viewMap[ticket.id];
    if (!lastViewed) return true; // Never viewed in this context = highlighted
    return new Date(ticket.last_activity_at) > new Date(lastViewed);
  }, [user?.id, viewMap]);

  // Filter tickets by search query (client-side for responsiveness)
  const filteredTickets = useMemo(() => {
    if (!searchQuery.trim()) return tickets;
    const query = searchQuery.toLowerCase();
    return tickets.filter(ticket => 
      ticket.title.toLowerCase().includes(query) ||
      ticket.ticket_number.toString().includes(query) ||
      ticket.submitter_name?.toLowerCase().includes(query) ||
      ticket.submitter_email?.toLowerCase().includes(query)
    );
  }, [tickets, searchQuery]);

  const activeFilterChips = useMemo(() => {
    const chips: { label: string; onRemove: () => void }[] = [];
    if (statusFilter !== 'all') chips.push({ label: `Status: ${statusFilter}`, onRemove: () => setStatusFilter('all') });
    if (priorityFilter !== 'all') chips.push({ label: `Priority: ${priorityFilter}`, onRemove: () => setPriorityFilter('all') });
    if (assigneeFilter !== 'all') chips.push({ label: `Assignee: ${assigneeFilter}`, onRemove: () => setAssigneeFilter('all') });
    if (groupFilter !== 'all') {
      const groupLabel = TICKET_GROUPS.find(g => g.value === groupFilter)?.label ?? groupFilter;
      chips.push({ label: `Group: ${groupLabel}`, onRemove: () => setGroupFilter('all') });
    }
    if (dateFrom) chips.push({ label: `From: ${format(dateFrom, 'MMM d')}`, onRemove: () => setDateFrom(undefined) });
    if (dateTo) chips.push({ label: `To: ${format(dateTo, 'MMM d')}`, onRemove: () => setDateTo(undefined) });
    return chips;
  }, [statusFilter, priorityFilter, assigneeFilter, groupFilter, dateFrom, dateTo]);

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error loading tickets</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {title}
          </CardTitle>
          {showFilters && (
            <SavedFilters
              storageKey={`saved-filters-${sourceFilter || categoryFilter || 'all'}`}
              currentFilters={currentFilters}
              onApply={applyFilters}
            />
          )}
        </div>
        {showFilters && (
          <div className="flex gap-2 flex-wrap">
            {showGroupFilter && (
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter by Group" />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_GROUPS.map(g => (
                    <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="waiting">Waiting</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <CalendarIcon className="h-4 w-4" />
                  {dateFrom || dateTo ? (
                    <span>
                      {dateFrom ? format(dateFrom, 'MMM d') : '...'} – {dateTo ? format(dateTo, 'MMM d') : '...'}
                    </span>
                  ) : (
                    'Date Range'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: dateFrom, to: dateTo }}
                  onSelect={(range) => {
                    setDateFrom(range?.from);
                    setDateTo(range?.to);
                  }}
                  numberOfMonths={1}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {/* Search Input */}
        {showFilters && (
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ticket #, title, or submitter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Active Filter Chips */}
        {activeFilterChips.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-4">
            {activeFilterChips.map((chip, i) => (
              <Badge key={i} variant="secondary" className="gap-1 cursor-pointer hover:bg-destructive/10" onClick={chip.onRemove}>
                {chip.label}
                <X className="h-3 w-3" />
              </Badge>
            ))}
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearAllFilters}>
              Clear all
            </Button>
          </div>
        )}

        {filteredTickets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{searchQuery ? 'No tickets match your search' : 'No tickets found'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((ticket) => {
              const assignee = ticket.assigned_to ? assigneeProfiles[ticket.assigned_to] : null;
              const highlighted = isTicketHighlighted(ticket);
              
              return (
                <div
                  key={ticket.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                    highlighted 
                      ? 'border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30' 
                      : 'bg-card hover:bg-accent/50'
                  }`}
                  onClick={() => {
                    setSelectedTicketId(ticket.id);
                    setDialogOpen(true);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs text-muted-foreground font-mono">
                        #{ticket.ticket_number}
                      </span>
                      {highlighted && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-0">
                          Updated
                        </Badge>
                      )}
                      {showSourceBadge && <SourceBadge source={ticket.source} />}
                      <OriginBadge originatingSource={ticket.originating_source} currentSource={ticket.source} />
                      <PriorityBadge priority={ticket.priority} />
                      <StatusBadge status={ticket.status} />
                      {assignee && (
                        <div className="flex items-center gap-1 ml-2" title={`Assigned to ${assignee.full_name}`}>
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={assignee.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {getInitials(assignee.full_name)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      )}
                      {!assignee && ticket.assigned_to === null && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                    <h4 className="font-medium truncate">{ticket.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {ticket.submitter_name || ticket.submitter_email || 'Unknown'} •{' '}
                      {format(new Date(ticket.created_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
      
      <TicketDetailDialog
        ticketId={selectedTicketId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        canManage={true}
        viewContext={viewContext}
      />
    </Card>
  );
}
