import { useState } from 'react';
import { Copy, ExternalLink, Send, CreditCard, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Lead {
  id: string;
  name: string;
  email: string;
  service_type: string | null;
  plan_minutes: number | null;
  billing_period: string | null;
  pipeline_stage: string | null;
  payment_link_sent_at: string | null;
  subscription_started_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  onboarding_checklist: Record<string, boolean> | null;
}

interface BillingActionsProps {
  lead: Lead;
  onUpdate: () => void;
}

export function BillingActions({ lead, onUpdate }: BillingActionsProps) {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);

  const isChecklistComplete = lead.onboarding_checklist 
    ? Object.values(lead.onboarding_checklist).every(v => v === true)
    : false;

  const canSendPaymentLink = 
    lead.pipeline_stage === 'ready_for_billing' && 
    lead.service_type && 
    lead.plan_minutes &&
    !lead.stripe_subscription_id;

  const handleSendPaymentLink = async () => {
    if (!lead.service_type || !lead.plan_minutes) {
      toast({
        title: 'Missing plan information',
        description: 'Lead must have a service type and minutes selected.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-payment-link', {
        body: { 
          leadId: lead.id,
          email: lead.email,
        },
      });

      if (error) throw error;

      if (data?.url) {
        setPaymentLink(data.url);
        toast({
          title: 'Payment link generated!',
          description: data.emailSent 
            ? 'Link has been emailed to the client.' 
            : 'Copy the link below to share with the client.',
        });
        onUpdate();
      }
    } catch (error: any) {
      toast({
        title: 'Failed to generate payment link',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Payment link copied to clipboard.',
    });
  };

  // Active subscription state
  if (lead.stripe_subscription_id) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge className="bg-secondary/10 text-secondary">Active Subscription</Badge>
        </div>
        <div className="text-sm space-y-1">
          <p className="text-muted-foreground">
            Started: {lead.subscription_started_at 
              ? format(new Date(lead.subscription_started_at), 'MMM d, yyyy')
              : 'N/A'}
          </p>
          <p className="text-muted-foreground">
            Customer ID: {lead.stripe_customer_id?.slice(0, 20)}...
          </p>
        </div>
        <Button variant="outline" size="sm" className="w-full" disabled>
          <CreditCard className="w-4 h-4 mr-2" />
          View in Stripe Dashboard
        </Button>
      </div>
    );
  }

  // Payment link sent state
  if (lead.payment_link_sent_at && !paymentLink) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-yellow-500 text-yellow-600">
            Payment Link Sent
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Sent on {format(new Date(lead.payment_link_sent_at), 'MMM d, yyyy h:mm a')}
        </p>
        <Button 
          variant="secondary" 
          size="sm" 
          className="w-full"
          onClick={handleSendPaymentLink}
          disabled={isSending}
        >
          <Send className="w-4 h-4 mr-2" />
          Resend Payment Link
        </Button>
      </div>
    );
  }

  // Ready to send state
  return (
    <div className="space-y-4">
      {!isChecklistComplete && (
        <div className="flex items-start gap-2 text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Complete the onboarding checklist before sending payment link.</span>
        </div>
      )}

      {lead.pipeline_stage !== 'ready_for_billing' && (
        <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Move lead to "Ready for Billing" stage to enable payment link.</span>
        </div>
      )}

      <Button 
        className="w-full"
        onClick={handleSendPaymentLink}
        disabled={!canSendPaymentLink || isSending}
      >
        <Send className="w-4 h-4 mr-2" />
        {isSending ? 'Generating...' : 'Send Payment Link'}
      </Button>

      {paymentLink && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Payment Link Generated:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={paymentLink}
              readOnly
              className="flex-1 text-xs bg-muted px-3 py-2 rounded-md truncate"
            />
            <Button size="sm" variant="outline" onClick={() => copyToClipboard(paymentLink)}>
              <Copy className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={paymentLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
