import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Loader2, ShieldAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { AdminDashboardSwitcher } from '@/components/admin/AdminDashboardSwitcher';
import { setWLImpersonation } from '@/lib/wlImpersonation';
import { logAuditEvent } from '@/lib/audit';

interface PartnerOption {
  id: string;
  slug: string;
  company_name: string;
  logo_url: string | null;
}

export default function WLClientsPortalList() {
  const navigate = useNavigate();
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPartners = async () => {
      // Get active partners
      const { data: partnerRows } = await supabase
        .from('white_label_partners')
        .select('id, company_name, status')
        .eq('status', 'active')
        .order('company_name');

      if (!partnerRows || partnerRows.length === 0) {
        setIsLoading(false);
        return;
      }

      // Get branding for each partner to resolve slug + logo
      const results: PartnerOption[] = [];
      for (const p of partnerRows) {
        const { data: branding } = await supabase
          .from('white_label_branding')
          .select('company_name, logo_url')
          .eq('partner_id', p.id)
          .single();

        const brandName = branding?.company_name || p.company_name;
        const slug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        if (slug) {
          results.push({
            id: p.id,
            slug,
            company_name: brandName,
            logo_url: branding?.logo_url || null,
          });
        }
      }

      // D-4: Do NOT auto-redirect when only one partner exists. The QA report
      // explicitly requires an explicit click so the impersonation entry is
      // intentional and audit-logged. Always render the chooser.
      setPartners(results);
      setIsLoading(false);
    };

    fetchPartners();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <AdminDashboardSwitcher />
      </div>
    );
  }

  if (partners.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Building2 className="h-16 w-16 mx-auto text-muted-foreground/30" />
          <h2 className="text-xl font-semibold text-foreground">No Active Partners</h2>
          <p className="text-muted-foreground text-sm">There are no active white label partners to view.</p>
        </div>
        <AdminDashboardSwitcher />
      </div>
    );
  }

  const enterPortal = (partner: PartnerOption) => {
    setWLImpersonation({
      partnerId: partner.id,
      slug: partner.slug,
      partnerName: partner.company_name,
      returnTo: '/admin/wl-portals',
    });
    logAuditEvent({
      action: 'impersonation.wl_portal.opened',
      target_table: 'white_label_partners',
      target_id: partner.id,
      metadata: { slug: partner.slug, partner_name: partner.company_name },
    });
    navigate(`/portal/${partner.slug}`);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">WL Client Portals</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Select a partner portal to enter impersonation mode. A persistent banner will indicate
            the active partner and provide an Exit control to return to /admin.
          </p>
          <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              All actions inside the impersonated portal are recorded as admin activity in the
              audit log.
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {partners.map((partner) => (
            <Card
              key={partner.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => enterPortal(partner)}
            >
              <CardContent className="p-6 flex items-center gap-4">
                {partner.logo_url ? (
                  <img
                    src={partner.logo_url}
                    alt={partner.company_name}
                    className="h-10 w-10 rounded-lg object-contain"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-foreground">{partner.company_name}</p>
                  <p className="text-xs text-muted-foreground">/{partner.slug}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <AdminDashboardSwitcher />
    </div>
  );
}
