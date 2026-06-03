import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Beaker,
  AlertTriangle,
  ClipboardList,
  History,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGoLiveChecks } from '@/hooks/campaign-os/useGoLiveChecks';
import { useGoLiveSnapshot } from '@/hooks/campaign-os/useGoLiveSnapshot';

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

interface Props {
  campaignId: string;
}

function fmtAgo(at: string | null | undefined): string {
  if (!at) return 'never';
  try {
    return formatDistanceToNow(new Date(at), { addSuffix: true });
  } catch {
    return at;
  }
}

/**
 * Per-campaign Go-Live audit.
 *
 * Read-only summary of every readiness artifact that gates activation,
 * the persisted snapshot the regression-notifier compares against, plus
 * an admin-only sandbox self-test that proves the gating pipeline still
 * works end-to-end. Mirrors the data the supervisor / admin would need
 * to sign off on a launch without flipping between tabs.
 */
export function GoLiveAuditPanel({ campaignId }: Props) {
  const { isAdmin } = useAuth();
  const checksQ = useGoLiveChecks(campaignId);
  const snapshotQ = useGoLiveSnapshot(campaignId);

  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<SelfTestReport | null>(null);

  const checks = checksQ.data;
  const snapshot = snapshotQ.data;

  const artifacts = checks
    ? [
        {
          key: 'script',
          label: 'Script',
          requirement: 'At least one script document published',
          ok: checks.script_published,
          evidence: checks.script_published ? 'Published version live' : 'No published version',
        },
        {
          key: 'faqs',
          label: 'FAQs',
          requirement: 'At least one approved FAQ in scope',
          ok: checks.faqs_ok,
          evidence: `${checks.faqs_approved_count} approved`,
        },
        {
          key: 'policies',
          label: 'Policies',
          requirement: 'At least one approved policy block',
          ok: checks.policies_ok,
          evidence: `${checks.policies_approved_count} approved`,
        },
        {
          key: 'training',
          label: 'Training',
          requirement:
            checks.required_modules === 0
              ? 'No required modules — auto-passes'
              : `${checks.required_modules} required module(s) signed off`,
          ok: checks.training_ok,
          evidence:
            checks.required_modules === 0
              ? 'n/a'
              : `${checks.required_signoffs}/${checks.required_modules} signed off`,
        },
      ]
    : [];

  const passedCount = artifacts.filter((a) => a.ok).length;
  const totalCount = artifacts.length;

  const runSelfTest = async () => {
    setRunning(true);
    setReport(null);
    try {
      const { data, error } = await supabase.functions.invoke('test-campaign-go-live', {
        body: {},
      });
      if (error) throw error;
      const r = data as SelfTestReport;
      setReport(r);
      if (r.failed === 0) {
        toast.success(`Self-test passed (${r.passed}/${r.passed + r.failed} steps)`);
      } else {
        toast.error(`Self-test: ${r.failed} step(s) failed`);
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
    <div className="space-y-4">
      {/* Audit header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4" /> Go-Live audit
              </CardTitle>
              <CardDescription>
                Auditable summary of which readiness artifacts passed the gating checks for this
                campaign, plus the most recent self-test result.
              </CardDescription>
            </div>
            {checks && (
              <Badge
                variant={checks.all_ok ? 'default' : 'outline'}
                className={
                  checks.all_ok
                    ? 'bg-status-success-bg text-status-success border-status-success'
                    : 'border-status-warning text-status-warning'
                }
              >
                {checks.all_ok
                  ? `All ${totalCount} gates passed`
                  : `${passedCount}/${totalCount} gates passed`}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {checksQ.isLoading ? (
            <div className="py-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading audit…
            </div>
          ) : !checks ? (
            <div className="py-6 text-sm text-muted-foreground text-center">
              No audit data available for this campaign.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Artifact</TableHead>
                  <TableHead>Gating requirement</TableHead>
                  <TableHead className="w-[180px]">Evidence</TableHead>
                  <TableHead className="w-[110px] text-right">Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {artifacts.map((a) => (
                  <TableRow key={a.key}>
                    <TableCell className="font-medium">{a.label}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {a.requirement}
                    </TableCell>
                    <TableCell className="text-sm">{a.evidence}</TableCell>
                    <TableCell className="text-right">
                      {a.ok ? (
                        <Badge className="bg-status-success-bg text-status-success border-status-success gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Pass
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-status-warning text-status-warning gap-1"
                        >
                          <XCircle className="h-3 w-3" /> Fail
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Persisted snapshot — what the regression notifier last saw */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" /> Last evaluated snapshot
          </CardTitle>
          <CardDescription>
            The persisted readiness state used by the was-green-now-red regression notifier.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {snapshotQ.isLoading ? (
            <div className="py-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading snapshot…
            </div>
          ) : !snapshot ? (
            <div className="py-4 text-sm text-muted-foreground text-center">
              No snapshot recorded yet — the next gate change will create one.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                Evaluated {fmtAgo(snapshot.last_evaluated_at)} ·{' '}
                <span className="font-mono">
                  {new Date(snapshot.last_evaluated_at).toLocaleString()}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <SnapshotPill label="Script" ok={snapshot.script_published} />
                <SnapshotPill label="FAQs" ok={snapshot.faqs_ok} />
                <SnapshotPill label="Policies" ok={snapshot.policies_ok} />
                <SnapshotPill label="Training" ok={snapshot.training_ok} />
                <SnapshotPill label="All OK" ok={snapshot.all_ok} emphasised />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Self-test runner — admin only */}
      {isAdmin && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
            <div className="min-w-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Beaker className="h-4 w-4" /> Pipeline self-test
              </CardTitle>
              <CardDescription>
                Spins up a sandbox campaign, walks every readiness gate, and verifies the
                activation trigger. Rolls back when done. Result below is for the gating
                pipeline overall, not for this specific campaign.
              </CardDescription>
            </div>
            <Button onClick={runSelfTest} disabled={running} size="sm">
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Running…
                </>
              ) : (
                'Run self-test'
              )}
            </Button>
          </CardHeader>
          {report && (
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                {report.failed === 0 ? (
                  <Badge className="bg-status-success-bg text-status-success border-status-success gap-1">
                    <CheckCircle2 className="h-3 w-3" /> All passed
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-status-warning text-status-warning gap-1"
                  >
                    <AlertTriangle className="h-3 w-3" /> {report.failed} failure(s)
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {report.passed} passed · {report.failed} failed · ran{' '}
                  {new Date(report.ran_at).toLocaleTimeString()}
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
                      {s.detail && (
                        <div className="text-xs text-muted-foreground">{s.detail}</div>
                      )}
                      {s.error && <div className="text-xs text-destructive">{s.error}</div>}
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}

function SnapshotPill({
  label,
  ok,
  emphasised = false,
}: {
  label: string;
  ok: boolean;
  emphasised?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md border p-2 text-sm ${
        ok ? 'bg-status-success-bg/40' : 'bg-status-warning-bg/40'
      } ${emphasised ? 'font-semibold' : ''}`}
    >
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-status-success shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-status-warning shrink-0" />
      )}
      <span className="truncate">{label}</span>
    </div>
  );
}
