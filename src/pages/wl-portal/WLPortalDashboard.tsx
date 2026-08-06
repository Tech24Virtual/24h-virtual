import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Phone, PhoneOutgoing, Clock, TrendingUp, FileText, ArrowRight } from 'lucide-react';
import { wlClientUrl } from '@/lib/wlClientUrl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WLPortalLayout } from '@/components/wl-portal/WLPortalLayout';
import { WLOutboundCallRequestDialog } from '@/components/wl-portal/WLOutboundCallRequestDialog';
import { WLClientServiceStatusCard } from '@/components/wl-portal/WLClientServiceStatusCard';
import { ClientCallTrendCard } from '@/components/client-dashboard/ClientCallTrendCard';
import { ClientNudgesCard } from '@/components/client-dashboard/ClientNudgesCard';
import { WLEndClientActivationCard } from '@/components/wl-portal/WLEndClientActivationCard';
import { ClientWelcomeModal } from '@/components/wl-portal/ClientWelcomeModal';
import { useWLPortal } from '@/contexts/WLPortalContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

import { usePageView } from '@/lib/analytics';

export default function WLPortalDashboard() {
  usePageView('wl_portal_dashboard', 'wl_partner');
  const { slug, clientInfo, branding, partnerId } = useWLPortal();
  const [stats, setStats] = useState({ callsThisMonth: 0, totalMinutes: 0, missedCalls: 0, activeScripts: 0 });
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [outboundDialogOpen, setOutboundDialogOpen] = useState(false);

  useEffect(() => {
    if (!clientInfo) return;
    const fetchData = async () => {
      setIsLoading(true);
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      try {
        const [callsData, scriptsData] = await Promise.all([
          supabase
            .from('wl_call_logs')
            .select('*')
            .eq('wl_client_id', clientInfo.id)
            .gte('created_at', startOfMonth.toISOString()),
          supabase
            .from('wl_client_scripts')
            .select('id', { count: 'exact', head: true })
            .eq('wl_client_id', clientInfo.id)
            .eq('is_active', true),
        ]);

        const calls = callsData.data || [];
        const totalMinutes = calls.reduce((sum: number, c: any) => sum + (c.handle_time_seconds || 0), 0) / 60;

        setStats({
          callsThisMonth: calls.length,
          totalMinutes: Math.round(totalMinutes),
          missedCalls: calls.filter((c: any) => c.status === 'missed').length,
          activeScripts: scriptsData.count || 0,
        });

        const { data: recent } = await supabase
          .from('wl_call_logs')
          .select('*')
          .eq('wl_client_id', clientInfo.id)
          .order('created_at', { ascending: false })
          .limit(5);

        setRecentCalls(recent || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [clientInfo]);

  const greeting = clientInfo?.contact_name || clientInfo?.client_name || '';

  const statCards = [
    { label: 'Calls This Month', value: stats.callsThisMonth.toString(), icon: Phone, color: 'text-primary', bgColor: 'bg-primary/10' },
    { label: 'Total Minutes', value: stats.totalMinutes.toString(), icon: Clock, color: 'text-cta', bgColor: 'bg-cta/10' },
    { label: 'Missed Calls', value: stats.missedCalls.toString(), icon: TrendingUp, color: 'text-primary', bgColor: 'bg-brand-rose' },
    { label: 'Active Scripts', value: stats.activeScripts.toString(), icon: FileText, color: 'text-secondary', bgColor: 'bg-secondary/10' },
  ];

  return (
    <WLPortalLayout
      title={`Welcome back${greeting ? `, ${greeting}` : ''}!`}
      description="Here's an overview of your call activity"
    >
      <ClientWelcomeModal />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-heading mt-1">{isLoading ? '...' : stat.value}</p>
                </div>
                <div className={cn('w-12 h-12 rounded-full flex items-center justify-center', stat.bgColor)}>
                  <stat.icon className={cn('w-6 h-6', stat.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Phase 6 + Phase 12 + Phase 15: Service status, activation path, trend, and nudges (RLS-scoped) */}
      {clientInfo?.id && (
        <div className="mb-6 space-y-4">
          <WLClientServiceStatusCard wlClientId={clientInfo.id} />
          <WLEndClientActivationCard wlClientId={clientInfo.id} />
          <div className="grid gap-4 lg:grid-cols-2">
            <ClientCallTrendCard scope="wl" clientId={clientInfo.id} />
            <ClientNudgesCard scope="wl" clientId={clientInfo.id} />
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Recent Calls</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : recentCalls.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Phone className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No calls yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCalls.map((call: any) => (
                  <div key={call.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{call.caller_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{call.caller_phone}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(call.created_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link to={wlClientUrl(slug, 'calls')}>
                View All Calls <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" onClick={() => setOutboundDialogOpen(true)}>
              <PhoneOutgoing className="mr-2 w-4 h-4" />Request Outbound Call
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to={wlClientUrl(slug, 'outbound-requests')}><PhoneOutgoing className="mr-2 w-4 h-4" />View Outbound Requests</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to={wlClientUrl(slug, 'scripts')}><FileText className="mr-2 w-4 h-4" />View Scripts</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to={wlClientUrl(slug, 'schedule')}><Clock className="mr-2 w-4 h-4" />Business Hours</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to={wlClientUrl(slug, 'billing')}><TrendingUp className="mr-2 w-4 h-4" />View Usage</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      <WLOutboundCallRequestDialog open={outboundDialogOpen} onClose={() => setOutboundDialogOpen(false)} />
    </WLPortalLayout>
  );
}
