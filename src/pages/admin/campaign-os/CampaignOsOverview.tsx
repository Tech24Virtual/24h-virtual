import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, MapPin, PhoneCall, MessageCircleQuestion, ScrollText, Phone, Tag, Database } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { GoLiveSelfTestPanel } from '@/components/campaign-os/go-live/GoLiveSelfTestPanel';

function useCount(table: string, key: string) {
  return useQuery({
    queryKey: ['campaign-os', 'count', key],
    queryFn: async () => {
      const { count } = await (supabase as any).from(table).select('id', { count: 'exact', head: true });
      return count ?? 0;
    },
  });
}

export default function CampaignOsOverview() {
  const clients = useCount('leads', 'clients');
  const locations = useCount('client_locations', 'locations');
  const callFlows = useCount('client_departments', 'call_flows');
  const fields = useCount('campaign_fields', 'fields');
  const faqs = useCount('campaign_faq_entries', 'faqs');
  const policies = useCount('campaign_policy_blocks', 'policies');
  const mappings = useCount('five9_variable_mappings', 'mappings');
  const defaults = useCount('campaign_department_type_defaults', 'defaults');

  const cards = [
    { label: 'Clients', icon: Building2, value: clients.data, isLoading: clients.isLoading },
    { label: 'Locations', icon: MapPin, value: locations.data, isLoading: locations.isLoading },
    { label: 'Call Flows', icon: PhoneCall, value: callFlows.data, isLoading: callFlows.isLoading },
    { label: 'Fields', icon: Tag, value: fields.data, isLoading: fields.isLoading },
    { label: 'FAQs', icon: MessageCircleQuestion, value: faqs.data, isLoading: faqs.isLoading },
    { label: 'Policies', icon: ScrollText, value: policies.data, isLoading: policies.isLoading },
    { label: 'Five9 Mappings', icon: Phone, value: mappings.data, isLoading: mappings.isLoading },
    { label: 'Defaults Catalog', icon: Database, value: defaults.data, isLoading: defaults.isLoading },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {c.isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-3xl font-bold">{c.value ?? 0}</div>}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <GoLiveSelfTestPanel />
    </div>
  );
}
