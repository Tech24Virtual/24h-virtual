import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldAlert, ShieldCheck, RefreshCw } from "lucide-react";

interface Finding {
  partner_id: string;
  partner_name: string;
  surface: string;
  match: string;
  preview: string;
}

interface ScanResult {
  scanned_partners: number;
  scanned_templates: number;
  total_findings: number;
  findings: Finding[];
  by_partner: Record<string, { partner_name: string; findings: Finding[] }>;
  generated_at: string;
}

export default function AdminWLLeakAudit() {
  const { toast } = useToast();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  const runScan = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("wl-leak-audit");
      if (error) throw error;
      setResult(data as ScanResult);
      toast({
        title: "Scan complete",
        description: `${(data as ScanResult).total_findings} potential brand leaks found.`,
      });
    } catch (err: any) {
      toast({
        title: "Scan failed",
        description: err?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  const partnerEntries = result
    ? Object.entries(result.by_partner).sort(
        (a, b) => b[1].findings.length - a[1].findings.length
      )
    : [];

  return (
    <div className="space-y-6 max-w-6xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ShieldAlert className="w-7 h-7 text-primary" />
              WL Brand Leak Audit
            </h1>
            <p className="text-muted-foreground mt-1">
              Scans every partner's branding fields and rendered email templates for
              accidental references to <span className="font-mono">24H Virtual</span>,{" "}
              <span className="font-mono">24hvirtual.com</span>, or{" "}
              <span className="font-mono">24hv.io</span>.
            </p>
          </div>
          <Button onClick={runScan} disabled={running} size="lg">
            {running ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Scanning…
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" /> Run scan
              </>
            )}
          </Button>
        </div>

        {!result && !running && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Click <span className="font-medium">Run scan</span> to check every partner's
              branding and emails for brand leaks.
            </CardContent>
          </Card>
        )}

        {result && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Partners scanned</CardDescription>
                  <CardTitle className="text-3xl">{result.scanned_partners}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Templates per partner</CardDescription>
                  <CardTitle className="text-3xl">{result.scanned_templates}</CardTitle>
                </CardHeader>
              </Card>
              <Card
                className={
                  result.total_findings === 0
                    ? "border-primary/40"
                    : "border-destructive/40"
                }
              >
                <CardHeader className="pb-2">
                  <CardDescription>Findings</CardDescription>
                  <CardTitle
                    className={`text-3xl flex items-center gap-2 ${
                      result.total_findings === 0 ? "text-primary" : "text-destructive"
                    }`}
                  >
                    {result.total_findings === 0 ? (
                      <ShieldCheck className="w-7 h-7" />
                    ) : (
                      <ShieldAlert className="w-7 h-7" />
                    )}
                    {result.total_findings}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {result.total_findings === 0 ? (
              <Card className="border-primary/40 bg-primary/5">
                <CardContent className="py-8 text-center">
                  <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-3" />
                  <p className="text-lg font-medium">All clear</p>
                  <p className="text-muted-foreground text-sm">
                    No 24H branding leaked into any partner-facing surface.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {partnerEntries.map(([partnerId, entry]) => (
                  <Card key={partnerId}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{entry.partner_name}</CardTitle>
                        <Badge variant="destructive">
                          {entry.findings.length} leak
                          {entry.findings.length === 1 ? "" : "s"}
                        </Badge>
                      </div>
                      <CardDescription className="font-mono text-xs">
                        {partnerId}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="max-h-[280px]">
                        <div className="space-y-2">
                          {entry.findings.map((f, i) => (
                            <div
                              key={i}
                              className="rounded-md border border-border p-3 text-sm"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="font-mono text-xs">
                                  {f.surface}
                                </Badge>
                                <Badge variant="destructive" className="text-xs">
                                  {f.match}
                                </Badge>
                              </div>
                              <p className="text-muted-foreground font-mono text-xs whitespace-pre-wrap break-all">
                                {f.preview}
                              </p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Scanned at {new Date(result.generated_at).toLocaleString()}
            </p>
          </>
        )}
      </div>
    
  );
}
