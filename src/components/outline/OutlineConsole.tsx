/**
 * Outline Console — the new founder-facing /outline experience.
 *
 * Reads:
 *   - phases from useBuildPhaseOverrides (canonical buildMap.ts + Wave overrides)
 *   - status overrides from useOutlineStatusOverrides (admin_settings)
 *   - plain-English copy from outlineLabels (overlay; falls back to buildMap)
 *
 * Sections (in display order):
 *   1. Top summary (counts)
 *   2. Current Focus       — the active phase and its 1-line outcome
 *   3. Build Next          — top unblocked items to attack now
 *   4. In Progress         — what's actively being worked
 *   5. Blocked             — what is waiting on something
 *   6. Later / Backlog     — deferred work, collapsed by default
 *   7. Completed           — collapsed group at the bottom
 *
 * Admin (route starts with /admin) gets inline status dropdowns. Public
 * viewers see the same layout, read-only.
 */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Loader2,
  CircleDashed,
  AlertTriangle,
  Zap,
  Archive,
  ChevronDown,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useBuildPhaseOverrides } from "@/hooks/useBuildPhaseOverrides";
import { useOutlineStatusOverrides } from "@/hooks/useOutlineStatusOverrides";
import { outlineLabels } from "@/data/outlineLabels";
import {
  OUTLINE_STATUS_DESCRIPTION,
  OUTLINE_STATUS_LABEL,
  pickBuildNext,
  resolveOutlineItems,
  summarize,
  type OutlineStatus,
  type ResolvedOutlineItem,
} from "@/lib/outline/status";
import { WaveClosePanel } from "@/components/outline/WaveClosePanel";
import { cn } from "@/lib/utils";

interface OutlineConsoleProps {
  /** When true, status dropdowns and the Wave close panel render. */
  canEdit: boolean;
}

const STATUS_STYLES: Record<OutlineStatus, string> = {
  complete: "bg-success/10 text-success border-success/30",
  in_progress: "bg-warning/15 text-warning-foreground border-warning/40",
  blocked: "bg-destructive/10 text-destructive border-destructive/30",
  planned: "bg-muted text-muted-foreground border-border",
  later: "bg-muted/40 text-muted-foreground border-border/60",
};

function StatusBadge({ status }: { status: OutlineStatus }) {
  const Icon =
    status === "complete"
      ? CheckCircle2
      : status === "in_progress"
        ? Loader2
        : status === "blocked"
          ? AlertTriangle
          : CircleDashed;
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", STATUS_STYLES[status])}>
      <Icon
        className={cn(
          "h-3 w-3",
          status === "in_progress" && "animate-spin",
        )}
      />
      {OUTLINE_STATUS_LABEL[status]}
    </Badge>
  );
}

function ItemRow({
  resolved,
  canEdit,
  onChange,
}: {
  resolved: ResolvedOutlineItem;
  canEdit: boolean;
  onChange: (id: string, status: OutlineStatus | null) => Promise<void>;
}) {
  const { toast } = useToast();
  const label = outlineLabels[resolved.item.id];
  const title = label?.title ?? resolved.item.name;
  const outcome = label?.outcome ?? resolved.item.description;
  const acceptance = label?.acceptance;
  const note = label?.note ?? resolved.override?.note;

  const handleChange = async (value: string) => {
    try {
      const next = value === "__auto" ? null : (value as OutlineStatus);
      await onChange(resolved.item.id, next);
      toast({
        title: "Status updated",
        description:
          next === null
            ? `${title} reverted to derived status.`
            : `${title} → ${OUTLINE_STATUS_LABEL[next]}.`,
      });
    } catch (err) {
      toast({
        title: "Couldn't save status",
        description:
          err instanceof Error ? err.message : "Try again in a moment.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-card p-3">
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={resolved.status} />
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <Badge variant="secondary" className="text-[10px] font-mono">
            {resolved.phase.code}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{outcome}</p>
        {acceptance && acceptance.length > 0 && (
          <ul className="text-xs text-muted-foreground space-y-0.5 ml-1">
            {acceptance.map((a) => (
              <li key={a} className="flex items-start gap-1.5">
                <span className="mt-1 h-1 w-1 rounded-full bg-muted-foreground/60 shrink-0" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        )}
        {note && (
          <p className="text-xs text-muted-foreground italic">Note: {note}</p>
        )}
      </div>
      {canEdit && (
        <div className="shrink-0">
          <Select
            value={resolved.override?.status ?? "__auto"}
            onValueChange={handleChange}
          >
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__auto">
                <span className="text-muted-foreground">
                  Auto ({OUTLINE_STATUS_LABEL[resolved.status]})
                </span>
              </SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="later">Later</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

function CollapsibleGroup({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-accent/40 rounded-t-xl"
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <Badge variant="secondary">{count}</Badge>
        </div>
      </button>
      {open && <div className="border-t border-border p-3 space-y-2">{children}</div>}
    </div>
  );
}

export function OutlineConsole({ canEdit }: OutlineConsoleProps) {
  const { phases } = useBuildPhaseOverrides();
  const { overrides, setItemStatus } = useOutlineStatusOverrides();

  const resolved = useMemo(
    () => resolveOutlineItems(phases, overrides),
    [phases, overrides],
  );
  const summary = useMemo(() => summarize(resolved), [resolved]);

  const activePhase = useMemo(
    () => phases.find((p) => p.status === "active"),
    [phases],
  );

  const buildNext = useMemo(() => pickBuildNext(resolved, 6), [resolved]);

  const inProgress = resolved.filter((r) => r.status === "in_progress");
  const blocked = resolved.filter((r) => r.status === "blocked");
  const later = resolved.filter((r) => r.status === "later");
  const complete = resolved.filter((r) => r.status === "complete");

  // Don't repeat items that already appear in Build Next.
  const buildNextIds = new Set(buildNext.map((r) => r.item.id));
  const inProgressOnly = inProgress.filter(
    (r) => !buildNextIds.has(r.item.id),
  );

  const completionPct = summary.total
    ? Math.round((summary.complete / summary.total) * 100)
    : 0;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="container-custom pt-8 pb-20">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* 1. Header + summary */}
          <header className="space-y-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                Build Console
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                The single source of truth for what to build next, what's in
                flight, and what's done.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(
                [
                  { k: "complete", label: "Complete" },
                  { k: "in_progress", label: "In Progress" },
                  { k: "blocked", label: "Blocked" },
                  { k: "planned", label: "Planned" },
                  { k: "later", label: "Later" },
                ] as const
              ).map(({ k, label }) => (
                <Tooltip key={k}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "rounded-lg border p-3 text-center",
                        STATUS_STYLES[k],
                      )}
                    >
                      <div className="text-2xl font-bold tabular-nums">
                        {summary[k]}
                      </div>
                      <div className="text-[11px] uppercase tracking-wider opacity-80">
                        {label}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{OUTLINE_STATUS_DESCRIPTION[k]}</TooltipContent>
                </Tooltip>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {summary.complete} of {summary.total} items complete (
                {completionPct}%)
              </span>
              {!canEdit && (
                <span className="italic">
                  Sign in as admin to update statuses.
                </span>
              )}
            </div>
          </header>

          {/* 2. Current Focus */}
          {activePhase && (
            <section className="rounded-2xl border-2 border-warning/40 bg-warning/5 p-5">
              <div className="flex items-start gap-3 mb-3">
                <Zap className="h-5 w-5 text-warning mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wider text-warning-foreground">
                    Current Focus
                  </div>
                  <h2 className="text-xl font-bold text-foreground mt-0.5">
                    {activePhase.title}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {activePhase.oneLiner}
                  </p>
                </div>
              </div>
              {activePhase.id === "wave-1" && canEdit && (
                <div className="mt-4">
                  <WaveClosePanel canEdit={canEdit} />
                </div>
              )}
            </section>
          )}

          {/* 3. Build Next */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">Build Next</h2>
                <p className="text-xs text-muted-foreground">
                  The highest-priority unblocked items. Knock these out in
                  order.
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
            {buildNext.length === 0 ? (
              <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
                Nothing queued. Either everything is complete, blocked, or
                deferred.
              </p>
            ) : (
              <div className="space-y-2">
                {buildNext.map((r) => (
                  <ItemRow
                    key={r.item.id}
                    resolved={r}
                    canEdit={canEdit}
                    onChange={setItemStatus}
                  />
                ))}
              </div>
            )}
          </section>

          {/* 4. In Progress (anything not already in Build Next) */}
          {inProgressOnly.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-foreground mb-3">
                In Progress
              </h2>
              <div className="space-y-2">
                {inProgressOnly.map((r) => (
                  <ItemRow
                    key={r.item.id}
                    resolved={r}
                    canEdit={canEdit}
                    onChange={setItemStatus}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 5. Blocked */}
          {blocked.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Blocked
              </h2>
              <div className="space-y-2">
                {blocked.map((r) => (
                  <ItemRow
                    key={r.item.id}
                    resolved={r}
                    canEdit={canEdit}
                    onChange={setItemStatus}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 6. Later / Backlog (collapsed) */}
          {later.length > 0 && (
            <section>
              <CollapsibleGroup title="Later / Backlog" count={later.length}>
                {later.map((r) => (
                  <ItemRow
                    key={r.item.id}
                    resolved={r}
                    canEdit={canEdit}
                    onChange={setItemStatus}
                  />
                ))}
              </CollapsibleGroup>
            </section>
          )}

          {/* 7. Completed (collapsed) */}
          {complete.length > 0 && (
            <section>
              <CollapsibleGroup
                title="Completed"
                count={complete.length}
              >
                {complete.map((r) => (
                  <ItemRow
                    key={r.item.id}
                    resolved={r}
                    canEdit={canEdit}
                    onChange={setItemStatus}
                  />
                ))}
              </CollapsibleGroup>
            </section>
          )}

          {/* Footer: link to legacy view */}
          <footer className="pt-4 border-t border-border/40">
            <p className="text-xs text-muted-foreground">
              Looking for the full legacy outline with phase contracts and
              gates?{" "}
              <Link
                to="?legacy=1"
                className="underline hover:text-foreground"
              >
                Open the legacy view
              </Link>
              .
            </p>
          </footer>
        </div>
      </div>
    </TooltipProvider>
  );
}
