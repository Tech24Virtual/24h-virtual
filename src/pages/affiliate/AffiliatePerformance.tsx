import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Users, DollarSign, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AffiliateLayout } from '@/components/affiliate/AffiliateLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const tierThresholds = [
  { tier: 'Standard', min: 0, max: 25, quarterlyBonus: 50, yearOnePerReferral: 350 },
  { tier: 'Silver', min: 25, max: 50, quarterlyBonus: 75, yearOnePerReferral: 450 },
  { tier: 'Gold', min: 50, max: 100, quarterlyBonus: 100, yearOnePerReferral: 550 },
  { tier: 'Platinum', min: 100, max: Infinity, quarterlyBonus: 150, yearOnePerReferral: 750 },
];

export default function AffiliatePerformance() {
  const { user } = useAuth();
  const [affiliateData, setAffiliateData] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setIsLoading(true);
      const { data: aff } = await supabase.from('affiliates').select('*').eq('user_id', user.id).maybeSingle();
      if (aff) {
        setAffiliateData(aff);
        const { data } = await supabase.from('affiliate_referrals').select('*').eq('affiliate_id', aff.id).order('click_timestamp', { ascending: false });
        setReferrals(data || []);
      }
      setIsLoading(false);
    };
    fetch();
  }, [user]);

  const metrics = useMemo(() => {
    const clicks = referrals.length;
    const signups = referrals.filter(r => r.status === 'signed_up' || r.status === 'converted').length;
    const conversions = referrals.filter(r => r.status === 'converted').length;
    const totalCommission = referrals.filter(r => r.status === 'converted').reduce((s, r) => s + (r.commission_amount || 0), 0);
    const avgCommission = conversions > 0 ? totalCommission / conversions : 0;
    const signupRate = clicks > 0 ? ((signups / clicks) * 100).toFixed(1) : '0';
    const conversionRate = signups > 0 ? ((conversions / signups) * 100).toFixed(1) : '0';
    return { clicks, signups, conversions, totalCommission, avgCommission, signupRate, conversionRate };
  }, [referrals]);

  const earningsData = useMemo(() => {
    const months: Record<string, number> = {};
    referrals.filter(r => r.status === 'converted' && r.converted_at).forEach(r => {
      const key = format(new Date(r.converted_at), 'MMM yyyy');
      months[key] = (months[key] || 0) + (r.commission_amount || 0);
    });
    return Object.entries(months).slice(-6).map(([month, earnings]) => ({ month, earnings }));
  }, [referrals]);

  const activityData = useMemo(() => {
    const months: Record<string, number> = {};
    referrals.forEach(r => {
      const key = format(new Date(r.click_timestamp), 'MMM yyyy');
      months[key] = (months[key] || 0) + 1;
    });
    return Object.entries(months).slice(-6).map(([month, count]) => ({ month, count }));
  }, [referrals]);

  const tierInfo = useMemo(() => {
    const lifetime = affiliateData?.lifetime_referrals || 0;
    const current = tierThresholds.find(t => lifetime >= t.min && lifetime < t.max) || tierThresholds[0];
    const next = tierThresholds.find(t => t.min > current.min);
    const progress = next ? ((lifetime - current.min) / (next.min - current.min)) * 100 : 100;
    return { current: current.tier, next: next?.tier, progress, lifetime, nextMin: next?.min };
  }, [affiliateData]);

  if (isLoading) return <AffiliateLayout title="Performance"><div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div></AffiliateLayout>;

  return (
    <AffiliateLayout title="Performance">
      {/* Funnel */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="text-lg">Conversion Funnel</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Clicks', value: metrics.clicks, color: 'bg-muted' },
              { label: 'Sign Ups', value: metrics.signups, color: 'bg-primary/10' },
              { label: 'Conversions', value: metrics.conversions, color: 'bg-cta/10' },
            ].map((s, i) => (
              <div key={s.label} className={cn('rounded-lg p-4 text-center', s.color)}>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                {i > 0 && <p className="text-xs text-muted-foreground mt-1">{i === 1 ? `${metrics.signupRate}%` : `${metrics.conversionRate}%`} rate</p>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      <div className="grid sm:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-5 text-center"><p className="text-xs text-muted-foreground">Click-to-Signup</p><p className="text-xl font-bold mt-1">{metrics.signupRate}%</p></CardContent></Card>
        <Card><CardContent className="p-5 text-center"><p className="text-xs text-muted-foreground">Signup-to-Conversion</p><p className="text-xl font-bold mt-1">{metrics.conversionRate}%</p></CardContent></Card>
        <Card><CardContent className="p-5 text-center"><p className="text-xs text-muted-foreground">Avg Commission</p><p className="text-xl font-bold mt-1">${metrics.avgCommission.toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="p-5 text-center"><p className="text-xs text-muted-foreground">Total Commission</p><p className="text-xl font-bold mt-1">${metrics.totalCommission.toFixed(2)}</p></CardContent></Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Earnings Chart */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Earnings Over Time</CardTitle></CardHeader>
          <CardContent>
            {earningsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={earningsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Earnings']} />
                  <Line type="monotone" dataKey="earnings" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-12">No data yet</p>}
          </CardContent>
        </Card>

        {/* Referral Activity */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Referral Activity</CardTitle></CardHeader>
          <CardContent>
            {activityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-12">No data yet</p>}
          </CardContent>
        </Card>
      </div>

      {/* Tier Progress */}
      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Target className="w-5 h-5" />Tier Progress</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{tierInfo.current}</span>
            {tierInfo.next && <span className="text-sm text-muted-foreground">{tierInfo.next}</span>}
          </div>
          <Progress value={tierInfo.progress} className="h-3 mb-4" />
          <p className="text-xs text-muted-foreground mb-6">
            {tierInfo.lifetime} lifetime referrals
            {tierInfo.next && ` · ${tierInfo.nextMin! - tierInfo.lifetime} more to reach ${tierInfo.next}`}
          </p>

          {/* Tier Comparison Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-left font-medium">Tier</th>
                  <th className="p-3 text-center font-medium">Referrals</th>
                  <th className="p-3 text-center font-medium">Conversion Bonus</th>
                  <th className="p-3 text-center font-medium">Quarterly Bonus</th>
                  <th className="p-3 text-right font-medium">Year 1 / Referral</th>
                </tr>
              </thead>
              <tbody>
                {tierThresholds.map((t) => {
                  const isCurrent = t.tier === tierInfo.current;
                  return (
                    <tr key={t.tier} className={cn('border-t', isCurrent && 'bg-primary/5 font-semibold')}>
                      <td className="p-3">
                        <span className="flex items-center gap-2">
                          {t.tier}
                          {isCurrent && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">You</Badge>}
                        </span>
                      </td>
                      <td className="p-3 text-center">{t.max === Infinity ? `${t.min}+` : `${t.min} – ${t.max - 1}`}</td>
                      <td className="p-3 text-center">$150</td>
                      <td className="p-3 text-center text-cta font-bold">${t.quarterlyBonus}</td>
                      <td className="p-3 text-right font-bold">${t.yearOnePerReferral}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AffiliateLayout>
  );
}
