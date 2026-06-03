import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWLPortal } from '@/contexts/WLPortalContext';
import { wlLoginUrl } from '@/lib/wlClientUrl';
import { is24HHost } from '@/lib/wlHostResolver';
import { isModuleEnabled, type WLModuleSlug } from '@/lib/wlModuleVisibility';
import { Loader2 } from 'lucide-react';

interface WLPortalRouteProps {
  children: React.ReactNode;
  /** If set, the route is gated by this module slug (per-client visibility). */
  requireModule?: WLModuleSlug;
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <p className="text-muted-foreground">Page not found</p>
      </div>
    </div>
  );
}

export function WLPortalRoute({ children, requireModule }: WLPortalRouteProps) {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const { slug } = useParams<{ slug: string }>();
  const { clientInfo, partnerId, enabledModules, loading: portalLoading, clientLoading, error } = useWLPortal();
  const isPartnerHost = !is24HHost(window.location.hostname);

  if (authLoading || portalLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={wlLoginUrl(slug || '')} replace />;
  }

  // Admin bypass for testing (only on 24H hosts, never on partner-branded hostnames).
  // Rationale: admins need to QA every WL portal slug without provisioning a wl_client
  // record per partner. Skipped on partner hostnames so customers never see admins
  // bypass tenant isolation. All cross-tenant accesses are recorded in audit_log (Phase 5).
  if (isAdmin && !isPartnerHost) {
    return <>{children}</>;
  }

  if (error) {
    if (isPartnerHost) return <NotFound />;
    return <Navigate to="/unauthorized" replace />;
  }

  // Validate the user's wl_client record belongs to this portal's partner
  if (portalLoading || clientLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  if (!clientInfo) {
    if (isPartnerHost) return <NotFound />;
    return <Navigate to="/unauthorized" replace />;
  }

  // Hard security boundary: cross-validate partner_id ownership
  if (partnerId && clientInfo.partner_id !== partnerId) {
    if (isPartnerHost) return <NotFound />;
    return <Navigate to="/unauthorized" replace />;
  }

  // Module visibility guard — partner can hide modules per client.
  // Returns 404 (not redirect) so disabled modules look like they don't exist.
  if (requireModule && !isModuleEnabled(enabledModules, requireModule)) {
    return <NotFound />;
  }

  return <>{children}</>;
}
