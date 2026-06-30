import { Component, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, MapPin, PhoneCall, MessageCircleQuestion, ScrollText, Phone, Tag, Database, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
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

class GoLivePanelErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <Card className="border-destructive/50">
          <CardContent className="p-6 text-center space-y-2">
            <AlertTriangle className="h-6 w-6 text-destructive mx-auto" />
            <p className="text-sm font-medium text-destructive">Go-Live panel failed to render</p>
            <p className="text-xs text-muted-foreground">{this.state.error.message}</p>
            <Button variant="outline" size="sm" onClick={() => this.setState({ error: null })}>
              Retry
            </Button>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
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
    { label: 'Clients', icon: Building2, value: clients.data, isLoading: clients.isLoading, isError: clients.isError },
    { label: 'Locations', icon: MapPin, value: locations.data, isLoading: locations.isLoading, isError: locations.isError },
    { label: 'Call Flows', icon: PhoneCall, value: callFlows.data, isLoading: callFlows.isLoading, isError: callFlows.isError },
    { label: 'Fields', icon: Tag, value: fields.data, isLoading: fields.isLoading, isError: fields.isError },
    { label: 'FAQs', icon: MessageCircleQuestion, value: faqs.data, isLoading: faqs.isLoading, isError: faqs.isError },
    { label: 'Policies', icon: ScrollText, value: policies.data, isLoading: policies.isLoading, isError: policies.isError },
    { label: 'Five9 Mappings', icon: Phone, value: mappings.data, isLoading: mappings.isLoading, isError: mappings.isError },
    { label: 'Defaults Catalog', icon: Database, value: defaults.data, isLoading: defaults.isLoading, isError: defaults.isError },
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
                {c.isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : c.isError ? (
                  <div className="flex items-center gap-1.5 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Error</span>
                  </div>
                ) : (
                  <div className="text-3xl font-bold">{c.value ?? 0}</div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <GoLivePanelErrorBoundary>
        <GoLiveSelfTestPanel />
      </GoLivePanelErrorBoundary>
    </div>
  );
}
