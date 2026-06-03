import { useNavigate, useParams } from "react-router-dom";
import { ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getWLImpersonation, clearWLImpersonation } from "@/lib/wlImpersonation";
import { logAuditEvent } from "@/lib/audit";

/**
 * Persistent top banner shown while an admin is impersonating a WL partner
 * portal (D-4). Renders only when a wl_impersonation session marker exists
 * AND the active route slug matches the impersonated partner. Exit returns
 * to the recorded admin route and writes an audit log entry.
 */
export function WLImpersonationBanner() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const session = getWLImpersonation();

  if (!session) return null;
  if (slug && session.slug !== slug) return null;

  const handleExit = () => {
    // D-8: Clear state + navigate FIRST so the Exit is never blocked by an
    // audit network call. The audit log is fire-and-forget.
    const auditPayload = {
      partner_id: session.partnerId,
      slug: session.slug,
      partner_name: session.partnerName,
      duration_ms: Date.now() - new Date(session.startedAt).getTime(),
    };
    const returnTo = session.returnTo || "/admin";

    clearWLImpersonation();
    navigate(returnTo, { replace: true });

    // Fire-and-forget — must not block exit. Errors are swallowed inside
    // logAuditEvent, but we also wrap defensively in case of a sync throw.
    try {
      void logAuditEvent({
        action: "impersonation.wl_portal.exited",
        metadata: auditPayload,
      });
    } catch {
      /* ignored */
    }
  };

  return (
    <div className="sticky top-0 z-50 w-full bg-amber-500 text-amber-950 border-b border-amber-600 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ShieldAlert className="h-4 w-4" />
          <span>
            Impersonating: <strong>{session.partnerName}</strong> — read/write actions
            here are recorded as admin activity.
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="bg-amber-50 hover:bg-white border-amber-700 text-amber-950"
          onClick={handleExit}
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Exit
        </Button>
      </div>
    </div>
  );
}
