import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { WLPortalLayout } from '@/components/wl-portal/WLPortalLayout';
import { useWLPortal } from '@/contexts/WLPortalContext';
import { useMyClientCampaigns, useMyClientCampaignScenarios } from '@/hooks/campaign-os/useClientCampaigns';
import { useCampaignFaqs } from '@/hooks/campaign-os/useCampaignFaqs';
import { useCampaignPolicies } from '@/hooks/campaign-os/useCampaignPolicies';
import { useCampaignFields } from '@/hooks/campaign-os/useCampaignFields';

/**
 * WL End-Client — Branded Campaign OS read view.
 *
 * RLS scopes the row set via wl_client_id (the authenticated end-client only
 * sees their own campaign artifacts). Layout + branding come from the WL
 * portal context (partner colors, fonts, logo).
 */
export default function WLPortalCampaignScript() {
  const { branding } = useWLPortal();
  const { data: campaigns, isLoading } = useMyClientCampaigns();
  const campaign = campaigns?.[0] ?? null;
  const departmentId = campaign?.department?.id ?? null;
  const { data: scenarios } = useMyClientCampaignScenarios(campaign?.id);
  const { data: faqs } = useCampaignFaqs(departmentId);
  const { data: policies } = useCampaignPolicies(departmentId);
  const { data: fields } = useCampaignFields(departmentId, 'wl_end_client');

  return (
    <WLPortalLayout
      title="Campaign Script"
      description={
        branding?.company_name
          ? `Approved campaign artifacts curated by ${branding.company_name}`
          : 'Approved campaign artifacts'
      }
    >
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      )}

      {!isLoading && !campaign && (
        <Card>
          <CardHeader>
            <CardTitle>No campaign yet</CardTitle>
            <CardDescription>
              Once your campaign is set up, the approved script content will appear here.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {campaign && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{campaign.display_name}</CardTitle>
                <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                  {campaign.status}
                </Badge>
              </div>
              <CardDescription>
                {campaign.department?.department_name ?? 'Department'}
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
              <CardTitle className="text-base">Information We Collect</CardTitle>
              <CardDescription>Fields visible to your end-client surface.</CardDescription>
            </CardHeader>
            <CardContent>
              {(fields?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No client-visible fields.</p>
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
      )}
    </WLPortalLayout>
  );
}
