import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, Users, TrendingUp, Copy, Check, Share2, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AffiliateLayout } from '@/components/affiliate/AffiliateLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { AFFILIATE_BASE_URL } from '@/lib/affiliateDomain';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AffiliateDashboard() {
  const { user } = useAuth();
  const [affiliateData, setAffiliateData] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setIsLoading(true);
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (affiliate) {
        setAffiliateData(affiliate);
        const [{ data: refs }, { data: pays }] = await Promise.all([
          supabase.from('affiliate_referrals').select('*').eq('affiliate_id', affiliate.id).order('click_timestamp', { ascending: false }),
          supabase.from('affiliate_payouts').select('*').eq('affiliate_id', affiliate.id).order('requested_at', { ascending: false }),
        ]);
        setReferrals(refs || []);
        setPayouts(pays || []);
      }
      setIsLoading(false);
    };
    fetchData();
  }, [user]);

  const stats = useMemo(() => {
    if (!affiliateData) return null;
    const totalEarnings = affiliateData.total_earnings || 0;
    const conversions = referrals.filter(r => r.status === 'converted').length;
    const activeReferrals = referrals.filter(r => r.status === 'signed_up').length;
    const paidOut = payouts.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0);
    const pendingPayouts = payouts.filter(p => p.status === 'pending' || p.status === 'processing').reduce((s, p) => s + p.amount, 0);
    const availableBalance = totalEarnings - paidOut - pendingPayouts;
    const conversionRate = referrals.length > 0 ? ((conversions / referrals.length) * 100).toFixed(1) : '0';
    return { totalEarnings, availableBalance, totalReferrals: referrals.length, conversionRate, activeReferrals, conversions };
  }, [affiliateData, referrals, payouts]);

  const earningsChartData = useMemo(() => {
    const months: Record<string, number> = {};
    referrals.filter(r => r.status === 'converted' && r.converted_at).forEach(r => {
      const key = format(new Date(r.converted_at), 'MMM yyyy');
      months[key] = (months[key] || 0) + (r.commission_amount || 0);
    });
    return Object.entries(months).slice(-6).map(([month, earnings]) => ({ month, earnings }));
  }, [referrals]);

  const recentActivity = useMemo(() => referrals.slice(0, 5), [referrals]);

  const tierBonusMap: Record<string, number> = { Standard: 50, Silver: 75, Gold: 100, Platinum: 150 };
  const currentQuarterlyBonus = tierBonusMap[affiliateData?.tier || 'Standard'] || 50;
  const yearOneEarnings = 150 + currentQuarterlyBonus * 4;

  const referralLink = affiliateData ? `${AFFILIATE_BASE_URL}?ref=${affiliateData.affiliate_code}` : '';

  const copyLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return <AffiliateLayout><div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div></AffiliateLayout>;
  }

  if (!affiliateData) {
    return (
      <AffiliateLayout>
        <Card><CardContent className="p-12 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mb-2">Not an Affiliate Yet</h3>
          <p className="text-muted-foreground mb-4">You haven't signed up for our affiliate program yet.</p>
          <Button asChild><a href="/partners/affiliate#apply">Apply to Become an Affiliate</a></Button>
        </CardContent></Card>
      </AffiliateLayout>
    );
  }

  const statCards = [
    { title: 'Total Earnings', value: `$${stats!.totalEarnings.toFixed(2)}`, icon: DollarSign, color: 'text-cta', bg: 'bg-cta/10' },
    { title: 'Available Balance', value: `$${stats!.availableBalance.toFixed(2)}`, icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10' },
    { title: 'Total Referrals', value: stats!.totalReferrals, icon: Users, color: 'text-secondary', bg: 'bg-secondary/10' },
    { title: 'Conversion Rate', value: `${stats!.conversionRate}%`, icon: TrendingUp, color: 'text-cta', bg: 'bg-cta/10' },
    { title: 'Active Referrals', value: stats!.activeReferrals, icon: Share2, color: 'text-primary', bg: 'bg-brand-rose' },
  ];

  return (
    <AffiliateLayout>
      {/* Stat Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map(s => (
          <Card key={s.title}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.title}</p>
                  <p className="text-xl font-bold mt-1">{s.value}</p>
                </div>
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', s.bg)}>
                  <s.icon className={cn('w-5 h-5', s.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Referral Link */}
      <Card className="mb-8">
        <CardHeader><CardTitle className="text-lg">Your Referral Link</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input value={referralLink} readOnly className="flex-1" />
            <Button onClick={copyLink} variant="outline">
              {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            $150 Conversion Bonus + ${currentQuarterlyBonus} Every 3 Months · Tier: {affiliateData.tier || 'Standard'}
          </p>
        </CardContent>
      </Card>

      {/* Commission Structure */}
      <Card className="mb-8">
        <CardHeader><CardTitle className="text-lg">Commission Structure</CardTitle></CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-primary/5 rounded-lg text-center">
              <p className="text-3xl font-bold text-primary">$150</p>
              <p className="text-sm text-muted-foreground mt-1">Conversion Bonus</p>
            </div>
            <div className="p-4 bg-cta/5 rounded-lg text-center">
              <p className="text-3xl font-bold text-cta">${currentQuarterlyBonus}</p>
              <p className="text-sm text-muted-foreground mt-1">Every 3 Months ({affiliateData?.tier || 'Standard'})</p>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• $150 upfront + ${currentQuarterlyBonus} quarterly retention bonus</li>
            <li>• Earn ${yearOneEarnings}+ per referral in year one</li>
            <li>• Referrals get 10% off for 3 months</li>
            <li>• Monthly payouts, no minimum</li>
          </ul>
          <div className="mt-4 border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr><th className="p-2 text-left">Milestone</th><th className="p-2 text-right">Total Earned</th></tr></thead>
              <tbody>
                <tr className="border-t"><td className="p-2">At Conversion</td><td className="p-2 text-right font-medium">$150</td></tr>
                <tr className="border-t"><td className="p-2">After 3 months</td><td className="p-2 text-right font-medium">${150 + currentQuarterlyBonus}</td></tr>
                <tr className="border-t"><td className="p-2">After 6 months</td><td className="p-2 text-right font-medium">${150 + currentQuarterlyBonus * 2}</td></tr>
                <tr className="border-t"><td className="p-2">After 12 months</td><td className="p-2 text-right font-medium">${yearOneEarnings}</td></tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Earnings Chart */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Earnings Over Time</CardTitle></CardHeader>
          <CardContent>
            {earningsChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={earningsChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Earnings']} />
                  <Line type="monotone" dataKey="earnings" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">No earnings data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <Link to="/affiliate/referrals"><Button variant="ghost" size="sm">View All <ArrowRight className="w-4 h-4 ml-1" /></Button></Link>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No activity yet</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{r.referred_name || r.referred_email}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(r.click_timestamp), 'MMM d, yyyy')}</p>
                    </div>
                    <Badge variant="secondary" className={cn(
                      r.status === 'converted' && 'bg-cta/10 text-cta',
                      r.status === 'signed_up' && 'bg-primary/10 text-primary',
                      r.status === 'clicked' && 'bg-muted text-muted-foreground',
                    )}>{r.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Link to="/affiliate/referrals"><Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-1"><Users className="w-5 h-5" /><span>View Referrals</span></Button></Link>
        <Link to="/affiliate/payouts"><Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-1"><DollarSign className="w-5 h-5" /><span>Request Payout</span></Button></Link>
        <Link to="/affiliate/marketing"><Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-1"><Share2 className="w-5 h-5" /><span>Marketing Assets</span></Button></Link>
      </div>
    </AffiliateLayout>
  );
}
