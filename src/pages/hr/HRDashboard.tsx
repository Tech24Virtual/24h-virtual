import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, GitPullRequest, CalendarOff, Briefcase, UserMinus, DollarSign, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HRLayout } from '@/components/hr/HRLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

import { usePageView } from '@/lib/analytics';

export default function HRDashboard() {
  usePageView('hr_dashboard', 'hr');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ employees: 0, onboardings: 0, pendingTimeOff: 0, openJobs: 0, offboardings: 0, pendingPayouts: 0, unreadComms: 0 });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const [empRes, onbRes, toRes, jobRes, offRes, payRes, comRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('agent_onboarding').select('id', { count: 'exact', head: true }).neq('status', 'completed'),
        supabase.from('time_off_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('job_postings').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('offboarding').select('id', { count: 'exact', head: true }).neq('status', 'completed'),
        supabase.from('shift_invoices').select('id', { count: 'exact', head: true }).eq('status', 'supervisor_approved'),
        supabase.from('hr_communications').select('id', { count: 'exact', head: true }).eq('to_user_id', user.id).is('read_at', null),
      ]);
      setStats({
        employees: empRes.count || 0,
        onboardings: onbRes.count || 0,
        pendingTimeOff: toRes.count || 0,
        openJobs: jobRes.count || 0,
        offboardings: offRes.count || 0,
        pendingPayouts: payRes.count || 0,
        unreadComms: comRes.count || 0,
      });
    };

    const fetchActivity = async () => {
      const { data } = await (supabase as any).from('agent_onboarding_log')
        .select('*, agent_onboarding:onboarding_id(applicant_user_id, profiles:applicant_user_id(full_name))')
        .order('created_at', { ascending: false })
        .limit(8);
      setRecentActivity(data || []);
    };

    fetchStats();
    fetchActivity();
  }, [user]);

  const kpis = [
    { title: 'Total Employees', value: stats.employees, icon: Users, color: 'text-blue-600', href: '/hr-portal/people/directory' },
    { title: 'Active Onboardings', value: stats.onboardings, icon: GitPullRequest, color: 'text-orange-600', href: '/hr-portal/people/onboarding' },
    { title: 'Pending Offboardings', value: stats.offboardings, icon: UserMinus, color: 'text-red-600', href: '/hr-portal/people/offboarding' },
    { title: 'Payroll Due', value: stats.pendingPayouts, icon: DollarSign, color: 'text-green-600', href: '/hr-portal/payroll' },
    { title: 'Pending Time Off', value: stats.pendingTimeOff, icon: CalendarOff, color: 'text-amber-600', href: '/hr-portal/payroll/time-off' },
    { title: 'Open Job Postings', value: stats.openJobs, icon: Briefcase, color: 'text-purple-600', href: '/hr-portal/hiring/jobs' },
    { title: 'Unread Messages', value: stats.unreadComms, icon: MessageSquare, color: 'text-cyan-600', href: '/hr-portal/communications' },
  ];

  return (
    <HRLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">HR Dashboard</h1>
            <p className="text-muted-foreground mt-1">Overview of HR operations</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={() => navigate('/hr-portal/people/onboarding')}>+ New Hire</Button>
            <Button size="sm" variant="outline" onClick={() => navigate('/hr-portal/people/offboarding')}>Initiate Offboarding</Button>
            <Button size="sm" variant="outline" onClick={() => navigate('/hr-portal/payroll')}>Process Payroll</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <Card key={kpi.title} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(kpi.href)}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-muted-foreground text-sm">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map(a => (
                  <div key={a.id} className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0">
                    <div>
                      <p className="text-sm font-medium capitalize">{a.action?.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground">
                        {(a.agent_onboarding as any)?.profiles?.full_name || 'Unknown'} • {format(new Date(a.created_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <Badge variant="secondary" className="capitalize text-xs">{a.action?.replace(/_/g, ' ')}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </HRLayout>
  );
}
