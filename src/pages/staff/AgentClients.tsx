import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { ClientDetailDialog } from '@/components/staff/ClientDetailDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Search, Users, Phone, Activity, ShieldAlert, ShieldCheck } from 'lucide-react';

interface ClientProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  company_name: string | null;
  phone: string | null;
  avatar_url: null;
  pipeline_stage: string | null;
  last_call_at: string | null;
  created_at: string;
}

const STAGE_COLORS: Record<string, string> = {
  active:     'bg-green-100 text-green-800 border-green-200',
  new:        'bg-blue-100 text-blue-800 border-blue-200',
  qualified:  'bg-indigo-100 text-indigo-800 border-indigo-200',
  pending:    'bg-amber-100 text-amber-800 border-amber-200',
  inactive:   'bg-gray-100 text-gray-600 border-gray-200',
  churned:    'bg-red-100 text-red-800 border-red-200',
};

export default function AgentClients() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Step 1: fetch this agent's assigned client IDs.
  // refetchInterval ensures new supervisor assignments appear within 30 s.
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['my-client-assignments', user?.id],
    enabled: !!user?.id,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_agent_assignments')
        .select('client_id')
        .eq('agent_id', user!.id);
      if (error) throw error;
      return data;
    },
  });

  const clientIds = assignments.map((a) => a.client_id);

  // Step 2: fetch lead details + last call date for each assigned client.
  // call_logs.client_id FK was remapped to leads(id) in migration 20260212032348.
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['agent-clients', clientIds],
    enabled: !!user?.id,
    refetchInterval: 30_000,
    queryFn: async () => {
      if (clientIds.length === 0) return [];

      const { data: leads, error } = await supabase
        .from('leads')
        .select('id, name, email, phone, company, pipeline_stage, created_at')
        .in('id', clientIds)
        .order('name');
      if (error) throw error;

      // Last call per client — silently skip if permission denied
      const { data: callDates } = await supabase
        .from('call_logs')
        .select('client_id, created_at')
        .in('client_id', clientIds)
        .order('created_at', { ascending: false });

      const lastCallMap: Record<string, string> = {};
      for (const c of callDates ?? []) {
        if (!lastCallMap[c.client_id]) lastCallMap[c.client_id] = c.created_at;
      }

      return (leads ?? []).map(lead => ({
        id: lead.id,
        full_name: lead.name,
        email: lead.email,
        company_name: lead.company,
        phone: lead.phone,
        avatar_url: null as null,
        pipeline_stage: lead.pipeline_stage,
        last_call_at: lastCallMap[lead.id] ?? null,
        created_at: lead.created_at,
      })) as ClientProfile[];
    },
  });

  // Step 3: fetch pending/reviewed signoffs for this agent's assignments.
  const { data: signoffs = [] } = useQuery({
    queryKey: ['agent-client-signoffs', user?.id],
    enabled: !!user?.id,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_assignment_signoffs')
        .select('client_id, status')
        .eq('agent_id', user!.id);
      if (error) throw error;
      return data;
    },
  });

  const signoffMap = new Map(signoffs.map((s) => [s.client_id, s.status]));

  const markReviewed = useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from('client_assignment_signoffs')
        .update({ status: 'reviewed', reviewed_at: new Date().toISOString() })
        .eq('agent_id', user!.id)
        .eq('client_id', clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-client-signoffs', user?.id] });
      toast.success('Marked as reviewed');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isLoading = assignmentsLoading || clientsLoading;

  const filteredClients = clients.filter(client => {
    const q = searchQuery.toLowerCase();
    return (
      (client.full_name ?? '').toLowerCase().includes(q) ||
      (client.company_name ?? '').toLowerCase().includes(q) ||
      (client.phone ?? '').toLowerCase().includes(q)
    );
  });

  const stats = {
    total: clients.length,
    active: clients.filter(c => c.pipeline_stage === 'active').length,
    withPhone: clients.filter(c => !!c.phone).length,
  };

  const handleClientClick = (client: ClientProfile) => {
    setSelectedClient(client);
    setDialogOpen(true);
  };

  return (
    <StaffLayout role="agent">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="text-muted-foreground">View and manage your assigned client profiles</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? <Skeleton className="h-8 w-10" /> : stats.total}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? <Skeleton className="h-8 w-10" /> : stats.active}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">With Phone</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? <Skeleton className="h-8 w-10" /> : stats.withPhone}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Call</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Review</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                          <div className="space-y-1.5">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-28 rounded-full" /></TableCell>
                    </TableRow>
                  ))
                ) : clients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-14 text-center">
                      <Users className="h-9 w-9 mx-auto mb-3 text-muted-foreground/40" />
                      <p className="font-medium text-foreground">No clients assigned yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Contact your supervisor to get clients assigned to you.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      No clients match &ldquo;{searchQuery}&rdquo;.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map(client => {
                    const stageColor = STAGE_COLORS[client.pipeline_stage ?? ''] ?? 'bg-gray-100 text-gray-600 border-gray-200';
                    const signoffStatus = signoffMap.get(client.id);
                    return (
                      <TableRow
                        key={client.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleClientClick(client)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 shrink-0">
                              <AvatarFallback className="text-sm font-medium">
                                {client.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{client.full_name || 'Unknown'}</p>
                              {client.email && (
                                <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {client.company_name
                            ? <Badge variant="secondary">{client.company_name}</Badge>
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {client.pipeline_stage ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${stageColor}`}>
                              {client.pipeline_stage}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {client.last_call_at
                            ? new Date(client.last_call_at).toLocaleDateString()
                            : '—'}
                        </TableCell>
                        <TableCell className="text-sm">{client.phone || '—'}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {signoffStatus === 'pending' ? (
                            <div className="flex items-center gap-2">
                              <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-500">
                                <ShieldAlert className="h-3 w-3" />
                                Review Required
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={markReviewed.isPending}
                                onClick={() => markReviewed.mutate(client.id)}
                              >
                                Mark as Reviewed
                              </Button>
                            </div>
                          ) : signoffStatus === 'reviewed' ? (
                            <Badge className="gap-1 bg-green-600 text-white hover:bg-green-600">
                              <ShieldCheck className="h-3 w-3" />
                              Reviewed
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <ClientDetailDialog
        client={selectedClient}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </StaffLayout>
  );
}
