import { useState } from 'react';
import { Loader2, UserPlus, Send, DollarSign } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  aiReceptionistPricing,
  messageAssistantPricing,
  virtualReceptionistPricing,
  virtualSecretaryPricing,
  getAnnualPrice,
  formatPrice,
  type ServicePricing,
} from '@/lib/pricingData';

interface CreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const servicePricingMap: Record<string, ServicePricing> = {
  'ai-receptionist': aiReceptionistPricing,
  'message-assistant': messageAssistantPricing,
  'virtual-receptionist': virtualReceptionistPricing,
  'virtual-secretary': virtualSecretaryPricing,
};

const serviceLabels: Record<string, string> = {
  'ai-receptionist': 'AI Receptionist',
  'message-assistant': 'Message Assistant',
  'virtual-receptionist': 'Virtual Receptionist',
  'virtual-secretary': 'Virtual Secretary',
};

export function CreateClientDialog({ open, onOpenChange }: CreateClientDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceType, setServiceType] = useState('virtual-receptionist');
  const [planMinutes, setPlanMinutes] = useState('250');
  const [country, setCountry] = useState<'US' | 'CA'>('US');
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  const pricing = servicePricingMap[serviceType];
  const selectedTier = pricing?.tiers.find(t => t.minutes === parseInt(planMinutes));
  const isAnnual = billingPeriod === 'annual';
  const billingCurrency = country === 'CA' ? 'cad' : 'usd';
  const currencySymbol = billingCurrency === 'cad' ? 'C$' : '$';
  
  const basePrice = selectedTier?.price || 0;
  const discountedPrice = isAnnual ? getAnnualPrice(basePrice) : basePrice;
  const savings = isAnnual ? basePrice - discountedPrice : 0;

  const resetForm = () => {
    setName('');
    setEmail('');
    setCompany('');
    setPhone('');
    setServiceType('virtual-receptionist');
    setPlanMinutes('250');
    setCountry('US');
    setBillingPeriod('monthly');
  };

  const handleCreate = async (sendPaymentLink: boolean) => {
    if (!name || !email) {
      toast({
        title: 'Validation Error',
        description: 'Name and email are required',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-client', {
        body: {
          name,
          email,
          company: company || null,
          phone: phone || null,
          serviceType,
          planMinutes: parseInt(planMinutes),
          billingPeriod,
          country,
          billingCurrency,
          sendPaymentLink,
        },
      });

      if (error) throw error;

      toast({
        title: 'Client Created',
        description: sendPaymentLink 
          ? `Client created and payment link sent to ${email}`
          : 'Client created successfully',
      });

      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating client:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create client',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create New Client
          </DialogTitle>
          <DialogDescription>
            Create a new client with Stripe integration and optional payment link
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Contact Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Smith"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Corp"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Service Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Service Selection
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Service Type</Label>
                <Select value={serviceType} onValueChange={setServiceType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(serviceLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plan Tier</Label>
                <Select value={planMinutes} onValueChange={setPlanMinutes}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pricing?.tiers.map((tier) => (
                      <SelectItem key={tier.minutes} value={tier.minutes.toString()}>
                        {tier.minutes.toLocaleString()} min - {tier.priceFormatted}/mo
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Billing Options */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Billing Options
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={country} onValueChange={(v) => setCountry(v as 'US' | 'CA')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States (USD)</SelectItem>
                    <SelectItem value="CA">Canada (CAD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Billing Period</Label>
                <div className="flex items-center gap-4 h-10">
                  <span className={billingPeriod === 'monthly' ? 'font-medium' : 'text-muted-foreground'}>
                    Monthly
                  </span>
                  <Switch
                    checked={billingPeriod === 'annual'}
                    onCheckedChange={(checked) => setBillingPeriod(checked ? 'annual' : 'monthly')}
                  />
                  <span className={billingPeriod === 'annual' ? 'font-medium' : 'text-muted-foreground'}>
                    Annual
                    <Badge className="ml-2 bg-cta/10 text-cta border-cta/20">
                      10% off
                    </Badge>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Pricing Preview */}
          <div className="p-4 rounded-lg bg-muted/50 border">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Pricing Preview
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base Plan:</span>
                <span className="font-medium">
                  {currencySymbol}{discountedPrice.toFixed(0)}/mo
                  {isAnnual && (
                    <span className="text-muted-foreground line-through ml-2">
                      {currencySymbol}{basePrice}
                    </span>
                  )}
                </span>
              </div>
              {isAnnual && (
                <div className="flex justify-between text-cta">
                  <span>Annual Savings:</span>
                  <span className="font-medium">{currencySymbol}{savings.toFixed(0)}/mo</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Overage Rate:</span>
                <span>{currencySymbol}{pricing?.overage.toFixed(2)}/min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Currency:</span>
                <span>{billingCurrency.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => handleCreate(false)} 
            disabled={isLoading || !name || !email}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create Client
          </Button>
          <Button 
            onClick={() => handleCreate(true)} 
            disabled={isLoading || !name || !email}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Create & Send Payment Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
