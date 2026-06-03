import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Search, Link2, User, Calendar, CreditCard, Loader2 } from 'lucide-react';

interface LinkStripeCustomerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StripeCustomer {
  id: string;
  name: string | null;
  email: string | null;
  created: string;
}

interface StripeSubscription {
  id: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  items: {
    id: string;
    priceId: string;
    productId: string;
    productName: string | null;
    amount: number | null;
    interval: string | null;
  }[];
}

export function LinkStripeCustomer({ open, onOpenChange }: LinkStripeCustomerProps) {
  const [email, setEmail] = useState('');
  const [searchResult, setSearchResult] = useState<{
    found: boolean;
    customer: StripeCustomer | null;
    subscriptions: StripeSubscription[];
  } | null>(null);
  const [linkMode, setLinkMode] = useState<'existing' | 'new'>('new');
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  const queryClient = useQueryClient();

  // Fetch leads for linking
  const { data: leads } = useQuery({
    queryKey: ['leads-for-linking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, email, company')
        .is('stripe_customer_id', null)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const handleSearch = async () => {
    if (!email.trim()) {
      toast({ title: 'Please enter an email address', variant: 'destructive' });
      return;
    }

    setIsSearching(true);
    setSearchResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('link-stripe-customer', {
        body: { email: email.trim(), action: 'search' },
      });

      if (error) throw error;
      setSearchResult(data);

      if (!data.found) {
        toast({ title: 'No Stripe customer found with this email' });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({ 
        title: 'Search failed', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive' 
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleLink = async () => {
    if (!searchResult?.customer) return;

    setIsLinking(true);

    try {
      const { data, error } = await supabase.functions.invoke('link-stripe-customer', {
        body: {
          email: searchResult.customer.email,
          action: 'link',
          leadId: linkMode === 'existing' ? selectedLeadId : undefined,
          createLead: linkMode === 'new',
        },
      });

      if (error) throw error;

      toast({ 
        title: 'Customer linked successfully!',
        description: `Linked to ${linkMode === 'new' ? 'new' : 'existing'} lead`,
      });

      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-stats'] });
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Link error:', error);
      toast({ 
        title: 'Failed to link customer', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive' 
      });
    } finally {
      setIsLinking(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setSearchResult(null);
    setLinkMode('new');
    setSelectedLeadId('');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link Existing Stripe Customer
          </DialogTitle>
          <DialogDescription>
            Search for a Stripe customer by email and link them to a lead
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="email" className="sr-only">Customer Email</Label>
              <Input
                id="email"
                placeholder="customer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Search Results */}
          {searchResult?.found && searchResult.customer && (
            <div className="space-y-4 border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {searchResult.customer.name || 'No name'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {searchResult.customer.email}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Created: {new Date(searchResult.customer.created).toLocaleDateString()}
                  </div>
                </div>
                <Badge variant="outline">
                  {searchResult.customer.id.substring(0, 12)}...
                </Badge>
              </div>

              {/* Subscriptions */}
              {searchResult.subscriptions.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium flex items-center gap-1">
                    <CreditCard className="h-4 w-4" />
                    Active Subscriptions
                  </div>
                  {searchResult.subscriptions.map((sub) => (
                    <div key={sub.id} className="text-sm bg-muted/50 rounded p-2">
                      {sub.items.map((item) => (
                        <div key={item.id}>
                          {item.productName || 'Unknown product'} 
                          {item.amount && ` - $${(item.amount / 100).toFixed(2)}`}
                          {item.interval && `/${item.interval}`}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* Link Options */}
              <div className="space-y-3 pt-2 border-t">
                <Label>Link to:</Label>
                <RadioGroup value={linkMode} onValueChange={(v) => setLinkMode(v as 'existing' | 'new')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="new" id="new" />
                    <Label htmlFor="new" className="font-normal">Create new lead</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="existing" id="existing" />
                    <Label htmlFor="existing" className="font-normal">Existing lead</Label>
                  </div>
                </RadioGroup>

                {linkMode === 'existing' && (
                  <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a lead" />
                    </SelectTrigger>
                    <SelectContent>
                      {leads?.map((lead) => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.name} - {lead.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <Button 
                onClick={handleLink} 
                disabled={isLinking || (linkMode === 'existing' && !selectedLeadId)}
                className="w-full"
              >
                {isLinking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Linking...
                  </>
                ) : (
                  'Link Customer'
                )}
              </Button>
            </div>
          )}

          {searchResult && !searchResult.found && (
            <div className="text-center py-4 text-muted-foreground">
              No Stripe customer found with this email
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
