import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Search, ExternalLink, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  servicePricingMap, 
  type ServicePricing 
} from '@/lib/pricingData';

interface ActiveSubscriptionsListProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export function ActiveSubscriptionsList({ searchTerm, onSearchChange }: ActiveSubscriptionsListProps) {
  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['active-subscriptions', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('*')
        .not('stripe_subscription_id', 'is', null)
        .order('subscription_started_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const getServiceName = (slug: string | null): string => {
    if (!slug) return 'Unknown Service';
    const service = servicePricingMap[slug];
    return service?.name || slug;
  };

  const getEstimatedPrice = (serviceType: string | null, minutes: number | null): string => {
    if (!serviceType || !minutes) return '-';
    const service = servicePricingMap[serviceType];
    if (!service) return '-';
    const tier = service.tiers.find(t => t.minutes === minutes);
    return tier?.priceFormatted || '-';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Subscriptions</CardTitle>
        <CardDescription>
          All clients with active Stripe subscriptions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or company..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : subscriptions?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? 'No subscriptions match your search' : 'No active subscriptions'}
          </div>
        ) : (
          <div className="space-y-3">
            {subscriptions?.map((lead) => (
              <div 
                key={lead.id} 
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{lead.name}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {lead.email}
                    {lead.company && ` • ${lead.company}`}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 ml-4">
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-medium">
                      {getServiceName(lead.service_type)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {lead.plan_minutes ? `${lead.plan_minutes} min` : '-'} • {getEstimatedPrice(lead.service_type, lead.plan_minutes)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={lead.status === 'active' ? 'default' : 'secondary'}
                      className="capitalize"
                    >
                      {lead.status}
                    </Badge>
                    
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/admin/leads/${lead.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
