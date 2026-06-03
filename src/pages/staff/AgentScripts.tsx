import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FileText, MessageSquare } from 'lucide-react';
import { LegacyMigratedBanner } from '@/components/campaign-os/LegacyMigratedBanner';

export default function AgentScripts() {
  const { user } = useAuth();

  const { data: assignments = [] } = useQuery({
    queryKey: ['my-client-assignments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_agent_assignments')
        .select('client_id')
        .eq('agent_id', user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const clientIds = assignments.map(a => a.client_id);

  const { data: scripts = [], isLoading } = useQuery({
    queryKey: ['agent-scripts', clientIds],
    queryFn: async () => {
      if (clientIds.length === 0) return [];
      const { data, error } = await supabase
        .from('client_scripts')
        .select('*')
        .in('client_id', clientIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: clientIds.length > 0,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['client-profiles-for-scripts', clientIds],
    queryFn: async () => {
      if (clientIds.length === 0) return [];
      const { data } = await supabase.from('profiles').select('id, full_name, company_name').in('id', clientIds);
      return data || [];
    },
    enabled: clientIds.length > 0,
  });

  const profileMap = new Map(profiles.map(p => [p.id, p]));

  return (
    <StaffLayout role="agent">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Client Scripts</h1>
          <p className="text-muted-foreground">Call handling scripts for your assigned clients</p>
        </div>

        <LegacyMigratedBanner
          migratedCount={scripts.filter((s: any) => !!s.migrated_to_campaign_id).length}
          totalCount={scripts.length}
          surfaceLabel="Agent Portal"
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{scripts.length}</p>
                <p className="text-sm text-muted-foreground">Total Scripts</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{scripts.filter(s => s.is_active).length}</p>
                <p className="text-sm text-muted-foreground">Active Scripts</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : scripts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No scripts available. Scripts will appear here once you are assigned clients.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {scripts.map(script => {
              const client = profileMap.get(script.client_id);
              const faqs = (script.faqs as any[] | null) || [];
              const rules = (script.call_handling_rules as any[] | null) || [];

              return (
                <Card key={script.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{script.name}</CardTitle>
                      <Badge variant={script.is_active ? 'default' : 'secondary'}>
                        {script.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Client: {client?.full_name || client?.company_name || 'Unknown'}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="multiple" className="w-full">
                      {script.greeting && (
                        <AccordionItem value="greeting">
                          <AccordionTrigger>Greeting</AccordionTrigger>
                          <AccordionContent>
                            <p className="whitespace-pre-wrap">{script.greeting}</p>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                      {faqs.length > 0 && (
                        <AccordionItem value="faqs">
                          <AccordionTrigger>FAQs ({faqs.length})</AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3">
                              {faqs.map((faq: any, i: number) => (
                                <div key={i} className="border-l-2 border-primary/20 pl-3">
                                  <p className="font-medium text-sm">{faq.question}</p>
                                  <p className="text-sm text-muted-foreground">{faq.answer}</p>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                      {rules.length > 0 && (
                        <AccordionItem value="rules">
                          <AccordionTrigger>Call Handling Rules ({rules.length})</AccordionTrigger>
                          <AccordionContent>
                            <ul className="space-y-2 text-sm">
                              {rules.map((rule: any, i: number) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-primary font-bold">•</span>
                                  <span>{typeof rule === 'string' ? rule : rule.description || JSON.stringify(rule)}</span>
                                </li>
                              ))}
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                    </Accordion>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
