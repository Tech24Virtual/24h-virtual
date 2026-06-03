import { useEffect, useMemo, useState } from 'react';
import { User, Phone, Search, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { WLPortalLayout } from '@/components/wl-portal/WLPortalLayout';
import { useWLPortal } from '@/contexts/WLPortalContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface LeadSummary {
  key: string;
  name: string;
  phone: string | null;
  email: string | null;
  callCount: number;
  lastCallAt: string;
  lastDisposition: string | null;
}

export default function WLPortalLeads() {
  const { clientInfo } = useWLPortal();
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!clientInfo) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('wl_call_logs')
        .select('id, caller_name, caller_phone, caller_email, disposition, created_at')
        .eq('wl_client_id', clientInfo.id)
        .order('created_at', { ascending: false })
        .limit(500);
      setCalls(data || []);
      setLoading(false);
    })();
  }, [clientInfo]);

  const leads = useMemo<LeadSummary[]>(() => {
    const map = new Map<string, LeadSummary>();
    for (const c of calls) {
      const key = (c.caller_phone || c.caller_email || c.caller_name || c.id).toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.callCount += 1;
      } else {
        map.set(key, {
          key,
          name: c.caller_name || 'Unknown',
          phone: c.caller_phone,
          email: c.caller_email,
          callCount: 1,
          lastCallAt: c.created_at,
          lastDisposition: c.disposition,
        });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastCallAt).getTime() - new Date(a.lastCallAt).getTime()
    );
  }, [calls]);

  const filtered = leads.filter(l =>
    !q ||
    l.name.toLowerCase().includes(q.toLowerCase()) ||
    l.phone?.toLowerCase().includes(q.toLowerCase()) ||
    l.email?.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <WLPortalLayout title="Lead Summaries" description="Unique callers who have reached your business">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Leads ({leads.length})</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search leads..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <User className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium text-heading mb-2">No leads yet</h3>
              <p className="text-sm">Inbound callers will appear here automatically.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Calls</TableHead>
                    <TableHead>Last Disposition</TableHead>
                    <TableHead>Last Contact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((l) => (
                    <TableRow key={l.key}>
                      <TableCell className="font-medium">{l.name}</TableCell>
                      <TableCell>{l.phone ? (<span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{l.phone}</span>) : '-'}</TableCell>
                      <TableCell>{l.email ? (<span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{l.email}</span>) : '-'}</TableCell>
                      <TableCell><Badge variant="secondary">{l.callCount}</Badge></TableCell>
                      <TableCell>{l.lastDisposition ? <Badge variant="outline">{l.lastDisposition}</Badge> : '-'}</TableCell>
                      <TableCell>{format(new Date(l.lastCallAt), 'MMM d, yyyy')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </WLPortalLayout>
  );
}
