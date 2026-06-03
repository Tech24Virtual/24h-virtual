import { useState, useEffect, useMemo } from 'react';
import { DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AffiliateLayout } from '@/components/affiliate/AffiliateLayout';
import { PayoutRequestDialog } from '@/components/affiliate/PayoutRequestDialog';
import { PayoutHistory } from '@/components/affiliate/PayoutHistory';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export default function AffiliatePayouts() {
  const { user } = useAuth();
  const [affiliateData, setAffiliateData] = useState<any>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);

  const fetchPayouts = async (affiliateId: string) => {
    const { data } = await supabase.from('affiliate_payouts').select('*').eq('affiliate_id', affiliateId).order('requested_at', { ascending: false });
    setPayouts(data || []);
    return data || [];
  };

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setIsLoading(true);
      const { data: aff } = await supabase.from('affiliates').select('*').eq('user_id', user.id).maybeSingle();
      if (aff) {
        setAffiliateData(aff);
        await fetchPayouts(aff.id);
      }
      setIsLoading(false);
    };
    fetch();
  }, [user]);

  const summary = useMemo(() => {
    if (!affiliateData) return { totalEarned: 0, totalPaid: 0, pending: 0, available: 0 };
    const totalEarned = affiliateData.total_earnings || 0;
    const totalPaid = payouts.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0);
    const pending = payouts.filter(p => p.status === 'pending' || p.status === 'processing').reduce((s, p) => s + p.amount, 0);
    return { totalEarned, totalPaid, pending, available: totalEarned - totalPaid - pending };
  }, [affiliateData, payouts]);

  if (isLoading) return <AffiliateLayout title="Payouts"><div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div></AffiliateLayout>;

  return (
    <AffiliateLayout title="Payouts">
      {/* Summary Cards */}
      <div className="grid sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Earned', value: `$${summary.totalEarned.toFixed(2)}` },
          { label: 'Total Paid', value: `$${summary.totalPaid.toFixed(2)}` },
          { label: 'Pending Payouts', value: `$${summary.pending.toFixed(2)}` },
          { label: 'Available Balance', value: `$${summary.available.toFixed(2)}` },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-5 text-center">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold mt-1">{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Payout History</CardTitle>
            <CardDescription>View your payout history and request payouts</CardDescription>
          </div>
          <Button onClick={() => setShowPayoutDialog(true)} disabled={summary.available <= 0}>
            <DollarSign className="w-4 h-4 mr-1" />Request Payout
          </Button>
        </CardHeader>
        <CardContent>
          {summary.available <= 0 && (
            <div className="mb-4 p-3 bg-muted rounded-md text-sm text-muted-foreground">
              No balance available for payout.
            </div>
          )}
          <PayoutHistory payouts={payouts} isLoading={isLoading} />
        </CardContent>
      </Card>

      {affiliateData && (
        <PayoutRequestDialog
          open={showPayoutDialog}
          onOpenChange={setShowPayoutDialog}
          affiliateId={affiliateData.id}
          availableBalance={summary.available}
          onSuccess={() => fetchPayouts(affiliateData.id)}
        />
      )}
    </AffiliateLayout>
  );
}
