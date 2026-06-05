import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FileText, MessageSquare, Search, HelpCircle, Shield } from 'lucide-react';
import { LegacyMigratedBanner } from '@/components/campaign-os/LegacyMigratedBanner';

const POLICY_KIND_LABELS: Record<string, string> = {
  service_rule:          'Service Rule',
  restricted_disclosure: 'Restricted Disclosure',
  escalation_rule:       'Escalation Rule',
  general_policy:        'General Policy',
};

export default function AgentScripts() {
  const { user } = useAuth();
  const [faqSearch, setFaqSearch]       = useState('');
  const [policySearch, setPolicySearch] = useState('');

  // ── Agent's assigned client IDs ──────────────────────────────────────────
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

  // ── Legacy scripts ───────────────────────────────────────────────────────
  const { data: scripts = [], isLoading: scriptsLoading } = useQuery({
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
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, company_name')
        .in('id', clientIds);
      return data || [];
    },
    enabled: clientIds.length > 0,
  });

  const profileMap = new Map(profiles.map(p => [p.id, p]));

  // ── FAQs ─────────────────────────────────────────────────────────────────
  // Always fetch global approved FAQs (visible to all authenticated users via
  // campaign_faq_entries_global_select). When the agent has assigned clients,
  // also fetch their client-scoped rows via campaign_faq_entries_agent_select.
  const { data: faqs = [], isLoading: faqsLoading } = useQuery({
    queryKey: ['agent-faqs', clientIds],
    enabled: !!user?.id,
    queryFn: async () => {
      let q = (supabase as any)
        .from('campaign_faq_entries')
        .select('id, question, answer_md, scope, client_lead_id, status')
        .eq('status', 'approved');
      if (clientIds.length > 0) {
        q = q.or(`scope.eq.global,client_lead_id.in.(${clientIds.join(',')})`);
      } else {
        q = q.eq('scope', 'global');
      }
      const { data, error } = await q.order('question', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; question: string; answer_md: string; scope: string; client_lead_id: string | null; status: string }>;
    },
  });

  // ── Policies ─────────────────────────────────────────────────────────────
  const { data: policies = [], isLoading: policiesLoading } = useQuery({
    queryKey: ['agent-policies', clientIds],
    enabled: !!user?.id,
    queryFn: async () => {
      let q = (supabase as any)
        .from('campaign_policy_blocks')
        .select('id, title, body_md, policy_kind, scope, client_lead_id, status')
        .eq('status', 'approved');
      if (clientIds.length > 0) {
        q = q.or(`scope.eq.global,client_lead_id.in.(${clientIds.join(',')})`);
      } else {
        q = q.eq('scope', 'global');
      }
      const { data, error } = await q.order('title', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; title: string; body_md: string; policy_kind: string; scope: string; client_lead_id: string | null; status: string }>;
    },
  });

  // ── Filtered results ─────────────────────────────────────────────────────
  const faqTerm = faqSearch.toLowerCase();
  const filteredFaqs = faqs.filter(
    f => f.question.toLowerCase().includes(faqTerm) || f.answer_md.toLowerCase().includes(faqTerm)
  );

  const policyTerm = policySearch.toLowerCase();
  const filteredPolicies = policies.filter(
    p => p.title.toLowerCase().includes(policyTerm) || p.body_md.toLowerCase().includes(policyTerm)
  );

  return (
    <StaffLayout role="agent">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Client Scripts</h1>
          <p className="text-muted-foreground">Call handling scripts, FAQs, and policies for your assigned clients</p>
        </div>

        <LegacyMigratedBanner
          migratedCount={scripts.filter((s: any) => !!s.migrated_to_campaign_id).length}
          totalCount={scripts.length}
          surfaceLabel="Agent Portal"
        />

        <div className="grid gap-4 md:grid-cols-3">
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
              <HelpCircle className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{faqs.length}</p>
                <p className="text-sm text-muted-foreground">Approved FAQs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <Shield className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{policies.length}</p>
                <p className="text-sm text-muted-foreground">Approved Policies</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="scripts" data-testid="agent-scripts-tabs">
          <TabsList>
            <TabsTrigger value="scripts" data-testid="tab-scripts">Scripts</TabsTrigger>
            <TabsTrigger value="faqs" data-testid="tab-faqs">FAQs</TabsTrigger>
            <TabsTrigger value="policies" data-testid="tab-policies">Policies</TabsTrigger>
          </TabsList>

          {/* ── Scripts tab ── */}
          <TabsContent value="scripts" className="mt-4">
            {scriptsLoading ? (
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
                  const scriptFaqs = (script.faqs as any[] | null) || [];
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
                          {scriptFaqs.length > 0 && (
                            <AccordionItem value="faqs">
                              <AccordionTrigger>FAQs ({scriptFaqs.length})</AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-3">
                                  {scriptFaqs.map((faq: any, i: number) => (
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
          </TabsContent>

          {/* ── FAQs tab ── */}
          <TabsContent value="faqs" className="mt-4" data-testid="faqs-tab-content">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  data-testid="faq-search-input"
                  className="pl-9"
                  placeholder="Search FAQs by question or answer…"
                  value={faqSearch}
                  onChange={e => setFaqSearch(e.target.value)}
                />
              </div>

              {faqsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : filteredFaqs.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground" data-testid="faq-empty-state">
                    {faqSearch ? 'No FAQs match your search.' : 'No approved FAQs available for your assigned clients'}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3" data-testid="faq-results-list">
                  {filteredFaqs.map(faq => (
                    <Card key={faq.id} data-testid="faq-result-item">
                      <CardContent className="pt-4 pb-4">
                        <p className="font-semibold text-sm mb-2" data-testid="faq-question">{faq.question}</p>
                        <div className="text-sm text-muted-foreground prose prose-sm max-w-none" data-testid="faq-answer">
                          <ReactMarkdown>{faq.answer_md}</ReactMarkdown>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Policies tab ── */}
          <TabsContent value="policies" className="mt-4" data-testid="policies-tab-content">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  data-testid="policy-search-input"
                  className="pl-9"
                  placeholder="Search policies by title or content…"
                  value={policySearch}
                  onChange={e => setPolicySearch(e.target.value)}
                />
              </div>

              {policiesLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : filteredPolicies.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground" data-testid="policy-empty-state">
                    {policySearch ? 'No policies match your search.' : 'No approved policies available for your assigned clients'}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3" data-testid="policy-results-list">
                  {filteredPolicies.map(policy => (
                    <Card key={policy.id} data-testid="policy-result-item">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-semibold text-sm" data-testid="policy-title">{policy.title}</p>
                          <Badge variant="outline" className="text-xs" data-testid="policy-kind-badge">
                            {POLICY_KIND_LABELS[policy.policy_kind] ?? policy.policy_kind}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground prose prose-sm max-w-none" data-testid="policy-body">
                          <ReactMarkdown>{policy.body_md}</ReactMarkdown>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </StaffLayout>
  );
}
