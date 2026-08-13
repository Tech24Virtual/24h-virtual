import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { WhiteLabelSidebar } from "./WhiteLabelSidebar";
import { WhiteLabelHeader } from "./WhiteLabelHeader";
import { AdminDashboardSwitcher } from "@/components/admin/AdminDashboardSwitcher";
import { FeedbackWidget } from "@/components/feedback/FeedbackWidget";
import { supabase } from "@/integrations/supabase/client";
import { useWLPartnerId } from "@/hooks/wl/useWLPartnerId";

export function WhiteLabelLayout({ children }: { children?: React.ReactNode }) {
  // Warms the ['wl-partner-id', user?.id] query cache so every child page's
  // useWLPartnerId() call resolves from cache instead of re-fetching.
  const { data: partnerId } = useWLPartnerId();
  const queryClient = useQueryClient();

  // Prefetch Leads/Tasks/Onboarding data in the background as soon as the
  // partner ID is known, so navigating to those pages hits a warm cache.
  useEffect(() => {
    if (!partnerId) return;
    queryClient.prefetchQuery({
      queryKey: ['wl-partner-leads', partnerId],
      queryFn: async () => {
        const { data } = await supabase.from('wl_partner_leads').select('*').eq('partner_id', partnerId).order('created_at', { ascending: false });
        return data ?? [];
      },
      staleTime: 30 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ['wl-partner-tasks', partnerId],
      queryFn: async () => {
        const { data } = await supabase.from('wl_partner_tasks').select('*, proposal:wl_partner_proposals(id, title, proposal_number), lead:wl_partner_leads(id, name)').eq('partner_id', partnerId).order('created_at', { ascending: false });
        return data ?? [];
      },
      staleTime: 30 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ['wl-partner-handoffs', partnerId],
      queryFn: async () => {
        const { data } = await supabase.from('wl_partner_onboarding_handoffs').select('*, proposal:wl_partner_proposals(id, title, proposal_number, accepted_at, checklist_template), lead:wl_partner_leads(id, name, email)').eq('partner_id', partnerId).order('created_at', { ascending: false });
        return data ?? [];
      },
      staleTime: 30 * 1000,
    });
    queryClient.prefetchQuery({
      queryKey: ['wl-partner-proposals', partnerId],
      queryFn: async () => {
        const { data } = await supabase
          .from('wl_partner_proposals')
          .select('*, lead:wl_partner_leads(id, name, email, company)')
          .eq('partner_id', partnerId)
          .order('created_at', { ascending: false });
        return data ?? [];
      },
      staleTime: 30 * 1000,
    });
  }, [partnerId, queryClient]);

  const { data: branding } = useQuery({
    queryKey: ['wl-partner-branding', partnerId],
    enabled: !!partnerId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('white_label_branding')
        .select('company_name, favicon_url')
        .eq('partner_id', partnerId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

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
