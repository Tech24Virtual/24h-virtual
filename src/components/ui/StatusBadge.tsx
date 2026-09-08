import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Single source of truth for status → color across the app.
 *
 * Fixes a bug pattern that was found and re-fixed page-by-page across the WL
 * Partner Dashboard, WL Client Portal, and Admin Dashboard: "active" (and
 * other non-error statuses) rendered in the app's rose/red `secondary` badge
 * token, which reads as an error/negative state. Route new status badges
 * through this component instead of a raw <Badge variant="secondary">.
 */

const STATUS_CLASSNAMES: Record<string, string> = {
  // green — genuinely good / live / resolved states
  active: "bg-green-500/10 text-green-700 border-green-200",
  completed: "bg-green-500/10 text-green-700 border-green-200",
  done: "bg-green-500/10 text-green-700 border-green-200",
  resolved: "bg-green-500/10 text-green-700 border-green-200",
  approved: "bg-green-500/10 text-green-700 border-green-200",
  converted: "bg-green-500/10 text-green-700 border-green-200",
  live: "bg-green-500/10 text-green-700 border-green-200",
  published: "bg-green-500/10 text-green-700 border-green-200",

  // amber — in-progress / awaiting action, not an error
  pending: "bg-amber-500/10 text-amber-700 border-amber-200",
  in_progress: "bg-amber-500/10 text-amber-700 border-amber-200",
  awaiting: "bg-amber-500/10 text-amber-700 border-amber-200",
  review: "bg-amber-500/10 text-amber-700 border-amber-200",

  // blue — informational / open / neutral-active
  open: "bg-blue-500/10 text-blue-600 border-blue-200",
  new: "bg-blue-500/10 text-blue-600 border-blue-200",
  public: "bg-blue-500/10 text-blue-600 border-blue-200",

  // gray — inert / not currently relevant, not an error
  inactive: "bg-muted text-muted-foreground border-transparent",
  suspended: "bg-muted text-muted-foreground border-transparent",
  draft: "bg-muted text-muted-foreground border-transparent",
  closed: "bg-muted text-muted-foreground border-transparent",
  archived: "bg-muted text-muted-foreground border-transparent",

  // red — genuine error / negative / destructive states only
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  canceled: "bg-destructive/10 text-destructive border-destructive/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
  error: "bg-destructive/10 text-destructive border-destructive/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
};

const FALLBACK_CLASSNAME = "bg-muted text-muted-foreground border-transparent";

export function statusBadgeClassName(status: string | null | undefined): string {
  if (!status) return FALLBACK_CLASSNAME;
  const key = status.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return STATUS_CLASSNAMES[key] || FALLBACK_CLASSNAME;
}

/** Turns a raw enum/status string ("wl_partner_request") into a label ("Wl Partner Request"). */
export function humanizeStatus(status: string | null | undefined): string {
  if (!status) return "Unknown";
  return status
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export interface StatusBadgeProps {
  status: string | null | undefined;
  /** Override the displayed text; defaults to a humanized version of `status`. */
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn(statusBadgeClassName(status), className)}>
      {label ?? humanizeStatus(status)}
    </Badge>
  );
}
