import { useState, useEffect, useMemo } from 'react';
import { Search, Download, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AffiliateLayout } from '@/components/affiliate/AffiliateLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  clicked: 'bg-muted text-muted-foreground',
  signed_up: 'bg-primary/10 text-primary',
  converted: 'bg-cta/10 text-cta',
};

export default function AffiliateReferrals() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setIsLoading(true);
      const { data: affiliate } = await supabase.from('affiliates').select('id').eq('user_id', user.id).maybeSingle();
      if (affiliate) {
        const { data } = await supabase.from('affiliate_referrals').select('*, leads(name, pipeline_stage)').eq('affiliate_id', affiliate.id).order('click_timestamp', { ascending: false });
        setReferrals(data || []);
      }
      setIsLoading(false);
    };
    fetch();
  }, [user]);

  const filtered = useMemo(() => {
    return referrals.filter(r => {
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchesSearch = !search || r.referred_name?.toLowerCase().includes(search.toLowerCase()) || r.referred_email.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [referrals, statusFilter, search]);

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Status', 'Commission', 'Date', 'Converted At'];
    const rows = filtered.map(r => [r.referred_name || '', r.referred_email, r.status || '', (r.commission_amount || 0).toFixed(2), r.click_timestamp, r.converted_at || '']);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'referrals.csv';
    a.click();
  };

  return (
    <AffiliateLayout title="Referrals">
      <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="clicked">Clicked</TabsTrigger>
            <TabsTrigger value="signed_up">Signed Up</TabsTrigger>
            <TabsTrigger value="converted">Converted</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-60" />
          </div>
          <Button variant="outline" onClick={exportCSV}><Download className="w-4 h-4 mr-1" />Export</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2">No referrals found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Clicked</TableHead>
                  <TableHead>Converted</TableHead>
                  <TableHead>Lead Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.referred_name || '-'}</TableCell>
                    <TableCell>{r.referred_email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusColors[r.status || 'clicked']}>{r.status || 'clicked'}</Badge>
                    </TableCell>
                    <TableCell>${(r.commission_amount || 0).toFixed(2)}</TableCell>
                    <TableCell>{format(new Date(r.click_timestamp), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{r.converted_at ? format(new Date(r.converted_at), 'MMM d, yyyy') : '-'}</TableCell>
                    <TableCell>
                      {r.leads ? (
                        <Badge variant="outline">{r.leads.pipeline_stage || 'N/A'}</Badge>
                      ) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AffiliateLayout>
  );
}
