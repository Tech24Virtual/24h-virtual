import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, Beaker, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SelfTestStep {
  name: string;
  passed: boolean;
  detail?: string | null;
  error?: string | null;
}

interface SelfTestReport {
  passed: number;
  failed: number;
  steps: SelfTestStep[];
  ran_at: string;
}

export function GoLiveSelfTestPanel() {
  const { isAdmin } = useAuth();
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<SelfTestReport | null>(null);

  if (!isAdmin) return null;

  const run = async () => {
    setRunning(true);
    setReport(null);
    try {
      const { data, error } = await supabase.functions.invoke('test-campaign-go-live', {
        body: {},
      });
      if (error) throw error;
      setReport(data as SelfTestReport);
      const r = data as SelfTestReport;
      if (r.failed === 0) {
        toast.success(`Go-Live self-test passed (${r.passed}/${r.passed + r.failed})`);
      } else {
        toast.error(`Go-Live self-test: ${r.failed} step(s) failed`);
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'Self-test failed to run');
      setReport({
        passed: 0,
        failed: 1,
        ran_at: new Date().toISOString(),
        steps: [{ name: 'invoke', passed: false, error: e?.message ?? 'unknown error' }],
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Beaker className="h-4 w-4" /> Go-Live Self-Test
          </CardTitle>
          <CardDescription>
            Spins up a sandbox campaign, walks every readiness gate, and verifies the
            activation trigger + audit log. Rolls back when done. Admin only.
          </CardDescription>
        </div>
        <Button onClick={run} disabled={running}>
          {running ? (
            <>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Running…
            </>
          ) : (
            'Run Go-Live Self-Test'
          )}
        </Button>
      </CardHeader>
      {report && (
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            {report.failed === 0 ? (
              <Badge className="bg-status-success-bg text-status-success border-status-success">
                <CheckCircle2 className="h-3 w-3 mr-1" /> All passed
              </Badge>
            ) : (
              <Badge variant="outline" className="border-status-warning text-status-warning">
                <AlertTriangle className="h-3 w-3 mr-1" /> {report.failed} failure(s)
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {report.passed} passed · {report.failed} failed · ran {new Date(report.ran_at).toLocaleTimeString()}
            </span>
          </div>
          <ol className="space-y-1.5">
            {report.steps.map((s, i) => (
              <li
                key={i}
                className={`flex items-start gap-2 rounded-md border p-2 text-sm ${
                  s.passed ? 'bg-status-success-bg/40' : 'bg-status-warning-bg/40'
                }`}
              >
                {s.passed ? (
                  <CheckCircle2 className="h-4 w-4 text-status-success mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-status-warning mt-0.5 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="font-medium">{s.name}</div>
                  {s.detail && <div className="text-xs text-muted-foreground">{s.detail}</div>}
                  {s.error && <div className="text-xs text-destructive">{s.error}</div>}
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      )}
    </Card>
  );
}
