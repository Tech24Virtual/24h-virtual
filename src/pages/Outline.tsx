import { useState, useEffect, useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { OutlineConsole } from "@/components/outline/OutlineConsole";
import { useAuth as useAuthForRouter } from "@/contexts/AuthContext";
import { Navigation as NavForRouter } from "@/components/Navigation";
import { Footer as FooterForRouter } from "@/components/Footer";
import { SEO as SEOForRouter } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Loader, Circle, Lock, Unlock, Zap, ShieldCheck, Hammer, FlaskConical, ClipboardCheck, AlertTriangle, FileText, Copy, ExternalLink } from "lucide-react";
import {
  platformInventory,
  allBuildMapItems,
  requiredSecrets,
  stabilizationItems,
  testingChecklist,
  type BuildMapItem,
  type BuildPhase,
  type BuildPhaseStatus,
  type GateStatus,
  type PhaseContract,
} from "@/data/buildMap";
import { knowledgeBaseMap } from "@/data/knowledgeBase";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { WaveClosePanel } from "@/components/outline/WaveClosePanel";
import { useBuildPhaseOverrides } from "@/hooks/useBuildPhaseOverrides";

const statusOrder: Record<string, number> = { "in-progress": 0, planned: 1, done: 2 };

interface ProgressRow {
  feature_id: string;
  tested: boolean;
  tested_by: string | null;
  tested_at: string | null;
}

function sortItems(items: BuildMapItem[]) {
  return [...items].sort((a, b) => (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2));
}

/**
 * Enforce the phase-gate rule mechanically: a phase can only render as
 * built or stabilized if all 3 work-gates are complete AND exit criteria
 * are stated. Otherwise it falls back to active.
 */
function effectiveStatus(p: BuildPhase): BuildPhaseStatus {
  if (
    (p.status === "built" || p.status === "stabilized") &&
    (p.contract.exitCriteria.length === 0 ||
      p.gates.build !== "complete" ||
      p.gates.test !== "complete" ||
      p.gates.qa !== "complete")
  ) {
    return "active";
  }
  return p.status;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "done") return <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />;
  if (status === "in-progress") return <Loader className="w-5 h-5 text-yellow-500 animate-spin shrink-0" />;
  return <Circle className="w-5 h-5 text-muted-foreground shrink-0" />;
}

function PhaseStatusPill({ status }: { status: BuildPhaseStatus }) {
  const map: Record<BuildPhaseStatus, { label: string; className: string; Icon: typeof CheckCircle }> = {
    built: { label: "Built", className: "bg-green-500/10 text-green-700 border-green-500/30", Icon: CheckCircle },
    stabilized: { label: "Stabilized", className: "bg-primary/10 text-primary border-primary/30", Icon: ShieldCheck },
    active: { label: "Active Build", className: "bg-amber-500/15 text-amber-700 border-amber-500/40 animate-pulse", Icon: Zap },
    deferred: { label: "Deferred", className: "bg-muted text-muted-foreground border-border", Icon: Lock },
  };
  const { label, className, Icon } = map[status];
  return (
    <Badge variant="outline" className={`${className} font-medium`}>
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
}

type GateKind = "build" | "test" | "qa" | "lock";

/**
 * Per-phase signoff artifact mapping.
 * The QA gate badge becomes a clickable popover trigger when a phase has
 * an entry here. Files live under `.lovable/` in the repo and are not
 * served over HTTP, so the popover surfaces the path with a copy button.
 */
const SIGNOFF_ARTIFACTS: Record<string, { path: string; label: string }> = {
  "wave-1": {
    path: ".lovable/wave-1-uat-signoff.md",
    label: "Wave 1 UAT signoff sheet",
  },
  "wave-2": {
    path: ".lovable/wave-2-uat-signoff.md",
    label: "Wave 2 UAT signoff sheet",
  },
};

function SignoffArtifactPopover({
  artifact,
  children,
}: {
  artifact: { path: string; label: string };
  children: React.ReactNode;
}) {
  const { toast } = useToast();
  const copy = () => {
    void navigator.clipboard.writeText(artifact.path);
    toast({ title: "Path copied", description: artifact.path });
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40"
          aria-label={`Open ${artifact.label}`}
        >
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="flex items-start gap-2 mb-2">
          <FileText className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">{artifact.label}</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Repo-internal artifact (not served over HTTP). Copy the path and open it in your editor.
            </p>
          </div>
        </div>
        <div className="rounded-md border border-border bg-muted/40 px-2 py-1.5 font-mono text-[11px] text-foreground break-all">
          {artifact.path}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={copy}>
            <Copy className="w-3 h-3 mr-1.5" />
            Copy path
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            asChild
          >
            <a
              href={`vscode://file/${artifact.path}`}
              title="Try to open in VS Code (only works locally)"
            >
              <ExternalLink className="w-3 h-3 mr-1.5" />
              Open
            </a>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function GateBadge({
  kind,
  status,
  locked,
  artifact,
}: {
  kind: GateKind;
  status?: GateStatus;
  locked?: boolean;
  artifact?: { path: string; label: string };
}) {
  if (kind === "lock") {
    if (locked) {
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-500/30 font-medium gap-1">
          <Lock className="w-3 h-3" />
          Locked
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-muted text-muted-foreground border-border font-medium gap-1">
        <Unlock className="w-3 h-3" />
        Unlocked
      </Badge>
    );
  }

  const kindMeta: Record<Exclude<GateKind, "lock">, { label: string; Icon: typeof CheckCircle }> = {
    build: { label: "Build", Icon: Hammer },
    test: { label: "Test", Icon: FlaskConical },
    qa: { label: "QA", Icon: ClipboardCheck },
  };
  const { label, Icon } = kindMeta[kind];

  const statusMeta: Record<GateStatus, { className: string; suffix: string }> = {
    complete: { className: "bg-green-500/10 text-green-700 border-green-500/30", suffix: "Complete" },
    "in-progress": { className: "bg-amber-500/15 text-amber-700 border-amber-500/40", suffix: "In Progress" },
    pending: { className: "bg-muted text-muted-foreground border-border", suffix: "Pending" },
    blocked: { className: "bg-red-500/10 text-red-700 border-red-500/30", suffix: "Blocked" },
  };
  const s = status ?? "pending";
  const { className, suffix } = statusMeta[s];

  const badge = (
    <Badge
      variant="outline"
      className={`${className} font-medium gap-1 ${artifact ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
    >
      <Icon className="w-3 h-3" />
      {label}: {suffix}
      {artifact && <FileText className="w-3 h-3 ml-0.5 opacity-70" />}
    </Badge>
  );

  if (artifact) {
    return <SignoffArtifactPopover artifact={artifact}>{badge}</SignoffArtifactPopover>;
  }
  return badge;
}

function GateRow({ phase }: { phase: BuildPhase }) {
  const artifact = SIGNOFF_ARTIFACTS[phase.id];
  return (
    <div className="flex flex-wrap gap-2">
      <GateBadge kind="build" status={phase.gates.build} />
      <GateBadge kind="test" status={phase.gates.test} />
      <GateBadge kind="qa" status={phase.gates.qa} artifact={artifact} />
      <GateBadge kind="lock" locked={phase.gates.locked} />
    </div>
  );
}

function ContractSection({ contract }: { contract: PhaseContract }) {
  const Block = ({ heading, items, tone = "default" }: { heading: string; items: string[]; tone?: "default" | "warn" }) => {
    if (!items || items.length === 0) return null;
    const isWarn = tone === "warn";
    return (
      <div>
        <h4 className={`text-xs font-semibold uppercase tracking-wider mb-1.5 ${isWarn ? "text-red-700" : "text-foreground"}`}>
          {heading}
        </h4>
        <ul className="space-y-1">
          {items.map((line, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
              {isWarn ? (
                <AlertTriangle className="w-3.5 h-3.5 text-red-600 mt-1 shrink-0" />
              ) : (
                <Circle className="w-2 h-2 mt-2 shrink-0 fill-current text-primary/60" />
              )}
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="space-y-4 rounded-lg border border-border/60 bg-background/60 p-4">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-1.5">Scope</h4>
        <p className="text-sm text-muted-foreground">{contract.scope}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Block heading="Engineering Tests Required" items={contract.engineeringTests} />
        <Block heading="QA / UAT Required" items={contract.qaUat} />
      </div>
      <Block heading="Exit Criteria" items={contract.exitCriteria} />
      {contract.exclusions && contract.exclusions.length > 0 && (
        <Block heading="Explicitly Not In This Phase" items={contract.exclusions} tone="warn" />
      )}
    </div>
  );
}

function phaseDoneCount(phase: BuildPhase) {
  return phase.items.filter((i) => i.status === "done").length;
}

/**
 * Default export: the new founder Build Console.
 * The legacy long-form outline is preserved at `?legacy=1`.
 */
export default function Outline() {
  const [params] = useSearchParams();
  const location = useLocation();
  const { user } = useAuthForRouter();
  const isAdmin = location.pathname.startsWith("/admin");
  const canEdit = !!user;
  const wantsLegacy = params.get("legacy") === "1";

  if (wantsLegacy) {
    return <OutlineLegacyShell isAdmin={isAdmin} />;
  }

  if (isAdmin) {
    return <OutlineConsole canEdit={canEdit} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOForRouter
        title="Build Console"
        description="The 24H Virtual build console: what's complete, in progress, blocked, and what to build next."
        canonical="/outline"
      />
      <NavForRouter />
      <div className="pt-24">
        <OutlineConsole canEdit={canEdit} />
      </div>
      <FooterForRouter />
    </div>
  );
}

function OutlineLegacyShell({ isAdmin }: { isAdmin: boolean }) {
  const content = <OutlineLegacyBody />;
  if (isAdmin) return content;
  return (
    <div className="min-h-screen bg-background">
      <SEOForRouter
        title="Master Build Outline (Legacy)"
        description="Legacy long-form Master Build Outline."
        canonical="/outline?legacy=1"
      />
      <NavForRouter />
      <div className="pt-24">{content}</div>
      <FooterForRouter />
    </div>
  );
}

function OutlineLegacyBody() {
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = location.pathname.startsWith("/admin");

  const [progress, setProgress] = useState<Record<string, ProgressRow>>({});
  const [testerNames, setTesterNames] = useState<Record<string, string>>({});
  const canEdit = !!user;
  const { phases } = useBuildPhaseOverrides();

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data, error } = await supabase
        .from("outline_progress")
        .select("feature_id, tested, tested_by, tested_at");
      if (error || !mounted) return;
      const map: Record<string, ProgressRow> = {};
      for (const row of data || []) map[row.feature_id] = row as ProgressRow;
      setProgress(map);

      const ids = Array.from(new Set((data || []).map((r) => r.tested_by).filter(Boolean))) as string[];
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ids);
        if (mounted && profs) {
          const names: Record<string, string> = {};
          for (const p of profs) names[p.id] = p.full_name || "Unknown";
          setTesterNames(names);
        }
      }
    };

    load();

    const channel = supabase
      .channel("outline_progress_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "outline_progress" },
        (payload) => {
          const row = (payload.new || payload.old) as ProgressRow;
          if (!row?.feature_id) return;
          setProgress((prev) => {
            if (payload.eventType === "DELETE") {
              const next = { ...prev };
              delete next[row.feature_id];
              return next;
            }
            return { ...prev, [row.feature_id]: payload.new as ProgressRow };
          });
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const isTested = (item: BuildMapItem) => {
    const row = progress[item.id];
    if (row) return row.tested;
    return item.status === "done";
  };

  const toggleTested = async (item: BuildMapItem) => {
    if (!canEdit) return;
    const current = isTested(item);
    const next = !current;
    setProgress((prev) => ({
      ...prev,
      [item.id]: {
        feature_id: item.id,
        tested: next,
        tested_by: user!.id,
        tested_at: new Date().toISOString(),
      },
    }));
    const { error } = await supabase
      .from("outline_progress")
      .upsert(
        {
          feature_id: item.id,
          tested: next,
          tested_by: user!.id,
          tested_at: new Date().toISOString(),
        },
        { onConflict: "feature_id" }
      );
    if (error) {
      setProgress((prev) => {
        const reverted = { ...prev };
        if (current && item.status !== "done") delete reverted[item.id];
        else reverted[item.id] = { ...reverted[item.id], tested: current };
        return reverted;
      });
    }
  };

  const totalItems = allBuildMapItems.length;
  const doneItems = allBuildMapItems.filter((i) => i.status === "done").length;
  const progressPercent = Math.round((doneItems / totalItems) * 100);

  const activePhase = useMemo(
    () => phases.find((p) => effectiveStatus(p) === "active"),
    [phases]
  );
  const phaseB = useMemo(() => phases.find((p) => p.id === "phase-b"), [phases]);
  const phaseA = useMemo(() => phases.find((p) => p.id === "phase-a"), [phases]);
  const deferredPhases = useMemo(
    () => phases.filter((p) => effectiveStatus(p) === "deferred"),
    [phases]
  );
  const defaultOpenPhases = useMemo(() => {
    const a = activePhase?.id;
    return a ? [a] : [];
  }, [activePhase]);

  const renderItemRow = (item: BuildMapItem, opts?: { note?: string }) => {
    const hasKB = !!knowledgeBaseMap[item.id];
    const tested = isTested(item);
    const row = progress[item.id];
    const tooltip = row?.tested_by
      ? `Tested by ${testerNames[row.tested_by] || "staff"}${row.tested_at ? ` on ${new Date(row.tested_at).toLocaleDateString()}` : ""}`
      : item.status === "done"
      ? "Auto-marked as tested (shipped)"
      : "Not yet tested";
    return (
      <div
        key={item.id}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors"
      >
        <StatusIcon status={item.status} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground">{item.name}</div>
          <div className="text-xs text-muted-foreground">{item.description}</div>
          {opts?.note && (
            <div className="text-xs text-amber-700 mt-0.5">{opts.note}</div>
          )}
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <label className={`flex items-center gap-1.5 text-xs text-muted-foreground ${canEdit ? "cursor-pointer" : "cursor-default"}`}>
                <Checkbox
                  checked={tested}
                  disabled={!canEdit}
                  onCheckedChange={() => toggleTested(item)}
                />
                Tested
              </label>
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
          </Tooltip>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Checkbox checked={hasKB} disabled />
            KB
          </label>
        </div>
      </div>
    );
  };

  const content = (
    <TooltipProvider delayDuration={150}>
      <div className="container-custom pt-8 pb-20">
        <div className="max-w-4xl mx-auto">
          {/* 1. Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-1">
              24H Virtual Master Build Outline
            </h1>
            <p className="text-sm text-muted-foreground mb-3">
              Canonical execution order, implementation status, testing status, QA status, and phase gates.
            </p>
            <p className="text-muted-foreground mb-4">
              {doneItems} of {totalItems} items shipped across all phases and inventory
            </p>
            <Progress value={progressPercent} className="h-3 mb-4" />
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-green-500" /> Done</span>
              <span className="flex items-center gap-1.5"><Loader className="w-4 h-4 text-yellow-500" /> In Progress</span>
              <span className="flex items-center gap-1.5"><Circle className="w-4 h-4 text-muted-foreground" /> Planned</span>
              <span className="flex items-center gap-1.5"><Lock className="w-4 h-4 text-muted-foreground" /> Deferred Phase</span>
            </div>
            {!canEdit && (
              <p className="text-xs text-muted-foreground mt-3">
                Sign in as staff to mark items as QA-tested. Public viewers see read-only progress.
              </p>
            )}
          </div>

          {/* 2. Canonical Execution Order strip */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-1">Canonical Execution Order</h2>
            <p className="text-sm text-muted-foreground mb-4">
              The locked sequence. Click any chip to jump to that phase card.
            </p>
            <div className="flex flex-wrap gap-2">
              {phases.map((p) => {
                const eff = effectiveStatus(p);
                const styles: Record<BuildPhaseStatus, string> = {
                  built: "bg-green-500/10 text-green-700 border-green-500/30 hover:bg-green-500/20",
                  stabilized: "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20",
                  active: "bg-amber-500/15 text-amber-700 border-amber-500/40 hover:bg-amber-500/25",
                  deferred: "bg-muted text-muted-foreground border-border hover:bg-muted/70",
                };
                return (
                  <a
                    key={p.id}
                    href={`#phase-${p.id}`}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${styles[eff]}`}
                  >
                    <span className="font-mono">{p.code}</span>
                    <span className="hidden sm:inline opacity-80">{p.title}</span>
                  </a>
                );
              })}
            </div>
          </section>

          {/* 3. Foundation Already Built */}
          {phaseB && (
            <section className="mb-10">
              <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-1">Foundation Already Built</h2>
                  <p className="text-sm text-muted-foreground">
                    Phase B: tenant identity, knowledge tables, field projection, Five9 mappings, and the admin authoring shell.
                  </p>
                </div>
                <PhaseStatusPill status={effectiveStatus(phaseB)} />
              </div>
              <div className="mb-3">
                <GateRow phase={phaseB} />
              </div>
              <div className="rounded-xl border border-border bg-card p-2 space-y-1">
                {sortItems(phaseB.items).map((item) => renderItemRow(item))}
              </div>
            </section>
          )}

          {/* 4. Stabilization Complete */}
          {phaseA && (
            <section className="mb-10">
              <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-1">Stabilization Complete</h2>
                  <p className="text-sm text-muted-foreground">
                    Phase A P0 series. IA, nav, scoping, and naming locked across all six personas.
                  </p>
                </div>
                <PhaseStatusPill status={effectiveStatus(phaseA)} />
              </div>
              <div className="mb-3">
                <GateRow phase={phaseA} />
              </div>
              <div className="rounded-xl border border-border bg-card p-2 space-y-1">
                {stabilizationItems.map((item) =>
                  renderItemRow(
                    item,
                    item.id === "p0-2-supervisor-lock"
                      ? { note: "Documentation lock only. True supervisor scoping deferred to P1-6a in Phase G." }
                      : undefined
                  )
                )}
              </div>
            </section>
          )}

          {/* 5. Current Active Phase */}
          {activePhase && (
            <section className="mb-10 rounded-2xl border-2 border-amber-500/40 bg-amber-500/5 p-5">
              <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-5 h-5 text-amber-600" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">Current Active Phase</span>
                  </div>
                  <h2 className="text-xl font-bold text-foreground">
                    {activePhase.code}: {activePhase.title}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">{activePhase.oneLiner}</p>
                </div>
                <Badge variant="outline" className="bg-background shrink-0">
                  {phaseDoneCount(activePhase)} of {activePhase.items.length}
                </Badge>
              </div>
              <div className="mb-4">
                <GateRow phase={activePhase} />
              </div>
              <ContractSection contract={activePhase.contract} />
              <div className="mt-4 space-y-1 bg-background/60 rounded-xl p-2">
                {sortItems(activePhase.items).map((item) => renderItemRow(item))}
              </div>
              {activePhase.id === "wave-1" && (
                <div className="mt-4">
                  <WaveClosePanel canEdit={canEdit} />
                </div>
              )}
            </section>
          )}

          {/* 6. Phase Cards (Execution Map) */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-1">Execution Map</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Every phase with its full contract: scope, build items, engineering tests, QA / UAT, exit criteria, and gates.
            </p>
            <Accordion type="multiple" defaultValue={defaultOpenPhases} className="space-y-3">
              {phases.map((phase) => {
                const eff = effectiveStatus(phase);
                const done = phaseDoneCount(phase);
                const sorted = sortItems(phase.items);
                const isDeferred = eff === "deferred";
                return (
                  <AccordionItem
                    key={phase.id}
                    id={`phase-${phase.id}`}
                    value={phase.id}
                    className={`border-2 rounded-xl px-3 ${
                      eff === "active"
                        ? "border-amber-500/40 bg-amber-500/5"
                        : isDeferred
                        ? "border-border/60 bg-muted/20"
                        : "border-border bg-card"
                    }`}
                  >
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full text-left pr-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Badge variant="secondary" className="shrink-0 font-mono text-xs">
                            {phase.code}
                          </Badge>
                          <div className="min-w-0">
                            <div className="text-base font-semibold text-foreground truncate">{phase.title}</div>
                            <div className="text-xs font-normal text-muted-foreground">{phase.oneLiner}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {done} of {phase.items.length}
                          </span>
                          <PhaseStatusPill status={eff} />
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pb-2">
                        <GateRow phase={phase} />
                        <ContractSection contract={phase.contract} />
                        <div className="space-y-1">{sorted.map((item) => renderItemRow(item))}</div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </section>

          {/* 7. Deferred / Blocked */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-1">Deferred / Blocked</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Everything explicitly out of scope until the active phase ships its exit criteria.
            </p>
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 mb-4 flex items-start gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-red-700 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-red-700">Supervisor true scoping (P1-6a)</span>
                <span className="text-muted-foreground"> is deferred to Phase G. Supervisor scope is currently a documentation-only lock to admin-equivalent.</span>
              </div>
            </div>
            <div className="space-y-4">
              {deferredPhases.map((phase) => (
                <div key={phase.id} className="rounded-xl border border-border/60 p-4 bg-muted/10">
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono text-xs">{phase.code}</Badge>
                      <a
                        href={`#phase-${phase.id}`}
                        className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        {phase.title}
                      </a>
                    </div>
                    <GateBadge kind="lock" locked={phase.gates.locked} />
                  </div>
                  <ul className="space-y-1.5 ml-1">
                    {phase.items.map((item) => (
                      <li key={item.id} className="flex items-start gap-2 text-sm">
                        <Lock className="w-3.5 h-3.5 text-muted-foreground mt-1 shrink-0" />
                        <div>
                          <span className="font-medium text-foreground">{item.name}</span>
                          <span className="text-muted-foreground">: {item.description}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* 8. Testing Model */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-1">Testing Model</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Applied to every phase. Each phase card lists its phase-specific engineering tests and QA / UAT checks; this checklist is the reusable pattern those lists are built from.
            </p>
            <div className="rounded-xl border border-border bg-card p-4">
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                {testingChecklist.map((line) => (
                  <li key={line} className="flex items-start gap-2 text-sm text-foreground">
                    <FlaskConical className="w-3.5 h-3.5 text-primary mt-1 shrink-0" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* 9. Legacy Platform Inventory */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-1">Legacy Platform Inventory</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Reference inventory only, not part of the canonical execution order.
            </p>
            <Accordion type="multiple" className="space-y-3">
              {platformInventory.map((category) => {
                const catDone = category.items.filter((i) => i.status === "done").length;
                const sorted = sortItems(category.items);
                return (
                  <AccordionItem key={category.id} value={category.id} className="border rounded-xl px-2">
                    <AccordionTrigger className="text-base font-semibold hover:no-underline">
                      <div className="text-left">
                        <div className="text-foreground">{category.title}</div>
                        <div className="text-sm font-normal text-muted-foreground">
                          {category.subtitle}: {catDone} of {category.items.length} built
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-1">{sorted.map((item) => renderItemRow(item))}</div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </section>

          {/* 10. Required Secrets */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Required Secrets & Credentials</h2>
            <div className="space-y-2">
              {requiredSecrets.map((secret) => (
                <div key={secret.name} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/50">
                  {secret.isPublic ? (
                    <Unlock className="w-4 h-4 text-green-500 shrink-0" />
                  ) : (
                    <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <Badge variant="secondary" className="shrink-0">{secret.service}</Badge>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground">{secret.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{secret.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </TooltipProvider>
  );

  if (isAdmin) return content;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Master Build Outline"
        description="Canonical Master Build Outline for the 24H Virtual platform. Phase order, gates, build / test / QA status, and platform inventory in one source of truth."
        canonical="/outline"
      />
      <Navigation />
      <div className="pt-24">{content}</div>
      <Footer />
    </div>
  );
}
