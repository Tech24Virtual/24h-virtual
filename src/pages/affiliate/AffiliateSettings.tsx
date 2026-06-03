import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { AffiliateLayout } from '@/components/affiliate/AffiliateLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function AffiliateSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [affiliateData, setAffiliateData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [paymentEmail, setPaymentEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('paypal');

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setIsLoading(true);
      const { data } = await supabase.from('affiliates').select('*').eq('user_id', user.id).maybeSingle();
      if (data) {
        setAffiliateData(data);
        setPaymentEmail(data.payment_email || '');
        setPaymentMethod(data.payment_method_preferred || 'paypal');
      }
      setIsLoading(false);
    };
    fetch();
  }, [user]);

  const handleSave = async () => {
    if (!affiliateData) return;
    setIsSaving(true);
    const { error } = await supabase.from('affiliates').update({
      payment_email: paymentEmail,
      payment_method_preferred: paymentMethod,
    }).eq('id', affiliateData.id);

    setIsSaving(false);
    if (error) {
      toast({ title: 'Error', description: 'Failed to save preferences', variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: 'Payment preferences updated successfully' });
    }
  };

  if (isLoading) return <AffiliateLayout title="Settings"><div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div></AffiliateLayout>;
  if (!affiliateData) return <AffiliateLayout title="Settings"><p className="text-muted-foreground">No affiliate data found.</p></AffiliateLayout>;

  return (
    <AffiliateLayout title="Settings">
      {/* Profile Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Profile Information</CardTitle>
          <CardDescription>Your affiliate account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label className="text-muted-foreground">Name</Label><p className="text-sm font-medium mt-1">{affiliateData.name || '-'}</p></div>
            <div><Label className="text-muted-foreground">Email</Label><p className="text-sm font-medium mt-1">{affiliateData.email}</p></div>
            <div><Label className="text-muted-foreground">Affiliate Code</Label><p className="text-sm font-medium mt-1 font-mono">{affiliateData.affiliate_code}</p></div>
            <div><Label className="text-muted-foreground">Status</Label><Badge variant="secondary" className="mt-1">{affiliateData.status || 'active'}</Badge></div>
          </div>
        </CardContent>
      </Card>

      {/* Commission & Tier */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Commission & Tier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div><Label className="text-muted-foreground">Commission Rate</Label><p className="text-sm font-medium mt-1">{((affiliateData.commission_rate || 0.1) * 100).toFixed(0)}%</p></div>
            <div><Label className="text-muted-foreground">Current Tier</Label><Badge variant="outline" className="mt-1 capitalize">{affiliateData.tier || 'standard'}</Badge></div>
            <div><Label className="text-muted-foreground">Lifetime Referrals</Label><p className="text-sm font-medium mt-1">{affiliateData.lifetime_referrals || 0}</p></div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Preferences</CardTitle>
          <CardDescription>Set your preferred payout method</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Preferred Payment Method</Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="mt-2">
              <div className="flex items-center space-x-2"><RadioGroupItem value="paypal" id="s-paypal" /><Label htmlFor="s-paypal" className="cursor-pointer">PayPal</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="bank_transfer" id="s-bank" /><Label htmlFor="s-bank" className="cursor-pointer">Bank Transfer</Label></div>
            </RadioGroup>
          </div>
          <div>
            <Label htmlFor="paymentEmail">{paymentMethod === 'paypal' ? 'PayPal Email' : 'Bank Account Details'}</Label>
            <Input id="paymentEmail" value={paymentEmail} onChange={e => setPaymentEmail(e.target.value)} placeholder={paymentMethod === 'paypal' ? 'your@email.com' : 'Account details'} className="mt-1" />
          </div>
          <Button onClick={handleSave} disabled={isSaving}><Save className="w-4 h-4 mr-1" />{isSaving ? 'Saving...' : 'Save Preferences'}</Button>
        </CardContent>
      </Card>
    </AffiliateLayout>
  );
}
