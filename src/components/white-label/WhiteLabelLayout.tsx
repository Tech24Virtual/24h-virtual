import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { WhiteLabelSidebar } from "./WhiteLabelSidebar";
import { WhiteLabelHeader } from "./WhiteLabelHeader";
import { AdminDashboardSwitcher } from "@/components/admin/AdminDashboardSwitcher";
import { FeedbackWidget } from "@/components/feedback/FeedbackWidget";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PartnerBranding {
  company_name: string | null;
  favicon_url: string | null;
}

export function WhiteLabelLayout({ children }: { children?: React.ReactNode }) {
  const { user } = useAuth();
  const [branding, setBranding] = useState<PartnerBranding | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('white_label_partners')
      .select('id, company_name')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data: partner }) => {
        if (!partner) return;
        supabase
          .from('white_label_branding')
          .select('favicon_url')
          .eq('partner_id', partner.id)
          .maybeSingle()
          .then(({ data: b }) => {
            setBranding({
              company_name: partner.company_name ?? null,
              favicon_url: b?.favicon_url ?? null,
            });
          });
      });
  }, [user]);

  useEffect(() => {
    if (!branding?.favicon_url) return;
    const existing = document.querySelectorAll("link[rel*='icon']");
    existing.forEach(l => l.parentNode?.removeChild(l));
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/png';
    link.href = branding.favicon_url;
    document.head.appendChild(link);
    return () => {
      link.parentNode?.removeChild(link);
    };
  }, [branding?.favicon_url]);

  return (
    <div className="min-h-screen bg-background flex">
      <Helmet>
        <title>{branding?.company_name || 'Partner Dashboard'}</title>
        <meta property="og:title" content={branding?.company_name || 'Partner Dashboard'} />
      </Helmet>
      <WhiteLabelSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <WhiteLabelHeader />
        <main className="flex-1 p-6 lg:p-8">
          {children || <Outlet />}
        </main>
      </div>
      <AdminDashboardSwitcher />
      <FeedbackWidget />
    </div>
  );
}
