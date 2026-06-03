/**
 * QACapturesPanel
 * ---------------
 * Lists previously saved Capture-for-chat bundles (PNG + JSON + markdown).
 * Each row lets the user re-download the PNG/JSON, copy the markdown, or
 * delete the entry. Backed by IndexedDB via qaCaptures.
 */
import { useEffect, useState } from "react";
import { Camera, Download, Trash2, Copy, FileImage, FileJson, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  listCaptures, getCapture, deleteCapture, clearCaptures, subscribeCaptures,
  type CaptureMeta,
} from "@/lib/productTesting/qaCaptures";

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function QACapturesPanel() {
  const { toast } = useToast();
  const [items, setItems] = useState<CaptureMeta[]>([]);

  useEffect(() => {
    let alive = true;
    const sync = () => listCaptures().then((r) => { if (alive) setItems(r); }).catch(() => {});
    sync();
    const unsub = subscribeCaptures(sync);
    return () => { alive = false; unsub(); };
  }, []);

  async function handleReattach(id: string) {
    const rec = await getCapture(id);
    if (!rec) return;
    downloadBlob(rec.png, rec.pngName);
    downloadBlob(new Blob([rec.jsonText], { type: "application/json" }), rec.jsonName);
    try {
      await navigator.clipboard.writeText(rec.markdown);
      toast({ title: "Capture reattached", description: "PNG + JSON downloaded, summary copied to clipboard." });
    } catch {
      toast({ title: "Capture downloaded", description: "Attach the PNG and JSON to your chat message." });
    }
  }

  async function handleCopyMd(id: string) {
    const rec = await getCapture(id);
    if (!rec) return;
    try {
      await navigator.clipboard.writeText(rec.markdown);
      toast({ title: "Markdown copied" });
    } catch {
      toast({ title: "Clipboard unavailable", variant: "destructive" });
    }
  }

  async function handleDelete(id: string) {
    await deleteCapture(id);
  }

  async function handleClear() {
    if (!confirm("Clear all saved captures? This cannot be undone.")) return;
    await clearCaptures();
    toast({ title: "Captures cleared" });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Capture History
          </CardTitle>
          <CardDescription>
            Saved Capture-for-chat bundles (last 10). Re-attach any previous capture to a new chat message.
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={handleClear} disabled={items.length === 0}>
          <Trash2 className="h-3 w-3 mr-1.5" />
          Clear
        </Button>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6">
            No captures yet. Use the <em>Capture for chat</em> button while a segment is open.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">
                      {c.segmentLabel ?? "Ad-hoc capture"}
                    </span>
                    {c.issueCount > 0 && (
                      <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-700 border-red-500/40">
                        <AlertCircle className="h-2.5 w-2.5 mr-1" />
                        {c.issueCount} issues
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>{new Date(c.createdAt).toLocaleString()}</span>
                    <span className="inline-flex items-center gap-1"><FileImage className="h-3 w-3" />{formatBytes(c.pngSize)}</span>
                    <span className="inline-flex items-center gap-1"><FileJson className="h-3 w-3" />{formatBytes(c.jsonSize)}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground/80 mt-0.5 truncate">{c.url}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => handleReattach(c.id)} title="Re-download files + copy markdown">
                    <Download className="h-3 w-3 mr-1.5" />
                    Re-attach
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleCopyMd(c.id)} title="Copy markdown summary">
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)} title="Delete capture">
                    <Trash2 className="h-3 w-3" />
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
