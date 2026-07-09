import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HRLayout } from '@/components/hr/HRLayout';
import { AgentPayoutsList } from '@/components/staff/AgentPayoutsList';
import { AgentBankingForm } from '@/components/staff/AgentBankingForm';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, Clock, CheckCircle, Landmark } from 'lucide-react';
import { RunPayrollButton } from '@/components/missions/RunPayrollButton';
import { MissionsList } from '@/components/missions/MissionsList';

export default function HRPayroll() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ pending: 0, processed: 0, totalBanking: 0 });
  const [bankingRecords, setBankingRecords] = useState<any[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [bankingDialogOpen, setBankingDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [pendingRes, paidRes, bankRes] = await Promise.all([
        (supabase as any).from('shift_invoices').select('id', { count: 'exact', head: true }).eq('status', 'supervisor_approved'),
        (supabase as any).from('shift_invoices').select('id', { count: 'exact', head: true }).eq('status', 'paid'),
        (supabase as any).from('agent_banking').select('*, profiles:agent_id(full_name)').order('created_at', { ascending: false }),
      ]);
      setStats({ pending: pendingRes.count || 0, processed: paidRes.count || 0, totalBanking: bankRes.data?.length || 0 });
      setBankingRecords(bankRes.data || []);
    };
    fetch();
  }, [user]);

  return (
    <HRLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Payroll & Banking</h1>
            <p className="text-muted-foreground mt-1">Process approved payouts and manage banking details</p>
          </div>
          <RunPayrollButton />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payouts</CardTitle>
              <Clock className="w-5 h-5 text-amber-600" />
            </CardHeader>
            <CardContent><p className="text-3xl font-bold">{stats.pending}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Processed</CardTitle>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </CardHeader>
            <CardContent><p className="text-3xl font-bold">{stats.processed}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Banking Records</CardTitle>
              <Landmark className="w-5 h-5 text-blue-600" />
            </CardHeader>
            <CardContent><p className="text-3xl font-bold">{stats.totalBanking}</p></CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending Payouts</TabsTrigger>
            <TabsTrigger value="paid">Paid History</TabsTrigger>
            <TabsTrigger value="banking">Banking Overview</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            <AgentPayoutsList statusFilter="supervisor_approved" />
          </TabsContent>

          <TabsContent value="paid" className="mt-4">
            <AgentPayoutsList statusFilter="paid" />
          </TabsContent>

          <TabsContent value="banking" className="mt-4">
            {bankingRecords.length === 0 ? (
              <Card><CardContent className="p-12 text-center text-muted-foreground">No banking records found.</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {bankingRecords.map(br => (
                  <Card key={br.id}>
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{br.profiles?.full_name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">{br.bank_name || 'Bank not specified'} • {br.country} • {br.currency}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize">{br.employment_type}</Badge>
                        {br.hourly_rate && <span className="text-sm font-medium">${Number(br.hourly_rate).toFixed(2)}/hr</span>}
                        <Button size="sm" variant="outline" onClick={() => { setSelectedAgentId(br.agent_id); setBankingDialogOpen(true); }}>Edit</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <MissionsList title="Recent Payroll Runs" missionTypeFilter="payroll_run" limit={5} />
      </div>

      <Dialog open={bankingDialogOpen} onOpenChange={setBankingDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle>Edit Banking Details</DialogTitle></DialogHeader>
          {selectedAgentId && <AgentBankingForm agentId={selectedAgentId} showHourlyRate />}
        </DialogContent>
      </Dialog>
    </HRLayout>
  );
}
