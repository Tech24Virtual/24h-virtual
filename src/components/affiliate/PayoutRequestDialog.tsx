import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PayoutRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  affiliateId: string;
  availableBalance: number;
  onSuccess: () => void;
}

export function PayoutRequestDialog({
  open,
  onOpenChange,
  affiliateId,
  availableBalance,
  onSuccess,
}: PayoutRequestDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('paypal');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [amount, setAmount] = useState(availableBalance.toString());

  const handleSubmit = async () => {
    const requestedAmount = parseFloat(amount);
    
    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    if (requestedAmount > availableBalance) {
      toast({
        title: 'Insufficient balance',
        description: 'You cannot request more than your available balance',
        variant: 'destructive',
      });
      return;
    }

    if (!paymentDetails.trim()) {
      toast({
        title: 'Payment details required',
        description: `Please enter your ${paymentMethod === 'paypal' ? 'PayPal email' : 'bank account details'}`,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase
      .from('affiliate_payouts')
      .insert({
        affiliate_id: affiliateId,
        amount: requestedAmount,
        payment_method: paymentMethod,
        payment_details: { [paymentMethod]: paymentDetails },
      });

    setIsSubmitting(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit payout request. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Payout requested',
      description: `Your request for $${requestedAmount.toFixed(2)} has been submitted.`,
    });

    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Payout</DialogTitle>
          <DialogDescription>
            Request a payout of your available earnings. Monthly payouts, no minimum.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              min={0.01}
              max={availableBalance}
              step={0.01}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Available balance: ${availableBalance.toFixed(2)}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="paypal" id="paypal" />
                <Label htmlFor="paypal" className="cursor-pointer">PayPal</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                <Label htmlFor="bank_transfer" className="cursor-pointer">Bank Transfer</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentDetails">
              {paymentMethod === 'paypal' ? 'PayPal Email' : 'Bank Account Details'}
            </Label>
            <Input
              id="paymentDetails"
              placeholder={paymentMethod === 'paypal' ? 'your@email.com' : 'Account number, routing, etc.'}
              value={paymentDetails}
              onChange={(e) => setPaymentDetails(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
