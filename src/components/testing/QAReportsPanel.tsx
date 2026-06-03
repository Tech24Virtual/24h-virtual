import { useEffect, useState } from 'react';
import { Download, Trash2, FileJson, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  getAllReports, getActiveReport, clearReports, deleteReport,
  downloadReports, subscribe, type QAReport,
} from '@/lib/productTesting/qaRecorder';
import { useToast } from '@/hooks/use-toast';

function formatDuration(start: string, end?: string) {
  const ms = (end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 1000 / 60)}m`;
}

function totalIssues(r: QAReport) {
  return r.counts.consoleErrors + r.counts.windowErrors + r.counts.rejections + r.counts.networkFailures;
}

export function QAReportsPanel() {
  const { toast } = useToast();
  const [reports, setReports] = useState<QAReport[]>([]);
  const [active, setActive] = useState<QAReport | null>(null);

  useEffect(() => {
    const sync = () => {
      setReports(getAllReports());
      setActive(getActiveReport());
    };
    sync();
    const unsub = subscribe(sync);
    // Re-sync periodically while a segment is active so live counts tick.
    const i = setInterval(sync, 2000);
    return () => { unsub(); clearInterval(i); };
  }, []);

  const handleExportAll = () => {
    if (reports.length === 0) {
      toast({ title: 'No reports yet', description: 'Open a segment first.' });
      return;
    }
    downloadReports(reports, `qa-reports-${new Date().toISOString().slice(0, 19)}.json`);
  };

  const handleExportOne = (r: QAReport) => {
    downloadReports([r], `qa-${r.segmentId}-${r.startedAt.slice(0, 19)}.json`);
  };

  const handleClear = () => {
    if (!confirm('Clear all QA reports? This cannot be undone.')) return;
    clearReports();
    setReports([]);
    toast({ title: 'QA reports cleared' });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <FileJson className="h-4 w-4" />
            QA Reports
            {active && (
              <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 border-emerald-500/40 text-[10px]">
                Recording: {active.segmentLabel}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Per-segment capture of console errors, network failures, and route changes.
            Open a segment to start recording. Export as JSON for triage.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleExportAll}>
            <Download className="h-3 w-3 mr-1.5" />
            Export All
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <Trash2 className="h-3 w-3 mr-1.5" />
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6">
            No QA reports yet. Click <em>Open Segment</em> on any segment above to begin recording.
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map((r) => {
              const isActive = active?.id === r.id;
              const issues = totalIssues(r);
              return (
                <div
                  key={r.id}
                  className={`flex items-center justify-between gap-3 rounded-lg border p-3 text-sm ${
                    isActive ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{r.segmentLabel}</span>
                      <Badge variant="outline" className="text-[10px]">{r.category}</Badge>
                      {isActive && (
                        <Badge className="text-[10px] bg-emerald-600">Live</Badge>
                      )}
                      {issues > 0 && (
                        <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-700 border-red-500/40">
                          <AlertCircle className="h-2.5 w-2.5 mr-1" />
                          {issues} issues
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>{new Date(r.startedAt).toLocaleString()}</span>
                      <span>· {formatDuration(r.startedAt, r.endedAt)}</span>
                      <span>· errors: {r.counts.consoleErrors}</span>
                      <span>· warnings: {r.counts.consoleWarnings}</span>
                      <span>· net failures: {r.counts.networkFailures}</span>
                      <span>· rejections: {r.counts.rejections}</span>
                      <span>· route changes: {r.counts.routeChanges}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground/80 mt-0.5 truncate">
                      {r.initialRoute}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExportOne(r)}
                      title="Export this report as JSON"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        deleteReport(r.id);
                        setReports(getAllReports());
                      }}
                      title="Delete report"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
