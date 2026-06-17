import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CreditCard,
  Clock,
  DollarSign,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  calculateDynamicBilling,
  formatCurrency,
  type DynamicBillingResult,
} from '@/lib/dynamicBilling';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface UsageStats {
  minutesUsed: number;
  totalCalls: number;
}

interface SubscriptionInfo {
  subscribed: boolean;
  plan_name: string | null;
  minutes_included: number;
  subscription_end: string | null;
  product_id: string | null;
}

interface BillingSummary {
  id: string;
  period_start: string;
  period_end: string;
  total_minutes: number;
  overage_amount: number;
  nmi_transaction_id: string | null;
  mode_used: string;
}

interface AddCardForm {
  card_number: string;
  card_expiry: string;
  card_cvv: string;
  first_name: string;
  last_name: string;
  billing_address: string;
  billing_city: string;
  billing_state: string;
  billing_zip: string;
  billing_country: string;
}

const emptyAddCardForm: AddCardForm = {
  card_number: '',
  card_expiry: '',
  card_cvv: '',
  first_name: '',
  last_name: '',
  billing_address: '',
  billing_city: '',
  billing_state: '',
  billing_zip: '',
  billing_country: 'US',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function Billing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Call-log + subscription state (not cache-able because check-subscription is
  // a Stripe edge-function call that doesn't map cleanly to a stable query key)
  const [usage, setUsage] = useState<UsageStats>({ minutesUsed: 0, totalCalls: 0 });
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [billingResult, setBillingResult] = useState<DynamicBillingResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  // Card management dialogs
  const [showAddCard, setShowAddCard] = useState(false);
  const [showUpdateCard, setShowUpdateCard] = useState(false);
  const [cardForm, setCardForm] = useState<AddCardForm>(emptyAddCardForm);
  const [updateForm, setUpdateForm] = useState({ card_number: '', card_expiry: '', card_cvv: '' });
  const [isCardBusy, setIsCardBusy] = useState(false);

  // ── TanStack Query: lead row (NMI card fields) ───────────────────────────
  // Key: ['client-lead', userId] — invalidated after add/update card
  const { data: leadData } = useQuery({
    queryKey: ['client-lead', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, service_type, plan_minutes, payment_processor, nmi_customer_vault_id, nmi_card_last_four, nmi_card_type, nmi_card_expiry')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const leadId = leadData?.id ?? null;
  const isNmi = leadData?.payment_processor === 'nmi';
  const hasVault = !!leadData?.nmi_customer_vault_id;

  // ── TanStack Query: billing history (NMI only) ───────────────────────────
  // Key: ['client-billing-history', leadId] — auto-refetches when lead changes
  const { data: billingHistory = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['client-billing-history', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_summaries')
        .select('id, period_start, period_end, total_minutes, overage_amount, nmi_transaction_id, mode_used')
        .eq('client_id', leadId!)
        .order('period_end', { ascending: false })
        .limit(24);
      if (error) throw error;
      return (data ?? []) as BillingSummary[];
    },
    enabled: !!leadId && isNmi,
  });

  // ── Effect: call logs + Stripe subscription (run once per user) ──────────
  useEffect(() => {
    if (!user) return;
    const fetchUsageAndSubscription = async () => {
      setIsLoading(true);
      const now = new Date();
      const [callsResult, subscriptionResult] = await Promise.all([
        supabase
          .from('call_logs')
          .select('handle_time_seconds')
          .eq('client_id', user.id)
          .gte('created_at', startOfMonth(now).toISOString())
          .lte('created_at', endOfMonth(now).toISOString()),
        supabase.functions.invoke('check-subscription'),
      ]);

      let totalMinutes = 0;
      if (!callsResult.error && callsResult.data) {
        const totalSeconds = callsResult.data.reduce(
          (sum, call) => sum + (call.handle_time_seconds || 0),
          0,
        );
        totalMinutes = Math.ceil(totalSeconds / 60);
        setUsage({ minutesUsed: totalMinutes, totalCalls: callsResult.data.length });
      }

      if (!subscriptionResult.error && subscriptionResult.data) {
        setSubscription(subscriptionResult.data);
      }

      setIsLoading(false);
    };
    fetchUsageAndSubscription();
  }, [user]);

  // ── Effect: dynamic billing (recalculates whenever lead/usage/sub changes) ─
  useEffect(() => {
    const serviceType = leadData?.service_type ?? null;
    const planMinutes =
      (subscription?.minutes_included ?? 0) > 0
        ? subscription!.minutes_included
        : (leadData?.plan_minutes ?? 250);
    if (serviceType) {
      setBillingResult(calculateDynamicBilling(serviceType, usage.minutesUsed, planMinutes));
    }
  }, [leadData, usage.minutesUsed, subscription]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleManageSubscription = async () => {
    setIsLoadingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to open billing portal. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingPortal(false);
    }
  };

  const handleAddCard = async () => {
    if (!leadId) return;
    setIsCardBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('nmi-vault-add', {
        body: { lead_id: leadId, ...cardForm },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'Card add failed');
      toast({ title: 'Card added', description: `${data.card_type} ending in ${data.card_last_four} saved.` });
      setShowAddCard(false);
      setCardForm(emptyAddCardForm);
      // Invalidate the lead query — the UI re-renders from fresh server data
      queryClient.invalidateQueries({ queryKey: ['client-lead', user?.id] });
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally {
      setIsCardBusy(false);
    }
  };

  const handleUpdateCard = async () => {
    if (!leadId) return;
    setIsCardBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('nmi-card-update', {
        body: { lead_id: leadId, ...updateForm },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'Update failed');
      toast({ title: 'Card updated', description: `Now ending in ${data.card_last_four}.` });
      setShowUpdateCard(false);
      setUpdateForm({ card_number: '', card_expiry: '', card_cvv: '' });
      // Invalidate the lead query — card details re-render from fresh server data
      queryClient.invalidateQueries({ queryKey: ['client-lead', user?.id] });
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally {
      setIsCardBusy(false);
    }
  };

  const handleUpgrade = () => { window.location.href = '/pricing'; };

  // ── Derived display values ────────────────────────────────────────────────

  const planMinutes =
    (subscription?.minutes_included ?? 0) > 0
      ? subscription!.minutes_included
      : (leadData?.plan_minutes ?? 250);

  const usagePercentage = Math.min((usage.minutesUsed / planMinutes) * 100, 100);
  const remainingMinutes = Math.max(planMinutes - usage.minutesUsed, 0);
  const currentMonth = format(new Date(), 'MMMM yyyy');
  const nextInvoiceDate = subscription?.subscription_end
    ? format(new Date(subscription.subscription_end), 'MMM d, yyyy')
    : format(endOfMonth(new Date()), 'MMM d, yyyy');

  const baseCost = billingResult?.breakdown.baseCost ?? (subscription?.minutes_included === 500 ? 399 : 199);
  const overageMinutes = billingResult?.breakdown.overageMinutes ?? Math.max(usage.minutesUsed - planMinutes, 0);
  const overageRate = billingResult?.breakdown.overageRate ?? 1.50;
  const overageCost = billingResult?.breakdown.overageCost ?? (overageMinutes * overageRate);
  const estimatedTotal = billingResult?.breakdown.totalCost ?? (baseCost + overageCost);
  const dynamicSavings = billingResult?.savings ?? 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout
      title="Billing & Usage"
      description="Manage your subscription and view invoices"
    >
      {/* Usage stats */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Minutes Used</p>
                <p className="text-2xl font-bold">
                  {isLoading ? '...' : `${usage.minutesUsed} / ${planMinutes}`}
                </p>
              </div>
            </div>
            <Progress value={usagePercentage} className="mt-4" />
            <p className="text-sm text-muted-foreground mt-2">
              {remainingMinutes} minutes remaining this period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Calls</p>
                <p className="text-2xl font-bold">
                  {isLoading ? '...' : usage.totalCalls}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">For {currentMonth}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estimated Invoice</p>
                <p className="text-2xl font-bold">
                  {subscription?.subscribed ? `$${estimatedTotal.toFixed(0)}` : '$0'}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              {subscription?.subscribed ? `Renews ${nextInvoiceDate}` : 'No active subscription'}
            </p>
            {overageMinutes > 0 && (
              <p className="text-xs text-destructive mt-1">
                Includes ${overageCost.toFixed(2)} overage charges
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Current Plan */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : subscription?.subscribed ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-semibold">{subscription.plan_name}</p>
                  <Badge variant="secondary" className="bg-cta/10 text-cta">Active</Badge>
                </div>
                <p className="text-muted-foreground">
                  {formatCurrency(baseCost)}/month • Billed monthly
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Overage rate: {formatCurrency(overageRate)}/minute
                </p>
                {dynamicSavings > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-green-600">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Saving {formatCurrency(dynamicSavings)} with dynamic billing!
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleUpgrade}>
                  Upgrade Plan
                </Button>
                {!isNmi && (
                  <Button
                    variant="outline"
                    onClick={handleManageSubscription}
                    disabled={isLoadingPortal}
                    data-testid="stripe-manage-billing-btn"
                  >
                    {isLoadingPortal ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <ExternalLink className="w-4 h-4 mr-2" />
                    )}
                    Manage Billing
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-semibold text-muted-foreground">No Active Plan</p>
                <p className="text-muted-foreground">
                  Subscribe to start using our answering services
                </p>
              </div>
              <Button variant="cta" onClick={handleUpgrade}>
                View Plans
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Method */}
      {isNmi ? (
        <Card className="mb-8" data-testid="nmi-client-card-section">
          <CardHeader>
            <CardTitle className="text-lg">Payment Method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasVault ? (
              <div data-testid="nmi-client-card-on-file" className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-8 rounded bg-muted flex items-center justify-center">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {leadData?.nmi_card_type || 'Card'} •••• {leadData?.nmi_card_last_four}
                    </p>
                    {leadData?.nmi_card_expiry && (
                      <p className="text-sm text-muted-foreground">Expires {leadData.nmi_card_expiry}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUpdateCard(true)}
                  data-testid="nmi-client-update-card-btn"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Update Card
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  <p className="text-sm text-muted-foreground">No card on file yet</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowAddCard(true)}
                  data-testid="nmi-client-add-card-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Card
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : subscription?.subscribed ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-8 rounded bg-muted flex items-center justify-center">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-medium">Managed by Stripe</p>
                  <p className="text-sm text-muted-foreground">Click "Manage Billing" to update</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManageSubscription}
                disabled={isLoadingPortal}
              >
                Update
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          {isNmi ? (
            isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : billingHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="nmi-billing-history-empty">
                <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No billing history yet</p>
                <p className="text-sm">Your invoices will appear here once billing begins.</p>
              </div>
            ) : (
              <div data-testid="nmi-billing-history-table">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Total Minutes</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingHistory.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">
                          {format(new Date(row.period_start), 'MMM yyyy')}
                        </TableCell>
                        <TableCell className="text-right">{row.total_minutes.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          ${Number(row.overage_amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {row.nmi_transaction_id || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={row.mode_used === 'live' ? 'default' : 'secondary'}
                            className={
                              row.mode_used === 'live'
                                ? 'bg-green-600 text-white'
                                : row.mode_used === 'sandbox'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-amber-100 text-amber-700'
                            }
                          >
                            {row.mode_used}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : subscription?.subscribed ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Invoices are managed by Stripe</p>
              <Button
                variant="link"
                onClick={handleManageSubscription}
                disabled={isLoadingPortal}
                className="mt-2"
              >
                View in Billing Portal
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No invoices yet</p>
              <p className="text-sm">Subscribe to a plan to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Card Dialog */}
      <Dialog open={showAddCard} onOpenChange={setShowAddCard}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Payment Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-3" data-testid="nmi-client-add-card-form">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>First Name</Label>
                <Input
                  placeholder="John"
                  value={cardForm.first_name}
                  onChange={(e) => setCardForm((f) => ({ ...f, first_name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Last Name</Label>
                <Input
                  placeholder="Doe"
                  value={cardForm.last_name}
                  onChange={(e) => setCardForm((f) => ({ ...f, last_name: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Card Number</Label>
              <Input
                placeholder="4111 1111 1111 1111"
                maxLength={19}
                value={cardForm.card_number}
                onChange={(e) => setCardForm((f) => ({ ...f, card_number: e.target.value.replace(/\D/g, '') }))}
                data-testid="nmi-client-card-number-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Expiry (MM/YY)</Label>
                <Input
                  placeholder="12/25"
                  maxLength={5}
                  value={cardForm.card_expiry}
                  onChange={(e) => setCardForm((f) => ({ ...f, card_expiry: e.target.value }))}
                  data-testid="nmi-client-card-expiry-input"
                />
              </div>
              <div className="space-y-1">
                <Label>CVV</Label>
                <Input
                  placeholder="123"
                  maxLength={4}
                  type="password"
                  value={cardForm.card_cvv}
                  onChange={(e) => setCardForm((f) => ({ ...f, card_cvv: e.target.value.replace(/\D/g, '') }))}
                  data-testid="nmi-client-card-cvv-input"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Billing Address</Label>
              <Input
                placeholder="123 Main St"
                value={cardForm.billing_address}
                onChange={(e) => setCardForm((f) => ({ ...f, billing_address: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1 col-span-1">
                <Label>City</Label>
                <Input
                  placeholder="Anytown"
                  value={cardForm.billing_city}
                  onChange={(e) => setCardForm((f) => ({ ...f, billing_city: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>State</Label>
                <Input
                  placeholder="CA"
                  maxLength={2}
                  value={cardForm.billing_state}
                  onChange={(e) => setCardForm((f) => ({ ...f, billing_state: e.target.value.toUpperCase() }))}
                />
              </div>
              <div className="space-y-1">
                <Label>ZIP</Label>
                <Input
                  placeholder="90210"
                  maxLength={10}
                  value={cardForm.billing_zip}
                  onChange={(e) => setCardForm((f) => ({ ...f, billing_zip: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCard(false)} disabled={isCardBusy}>
              Cancel
            </Button>
            <Button
              onClick={handleAddCard}
              disabled={isCardBusy || !cardForm.card_number || !cardForm.card_expiry || !cardForm.card_cvv}
            >
              {isCardBusy ? 'Saving...' : 'Save Card'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Card Dialog */}
      <Dialog open={showUpdateCard} onOpenChange={setShowUpdateCard}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Payment Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-3" data-testid="nmi-client-update-card-form">
            <div className="space-y-1">
              <Label>New Card Number</Label>
              <Input
                placeholder="4111 1111 1111 1111"
                maxLength={19}
                value={updateForm.card_number}
                onChange={(e) => setUpdateForm((f) => ({ ...f, card_number: e.target.value.replace(/\D/g, '') }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Expiry (MM/YY)</Label>
                <Input
                  placeholder="12/25"
                  maxLength={5}
                  value={updateForm.card_expiry}
                  onChange={(e) => setUpdateForm((f) => ({ ...f, card_expiry: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>CVV</Label>
                <Input
                  placeholder="123"
                  maxLength={4}
                  type="password"
                  value={updateForm.card_cvv}
                  onChange={(e) => setUpdateForm((f) => ({ ...f, card_cvv: e.target.value.replace(/\D/g, '') }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateCard(false)} disabled={isCardBusy}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateCard}
              disabled={isCardBusy || !updateForm.card_number || !updateForm.card_expiry || !updateForm.card_cvv}
            >
              {isCardBusy ? 'Updating...' : 'Update Card'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
