import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Search, Eye, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { servicePricingMap } from '@/lib/pricingData';

interface ActiveSubscriptionsListProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export function ActiveSubscriptionsList({ searchTerm, onSearchChange }: ActiveSubscriptionsListProps) {
  const { data: subscriptions, isLoading, error } = useQuery({
    queryKey: ['active-subscriptions', searchTerm],
    staleTime: 60_000,
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('id, name, email, company, service_type, plan_minutes, pipeline_stage, payment_processor, nmi_card_last_four, nmi_card_type')
        .eq('pipeline_stage', 'active')
        .order('created_at', { ascending: false });

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
        <CardTitle>Active Clients</CardTitle>
        <CardDescription>All clients with pipeline stage: active</CardDescription>
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
        ) : error ? (
          <div className="text-center py-8 text-destructive/80">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-60" />
            <p className="font-medium text-sm">Failed to load active clients</p>
            <p className="text-xs text-muted-foreground mt-1">Check Supabase grants for the leads table.</p>
          </div>
        ) : subscriptions?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? 'No clients match your search' : 'No active clients'}
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
                      {lead.plan_minutes ? `${lead.plan_minutes} min` : '-'} •{' '}
                      {getEstimatedPrice(lead.service_type, lead.plan_minutes)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="capitalize">
                      {(lead.payment_processor as string | null) ?? 'nmi'}
                    </Badge>
                    {lead.nmi_card_last_four && (
                      <span className="text-xs text-muted-foreground hidden md:inline">
                        ···{lead.nmi_card_last_four}
                      </span>
                    )}
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
