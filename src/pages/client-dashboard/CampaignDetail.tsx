import { Link, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import {
  useMyClientCampaign,
  useMyClientCampaignScenarios,
} from '@/hooks/campaign-os/useClientCampaigns';
import { useCampaignFaqs } from '@/hooks/campaign-os/useCampaignFaqs';
import { useCampaignPolicies } from '@/hooks/campaign-os/useCampaignPolicies';
import { useCampaignFields } from '@/hooks/campaign-os/useCampaignFields';

/**
 * Direct Client campaign detail. Read-only by design.
 *
 * - Fields: pulled via the `resolve_fields_for_audience` RPC with the
 *   `client` audience. The RPC physically strips internal-only fields at the
 *   DB boundary.
 * - FAQs / policies: server resolver returns the precedence-correct set of
 *   approved entries scoped to this client + department.
 */
export default function ClientCampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: campaign, isLoading } = useMyClientCampaign(id);
  const departmentId = campaign?.department?.id ?? null;
  const { data: scenarios } = useMyClientCampaignScenarios(id);
  const { data: faqs } = useCampaignFaqs(departmentId);
  const { data: policies } = useCampaignPolicies(departmentId);
  const { data: fields } = useCampaignFields(departmentId, 'client');

  if (isLoading) {
    return (
      <DashboardLayout title="Campaign">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      </DashboardLayout>
    );
  }

  if (!campaign) {
    return (
      <DashboardLayout title="Campaign">
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Campaign not found, or you no longer have access to it.
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="rounded-2xl border border-border p-6 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 mb-6">
        <h1 className="text-2xl font-bold text-heading">{campaign.display_name}</h1>
        <p className="text-muted-foreground mt-0.5">
          {campaign.department?.department_name ?? 'Department'} · {campaign.published_version_id ? 'Published' : 'Not yet published'}
        </p>
      </div>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link to="/client-dashboard/calls/campaigns">
              <ArrowLeft className="mr-2 h-4 w-4" /> All campaigns
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/client-dashboard/support">
              <Send className="mr-2 h-4 w-4" /> Request a Change
            </Link>
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
          {campaign.notes && (
            <CardContent className="text-sm text-muted-foreground whitespace-pre-wrap">
              {campaign.notes}
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Approved Scenarios</CardTitle>
            <CardDescription>How your team handles common call situations.</CardDescription>
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
            <CardDescription>
              Information your team collects on each call. Internal-only fields are not shown.
            </CardDescription>
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
            <CardHeader>
              <CardTitle className="text-base">FAQs</CardTitle>
            </CardHeader>
            <CardContent>
              {(faqs?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No FAQs configured.</p>
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
            <CardHeader>
              <CardTitle className="text-base">Policies</CardTitle>
            </CardHeader>
            <CardContent>
              {(policies?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No policies configured.</p>
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
    </DashboardLayout>
  );
}
