/**
 * Phase 22 — Board Pack Panel (admin-only)
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, FileText, Download } from "lucide-react";
import { fetchBoardPack, formatUsd, type BoardPack } from "@/lib/governance/boardPack";
import { downloadBoardPackPdf } from "@/lib/governance/boardPackPdf";
import { downloadFile, timestamp, rowsToCsv, logExportDownload } from "@/lib/governance/exports";

export default function BoardPackPanel() {
  const [pack, setPack] = useState<BoardPack | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetchBoardPack()
      .then((p) => { if (!cancelled) setPack(p); })
      .catch(() => { if (!cancelled) setPack(null); });
    return () => { cancelled = true; };
  }, []);

  if (pack === undefined) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (pack === null) {
    return <p className="text-sm text-destructive">Failed to load board pack.</p>;
  }

  const downloadJson = () => {
    downloadFile(`board-pack-${timestamp()}.json`, JSON.stringify(pack, null, 2), "application/json");
    logExportDownload("board_pack_download", { format: "json" });
  };
  const downloadPdf = () => {
    downloadBoardPackPdf(pack, `board-pack-${timestamp()}.pdf`);
    logExportDownload("board_pack_download", { format: "pdf" });
  };
  const downloadSection = (key: string) => {
    const section = pack.sections.find((s) => s.key === key);
    if (!section) return;
    const rows = Array.isArray(section.data) ? section.data : [section.data].filter(Boolean);
    downloadFile(`board-pack-${key}-${timestamp()}.csv`, rowsToCsv(rows), "text/csv");
    logExportDownload("board_pack_section_download", { key });
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Board pack.</strong> Composes canonical Phase 17–21 views into a board-ready bundle.
          No re-aggregation or narrative synthesis. Caveats are preserved per section. Admin-only.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />Board Pack — {pack.period_label}</CardTitle>
            <CardDescription>Generated {new Date(pack.generated_at).toLocaleString()} · {pack.sections.length} sections</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={downloadJson}>
              <Download className="h-4 w-4 mr-1" /> JSON
            </Button>
            <Button size="sm" onClick={downloadPdf}>
              <Download className="h-4 w-4 mr-1" /> PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="text-xs space-y-1 text-muted-foreground">
            {pack.global_caveats.map((c, i) => <li key={i}>• {c}</li>)}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {pack.sections.map((s) => (
          <Card key={s.key}>
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
              <div className="space-y-1">
                <CardTitle className="text-sm">{s.title}</CardTitle>
                <p className="text-xs text-muted-foreground">Source: <code>{s.source}</code></p>
                <div className="flex flex-wrap gap-1">
                  {s.caveats.map((c, i) => <Badge key={i} variant="outline" className="text-[10px]">{c}</Badge>)}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => downloadSection(s.key)}>
                <Download className="h-3 w-3 mr-1" /> CSV
              </Button>
            </CardHeader>
            <CardContent>
              <SectionPreview key={s.key} sectionKey={s.key} data={s.data} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SectionPreview({ sectionKey, data }: { sectionKey: string; data: any }) {
  if (data === null || data === undefined) return <p className="text-xs text-muted-foreground">No data.</p>;
  if (Array.isArray(data)) {
    return <p className="text-xs text-muted-foreground">{data.length} row{data.length === 1 ? "" : "s"}</p>;
  }
  if (typeof data === "object" && "channels" in data && "directVsWl" in data) {
    return <p className="text-xs text-muted-foreground">{data.channels.length} channels · {data.directVsWl.length} streams</p>;
  }
  if (typeof data === "object" && "ending_mrr_usd" in data) {
    return <p className="text-xs">Ending MRR: <span className="font-medium">{formatUsd(data.ending_mrr_usd)}</span> · Net new: {formatUsd(data.net_new_mrr_usd)}</p>;
  }
  return <p className="text-xs text-muted-foreground">{Object.keys(data).length} fields</p>;
}
