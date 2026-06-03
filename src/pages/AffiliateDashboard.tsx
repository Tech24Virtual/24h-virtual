import { useState, useEffect } from 'react';
import { DollarSign, Users, TrendingUp, Copy, Check, ExternalLink, LifeBuoy, Plus, Bot } from 'lucide-react';
import { DashboardOnboarding } from '@/components/onboarding/DashboardOnboarding';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PayoutRequestDialog } from '@/components/affiliate/PayoutRequestDialog';
import { PayoutHistory } from '@/components/affiliate/PayoutHistory';
import { MyTicketsList, SubmitTicketDialog } from '@/components/tickets';
import { SupportAssistant } from '@/components/admin/SupportAssistant';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { AFFILIATE_BASE_URL } from '@/lib/affiliateDomain';

interface AffiliateData {
  id: string;
  affiliate_code: string;
  commission_rate: number | null;
  total_earnings: number | null;
  status: string | null;
  tier: string;
}

interface Referral {
  id: string;
  referred_name: string | null;
  referred_email: string;
  status: string | null;
  commission_amount: number | null;
  click_timestamp: string;
  converted_at: string | null;
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  payment_method: string | null;
  requested_at: string;
  processed_at: string | null;
}

interface Stats {
  totalEarnings: number;
  pendingEarnings: number;
  paidOut: number;
  totalReferrals: number;
  conversions: number;
}

const statusColors: Record<string, string> = {
  clicked: 'bg-brand-rose text-heading',
  signed_up: 'bg-primary/10 text-primary',
  converted: 'bg-cta/10 text-cta',
};

export default function AffiliateDashboard() {
  const { user, profile } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(!(profile as any)?.onboarding_completed);
  const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalEarnings: 0,
    pendingEarnings: 0,
    paidOut: 0,
    totalReferrals: 0,
    conversions: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [payoutsLoading, setPayoutsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const [showTicketDialog, setShowTicketDialog] = useState(false);

  const fetchPayouts = async (affiliateId: string) => {
    setPayoutsLoading(true);
    const { data } = await supabase
      .from('affiliate_payouts')
      .select('*')
      .eq('affiliate_id', affiliateId)
      .order('requested_at', { ascending: false });
    
    setPayouts(data || []);
    setPayoutsLoading(false);
    return data || [];
  };

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setIsLoading(true);

      // Fetch affiliate data
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (affiliate) {
        setAffiliateData(affiliate);

        // Fetch referrals and payouts in parallel
        const [{ data: refs }, payoutsData] = await Promise.all([
          supabase
            .from('affiliate_referrals')
            .select('*')
            .eq('affiliate_id', affiliate.id)
            .order('click_timestamp', { ascending: false }),
          fetchPayouts(affiliate.id),
        ]);

        if (refs) {
          setReferrals(refs);

          const totalEarnings = affiliate.total_earnings || 0;
          const conversions = refs.filter(r => r.status === 'converted').length;
          const pendingEarnings = refs
            .filter(r => r.status === 'signed_up')
            .reduce((sum, r) => sum + (r.commission_amount || 0), 0);
          
          // Calculate paid out from completed payouts
          const paidOut = payoutsData
            .filter(p => p.status === 'completed')
            .reduce((sum, p) => sum + p.amount, 0);

          setStats({
            totalEarnings,
            pendingEarnings,
            paidOut,
            totalReferrals: refs.length,
            conversions,
          });
        }
      }

      setIsLoading(false);
    };

    fetchData();
  }, [user]);

  const referralLink = affiliateData
    ? `${AFFILIATE_BASE_URL}?ref=${affiliateData.affiliate_code}`
    : '';

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePayoutSuccess = () => {
    if (affiliateData) {
      fetchPayouts(affiliateData.id);
    }
  };

  // Available balance = total earnings - paid out - pending payouts
  const pendingPayouts = payouts
    .filter(p => p.status === 'pending' || p.status === 'processing')
    .reduce((sum, p) => sum + p.amount, 0);
  const availableBalance = stats.totalEarnings - stats.paidOut - pendingPayouts;

  const statCards = [
    {
      title: 'Total Earnings',
      value: `$${stats.totalEarnings.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-cta',
      bgColor: 'bg-cta/10',
    },
    {
      title: 'Available',
      value: `$${availableBalance.toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-brand-rose',
    },
    {
      title: 'Total Referrals',
      value: stats.totalReferrals,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Conversions',
      value: stats.conversions,
      icon: TrendingUp,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
    },
  ];

  if (isLoading) {
    return (
      <DashboardLayout title="Affiliate Dashboard" description="Track your referrals and earnings">
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Loading...
        </div>
      </DashboardLayout>
    );
  }

  if (!affiliateData) {
    return (
      <DashboardLayout title="Affiliate Dashboard" description="Track your referrals and earnings">
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">Not an Affiliate Yet</h3>
            <p className="text-muted-foreground mb-4">
              You haven't signed up for our affiliate program yet.
            </p>
            <Button asChild><a href="/partners/affiliate#apply">Apply to Become an Affiliate</a></Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Affiliate Dashboard" description="Track your referrals and earnings">
      {showOnboarding && (
        <DashboardOnboarding dashboardContext="affiliate" onComplete={() => setShowOnboarding(false)} />
      )}
      {/* Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-heading mt-1">{stat.value}</p>
                </div>
                <div className={cn('w-12 h-12 rounded-full flex items-center justify-center', stat.bgColor)}>
                  <stat.icon className={cn('w-6 h-6', stat.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Referral Link Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Your Referral Link</CardTitle>
          <CardDescription>Share this link to earn commissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input value={referralLink} readOnly className="flex-1" />
            <Button onClick={copyToClipboard} variant="outline">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          {(() => {
            const tierBonusMap: Record<string, number> = { Standard: 50, Silver: 75, Gold: 100, Platinum: 150 };
            const bonus = tierBonusMap[affiliateData?.tier || 'Standard'] || 50;
            return (
              <p className="text-sm text-muted-foreground mt-2">
                $150 Conversion Bonus + ${bonus} Every 3 Months ({affiliateData?.tier || 'Standard'} Tier)
              </p>
            );
          })()}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="referrals">
        <TabsList>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
        </TabsList>

        <TabsContent value="referrals" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Referrals</CardTitle>
            </CardHeader>
            <CardContent>
              {referrals.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium mb-2">No referrals yet</p>
                  <p className="text-sm">Share your link to start earning</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referrals.map((referral) => (
                      <TableRow key={referral.id}>
                        <TableCell>{referral.referred_name || '-'}</TableCell>
                        <TableCell>{referral.referred_email}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={statusColors[referral.status || 'clicked']}
                          >
                            {referral.status || 'clicked'}
                          </Badge>
                        </TableCell>
                        <TableCell>${(referral.commission_amount || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          {format(new Date(referral.click_timestamp), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Payout History</CardTitle>
                <CardDescription>View your payout history and request payouts</CardDescription>
              </div>
              <Button
                onClick={() => setShowPayoutDialog(true)}
                disabled={availableBalance <= 0}
              >
                Request Payout
              </Button>
            </CardHeader>
            <CardContent>
              {availableBalance <= 0 && (
                <div className="mb-4 p-3 bg-muted rounded-md text-sm text-muted-foreground">
                  No balance available for payout.
                </div>
              )}
              <PayoutHistory payouts={payouts} isLoading={payoutsLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="support" className="mt-6">
          <Tabs defaultValue="ai-support">
            <TabsList>
              <TabsTrigger value="ai-support" className="gap-2">
                <Bot className="h-4 w-4" />
                AI Support
              </TabsTrigger>
              <TabsTrigger value="tickets" className="gap-2">
                <LifeBuoy className="h-4 w-4" />
                Tickets
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ai-support" className="mt-4">
              <SupportAssistant dashboardContext="affiliate" />
            </TabsContent>

            <TabsContent value="tickets" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <LifeBuoy className="h-5 w-5" />
                      Support Tickets
                    </CardTitle>
                    <CardDescription>Get help from our affiliate support team</CardDescription>
                  </div>
                  <Button onClick={() => setShowTicketDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Submit Ticket
                  </Button>
                </CardHeader>
                <CardContent>
                  <MyTicketsList />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="marketing" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Marketing Assets</CardTitle>
              <CardDescription>Download banners and promotional materials</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <ExternalLink className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Banner 300x250</p>
                    <Button variant="outline" size="sm" className="mt-2">
                      Download
                    </Button>
                  </CardContent>
                </Card>
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <ExternalLink className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Banner 728x90</p>
                    <Button variant="outline" size="sm" className="mt-2">
                      Download
                    </Button>
                  </CardContent>
                </Card>
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <ExternalLink className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Email Templates</p>
                    <Button variant="outline" size="sm" className="mt-2">
                      Download
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payout Request Dialog */}
      <PayoutRequestDialog
        open={showPayoutDialog}
        onOpenChange={setShowPayoutDialog}
        affiliateId={affiliateData.id}
        availableBalance={availableBalance}
        onSuccess={handlePayoutSuccess}
      />

      {/* Support Ticket Dialog */}
      <SubmitTicketDialog
        open={showTicketDialog}
        onOpenChange={setShowTicketDialog}
        source="affiliate_portal"
        affiliateId={affiliateData.id}
      />
    </DashboardLayout>
  );
}
