import { useEffect, useState } from 'react';
import { Phone, FileText, MessageSquare, PhoneOutgoing, Activity as ActivityIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WLPortalLayout } from '@/components/wl-portal/WLPortalLayout';
import { useWLPortal } from '@/contexts/WLPortalContext';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

type ActivityKind = 'call' | 'script' | 'ticket' | 'outbound';

interface ActivityItem {
  id: string;
  kind: ActivityKind;
  title: string;
  description?: string;
  at: string;
  badge?: string;
}

const META: Record<ActivityKind, { icon: typeof Phone; bg: string; color: string; label: string }> = {
  call: { icon: Phone, bg: 'bg-primary/10', color: 'text-primary', label: 'Call' },
  script: { icon: FileText, bg: 'bg-secondary/10', color: 'text-secondary', label: 'Script' },
  ticket: { icon: MessageSquare, bg: 'bg-brand-rose', color: 'text-heading', label: 'Support' },
  outbound: { icon: PhoneOutgoing, bg: 'bg-primary/10', color: 'text-primary', label: 'Outbound' },
};

export default function WLPortalActivity() {
  const { clientInfo } = useWLPortal();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientInfo) return;
    const load = async () => {
      setLoading(true);
      const callsP = (supabase as any).from('wl_call_logs').select('id, caller_name, caller_phone, status, created_at')
        .eq('wl_client_id', clientInfo.id).order('created_at', { ascending: false }).limit(25);
      const scriptsP = (supabase as any).from('wl_client_scripts').select('id, title, updated_at, is_active')
        .eq('wl_client_id', clientInfo.id).order('updated_at', { ascending: false }).limit(15);
      const ticketsP = (supabase as any).from('wl_client_tickets').select('id, subject, status, created_at')
        .eq('wl_client_id', clientInfo.id).order('created_at', { ascending: false }).limit(15);
      const [calls, scripts, tickets] = await Promise.all([callsP, scriptsP, ticketsP]);

      const merged: ActivityItem[] = [];
      (calls.data || []).forEach((c: any) => merged.push({
        id: `call-${c.id}`, kind: 'call', at: c.created_at,
        title: `Call from ${c.caller_name || 'Unknown'}`,
        description: c.caller_phone || undefined, badge: c.status,
      }));
      (scripts.data || []).forEach((s: any) => merged.push({
        id: `script-${s.id}`, kind: 'script', at: s.updated_at,
        title: `Script updated: ${s.title}`,
        badge: s.is_active ? 'active' : 'inactive',
      }));
      (tickets.data || []).forEach((t: any) => merged.push({
        id: `ticket-${t.id}`, kind: 'ticket', at: t.created_at,
        title: `Support: ${t.subject}`, badge: t.status,
      }));

      merged.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      setItems(merged.slice(0, 60));
      setLoading(false);
    };
    load();
  }, [clientInfo]);

  return (
    <WLPortalLayout title="Activity Feed" description="A unified timeline of everything happening on your account">
      <Card>
        <CardHeader><CardTitle className="text-lg">Recent Activity</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ActivityIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium text-heading mb-2">No activity yet</h3>
              <p className="text-sm">Calls, scripts, and tickets will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const m = META[item.kind];
                const Icon = m.icon;
                return (
                  <div key={item.id} className="flex items-start gap-4 py-3 border-b last:border-0">
                    <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', m.bg)}>
                      <Icon className={cn('w-5 h-5', m.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-heading">{item.title}</p>
                        {item.badge && <Badge variant="outline" className="text-xs">{item.badge}</Badge>}
                      </div>
                      {item.description && <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>}
                      <p className="text-xs text-muted-foreground mt-1" title={format(new Date(item.at), 'PPpp')}>
                        {formatDistanceToNow(new Date(item.at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </WLPortalLayout>
  );
}
