import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

type AllowedRole = 'admin' | 'client' | 'agent' | 'white_label' | 'referrer' | 'affiliate' | 'sales' | 'billing' | 'supervisor' | 'tech' | 'hr' | 'wl_client';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AllowedRole | AllowedRole[];
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, roles, loading, rolesLoaded, isAdmin } = useAuth();
  const location = useLocation();

  if (loading || (user && !rolesLoaded)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admin bypass: Admins can access ANY role-gated portal regardless of requiredRole.
  // This is intentional — admins need to inspect every dashboard for QA, support, and
  // impersonation workflows. All cross-role accesses are observable via the audit_log
  // table (Phase 5: role grants, WL edits, lead deletions, billing changes).
  const required = requiredRole ? (Array.isArray(requiredRole) ? requiredRole : [requiredRole]) : [];
  if (required.length > 0 && !required.some(r => roles.includes(r)) && !isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
