import { useState, useEffect } from 'react';
import { FileText, CheckCircle, MessageSquare, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ScriptReviewDetail } from '@/components/staff/ScriptReviewDetail';

interface ChangeRequest {
  id: string;
  client_id: string;
  script_id: string | null;
  request_type: string;
  title: string;
  description: string | null;
  proposed_changes: Record<string, unknown>;
  status: string;
  reviewed_by: string | null;
  reviewer_notes: string | null;
  resolved_at: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

interface ChangeRequestWithClient extends ChangeRequest {
  client_name: string;
  script_name: string | null;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  in_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  needs_info: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const typeLabels: Record<string, string> = {
  greeting_change: 'Greeting',
  faq_update: 'FAQ Edit',
  new_faq: 'New FAQ',
  remove_faq: 'Remove FAQ',
  call_rules: 'Call Rules',
  full_script: 'Full Script',
  other: 'Other',
};

export default function SupervisorScriptReviews() {
  const [requests, setRequests] = useState<ChangeRequestWithClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequestWithClient | null>(null);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel('script-change-requests-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'script_change_requests',
      }, () => fetchRequests())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('script_change_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch client names and script names
      const clientIds = [...new Set((data || []).map(r => r.client_id))];
      const scriptIds = [...new Set((data || []).filter(r => r.script_id).map(r => r.script_id!))];

      const [profilesRes, scriptsRes] = await Promise.all([
        clientIds.length > 0
          ? supabase.from('profiles').select('id, full_name').in('id', clientIds)
          : { data: [], error: null },
        scriptIds.length > 0
          ? supabase.from('client_scripts').select('id, name').in('id', scriptIds)
          : { data: [], error: null },
      ]);

      const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p.full_name || 'Unknown Client']));
      const scriptMap = new Map((scriptsRes.data || []).map(s => [s.id, s.name]));

      const enriched: ChangeRequestWithClient[] = (data || []).map(r => ({
        ...r,
        proposed_changes: (r.proposed_changes as Record<string, unknown>) || {},
        client_name: profileMap.get(r.client_id) || 'Unknown Client',
        script_name: r.script_id ? scriptMap.get(r.script_id) || 'Unknown Script' : null,
      }));

      setRequests(enriched);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load script change requests');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRequests = requests.filter(r => {
    if (activeTab === 'pending') return ['pending', 'in_review', 'needs_info'].includes(r.status);
    if (activeTab === 'resolved') return ['approved', 'rejected'].includes(r.status);
    return true;
  });

  const pendingCount = requests.filter(r => ['pending', 'in_review', 'needs_info'].includes(r.status)).length;
  const actionNeededCount = requests.filter(r => ['pending', 'in_review'].includes(r.status)).length;
  const needsInfoCount = requests.filter(r => r.status === 'needs_info').length;
  const resolvedCount = requests.filter(r => ['approved', 'rejected'].includes(r.status)).length;

  if (selectedRequest) {
    return (
      <StaffLayout role="supervisor">
        <ScriptReviewDetail
          request={selectedRequest}
          onBack={() => { setSelectedRequest(null); fetchRequests(); }}
        />
      </StaffLayout>
    );
  }

  return (
    <StaffLayout role="supervisor">
      <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50/30 rounded-2xl border border-border p-6 mb-6">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Script Change Requests</h1>
            <p className="text-muted-foreground mt-0.5">Review and action client script change requests</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{actionNeededCount}</p>
                <p className="text-xs text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{needsInfoCount}</p>
                <p className="text-xs text-muted-foreground">Needs Info</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{resolvedCount}</p>
                <p className="text-xs text-muted-foreground">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="w-4 h-4" />
            Pending {pendingCount > 0 && `(${pendingCount})`}
          </TabsTrigger>
          <TabsTrigger value="resolved">
            <CheckCircle className="w-4 h-4 mr-1" />
            Resolved
          </TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {activeTab === 'pending' ? 'Pending Reviews' : activeTab === 'resolved' ? 'Resolved Requests' : 'All Requests'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                      <Skeleton className="h-4 w-4 rounded" />
                    </div>
                  ))}
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <h3 className="text-base font-medium text-heading mb-1">
                    {activeTab === 'pending' ? 'No pending requests' : activeTab === 'resolved' ? 'No resolved requests' : 'No requests yet'}
                  </h3>
                  <p className="text-sm">
                    {activeTab === 'pending'
                      ? 'All change requests are up to date.'
                      : activeTab === 'resolved'
                      ? 'Approved and rejected requests will appear here.'
                      : 'Client script change requests will appear here once submitted.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedRequest(req)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="font-medium text-heading truncate">{req.title}</h4>
                          <Badge className={statusColors[req.status]}>
                            {req.status.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline">{typeLabels[req.request_type] || req.request_type}</Badge>
                          {req.source === 'quick_link' && (
                            <Badge variant="secondary">Quick Link</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {req.client_name}
                          {req.script_name && ` • ${req.script_name}`}
                          {' • '}
                          {format(new Date(req.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </StaffLayout>
  );
}
