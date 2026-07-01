import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Send, ArrowRight, Loader2 } from 'lucide-react';
import { useMyClientCampaigns } from '@/hooks/campaign-os/useClientCampaigns';

/**
 * Direct Client Campaign OS read view.
 *
 * Server-side RLS scopes this list to the authenticated client's own
 * campaigns. Internal-only fields and unapproved drafts never reach the
 * browser. Edits route through Support (Request a Change).
 */
export default function ClientCampaigns() {
  const { data: campaigns, isLoading, error } = useMyClientCampaigns();

  return (
    <DashboardLayout>
      <div className="rounded-2xl border border-border p-6 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 mb-6">
        <h1 className="text-2xl font-bold text-heading">Campaigns</h1>
        <p className="text-muted-foreground mt-0.5">Approved campaigns and their current status. Edits route through Support.</p>
      </div>
      <div className="space-y-6">
        <div className="flex items-center justify-end">
          <Button asChild variant="outline">
            <Link to="/client-dashboard/support">
              <Send className="mr-2 h-4 w-4" /> Request a Change
            </Link>
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading campaigns…
          </div>
        )}

        {error && (
          <Card>
            <CardContent className="p-6 text-sm text-destructive">
              Could not load your campaigns. Please refresh, or contact Support.
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && (campaigns?.length ?? 0) === 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                <CardTitle>Your campaigns will appear here</CardTitle>
              </div>
              <CardDescription>
                Once your account team publishes a campaign for one of your call flows, it lands
                here with the approved configuration. Want to kick things off, or have questions?
                Talk to your account team.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/client-dashboard/support">
                  <Send className="mr-2 h-4 w-4" /> Talk to Your Account Team
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-3">
          {(campaigns ?? []).map((c) => (
            <Card key={c.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate">{c.display_name}</h3>
                    <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>
                      {c.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {c.department?.department_name ?? 'Department'} ·{' '}
                    {c.published_version_id ? 'Published' : 'Not yet published'}
                  </p>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/client-dashboard/calls/campaigns/${c.id}`}>
                    View <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
