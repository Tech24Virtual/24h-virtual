/**
 * Phase 11 — Exports panel for admin/intelligence.
 * Lists the export catalog, lets admins materialize snapshots, and
 * download CSV/JSON. Every action is audited via the underlying RPCs.
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, FileJson, FileSpreadsheet, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  EXPORT_CATALOG,
  generateExecutiveSnapshot,
  fetchBiView,
  rowsToCsv,
  downloadFile,
  timestamp,
  listSnapshots,
  logExportDownload,
  type SnapshotRow,
  type ExportProduct,
} from "@/lib/governance/exports";

const VIEW_FOR_KEY: Record<string, string | null> = {
  executive_snapshot: null,
  revenue_pipeline: "v_bi_revenue_pipeline",
  delivery_pipeline: "v_bi_delivery_pipeline",
  voice_readiness: "v_bi_voice_readiness",
  wl_partner_readiness: "v_bi_wl_partner_readiness",
  automation_health: "v_bi_automation_health",
  wl_partner_snapshot: null,
};

export default function ExportsPanel() {
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [loadingSnaps, setLoadingSnaps] = useState(true);

  const refresh = async () => {
    try {
      setLoadingSnaps(true);
      setSnapshots(await listSnapshots({ limit: 15 }));
    } catch (e: any) {
      toast({ title: "Could not load snapshots", description: e.message, variant: "destructive" });
    } finally {
      setLoadingSnaps(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const adminProducts = EXPORT_CATALOG.filter((p) => p.audience === "admin");

  const handleViewExport = async (p: ExportProduct, format: "csv" | "json") => {
    const view = VIEW_FOR_KEY[p.key];
    if (!view) return;
    try {
      setBusy(`${p.key}:${format}`);
      const rows = await fetchBiView(view);
      const ts = timestamp();
      if (format === "csv") {
        downloadFile(`${p.key}_${ts}.csv`, rowsToCsv(rows), "text/csv");
      } else {
        downloadFile(`${p.key}_${ts}.json`, JSON.stringify(rows, null, 2), "application/json");
      }
      await logExportDownload(`intelligence.export.${p.key}`, { format, rows: rows.length });
      toast({ title: "Export downloaded", description: `${rows.length} row${rows.length === 1 ? "" : "s"}` });
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const handleSnapshot = async () => {
    try {
      setBusy("snapshot");
      await generateExecutiveSnapshot();
      toast({ title: "Executive snapshot generated", description: "Logged to audit trail." });
      await refresh();
    } catch (e: any) {
      toast({ title: "Snapshot failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const downloadSnapshot = (s: SnapshotRow, format: "csv" | "json") => {
    const ts = s.generated_at.replace(/[:.]/g, "-").slice(0, 19);
    if (format === "json") {
      downloadFile(`${s.snapshot_type}_${ts}.json`, JSON.stringify(s.payload, null, 2), "application/json");
    } else {
      // CSV: flatten one row per top-level array section, prefixed with section name
      const out: string[] = [];
      const p = s.payload ?? {};
      if (p.kpi && typeof p.kpi === "object") {
        out.push("# kpi");
        out.push(rowsToCsv([p.kpi]));
      }
      for (const [k, v] of Object.entries(p)) {
        if (Array.isArray(v) && v.length) {
          out.push(`\n# ${k}`);
          out.push(rowsToCsv(v as any[]));
        }
      }
      downloadFile(`${s.snapshot_type}_${ts}.csv`, out.join("\n"), "text/csv");
    }
    logExportDownload(`intelligence.export.${s.snapshot_type}.download`, { snapshot_id: s.id, format });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">Executive Snapshot</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Materialize a board-ready snapshot of KPIs, pipelines, voice/WL readiness, and open recommendations. Stored, audited, and downloadable.
            </p>
          </div>
          <Button onClick={handleSnapshot} disabled={busy === "snapshot"}>
            {busy === "snapshot" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Generate Snapshot
          </Button>
        </CardHeader>
        <CardContent>
          {loadingSnaps ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : snapshots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No snapshots yet. Generate one to start the audit trail.</p>
          ) : (
            <div className="space-y-2">
              {snapshots.map((s) => (
                <div key={s.id} className="flex items-center justify-between border rounded-md px-3 py-2 text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <History className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{s.snapshot_type}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(s.generated_at).toLocaleString()} · {s.row_count} rows · {s.scope}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => downloadSnapshot(s, "csv")}>
                      <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />CSV
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => downloadSnapshot(s, "json")}>
                      <FileJson className="h-3.5 w-3.5 mr-1" />JSON
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Live Data Exports</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Stream-now exports straight from canonical BI views. Each download is recorded as a dashboard event. Internal use only — do not share externally without redaction review.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {adminProducts.filter((p) => VIEW_FOR_KEY[p.key]).map((p) => (
              <div key={p.key} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{p.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{p.description}</div>
                  </div>
                  <Badge variant="secondary" className="shrink-0">Internal</Badge>
                </div>
                <div className="text-[11px] font-mono text-muted-foreground">{p.source}</div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" disabled={busy === `${p.key}:csv`} onClick={() => handleViewExport(p, "csv")}>
                    {busy === `${p.key}:csv` ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />}CSV
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy === `${p.key}:json`} onClick={() => handleViewExport(p, "json")}>
                    {busy === `${p.key}:json` ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileJson className="h-3.5 w-3.5 mr-1" />}JSON
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">External BI / Warehouse Hook</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            The following Postgres views have stable, BI-ready column names and enforce the caller's RLS context (security_invoker = true). Connect any external warehouse or BI tool with admin credentials to consume them; partner credentials see only their own rows.
          </p>
          <ul className="list-disc pl-5 space-y-1 font-mono text-xs">
            <li>v_bi_executive_kpi</li>
            <li>v_bi_revenue_pipeline</li>
            <li>v_bi_delivery_pipeline</li>
            <li>v_bi_voice_readiness</li>
            <li>v_bi_wl_partner_readiness</li>
            <li>v_bi_wl_partner_export · partner-scoped</li>
            <li>v_bi_automation_health</li>
          </ul>
          <p className="text-xs">
            Schema is treated as a contract: existing columns will not be removed without notice. Real-time streaming, full ETL pipelines, and wide-open APIs are intentionally out of scope.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
