import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "impersonation.client_view.entered"
  | "impersonation.client_view.exited"
  | "impersonation.dashboard.switched"
  | "impersonation.wl_portal.opened"
  | "impersonation.wl_portal.exited"
  | "admin.tool.launched"
  | "qa.seed_state.invoked";

interface LogAuditOptions {
  action: AuditAction;
  target_table?: string;
  target_id?: string;
  tenant_context?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget client audit logger. Errors are swallowed so they
 * never block the UI action being recorded.
 */
export async function logAuditEvent(opts: LogAuditOptions): Promise<void> {
  try {
    await supabase.functions.invoke("log-audit-event", { body: opts });
  } catch (err) {
    // Intentionally swallow — audit log is best-effort from the client.
    console.warn("logAuditEvent failed:", err);
  }
}
