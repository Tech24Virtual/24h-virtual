/**
 * Phase 39 — QA Readiness Panel
 *
 * Single admin surface that presents the frozen QA scope, seeded personas,
 * test scripts, regression pack, defect template, and an editable release
 * gate so a Computer-driven QA cycle can be handed off cleanly.
 */

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  QA_SCOPE_AREAS,
  QA_DEFERRED,
  QA_PERSONAS,
  QA_TEST_SCRIPTS,
  QA_REGRESSION_PACK,
  QA_DEFECT_TEMPLATE,
  defectMarkdownTemplate,
  DEFAULT_GATE_CHECKS,
  listReleaseGates,
  createReleaseGate,
  updateGateChecks,
  recordDecision,
  deleteReleaseGate,
  type QAReleaseGate,
  type QAGateCheck,
  type QASeverity,
} from "@/lib/governance/qaReadiness";
import { supabase } from "@/integrations/supabase/client";
import { logAuditEvent } from "@/lib/audit";
import { Loader2, AlertTriangle } from "lucide-react";

const sevColor: Record<QASeverity, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-gray-100 text-gray-800",
};

export default function QAReadinessPanel() {
  const { toast } = useToast();
  const [gates, setGates] = useState<QAReleaseGate[]>([]);
  const [loading, setLoading] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newSummary, setNewSummary] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      setGates(await listReleaseGates());
    } catch (e: any) {
      toast({ title: "Failed to load release gates", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const selected = useMemo(() => gates.find((g) => g.id === selectedId) ?? null, [gates, selectedId]);

  async function handleCreate() {
    if (!newLabel.trim()) return;
    try {
      const created = await createReleaseGate({
        release_label: newLabel.trim(),
        scope_summary: newSummary.trim() || undefined,
      });
      toast({ title: "Release gate created", description: created.release_label });
      setNewLabel("");
      setNewSummary("");
      await refresh();
      setSelectedId(created.id);
    } catch (e: any) {
      toast({ title: "Create failed", description: e.message, variant: "destructive" });
    }
  }

  async function toggleCheck(idx: number, status: QAGateCheck["status"]) {
    if (!selected) return;
    const next = selected.gate_checks.map((c, i) => (i === idx ? { ...c, status } : c));
    try {
      await updateGateChecks(selected.id, next);
      await refresh();
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    }
  }

  async function handleDecision(decision: "go" | "no_go") {
    if (!selected) return;
    try {
      await recordDecision(selected.id, decision);
      toast({ title: `Decision recorded: ${decision}` });
      await refresh();
    } catch (e: any) {
      toast({ title: "Decision failed", description: e.message, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>QA Readiness & Test Harness</CardTitle>
          <CardDescription>
            Phase 39. Operational QA packaging: scope, seeded personas, scripts, regression
            pack, defect template, and release gate. Designed for a Perplexity Computer / UAT
            handoff. This is not a full test management system.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="scope">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="scope">Scope</TabsTrigger>
          <TabsTrigger value="personas">Personas</TabsTrigger>
          <TabsTrigger value="scripts">Scripts</TabsTrigger>
          <TabsTrigger value="regression">Regression Pack</TabsTrigger>
          <TabsTrigger value="gate">Release Gate</TabsTrigger>
          <TabsTrigger value="defects">Defect Template</TabsTrigger>
          <TabsTrigger value="seed">Seed QA State</TabsTrigger>
        </TabsList>

        <TabsContent value="seed" className="space-y-3">
          <QASeedStatePanel />
        </TabsContent>

        {/* SCOPE */}
        <TabsContent value="scope" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>In-Scope Surfaces</CardTitle>
              <CardDescription>Frozen for this QA cycle.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {QA_SCOPE_AREAS.map((a) => (
                <div key={a.id} className="border rounded-lg p-3">
                  <div className="font-semibold">{a.surface}</div>
                  <ul className="list-disc ml-5 text-sm mt-1">
                    {a.included.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                  {a.excluded && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Excluded: {a.excluded.join(", ")}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Deferred / Not Bugs</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc ml-5 text-sm">
                {QA_DEFERRED.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PERSONAS */}
        <TabsContent value="personas" className="space-y-3">
          {QA_PERSONAS.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{p.label}</CardTitle>
                  <Badge variant="outline">{p.role}</Badge>
                </div>
                <CardDescription>{p.email}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><span className="font-semibold">Purpose:</span> {p.purpose}</div>
                <div>
                  <span className="font-semibold">Seeded state:</span>
                  <ul className="list-disc ml-5 mt-1">
                    {p.seededState.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* SCRIPTS */}
        <TabsContent value="scripts" className="space-y-3">
          {QA_TEST_SCRIPTS.map((s) => (
            <Card key={s.id}>
              <CardHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{s.id}</Badge>
                  <CardTitle className="text-base">{s.title}</CardTitle>
                  <Badge className={sevColor[s.severityIfFailed]}>{s.severityIfFailed}</Badge>
                  {s.negative && <Badge variant="secondary">negative</Badge>}
                </div>
                <CardDescription>
                  {s.area} · {s.persona}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div>
                  <span className="font-semibold">Preconditions:</span>
                  <ul className="list-disc ml-5">{s.preconditions.map((p) => <li key={p}>{p}</li>)}</ul>
                </div>
                <div>
                  <span className="font-semibold">Steps:</span>
                  <ol className="list-decimal ml-5">{s.steps.map((p) => <li key={p}>{p}</li>)}</ol>
                </div>
                <div><span className="font-semibold">Expected:</span> {s.expected}</div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* REGRESSION */}
        <TabsContent value="regression" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>High-Risk Regression Pack</CardTitle>
              <CardDescription>Run first before broader QA.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {QA_REGRESSION_PACK.map((r) => (
                  <div key={r.id} className="flex items-center justify-between border rounded p-2">
                    <div>
                      <div className="font-medium">{r.label}</div>
                      <div className="text-xs text-muted-foreground">
                        Scripts: {r.scriptIds.join(", ")}
                      </div>
                    </div>
                    <Badge className={sevColor[r.severity]}>{r.severity}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RELEASE GATE */}
        <TabsContent value="gate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Release Gate</CardTitle>
              <CardDescription>
                One per QA round. Label is unique (e.g. 2026-05-Computer-QA).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Release Label</Label>
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="2026-05-Computer-QA"
                />
              </div>
              <div>
                <Label>Scope Summary</Label>
                <Textarea
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="Short summary of in-scope surfaces for this round"
                />
              </div>
              <Button onClick={handleCreate} disabled={!newLabel.trim() || loading}>
                Create Gate
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Existing Release Gates</CardTitle>
            </CardHeader>
            <CardContent>
              {gates.length === 0 ? (
                <div className="text-sm text-muted-foreground">No release gates recorded yet.</div>
              ) : (
                <div className="space-y-2">
                  <Select value={selectedId ?? undefined} onValueChange={setSelectedId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a release gate" />
                    </SelectTrigger>
                    <SelectContent>
                      {gates.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.release_label} — {g.decision}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {selected && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selected.release_label}</CardTitle>
                    <CardDescription>
                      Decision:{" "}
                      <Badge
                        className={
                          selected.decision === "go"
                            ? "bg-green-100 text-green-800"
                            : selected.decision === "no_go"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {selected.decision}
                      </Badge>
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (!confirm(`Delete gate "${selected.release_label}"?`)) return;
                      await deleteReleaseGate(selected.id);
                      setSelectedId(null);
                      await refresh();
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {selected.scope_summary && (
                  <div className="text-sm border rounded p-2 bg-muted/30">
                    {selected.scope_summary}
                  </div>
                )}
                <div className="space-y-2">
                  {(selected.gate_checks ?? DEFAULT_GATE_CHECKS).map((c, idx) => (
                    <div
                      key={`${c.name}-${idx}`}
                      className="flex items-center justify-between border rounded p-2"
                    >
                      <div className="text-sm">{c.name}</div>
                      <Select
                        value={c.status}
                        onValueChange={(v) => toggleCheck(idx, v as QAGateCheck["status"])}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="pass">Pass</SelectItem>
                          <SelectItem value="fail">Fail</SelectItem>
                          <SelectItem value="na">N/A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleDecision("go")}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Record GO
                  </Button>
                  <Button
                    onClick={() => handleDecision("no_go")}
                    variant="destructive"
                  >
                    Record NO-GO
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* DEFECT TEMPLATE */}
        <TabsContent value="defects" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Defect Handoff Template</CardTitle>
              <CardDescription>
                Use this exact structure for every defect. Fields: {QA_DEFECT_TEMPLATE.fields.join(", ")}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                readOnly
                value={defectMarkdownTemplate()}
                className="font-mono text-xs min-h-[320px]"
              />
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  navigator.clipboard.writeText(defectMarkdownTemplate());
                  toast({ title: "Template copied" });
                }}
              >
                Copy Template
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * D-7 (Computer QA 2026-05-10): admin-only fixture seeder. Calls the
 * seed_qa_state() RPC, which is hard-gated by qa_environment_flags so it
 * cannot run on production unless explicitly enabled.
 */
function QASeedStatePanel() {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [lastResult, setLastResult] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("qa_environment_flags" as never)
        .select("qa_seed_enabled")
        .eq("id", true)
        .maybeSingle();
      setEnabled(((data as { qa_seed_enabled?: boolean } | null)?.qa_seed_enabled) ?? false);
    })();
  }, []);

  const toggleEnabled = async (next: boolean) => {
    const { error } = await supabase
      .from("qa_environment_flags" as never)
      .update({ qa_seed_enabled: next, updated_at: new Date().toISOString() } as never)
      .eq("id", true);
    if (error) {
      toast({ title: "Failed to toggle", description: error.message, variant: "destructive" });
      return;
    }
    setEnabled(next);
  };

  const runSeed = async () => {
    setBusy(true);
    try {
      // Verify caller is authenticated. Without a session, the RPC runs in
      // an anonymous context and `has_role(auth.uid(), 'admin')` returns
      // false, producing a confusing permission_denied error.
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        throw new Error(
          "Not authenticated. Sign in as an admin user before running seed_qa_state().",
        );
      }

      const { data, error } = await supabase.rpc("seed_qa_state" as never);
      if (error) {
        // Surface the full PostgrestError for debugging.
        // eslint-disable-next-line no-console
        console.error("[seed_qa_state] RPC error", {
          message: error.message,
          details: (error as { details?: string }).details,
          hint: (error as { hint?: string }).hint,
          code: (error as { code?: string }).code,
        });
        throw error;
      }
      setLastResult(data as Record<string, unknown>);
      logAuditEvent({ action: "qa.seed_state.invoked", metadata: { result: data } });
      toast({ title: "QA state seeded", description: "Fixture rows tagged QA-SEED 2026-05-10." });
    } catch (e) {
      // PostgrestError is a plain object — `instanceof Error` is false and
      // `String(e)` yields "[object Object]". Pull message/details/hint
      // explicitly so the toast renders something actionable.
      const err = (e ?? {}) as {
        message?: string;
        details?: string;
        hint?: string;
        code?: string;
      };
      const parts = [
        err.message,
        err.details ? `Details: ${err.details}` : null,
        err.hint ? `Hint: ${err.hint}` : null,
        err.code ? `Code: ${err.code}` : null,
      ].filter(Boolean);
      const description =
        parts.length > 0
          ? parts.join(" · ")
          : (() => {
              try {
                return JSON.stringify(e);
              } catch {
                return String(e);
              }
            })();
      // eslint-disable-next-line no-console
      console.error("[seed_qa_state] failed", e);
      toast({
        title: "Seed failed",
        description,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seed QA State</CardTitle>
        <CardDescription>
          Inserts a fixed set of fixtures (deals below/above approval threshold, an implemented
          deal, a forecast snapshot, a RevOps period snapshot, and 4 client/partner health rows)
          tagged "QA-SEED 2026-05-10" for clean removal. Disabled by default; must be explicitly
          enabled per environment to prevent accidental production seeding.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            This is a destructive write. Only enable on staging or QA environments. Production
            seeding will pollute canonical metrics.
          </span>
        </div>

        <div className="flex items-center justify-between rounded border p-3">
          <div className="text-sm">
            <p className="font-medium">QA seeding flag</p>
            <p className="text-muted-foreground text-xs">
              Status:{" "}
              <Badge variant={enabled ? "default" : "secondary"}>
                {enabled === null ? "loading…" : enabled ? "enabled" : "disabled"}
              </Badge>
            </p>
          </div>
          <Button
            variant={enabled ? "outline" : "default"}
            size="sm"
            disabled={enabled === null}
            onClick={() => toggleEnabled(!enabled)}
          >
            {enabled ? "Disable" : "Enable"}
          </Button>
        </div>

        <Button onClick={runSeed} disabled={!enabled || busy}>
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Run seed_qa_state()
        </Button>

        {lastResult && (
          <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">
            {JSON.stringify(lastResult, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
