import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardOnboarding } from '@/components/onboarding/DashboardOnboarding';
import { WizardPersonalizedHero } from '@/components/dashboard/WizardPersonalizedHero';
import { Phone, Clock, TrendingUp, FileText, ArrowRight, PhoneOutgoing } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { OutboundCallRequestDialog } from '@/components/client-dashboard/OutboundCallRequestDialog';
import { DeliveryStatusCard } from '@/components/client-dashboard/DeliveryStatusCard';
import { ReceptionistStatusCard } from '@/components/client-dashboard/ReceptionistStatusCard';
import { ClientCallTrendCard } from '@/components/client-dashboard/ClientCallTrendCard';
import { ClientNudgesCard } from '@/components/client-dashboard/ClientNudgesCard';
import { ClientSuccessGuidanceCard } from '@/components/client-dashboard/ClientSuccessGuidanceCard';
import { ActivationPathCard } from '@/components/client-dashboard/ActivationPathCard';
import { usePageView, track } from '@/lib/analytics';

interface CallLog {
  id: string;
  caller_name: string | null;
  caller_phone: string | null;
  call_duration: number | null;
  created_at: string;
}

interface Stats {
  callsThisMonth: number;
  totalMinutes: number;
  missedCalls: number;
  activeScripts: number;
}

export default function ClientDashboard() {
  const { profile, user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    if (profile !== undefined && profile !== null) {
      setShowOnboarding(!(profile as any)?.onboarding_completed);
    }
  }, [profile]);
  const [outboundDialogOpen, setOutboundDialogOpen] = useState(false);
  const [stats, setStats] = useState<Stats>({
    callsThisMonth: 0,
    totalMinutes: 0,
    missedCalls: 0,
    activeScripts: 0,
  });
  const [recentCalls, setRecentCalls] = useState<CallLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  usePageView('client_dashboard', 'client');

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setIsLoading(true);
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      try {
        const [callsData, missedData, scriptsData] = await Promise.all([
          supabase
            .from('call_logs')
            .select('*')
            .eq('client_id', user.id)
            .gte('created_at', startOfMonth.toISOString()),
          supabase
            .from('call_logs')
            .select('id', { count: 'exact', head: true })
            .eq('client_id', user.id)
            .eq('status', 'missed')
            .gte('created_at', startOfMonth.toISOString()),
          supabase
            .from('client_scripts')
            .select('id', { count: 'exact', head: true })
            .eq('client_id', user.id)
            .eq('is_active', true),
        ]);

        const calls = callsData.data || [];
        const totalMinutes = calls.reduce((sum, c) => sum + (c.call_duration || 0), 0) / 60;

        setStats({
          callsThisMonth: calls.length,
          totalMinutes: Math.round(totalMinutes),
          missedCalls: missedData.count || 0,
          activeScripts: scriptsData.count || 0,
        });

        // Get recent calls
        const { data: recent } = await supabase
          .from('call_logs')
          .select('*')
          .eq('client_id', user.id)
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
  }, [user]);

  const statCards = [
    { 
      label: 'Calls This Month', 
      value: stats.callsThisMonth.toString(), 
      icon: Phone, 
      trend: '+12%',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    { 
      label: 'Total Minutes', 
      value: stats.totalMinutes.toString(), 
      icon: Clock, 
      trend: '+8%',
      color: 'text-cta',
      bgColor: 'bg-cta/10',
    },
    { 
      label: 'Missed Calls', 
      value: stats.missedCalls.toString(), 
      icon: TrendingUp, 
      trend: '-5%',
      color: 'text-primary',
      bgColor: 'bg-brand-rose',
    },
    { 
      label: 'Active Scripts', 
      value: stats.activeScripts.toString(), 
      icon: FileText, 
      trend: '',
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
    },
  ];

  return (
    <DashboardLayout
      title={`Welcome back${profile?.full_name ? `, ${profile.full_name}` : ''}!`}
      description="Here's an overview of your call activity"
    >
      {showOnboarding && (
        <DashboardOnboarding dashboardContext="client" onComplete={() => setShowOnboarding(false)} />
      )}
      <WizardPersonalizedHero />
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <DeliveryStatusCard />
        <ReceptionistStatusCard />
      </div>

      {/* Phase 12: Trend + nudges */}
      {user && (
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <ClientCallTrendCard scope="direct" clientId={user.id} />
          <ClientNudgesCard scope="direct" clientId={user.id} />
        </div>
      )}
      {/* Phase 15: Activation Path */}
      {user && (
        <div className="mb-6">
          <ActivationPathCard />
        </div>
      )}
      {/* Phase 30: Customer Success Guidance */}
      {user && (
        <div className="mb-6">
          <ClientSuccessGuidanceCard />
        </div>
      )}
      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-heading mt-1">
                    {isLoading ? '...' : stat.value}
                  </p>
                  {stat.trend && (
                    <p className="text-xs text-muted-foreground mt-1">{stat.trend} from last month</p>
                  )}
                </div>
                <div className={cn('w-12 h-12 rounded-full flex items-center justify-center', stat.bgColor)}>
                  <stat.icon className={cn('w-6 h-6', stat.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Calls</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : recentCalls.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Phone className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No calls yet</p>
                <p className="text-sm">Your recent call activity will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCalls.map((call) => (
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
              <Link to="/client-dashboard/calls">
                View All Calls
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/client-dashboard/scripts" onClick={() => track.quickAction('client_dashboard', 'create_script', 'client')}>
                <FileText className="mr-2 w-4 h-4" />
                Create New Script
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/client-dashboard/schedule" onClick={() => track.quickAction('client_dashboard', 'update_business_hours', 'client')}>
                <Clock className="mr-2 w-4 h-4" />
                Update Business Hours
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/client-dashboard/billing" onClick={() => track.quickAction('client_dashboard', 'view_billing', 'client')}>
                <TrendingUp className="mr-2 w-4 h-4" />
                View Usage & Billing
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                track.quickAction('client_dashboard', 'request_outbound_call', 'client');
                setOutboundDialogOpen(true);
              }}
            >
              <PhoneOutgoing className="mr-2 w-4 h-4" />
              Request Outbound Call
            </Button>
          </CardContent>
        </Card>
      </div>

      <OutboundCallRequestDialog
        open={outboundDialogOpen}
        onClose={(saved) => {
          if (saved) track.cta('client_dashboard', 'outbound_call_submitted', 'client');
          setOutboundDialogOpen(false);
        }}
      />
    </DashboardLayout>
  );
}
