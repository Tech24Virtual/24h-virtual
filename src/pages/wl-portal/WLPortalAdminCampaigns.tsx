import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Loader2, Megaphone } from 'lucide-react';
import { WLPortalLayout } from '@/components/wl-portal/WLPortalLayout';
import { useWLPortal } from '@/contexts/WLPortalContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePartnerCampaigns } from '@/hooks/campaign-os/usePartnerCampaigns';
import { wlClientUrl } from '@/lib/wlClientUrl';

/**
 * WL Partner — Cross-client Campaign OS list.
 *
 * Visible only when the authenticated user owns the WL partner record. RLS
 * gates the row set server-side, but clientInfo carries no role field to
 * distinguish partner staff from end-clients, so this frontend guard checks
 * the `white_label` app_role directly — end-clients (role `wl_client`) are
 * redirected back to the portal dashboard.
 */
export default function WLPortalAdminCampaigns() {
  const { slug, partnerId, branding } = useWLPortal();
  const { isWhiteLabel, isAdmin } = useAuth();
  const navigate = useNavigate();
  const isAuthorized = isWhiteLabel || isAdmin;
  const { data: groups, isLoading } = usePartnerCampaigns(partnerId);

  useEffect(() => {
    if (!isAuthorized) {
      navigate(wlClientUrl(slug), { replace: true });
    }
  }, [isAuthorized, slug, navigate]);

  if (!isAuthorized) return null;

  return (
    <WLPortalLayout
      title="Campaigns"
      description={`Cross-client view of every campaign across ${branding?.company_name ?? 'your book'}`}
    >
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      )}

      {!isLoading && (groups?.length ?? 0) === 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              <CardTitle>No campaigns yet</CardTitle>
            </div>
            <CardDescription>
              Campaigns built for your clients will appear here, grouped by client.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="space-y-6">
        {(groups ?? []).map((g) => (
          <div key={g.wl_client_id} className="space-y-2">
            <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
              {g.client_name}
            </h3>
            <div className="grid gap-2">
              {g.campaigns.map((c) => (
                <Card key={c.id} className="hover:border-primary/40 transition-colors">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">{c.display_name}</h4>
                        <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>
                          {c.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {c.department?.department_name ?? 'Department'} ·{' '}
                        {c.published_version_id ? 'Published' : 'Not published'}
                      </p>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`${wlClientUrl(slug, 'admin/campaigns')}/${c.id}`}>
                        View <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </WLPortalLayout>
  );
}
