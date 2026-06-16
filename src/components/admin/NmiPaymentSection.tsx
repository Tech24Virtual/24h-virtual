import { useState } from 'react';
import { CreditCard, Plus, RefreshCw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface NmiLead {
  id: string;
  name: string;
  payment_processor: string | null;
  nmi_customer_vault_id: string | null;
  nmi_card_last_four: string | null;
  nmi_card_type: string | null;
  nmi_card_expiry: string | null;
  billing_currency: string | null;
}

interface NmiPaymentSectionProps {
  lead: NmiLead;
  onUpdate: () => void;
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

const emptyCardForm: AddCardForm = {
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

export function NmiPaymentSection({ lead, onUpdate }: NmiPaymentSectionProps) {
  const { toast } = useToast();
  const [showAddCard, setShowAddCard] = useState(false);
  const [showUpdateCard, setShowUpdateCard] = useState(false);
  const [showCharge, setShowCharge] = useState(false);
  const [cardForm, setCardForm] = useState<AddCardForm>(emptyCardForm);
  const [updateForm, setUpdateForm] = useState({ card_number: '', card_expiry: '', card_cvv: '' });
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeDesc, setChargeDesc] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const isNmi = lead.payment_processor === 'nmi';
  const hasVault = !!lead.nmi_customer_vault_id;

  const handleAddCard = async () => {
    setIsBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('nmi-vault-add', {
        body: { lead_id: lead.id, ...cardForm },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'Card add failed');
      toast({ title: 'Card added', description: `${data.card_type} ending in ${data.card_last_four} saved.` });
      setShowAddCard(false);
      setCardForm(emptyCardForm);
      onUpdate();
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally {
      setIsBusy(false);
    }
  };

  const handleUpdateCard = async () => {
    setIsBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('nmi-card-update', {
        body: { lead_id: lead.id, ...updateForm },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'Update failed');
      toast({ title: 'Card updated', description: `Now ending in ${data.card_last_four}.` });
      setShowUpdateCard(false);
      setUpdateForm({ card_number: '', card_expiry: '', card_cvv: '' });
      onUpdate();
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally {
      setIsBusy(false);
    }
  };

  const handleCharge = async () => {
    const amount = parseFloat(chargeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Invalid amount', description: 'Enter a positive dollar amount.', variant: 'destructive' });
      return;
    }
    setIsBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('nmi-charge', {
        body: {
          lead_id: lead.id,
          amount,
          description: chargeDesc || 'Manual charge',
          currency: lead.billing_currency || 'usd',
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'Charge failed');
      toast({ title: 'Charge successful', description: `$${amount.toFixed(2)} charged. TXN: ${data.transaction_id}` });
      setShowCharge(false);
      setChargeAmount('');
      setChargeDesc('');
    } catch (err: unknown) {
      toast({ title: 'Charge failed', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Card data-testid="nmi-payment-section">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Processor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Processor badge */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Processor</span>
          <Badge
            data-testid="payment-processor-badge"
            variant={isNmi ? 'default' : 'secondary'}
            className={isNmi ? 'bg-blue-600 text-white' : ''}
          >
            {isNmi ? 'NMI' : 'Stripe'}
          </Badge>
        </div>

        {/* Card on file — NMI only */}
        {isNmi && hasVault && (
          <>
            <Separator />
            <div data-testid="nmi-card-on-file" className="space-y-2">
              <p className="text-sm font-medium">Card on File</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                <span>
                  {lead.nmi_card_type || 'Card'} •••• {lead.nmi_card_last_four}
                  {lead.nmi_card_expiry && ` — exp ${lead.nmi_card_expiry}`}
                </span>
              </div>
            </div>
          </>
        )}

        {isNmi && !hasVault && (
          <p className="text-sm text-muted-foreground">No card on file yet.</p>
        )}

        <Separator />

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddCard(true)}
            data-testid="nmi-add-card-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            {hasVault && isNmi ? 'Replace Card (New Vault)' : 'Add Card (NMI)'}
          </Button>

          {isNmi && hasVault && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUpdateCard(true)}
                data-testid="nmi-update-card-btn"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Update Card
              </Button>

              <Button
                size="sm"
                onClick={() => setShowCharge(true)}
                data-testid="nmi-charge-now-btn"
              >
                <Zap className="w-4 h-4 mr-2" />
                Charge Now
              </Button>
            </>
          )}
        </div>
      </CardContent>

      {/* Add Card Dialog */}
      <Dialog open={showAddCard} onOpenChange={setShowAddCard}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Card to NMI Vault</DialogTitle>
          </DialogHeader>
          <div className="space-y-3" data-testid="nmi-add-card-form">
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
                data-testid="nmi-card-number-input"
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
                  data-testid="nmi-card-expiry-input"
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
                  data-testid="nmi-card-cvv-input"
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
            <Button variant="outline" onClick={() => setShowAddCard(false)} disabled={isBusy}>Cancel</Button>
            <Button onClick={handleAddCard} disabled={isBusy || !cardForm.card_number || !cardForm.card_expiry || !cardForm.card_cvv}>
              {isBusy ? 'Saving...' : 'Save Card'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Card Dialog */}
      <Dialog open={showUpdateCard} onOpenChange={setShowUpdateCard}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
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
            <Button variant="outline" onClick={() => setShowUpdateCard(false)} disabled={isBusy}>Cancel</Button>
            <Button onClick={handleUpdateCard} disabled={isBusy || !updateForm.card_number || !updateForm.card_expiry || !updateForm.card_cvv}>
              {isBusy ? 'Updating...' : 'Update Card'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Charge Now Dialog */}
      <Dialog open={showCharge} onOpenChange={setShowCharge}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Charge Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Amount ({(lead.billing_currency || 'usd').toUpperCase()})</Label>
              <Input
                placeholder="0.00"
                type="number"
                min="0.01"
                step="0.01"
                value={chargeAmount}
                onChange={(e) => setChargeAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input
                placeholder="Monthly subscription"
                value={chargeDesc}
                onChange={(e) => setChargeDesc(e.target.value)}
              />
            </div>
            {lead.nmi_card_last_four && (
              <p className="text-xs text-muted-foreground">
                Charging {lead.nmi_card_type} •••• {lead.nmi_card_last_four}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCharge(false)} disabled={isBusy}>Cancel</Button>
            <Button onClick={handleCharge} disabled={isBusy || !chargeAmount}>
              {isBusy ? 'Charging...' : 'Charge Now'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
