/**
 * CaptureForChatButton
 * --------------------
 * One-click capture: takes a screenshot of the current page (html2canvas),
 * snapshots the active QA report (console errors / network failures / route
 * changes / window errors), and bundles them for the user to attach to the
 * Lovable chat.
 *
 * Output:
 *  - PNG screenshot saved to /mnt/documents-style download (lovable-capture-<ts>.png)
 *  - JSON diagnostics download (lovable-capture-<ts>.json)
 *  - Markdown summary copied to clipboard, ready to paste into chat
 *
 * Visible only while a Product Testing segment is active (?testSegment=...).
 */
import { useState } from "react";
import html2canvas from "html2canvas";
import { Camera, Loader2, Check, PencilRuler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProductTesting } from "@/contexts/ProductTestingContext";
import { getActiveReport, getAllReports, type QAReport } from "@/lib/productTesting/qaRecorder";
import { getRecentNetworkRequests } from "@/lib/productTesting/networkLog";
import { redactDeep, redactString, redactDomTextNodes } from "@/lib/productTesting/redact";
import { saveCapture } from "@/lib/productTesting/qaCaptures";
import { ScreenshotAnnotator } from "@/components/testing/ScreenshotAnnotator";
import { analyzeCapture, renderAnalysisMarkdown } from "@/lib/productTesting/qaAnalyzer";
import { toast } from "sonner";

const ANNOTATE_KEY = "lovable:capture:annotate";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function buildMarkdown(report: QAReport | null, screenshotName: string, jsonName: string): string {
  const lines: string[] = [];
  lines.push("**Lovable QA capture**");
  if (report) {
    lines.push(`- Segment: \`${report.segmentLabel}\` (${report.segmentId})`);
    lines.push(`- Route: \`${location.pathname}${location.search}\``);
    lines.push(
      `- Counts: ${report.counts.consoleErrors} errors, ${report.counts.consoleWarnings} warnings, ` +
        `${report.counts.networkFailures} network failures, ${report.counts.windowErrors} window errors, ` +
        `${report.counts.rejections} rejections, ${report.counts.routeChanges} route changes`
    );
  } else {
    lines.push(`- Route: \`${location.pathname}${location.search}\``);
  }
  lines.push(`- Attached: \`${screenshotName}\`, \`${jsonName}\``);

  const recentErrors = (report?.events ?? [])
    .filter((e) => e.kind === "console" && e.level === "error")
    .slice(-5);
  if (recentErrors.length) {
    lines.push("", "Recent console errors:");
    recentErrors.forEach((e) => lines.push(`- ${e.message?.slice(0, 240) ?? ""}`));
  }
  const recentNet = (report?.events ?? [])
    .filter((e) => e.kind === "network" && (e.status === undefined || e.status >= 400))
    .slice(-5);
  if (recentNet.length) {
    lines.push("", "Recent network failures:");
    recentNet.forEach((e) =>
      lines.push(`- ${e.method ?? "GET"} ${e.status ?? "ERR"} ${e.url ?? ""}`)
    );
  }

  lines.push("", "Please diagnose and propose a fix.");
  return lines.join("\n");
}

function buildMarkdownWithAnalysis(
  report: QAReport | null,
  net: import("@/lib/productTesting/networkLog").NetworkLogEntry[],
  screenshotName: string,
  jsonName: string,
): string {
  const base = buildMarkdown(report, screenshotName, jsonName);
  const analysis = renderAnalysisMarkdown(analyzeCapture(report, net));
  return analysis ? `${base}\n${analysis}` : base;
}

export function CaptureForChatButton() {
  const { active } = useProductTesting();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [annotate, setAnnotate] = useState<boolean>(() => {
    try { return localStorage.getItem(ANNOTATE_KEY) !== "0"; } catch { return true; }
  });
  // Pending capture state held while the annotator dialog is open.
  const [pending, setPending] = useState<null | {
    rawPng: Blob;
    screenshotName: string;
    jsonName: string;
    activeReport: QAReport | null;
    jsonText: string;
    md: string;
  }>(null);

  if (!active) return null;

  function toggleAnnotate(next: boolean) {
    setAnnotate(next);
    try { localStorage.setItem(ANNOTATE_KEY, next ? "1" : "0"); } catch { /* ignore */ }
  }

  async function finalize(pngBlob: Blob, ctx: NonNullable<typeof pending>) {
    downloadBlob(pngBlob, ctx.screenshotName);
    downloadBlob(new Blob([ctx.jsonText], { type: "application/json" }), ctx.jsonName);
    try {
      await navigator.clipboard.writeText(ctx.md);
      toast.success("Capture ready", {
        description: "Saved to history. Files downloaded, summary copied to clipboard.",
      });
    } catch {
      toast.success("Capture downloaded", {
        description: "Saved to history. Attach the PNG and JSON to your chat message.",
      });
    }
    const issueCount = ctx.activeReport
      ? ctx.activeReport.counts.consoleErrors +
        ctx.activeReport.counts.windowErrors +
        ctx.activeReport.counts.rejections +
        ctx.activeReport.counts.networkFailures
      : 0;
    try {
      await saveCapture({
        id: `cap-${Date.now()}`,
        createdAt: new Date().toISOString(),
        segmentId: active?.segment.id ?? null,
        segmentLabel: active?.segment.label ?? null,
        url: location.href,
        pngName: ctx.screenshotName,
        jsonName: ctx.jsonName,
        pngSize: pngBlob.size,
        jsonSize: ctx.jsonText.length,
        issueCount,
        png: pngBlob,
        jsonText: ctx.jsonText,
        markdown: ctx.md,
      });
    } catch (e) {
      console.warn("Failed to save capture to history", e);
    }
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  }

  async function capture() {
    if (busy) return;
    setBusy(true);
    setDone(false);
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const screenshotName = `lovable-capture-${ts}.png`;
      const jsonName = `lovable-capture-${ts}.json`;

      // Screenshot — DOM redacted during render, restored after.
      const restoreDom = redactDomTextNodes(document.body);
      let canvas: HTMLCanvasElement;
      try {
        canvas = await html2canvas(document.body, {
          backgroundColor: null,
          scale: Math.min(window.devicePixelRatio || 1, 2),
          useCORS: true,
          logging: false,
          ignoreElements: (el) => el.hasAttribute("data-capture-ignore"),
        });
      } finally {
        restoreDom();
      }
      const pngBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/png");
      });
      if (!pngBlob) throw new Error("Failed to render screenshot");

      // Diagnostics JSON (deep-redacted)
      const activeReport = getActiveReport();
      const rawPayload = {
        capturedAt: new Date().toISOString(),
        url: location.href,
        userAgent: navigator.userAgent,
        viewport: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio },
        segment: active,
        activeReport,
        allReports: getAllReports(),
        recentNetwork: getRecentNetworkRequests(),
      };
      const jsonText = JSON.stringify(redactDeep(rawPayload), null, 2);
      const recentNet = getRecentNetworkRequests();
      const md = redactString(buildMarkdownWithAnalysis(activeReport, recentNet, screenshotName, jsonName));

      const ctx = { rawPng: pngBlob, screenshotName, jsonName, activeReport, jsonText, md };
      if (annotate) {
        setPending(ctx);
      } else {
        await finalize(pngBlob, ctx);
      }
    } catch (err) {
      toast.error("Capture failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div data-capture-ignore className="fixed bottom-4 right-4 z-[60] flex items-center gap-2">
        <button
          type="button"
          onClick={() => toggleAnnotate(!annotate)}
          className={`rounded-md border px-2 py-1 text-xs shadow-sm transition ${
            annotate ? "bg-primary/10 border-primary/40 text-primary" : "bg-background border-border text-muted-foreground"
          }`}
          title="Toggle annotation step before download"
        >
          <PencilRuler className="inline h-3 w-3 mr-1" />
          Annotate {annotate ? "on" : "off"}
        </button>
        <Button onClick={capture} disabled={busy} size="sm" className="shadow-lg gap-2">
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : done ? (
            <Check className="h-4 w-4" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          {busy ? "Capturing…" : done ? "Ready to paste" : "Capture for chat"}
        </Button>
      </div>

      <ScreenshotAnnotator
        open={!!pending}
        source={pending?.rawPng ?? null}
        onCancel={() => setPending(null)}
        onConfirm={async (annotatedPng) => {
          if (!pending) return;
          const ctx = pending;
          setPending(null);
          await finalize(annotatedPng, ctx);
        }}
      />
    </>
  );
}
