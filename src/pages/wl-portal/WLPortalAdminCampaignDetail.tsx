import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WLPortalLayout } from '@/components/wl-portal/WLPortalLayout';
import { useWLPortal } from '@/contexts/WLPortalContext';
import { usePartnerCampaign } from '@/hooks/campaign-os/usePartnerCampaigns';
import { useMyClientCampaignScenarios } from '@/hooks/campaign-os/useClientCampaigns';
import { useCampaignFaqs } from '@/hooks/campaign-os/useCampaignFaqs';
import { useCampaignPolicies } from '@/hooks/campaign-os/useCampaignPolicies';
import { useCampaignFields } from '@/hooks/campaign-os/useCampaignFields';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { wlClientUrl } from '@/lib/wlClientUrl';

/**
 * WL Partner — Branded read view for a single campaign.
 *
 * "Request edit from 24H" creates a script_change_requests row tagged with
 * the partner's user id so the 24H team can pick it up.
 */
export default function WLPortalAdminCampaignDetail() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const { branding } = useWLPortal();
  const { user } = useAuth();
  const { data: campaign, isLoading } = usePartnerCampaign(id);
  const departmentId = campaign?.department?.id ?? null;
  const { data: scenarios } = useMyClientCampaignScenarios(id);
  const { data: faqs } = useCampaignFaqs(departmentId);
  const { data: policies } = useCampaignPolicies(departmentId);
  const { data: fields } = useCampaignFields(departmentId, 'wl_partner');
  const [submitting, setSubmitting] = useState(false);

  const requestEdit = async () => {
    if (!user || !campaign) return;
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from('script_change_requests').insert({
        client_id: user.id,
        title: `WL partner edit request: ${campaign.display_name}`,
        description: `WL partner ${branding?.company_name ?? 'partner'} requested an edit to campaign ${campaign.id}.`,
        request_type: 'edit',
        source: 'wl_partner_admin',
        proposed_changes: { campaign_id: campaign.id, wl_client_id: campaign.wl_client_id },
      });
      if (error) throw error;
      toast.success('Edit request submitted to 24H');
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <WLPortalLayout title="Campaign">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      </WLPortalLayout>
    );
  }
  if (!campaign) {
    return (
      <WLPortalLayout title="Campaign">
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Campaign not found, or you no longer have access to it.
          </CardContent>
        </Card>
      </WLPortalLayout>
    );
  }

  return (
    <WLPortalLayout
      title={campaign.display_name}
      description={campaign.wl_client?.client_name ?? undefined}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link to={wlClientUrl(slug, 'admin/campaigns')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> All campaigns
            </Link>
          </Button>
          <Button onClick={requestEdit} disabled={submitting} variant="outline">
            <Send className="mr-2 h-4 w-4" />
            {submitting ? 'Submitting…' : 'Request edit from 24H'}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Summary</CardTitle>
              <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                {campaign.status}
              </Badge>
            </div>
            <CardDescription>
              {campaign.department?.department_name ?? 'Department'} ·{' '}
              {campaign.published_version_id ? 'Published' : 'Not yet published'}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Approved Scenarios</CardTitle>
          </CardHeader>
          <CardContent>
            {(scenarios?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No approved scenarios yet.</p>
            ) : (
              <ul className="space-y-3">
                {scenarios!.map((s) => (
                  <li key={s.id} className="border rounded-md p-3">
                    <p className="font-medium text-sm">{s.title}</p>
                    {s.expected_outcome_md && (
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                        {s.expected_outcome_md}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configured Fields</CardTitle>
          </CardHeader>
          <CardContent>
            {(fields?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No partner-visible fields.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {fields!.map((f) => (
                  <li key={f.field_id} className="text-sm border rounded-md p-2">
                    <span className="font-medium">{f.display_label}</span>
                    {f.is_required && (
                      <Badge variant="outline" className="ml-2 text-[10px]">required</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">FAQs</CardTitle></CardHeader>
            <CardContent>
              {(faqs?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">None.</p>
              ) : (
                <ul className="space-y-2">
                  {faqs!.map((f) => (
                    <li key={f.id} className="text-sm">
                      <p className="font-medium">{f.question}</p>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {f.answer_md}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Policies</CardTitle></CardHeader>
            <CardContent>
              {(policies?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">None.</p>
              ) : (
                <ul className="space-y-2">
                  {policies!.map((p) => (
                    <li key={p.id} className="text-sm">
                      <p className="font-medium">{p.title}</p>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {p.body_md}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </WLPortalLayout>
  );
}
