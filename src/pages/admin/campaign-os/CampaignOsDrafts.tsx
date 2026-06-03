/**
 * P0-6 — Admin Drafts Review queue (admin-only).
 *
 * Lists every FAQ + Policy with status='draft' across all tenants. Admin can
 * approve, archive, or jump to the relevant authoring page to edit.
 *
 * Scope note: this page is **admin-only** by design. Supervisors do NOT have
 * a dedicated draft review route in this pass — they continue to surface
 * drafts through the existing supervisor Workspace Campaigns mode (read-only).
 * A supervisor draft route is tracked separately in the stabilization backlog.
 */

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  useApproveFaq,
  useArchiveFaq,
  useApprovePolicy,
  useArchivePolicy,
} from '@/hooks/campaign-os/useCampaignMutations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, Archive, Pencil, Inbox } from 'lucide-react';
import { toast } from 'sonner';

interface DraftFaq {
  id: string;
  question: string;
  answer_md: string;
  scope: string;
  tenant_kind: string | null;
  wl_partner_id: string | null;
  wl_client_id: string | null;
  client_lead_id: string | null;
  client_department_id: string | null;
  created_at: string;
  updated_at: string;
}

interface DraftPolicy {
  id: string;
  title: string;
  body_md: string;
  policy_kind: string;
  scope: string;
  tenant_kind: string | null;
  wl_partner_id: string | null;
  wl_client_id: string | null;
  client_lead_id: string | null;
  client_department_id: string | null;
  created_at: string;
  updated_at: string;
}

function tenantLabel(row: { tenant_kind: string | null; wl_partner_id: string | null; wl_client_id: string | null; client_lead_id: string | null }) {
  if (!row.tenant_kind) return 'Global';
  if (row.tenant_kind === 'wl_partner') {
    if (row.wl_client_id) return `WL end-client · ${row.wl_client_id.slice(0, 8)}`;
    if (row.wl_partner_id) return `WL partner · ${row.wl_partner_id.slice(0, 8)}`;
    return 'WL partner';
  }
  if (row.tenant_kind === 'direct_24h') {
    if (row.client_lead_id) return `Direct · ${row.client_lead_id.slice(0, 8)}`;
    return 'Direct';
  }
  return row.tenant_kind;
}

export default function CampaignOsDrafts() {
  const approveFaq = useApproveFaq();
  const archiveFaq = useArchiveFaq();
  const approvePolicy = useApprovePolicy();
  const archivePolicy = useArchivePolicy();

  const { data: faqs = [], isLoading: loadingFaqs } = useQuery({
    queryKey: ['campaign-os', 'faqs-drafts'],
    queryFn: async (): Promise<DraftFaq[]> => {
      const { data, error } = await (supabase as any)
        .from('campaign_faq_entries')
        .select('id, question, answer_md, scope, tenant_kind, wl_partner_id, wl_client_id, client_lead_id, client_department_id, created_at, updated_at')
        .eq('status', 'draft')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as DraftFaq[];
    },
  });

  const { data: policies = [], isLoading: loadingPolicies } = useQuery({
    queryKey: ['campaign-os', 'policies-drafts'],
    queryFn: async (): Promise<DraftPolicy[]> => {
      const { data, error } = await (supabase as any)
        .from('campaign_policy_blocks')
        .select('id, title, body_md, policy_kind, scope, tenant_kind, wl_partner_id, wl_client_id, client_lead_id, client_department_id, created_at, updated_at')
        .eq('status', 'draft')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as DraftPolicy[];
    },
  });

  const handleApproveFaq = async (id: string) => {
    try {
      await approveFaq.mutateAsync(id);
      toast.success('FAQ approved');
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  const handleArchiveFaq = async (id: string) => {
    if (!confirm('Archive this draft FAQ?')) return;
    try {
      await archiveFaq.mutateAsync(id);
      toast.success('FAQ archived');
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  const handleApprovePolicy = async (id: string) => {
    try {
      await approvePolicy.mutateAsync(id);
      toast.success('Policy approved');
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  const handleArchivePolicy = async (id: string) => {
    if (!confirm('Archive this draft policy?')) return;
    try {
      await archivePolicy.mutateAsync(id);
      toast.success('Policy archived');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Drafts Review</h2>
        <p className="text-sm text-muted-foreground">
          Cross-tenant queue of draft FAQs and Policies awaiting approval. Admin-only.
        </p>
      </div>

      <Tabs defaultValue="faqs">
        <TabsList>
          <TabsTrigger value="faqs">FAQ drafts ({faqs.length})</TabsTrigger>
          <TabsTrigger value="policies">Policy drafts ({policies.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="faqs" className="space-y-2 mt-4">
          {loadingFaqs ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
          ) : faqs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No FAQ drafts pending review.
              </CardContent>
            </Card>
          ) : (
            faqs.map((f) => (
              <Card key={f.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="text-base">{f.question}</CardTitle>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="secondary">{f.scope}</Badge>
                      <Badge variant="outline">{tenantLabel(f)}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground line-clamp-4">{f.answer_md}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="default" onClick={() => handleApproveFaq(f.id)} disabled={approveFaq.isPending}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/admin/campaign-os/faqs">
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Open in FAQs
                      </Link>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleArchiveFaq(f.id)} disabled={archiveFaq.isPending}>
                      <Archive className="h-3.5 w-3.5 mr-1" /> Archive
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="policies" className="space-y-2 mt-4">
          {loadingPolicies ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
          ) : policies.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No policy drafts pending review.
              </CardContent>
            </Card>
          ) : (
            policies.map((p) => (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="text-base">{p.title}</CardTitle>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline">{p.policy_kind}</Badge>
                      <Badge variant="secondary">{p.scope}</Badge>
                      <Badge variant="outline">{tenantLabel(p)}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground line-clamp-4">{p.body_md}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="default" onClick={() => handleApprovePolicy(p.id)} disabled={approvePolicy.isPending}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/admin/campaign-os/policies">
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Open in Policies
                      </Link>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleArchivePolicy(p.id)} disabled={archivePolicy.isPending}>
                      <Archive className="h-3.5 w-3.5 mr-1" /> Archive
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
