import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, DollarSign, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function BillingCommissions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('pending');

  const { data: commissions, isLoading } = useQuery({
    queryKey: ['billing-commissions', activeTab],
    queryFn: async () => {
      let query = supabase
        .from('sales_commissions')
        .select('*, leads(name, company)')
        .order('created_at', { ascending: false });

      if (activeTab === 'pending') query = query.eq('status', 'pending');
      else if (activeTab === 'approved') query = query.eq('status', 'approved');
      else if (activeTab === 'paid') query = query.eq('status', 'paid');

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, any> = { status, approved_by: user?.id };
      if (status === 'paid') updates.paid_at = new Date().toISOString();
      const { error } = await supabase.from('sales_commissions').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-commissions'] });
      toast({ title: 'Commission updated' });
    },
  });

  const statusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline', approved: 'default', paid: 'secondary',
    };
    return <Badge variant={variants[status] || 'outline'} className="capitalize">{status}</Badge>;
  };

  return (
    <StaffLayout role="billing">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Commission Approvals</h1>
          <p className="text-muted-foreground">Review and approve sales commissions</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending" className="gap-2"><Clock className="h-4 w-4" />Pending</TabsTrigger>
            <TabsTrigger value="approved" className="gap-2"><CheckCircle className="h-4 w-4" />Approved</TabsTrigger>
            <TabsTrigger value="paid" className="gap-2"><DollarSign className="h-4 w-4" />Paid</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            <Card>
              <CardHeader>
                <CardTitle className="capitalize">{activeTab} Commissions</CardTitle>
                <CardDescription>
                  {activeTab === 'pending' && 'Commissions awaiting billing approval'}
                  {activeTab === 'approved' && 'Approved commissions ready for payout'}
                  {activeTab === 'paid' && 'Historical paid commissions'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : !commissions?.length ? (
                  <div className="text-center py-8 text-muted-foreground">No {activeTab} commissions</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Deal / Client</TableHead>
                        <TableHead>Base Amount</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Commission</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        {activeTab === 'pending' && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commissions.map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell>
                            <div className="font-medium">{c.leads?.name || 'Unknown'}</div>
                            <div className="text-sm text-muted-foreground">{c.leads?.company}</div>
                          </TableCell>
                          <TableCell>${c.base_amount?.toFixed(2)}</TableCell>
                          <TableCell>{(c.commission_rate * 100).toFixed(0)}%</TableCell>
                          <TableCell className="font-medium">${c.commission_amount?.toFixed(2)}</TableCell>
                          <TableCell className="text-sm">{format(new Date(c.created_at), 'MMM d, yyyy')}</TableCell>
                          <TableCell>{statusBadge(c.status)}</TableCell>
                          {activeTab === 'pending' && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button size="sm" onClick={() => updateMutation.mutate({ id: c.id, status: 'approved' })} disabled={updateMutation.isPending}>
                                  <CheckCircle className="h-4 w-4 mr-1" />Approve
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </StaffLayout>
  );
}
