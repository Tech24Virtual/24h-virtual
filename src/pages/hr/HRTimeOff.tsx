import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HRLayout } from '@/components/hr/HRLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function HRTimeOff() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    const { data, error } = await supabase.from('time_off_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Failed to load time off requests');
      setRequests([]);
      setIsLoading(false);
      return;
    }

    // time_off_requests.agent_id has no FK relationship registered for
    // PostgREST to embed, so profiles are fetched separately and merged.
    const agentIds = [...new Set((data ?? []).map(r => r.agent_id))];
    const profilesById: Record<string, { full_name: string | null }> = {};
    if (agentIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', agentIds);
      (profilesData ?? []).forEach(p => { profilesById[p.id] = { full_name: p.full_name }; });
    }

    setRequests((data ?? []).map(r => ({ ...r, profiles: profilesById[r.agent_id] ?? null })));
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleAction = async (id: string, action: 'approved' | 'denied') => {
    const { error } = await supabase.from('time_off_requests')
      .update({ status: action, reviewed_by: user!.id, reviewed_at: new Date().toISOString(), review_notes: reviewNotes[id] || null })
      .eq('id', id);
    if (error) { toast.error('Failed to update request'); return; }
    toast.success(`Request ${action}`);
    fetchData();
  };

  const filtered = requests.filter(t => filter === 'all' || t.status === filter);

  // Calendar data
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getTimeOffForDay = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return approvedRequests.filter(r => dateStr >= r.start_date && dateStr <= r.end_date);
  };

  return (
    <HRLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Time Off Management</h1>
          <p className="text-muted-foreground mt-1">Review requests and view calendar</p>
        </div>

        <Tabs defaultValue="requests">
          <TabsList>
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-4 mt-4">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Filter" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
              </SelectContent>
            </Select>

            {isLoading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <Card><CardContent className="p-12 text-center text-muted-foreground">No time off requests found.</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {filtered.map(req => (
                  <Card key={req.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{req.profiles?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(req.start_date), 'MMM d')} – {format(new Date(req.end_date), 'MMM d, yyyy')} • {req.request_type}
                          </p>
                          {req.reason && <p className="text-sm mt-1">{req.reason}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={req.status === 'approved' ? 'default' : req.status === 'denied' ? 'destructive' : 'secondary'} className="capitalize">
                            {req.status}
                          </Badge>
                        </div>
                      </div>
                      {req.status === 'pending' && (
                        <div className="flex items-center gap-2 pt-1">
                          <Textarea
                            placeholder="Review notes (optional)..."
                            value={reviewNotes[req.id] || ''}
                            onChange={e => setReviewNotes(p => ({ ...p, [req.id]: e.target.value }))}
                            rows={1}
                            className="flex-1"
                          />
                          <Button size="sm" onClick={() => handleAction(req.id, 'approved')}>Approve</Button>
                          <Button size="sm" variant="outline" onClick={() => handleAction(req.id, 'denied')}>Deny</Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="calendar" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="icon" onClick={() => setCalendarMonth(d => new Date(d.getFullYear(), d.getMonth() - 1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <CardTitle className="text-lg">{format(calendarMonth, 'MMMM yyyy')}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setCalendarMonth(d => new Date(d.getFullYear(), d.getMonth() + 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="text-center text-xs font-medium text-muted-foreground p-1">{d}</div>
                  ))}
                  {Array.from({ length: monthStart.getDay() }).map((_, i) => <div key={`empty-${i}`} />)}
                  {days.map(day => {
                    const offs = getTimeOffForDay(day);
                    return (
                      <div key={day.toISOString()} className={`p-1 min-h-[60px] border rounded text-xs ${offs.length > 0 ? 'bg-primary/5' : ''}`}>
                        <span className="font-medium">{format(day, 'd')}</span>
                        {offs.slice(0, 2).map(o => (
                          <div key={o.id} className="bg-primary/10 text-primary rounded px-1 mt-0.5 truncate text-[10px]">
                            {o.profiles?.full_name?.split(' ')[0]}
                          </div>
                        ))}
                        {offs.length > 2 && <div className="text-[10px] text-muted-foreground">+{offs.length - 2} more</div>}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </HRLayout>
  );
}
