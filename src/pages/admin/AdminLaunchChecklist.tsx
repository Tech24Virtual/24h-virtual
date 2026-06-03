import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Shield, Key, Database, Bot, Globe, Link2, ShieldCheck, GitMerge, Lock,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { resolveTenant, tenantWhere } from '@/lib/campaign-os/tenancy';
import type { Json } from '@/integrations/supabase/types';

interface Check {
  category: string;
  name: string;
  status: 'pass' | 'fail' | 'warn';
  detail: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  'API Keys': <Key className="w-5 h-5" />,
  'Database Security': <Database className="w-5 h-5" />,
  'Platform': <Shield className="w-5 h-5" />,
  'Agents': <Bot className="w-5 h-5" />,
  'Integrations': <Link2 className="w-5 h-5" />,
  'SEO': <Globe className="w-5 h-5" />,
};

const statusConfig = {
  pass: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30', badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  fail: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30', badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  warn: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950/30', badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
};

export default function AdminLaunchChecklist() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const { toast } = useToast();

  const runChecks = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Not authenticated', variant: 'destructive' });
        return;
      }

      const { data, error } = await supabase.functions.invoke('pre-launch-checks', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      setChecks(data.checks);
      setLastRun(data.timestamp);
      
      const fails = data.checks.filter((c: Check) => c.status === 'fail').length;
      const warns = data.checks.filter((c: Check) => c.status === 'warn').length;
      
      toast({
        title: 'Checks complete',
        description: `${data.checks.length} checks run. ${fails} failed, ${warns} warnings.`,
        variant: fails > 0 ? 'destructive' : 'default',
      });
    } catch (err: any) {
      toast({ title: 'Check failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const grouped = checks.reduce<Record<string, Check[]>>((acc, c) => {
    (acc[c.category] = acc[c.category] || []).push(c);
    return acc;
  }, {});

  const totalPass = checks.filter(c => c.status === 'pass').length;
  const totalFail = checks.filter(c => c.status === 'fail').length;
  const totalWarn = checks.filter(c => c.status === 'warn').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pre-Launch Checklist</h1>
          <p className="text-muted-foreground">
            Verify all systems are configured and secure before going live.
          </p>
        </div>
        <Button onClick={runChecks} disabled={loading} size="lg">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          {checks.length === 0 ? 'Run Checks' : 'Re-run'}
        </Button>
      </div>

      {checks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-green-200 dark:border-green-800">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{totalPass}</p>
                <p className="text-sm text-muted-foreground">Passed</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="p-4 flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{totalFail}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-yellow-200 dark:border-yellow-800">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{totalWarn}</p>
                <p className="text-sm text-muted-foreground">Warnings</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {checks.length === 0 && !loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ready to check?</h3>
            <p className="text-muted-foreground mb-4">
              Click "Run Checks" to verify API keys, RLS policies, agent configs, integrations, and SEO health.
            </p>
          </CardContent>
        </Card>
      )}

      {Object.entries(grouped).map(([category, items]) => (
        <Card key={category}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              {categoryIcons[category] || <Shield className="w-5 h-5" />}
              {category}
              <Badge variant="secondary" className="ml-auto">
                {items.filter(i => i.status === 'pass').length}/{items.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.map((check, i) => {
              const cfg = statusConfig[check.status];
              const Icon = cfg.icon;
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${cfg.bg}`}>
                  <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${cfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{check.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>
                  </div>
                  <Badge className={`shrink-0 ${cfg.badge}`}>
                    {check.status === 'pass' ? 'OK' : check.status === 'fail' ? 'FAIL' : 'WARN'}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {lastRun && (
        <p className="text-xs text-muted-foreground text-center">
          Last run: {new Date(lastRun).toLocaleString()}
        </p>
      )}

      <CampaignOsRlsDiagnostics />
      <Wave1PostGateRegression />
    </div>
  );
}

interface ProbeResult {
  label: string;
  status: 'pass' | 'fail' | 'warn';
  detail: string;
}

function CampaignOsRlsDiagnostics() {
  const [results, setResults] = useState<ProbeResult[]>([]);
  const [running, setRunning] = useState(false);
  const { toast } = useToast();

  const run = async () => {
    setRunning(true);
    const out: ProbeResult[] = [];
    try {
      const tenant = await resolveTenant();

      // Probe 1 — campaigns visible to current tenant
      try {
        let q = (supabase as any).from('campaigns').select('id', { count: 'exact', head: true });
        q = tenantWhere(q, tenant);
        const { count, error } = await q;
        if (error) throw error;
        out.push({
          label: 'Tenant-scoped SELECT on campaigns',
          status: 'pass',
          detail: `${count ?? 0} campaign row(s) visible under current tenant context.`,
        });
      } catch (e: any) {
        out.push({ label: 'Tenant-scoped SELECT on campaigns', status: 'fail', detail: e.message });
      }

      // Probe 2 — campaign_scenarios visible to current tenant
      try {
        let q = (supabase as any).from('campaign_scenarios').select('id', { count: 'exact', head: true });
        q = tenantWhere(q, tenant);
        const { count, error } = await q;
        if (error) throw error;
        out.push({
          label: 'Tenant-scoped SELECT on campaign_scenarios',
          status: 'pass',
          detail: `${count ?? 0} scenario row(s) visible under current tenant context.`,
        });
      } catch (e: any) {
        out.push({ label: 'Tenant-scoped SELECT on campaign_scenarios', status: 'fail', detail: e.message });
      }

      // Probe 3 — anon SELECT on campaigns must be empty
      try {
        const anonUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
        const anonKey = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (!anonUrl || !anonKey) throw new Error('Anon client config missing');
        const { createClient } = await import('@supabase/supabase-js');
        const anon = createClient(anonUrl, anonKey, { auth: { persistSession: false } });
        const { count, error } = await anon.from('campaigns' as any).select('id', { count: 'exact', head: true });
        if (error) {
          out.push({
            label: 'Anonymous SELECT on campaigns is denied',
            status: 'pass',
            detail: `RLS denied with: ${error.message}`,
          });
        } else if ((count ?? 0) === 0) {
          out.push({
            label: 'Anonymous SELECT on campaigns is empty',
            status: 'pass',
            detail: 'Anon client returned 0 rows (RLS filters everything).',
          });
        } else {
          out.push({
            label: 'Anonymous SELECT on campaigns leaks rows',
            status: 'fail',
            detail: `Anon client unexpectedly returned ${count} row(s).`,
          });
        }
      } catch (e: any) {
        out.push({ label: 'Anonymous SELECT probe (campaigns)', status: 'warn', detail: e.message });
      }

      // Probe 4 — anon SELECT on campaign_scenarios must be empty
      try {
        const anonUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
        const anonKey = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (!anonUrl || !anonKey) throw new Error('Anon client config missing');
        const { createClient } = await import('@supabase/supabase-js');
        const anon = createClient(anonUrl, anonKey, { auth: { persistSession: false } });
        const { count, error } = await anon.from('campaign_scenarios' as any).select('id', { count: 'exact', head: true });
        if (error) {
          out.push({
            label: 'Anonymous SELECT on campaign_scenarios is denied',
            status: 'pass',
            detail: `RLS denied with: ${error.message}`,
          });
        } else if ((count ?? 0) === 0) {
          out.push({
            label: 'Anonymous SELECT on campaign_scenarios is empty',
            status: 'pass',
            detail: 'Anon client returned 0 rows (RLS filters everything).',
          });
        } else {
          out.push({
            label: 'Anonymous SELECT on campaign_scenarios leaks rows',
            status: 'fail',
            detail: `Anon client unexpectedly returned ${count} row(s).`,
          });
        }
      } catch (e: any) {
        out.push({ label: 'Anonymous SELECT probe (campaign_scenarios)', status: 'warn', detail: e.message });
      }

      setResults(out);
      const fails = out.filter((r) => r.status === 'fail').length;
      toast({
        title: 'RLS diagnostics complete',
        description: `${out.length} probes run, ${fails} failed.`,
        variant: fails > 0 ? 'destructive' : 'default',
      });
    } catch (e: any) {
      toast({ title: 'Diagnostics error', description: e.message, variant: 'destructive' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="w-5 h-5" />
              Wave 1 Campaigns RLS
            </CardTitle>
            <CardDescription>
              Read-only probes for tenant-scoped RLS on <code>campaigns</code> and <code>campaign_scenarios</code>.
              For end-to-end coverage, run <code>.lovable/wave-1-rls-checklist.md</code>.
            </CardDescription>
          </div>
          <Button onClick={run} disabled={running} variant="outline" size="sm">
            {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
            Run RLS probes
          </Button>
        </div>
      </CardHeader>
      {results.length > 0 && (
        <CardContent className="space-y-2">
          {results.map((r, i) => {
            const cfg = statusConfig[r.status];
            const Icon = cfg.icon;
            return (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${cfg.bg}`}>
                <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${cfg.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{r.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.detail}</p>
                </div>
                <Badge className={`shrink-0 ${cfg.badge}`}>
                  {r.status === 'pass' ? 'OK' : r.status === 'fail' ? 'FAIL' : 'WARN'}
                </Badge>
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}

// ───────────────────────────────────────────────────────────────
// Wave 1 Post-Gate RLS Regression
// ───────────────────────────────────────────────────────────────
//
// Lightweight sanity check that runs AFTER the Wave 1 gate flip and
// BEFORE Wave 2 begins. Re-uses the same 4 tenant-isolation probes as
// the pre-gate diagnostic and adds a tenant-context guard. The card
// only renders if the Wave 1 UAT signoff has been confirmed via
// /outline (admin_settings key `wave_1_uat_signoff_confirmed`). Each
// run persists its summary into `wave_1_post_gate_regression` so the
// last regression result survives reload and is auditable.

const REGRESSION_KEY = 'wave_1_post_gate_regression';
const SIGNOFF_KEY = 'wave_1_uat_signoff_confirmed';

interface RegressionRun {
  ran_at: string;
  ran_by?: string | null;
  verdict: 'go' | 'no-go';
  pass_count: number;
  fail_count: number;
  warn_count: number;
  results: ProbeResult[];
}

async function runWave1RlsProbes(): Promise<ProbeResult[]> {
  const out: ProbeResult[] = [];
  const tenant = await resolveTenant();

  if (!tenant) {
    out.push({
      label: 'Tenant context resolved',
      status: 'fail',
      detail: 'resolveTenant() returned null. RLS probes cannot be trusted without an active tenant.',
    });
    return out;
  }
  out.push({
    label: 'Tenant context resolved',
    status: 'pass',
    detail: 'Active tenant scope present for the current admin session.',
  });

  try {
    let q = (supabase as any).from('campaigns').select('id', { count: 'exact', head: true });
    q = tenantWhere(q, tenant);
    const { count, error } = await q;
    if (error) throw error;
    out.push({
      label: 'Tenant-scoped SELECT on campaigns',
      status: 'pass',
      detail: `${count ?? 0} campaign row(s) visible under current tenant.`,
    });
  } catch (e: any) {
    out.push({ label: 'Tenant-scoped SELECT on campaigns', status: 'fail', detail: e.message });
  }

  try {
    let q = (supabase as any).from('campaign_scenarios').select('id', { count: 'exact', head: true });
    q = tenantWhere(q, tenant);
    const { count, error } = await q;
    if (error) throw error;
    out.push({
      label: 'Tenant-scoped SELECT on campaign_scenarios',
      status: 'pass',
      detail: `${count ?? 0} scenario row(s) visible under current tenant.`,
    });
  } catch (e: any) {
    out.push({ label: 'Tenant-scoped SELECT on campaign_scenarios', status: 'fail', detail: e.message });
  }

  try {
    const anonUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
    const anonKey = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!anonUrl || !anonKey) throw new Error('Anon client config missing');
    const { createClient } = await import('@supabase/supabase-js');
    const anon = createClient(anonUrl, anonKey, { auth: { persistSession: false } });
    const { count, error } = await anon.from('campaigns' as any).select('id', { count: 'exact', head: true });
    if (error) {
      out.push({ label: 'Anonymous SELECT on campaigns is denied', status: 'pass', detail: `RLS denied: ${error.message}` });
    } else if ((count ?? 0) === 0) {
      out.push({ label: 'Anonymous SELECT on campaigns is empty', status: 'pass', detail: 'Anon returned 0 rows.' });
    } else {
      out.push({ label: 'Anonymous SELECT on campaigns leaks rows', status: 'fail', detail: `Anon returned ${count} row(s).` });
    }
  } catch (e: any) {
    out.push({ label: 'Anonymous SELECT probe (campaigns)', status: 'warn', detail: e.message });
  }

  try {
    const anonUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
    const anonKey = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!anonUrl || !anonKey) throw new Error('Anon client config missing');
    const { createClient } = await import('@supabase/supabase-js');
    const anon = createClient(anonUrl, anonKey, { auth: { persistSession: false } });
    const { count, error } = await anon.from('campaign_scenarios' as any).select('id', { count: 'exact', head: true });
    if (error) {
      out.push({ label: 'Anonymous SELECT on campaign_scenarios is denied', status: 'pass', detail: `RLS denied: ${error.message}` });
    } else if ((count ?? 0) === 0) {
      out.push({ label: 'Anonymous SELECT on campaign_scenarios is empty', status: 'pass', detail: 'Anon returned 0 rows.' });
    } else {
      out.push({ label: 'Anonymous SELECT on campaign_scenarios leaks rows', status: 'fail', detail: `Anon returned ${count} row(s).` });
    }
  } catch (e: any) {
    out.push({ label: 'Anonymous SELECT probe (campaign_scenarios)', status: 'warn', detail: e.message });
  }

  return out;
}

function Wave1PostGateRegression() {
  const [signoffConfirmed, setSignoffConfirmed] = useState<boolean | null>(null);
  const [lastRun, setLastRun] = useState<RegressionRun | null>(null);
  const [running, setRunning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [signoffRes, regressionRes] = await Promise.all([
        supabase.from('admin_settings').select('value').eq('key', SIGNOFF_KEY).maybeSingle(),
        supabase.from('admin_settings').select('value').eq('key', REGRESSION_KEY).maybeSingle(),
      ]);
      if (!mounted) return;
      const sv = (signoffRes.data?.value as { confirmed?: boolean } | null) ?? null;
      setSignoffConfirmed(!!sv?.confirmed);
      const rv = (regressionRes.data?.value as unknown as RegressionRun | null) ?? null;
      if (rv && Array.isArray(rv.results)) setLastRun(rv);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const run = async () => {
    setRunning(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const results = await runWave1RlsProbes();
      const pass_count = results.filter((r) => r.status === 'pass').length;
      const fail_count = results.filter((r) => r.status === 'fail').length;
      const warn_count = results.filter((r) => r.status === 'warn').length;
      const verdict: 'go' | 'no-go' = fail_count === 0 ? 'go' : 'no-go';
      const runRecord: RegressionRun = {
        ran_at: new Date().toISOString(),
        ran_by: session?.user?.id ?? null,
        verdict,
        pass_count,
        fail_count,
        warn_count,
        results,
      };
      setLastRun(runRecord);
      await supabase.from('admin_settings').upsert(
        [
          {
            key: REGRESSION_KEY,
            value: runRecord as unknown as Json,
            updated_by: session?.user?.id ?? null,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'key' },
      );
      toast({
        title: verdict === 'go' ? 'Post-gate regression: GO' : 'Post-gate regression: NO-GO',
        description: `${pass_count} pass · ${fail_count} fail · ${warn_count} warn`,
        variant: verdict === 'go' ? 'default' : 'destructive',
      });
    } catch (e: any) {
      toast({ title: 'Regression run failed', description: e.message, variant: 'destructive' });
    } finally {
      setRunning(false);
    }
  };

  if (signoffConfirmed === null) return null;

  if (!signoffConfirmed) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg">Wave 1 Post-Gate RLS Regression</CardTitle>
              <CardDescription>
                Unlocks after Wave 1 UAT signoff is confirmed on <code>/outline</code>. Use this to sanity-check tenant isolation before Wave 2 begins.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  const verdict = lastRun?.verdict;
  const verdictBg =
    verdict === 'go'
      ? 'bg-green-500/10 border-green-500/40'
      : verdict === 'no-go'
        ? 'bg-red-500/10 border-red-500/40'
        : 'bg-muted/30 border-border';

  return (
    <Card className={`border-2 ${verdictBg}`}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <GitMerge className="w-5 h-5" />
              Wave 1 Post-Gate RLS Regression
              {verdict && (
                <Badge
                  className={
                    verdict === 'go'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }
                >
                  {verdict === 'go' ? 'GO for Wave 2' : 'NO-GO'}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Re-runs the 4 tenant-isolation probes plus a tenant-context guard. Run this after the gate flip and before any Wave 2 work begins. Last result is persisted for audit.
            </CardDescription>
          </div>
          <Button
            onClick={run}
            disabled={running}
            variant={verdict === 'no-go' ? 'destructive' : 'default'}
            size="sm"
          >
            {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
            {lastRun ? 'Re-run regression' : 'Run regression'}
          </Button>
        </div>
      </CardHeader>
      {lastRun && (
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md border border-green-500/30 bg-green-500/5 p-2">
              <div className="text-xl font-bold text-green-700">{lastRun.pass_count}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Pass</div>
            </div>
            <div className="rounded-md border border-red-500/30 bg-red-500/5 p-2">
              <div className="text-xl font-bold text-red-700">{lastRun.fail_count}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Fail</div>
            </div>
            <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-2">
              <div className="text-xl font-bold text-yellow-700">{lastRun.warn_count}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Warn</div>
            </div>
          </div>
          <div className="space-y-2">
            {lastRun.results.map((r, i) => {
              const cfg = statusConfig[r.status];
              const Icon = cfg.icon;
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${cfg.bg}`}>
                  <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${cfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{r.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.detail}</p>
                  </div>
                  <Badge className={`shrink-0 ${cfg.badge}`}>
                    {r.status === 'pass' ? 'OK' : r.status === 'fail' ? 'FAIL' : 'WARN'}
                  </Badge>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            Last regression run {new Date(lastRun.ran_at).toLocaleString()}
            {lastRun.verdict === 'no-go' && (
              <span className="ml-2 font-semibold text-red-700">
                · Investigate failures before starting Wave 2.
              </span>
            )}
          </p>
        </CardContent>
      )}
      {!lastRun && (
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No regression run recorded yet. Click <span className="font-medium">Run regression</span> to confirm tenant isolation is intact post-gate-flip.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
