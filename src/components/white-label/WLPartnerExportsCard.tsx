/**
 * Phase 11 — Partner-safe reporting export.
 * Renders inside the WL partner dashboard. Lets the owning partner
 * generate and download a tenant-scoped snapshot of their readiness +
 * client directory aggregates. Uses generate_wl_partner_snapshot RPC,
 * which enforces (admin OR owning partner) server-side.
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download, FileSpreadsheet, FileJson } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWLPartnerId } from "@/hooks/wl/useWLPartnerId";
import {
  generateWLPartnerSnapshot,
  listSnapshots,
  rowsToCsv,
  downloadFile,
  type SnapshotRow,
} from "@/lib/governance/exports";

export function WLPartnerExportsCard() {
  const { toast } = useToast();
  const { data: partnerId } = useWLPartnerId();
  const [busy, setBusy] = useState(false);
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!partnerId) return;
    try {
      setLoading(true);
      setSnapshots(await listSnapshots({ type: "wl_partner_snapshot", partnerId, limit: 10 }));
    } catch (e: any) {
      toast({ title: "Could not load exports", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [partnerId]);

  const handleGenerate = async () => {
    if (!partnerId) return;
    try {
      setBusy(true);
      await generateWLPartnerSnapshot(partnerId);
      toast({ title: "Reporting snapshot generated" });
      await refresh();
    } catch (e: any) {
      toast({ title: "Snapshot failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const download = (s: SnapshotRow, format: "csv" | "json") => {
    const ts = s.generated_at.replace(/[:.]/g, "-").slice(0, 19);
    if (format === "json") {
      downloadFile(`partner_snapshot_${ts}.json`, JSON.stringify(s.payload, null, 2), "application/json");
      return;
    }
    const out: string[] = [];
    if (s.payload?.readiness) {
      out.push("# readiness");
      out.push(rowsToCsv([s.payload.readiness]));
    }
    if (Array.isArray(s.payload?.clients)) {
      out.push("\n# clients");
      out.push(rowsToCsv(s.payload.clients));
    }
    downloadFile(`partner_snapshot_${ts}.csv`, out.join("\n"), "text/csv");
  };

  if (!partnerId) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">Reporting Exports</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Generate a tenant-safe snapshot of your readiness and client portfolio. Cross-tenant data is never included.
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          Generate
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : snapshots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No snapshots yet.</p>
        ) : (
          <div className="space-y-2">
            {snapshots.map((s) => (
              <div key={s.id} className="flex items-center justify-between border rounded-md px-3 py-2 text-sm">
                <div>
                  <div className="font-medium">Partner Snapshot</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(s.generated_at).toLocaleString()} · {s.row_count} clients
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => download(s, "csv")}>
                    <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => download(s, "json")}>
                    <FileJson className="h-3.5 w-3.5 mr-1" />JSON
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
