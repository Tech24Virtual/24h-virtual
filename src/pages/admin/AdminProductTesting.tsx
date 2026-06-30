import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, FlaskConical, Trash2, ExternalLink, KeyRound } from 'lucide-react';
import { buildHandoffUrl } from '@/lib/productTesting/qaSessionHandoff';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  PRODUCT_TESTING_SEGMENTS,
  SEGMENT_CATEGORY_LABELS,
  SEGMENT_STATUS_LABELS,
  type SegmentCategory,
  type SegmentStatus,
} from '@/config/productTestingSegments';
import { SegmentCard } from '@/components/testing/SegmentCard';
import { getRecentLaunches, clearTraceLog, type TraceEntry } from '@/lib/productTesting/traceLog';
import { toast } from 'sonner';
import { QAReportsPanel } from '@/components/testing/QAReportsPanel';
import { QACapturesPanel } from '@/components/testing/QACapturesPanel';
import QAReadinessPanel from '@/components/admin/intelligence/QAReadinessPanel';

const CATEGORY_ORDER: SegmentCategory[] = ['dashboard', 'onboarding', 'product', 'diagnostic'];

const ROLE_OPTIONS = [
  'all', 'public', 'admin', 'client', 'agent', 'supervisor',
  'sales', 'billing', 'tech', 'hr', 'white_label', 'wl_client', 'affiliate',
];

const STATUS_OPTIONS: Array<SegmentStatus | 'all'> = [
  'all', 'production', 'sandbox', 'partial', 'placeholder', 'requires-context',
];

export default function AdminProductTesting() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<SegmentCategory | 'all'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<SegmentStatus | 'all'>('all');
  const [recent, setRecent] = useState<TraceEntry[]>([]);

  useEffect(() => {
    setRecent(getRecentLaunches());
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return PRODUCT_TESTING_SEGMENTS.filter((s) => {
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
      if (roleFilter !== 'all' && s.role !== roleFilter) return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (q) {
        const hay = `${s.label} ${s.description} ${s.id} ${s.productArea} ${s.route}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [search, categoryFilter, roleFilter, statusFilter]);

  const grouped = useMemo(() => {
    const out: Record<SegmentCategory, typeof filtered> = {
      dashboard: [], onboarding: [], product: [], diagnostic: [],
    };
    filtered.forEach((s) => out[s.category].push(s));
    return out;
  }, [filtered]);

  const totalSegments = PRODUCT_TESTING_SEGMENTS.length;
  const productionCount = PRODUCT_TESTING_SEGMENTS.filter((s) => s.status === 'production').length;
  const blockedCount = PRODUCT_TESTING_SEGMENTS.filter((s) => s.status === 'requires-context').length;

  const handleClearRecent = () => {
    clearTraceLog();
    setRecent([]);
    toast.success('Trace log cleared');
  };

  const handleCopyHandoff = async () => {
    const url = await buildHandoffUrl('/admin/settings/product-testing');
    if (!url) {
      toast.error('No active session', { description: 'Sign in first.' });
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('QA handoff link copied', {
        description: 'Paste into another browser, private window, or headless QA. Expires in 10 minutes. Treat like a password.',
      });
    } catch {
      // Fallback: show in a prompt so user can copy manually.
      window.prompt('Copy this QA handoff URL (expires in 10 min):', url);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FlaskConical className="h-6 w-6 text-primary" />
              <h1 className="text-2xl lg:text-3xl font-bold">Product Testing</h1>
              <Badge variant="outline" className="ml-2">Superadmin</Badge>
            </div>
            <p className="text-muted-foreground">
              Segmented QA launcher for every major surface of the platform. Each segment opens its real
              route with <code className="px-1 bg-muted rounded text-xs">?testSegment=&lt;id&gt;</code> and
              overlays a trace banner so you can isolate, reproduce, and inspect issues per area. Uses your
              current identity, no impersonation or role spoofing.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleCopyHandoff} className="shrink-0">
            <KeyRound className="h-4 w-4 mr-2" />
            Copy QA Handoff Link
          </Button>
        </div>
      </div>
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 text-xs text-muted-foreground">
          <strong className="text-foreground">QA Handoff Link:</strong> generates a one-time URL that
          carries your live login (access + refresh token in the URL hash, never sent to the server).
          Open it in a private window, another device, or a headless QA browser to inherit your session
          without re-typing credentials. Expires in 10 minutes. Treat the link like a password.
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold">{totalSegments}</div>
          <div className="text-xs text-muted-foreground">Total segments</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-emerald-600">{productionCount}</div>
          <div className="text-xs text-muted-foreground">Production-backed</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-orange-600">{blockedCount}</div>
          <div className="text-xs text-muted-foreground">Need seeded context</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold">{recent.length}</div>
          <div className="text-xs text-muted-foreground">Recent launches</div>
        </CardContent></Card>
      </div>

      {/* Diagnostics note */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4 text-sm">
          <strong className="text-amber-700 dark:text-amber-400">Sandbox notes:</strong>{' '}
          Some segments (WL end-client portal, Five9 runtime, WL preview, Script Builder) need seeded
          context (campaign id, partner slug, partner UUID). They are shown with a "Requires Context"
          badge and disabled launch button. Open those by pasting a real id/slug into the URL after
          launching the parent segment.
        </CardContent>
      </Card>

      {/* Recently launched */}
      {recent.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recently Launched</CardTitle>
              <CardDescription>Last {recent.length} segments opened from this device.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClearRecent}>
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {recent.map((entry) => {
                const hasIssue = entry.missingContext.length > 0 || entry.redirectedFrom;
                return (
                  <Link
                    key={`${entry.segmentId}-${entry.launchedAt}`}
                    to={`${entry.route.split('?')[0]}?testSegment=${entry.segmentId}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border hover:bg-accent text-xs transition-colors"
                  >
                    <span className="font-medium">{entry.label}</span>
                    {hasIssue && (
                      <Badge variant="outline" className="text-[9px] py-0 h-4 bg-amber-500/15 text-amber-600 border-amber-500/30">
                        issue
                      </Badge>
                    )}
                    <span className="text-muted-foreground">{entry.loadDurationMs}ms</span>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* QA Reports */}
      <QAReportsPanel />

      {/* Capture history */}
      <QACapturesPanel />

      {/* QA Readiness & Test Harness — canonical home (relocated from /admin/intelligence) */}
      <section id="qa-readiness">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-semibold">QA Readiness & Test Harness</h2>
          <Badge variant="outline">Admin · Staging</Badge>
        </div>
        <QAReadinessPanel />
      </section>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search segments by name, description, or route..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as SegmentCategory | 'all')}>
            <SelectTrigger className="w-full md:w-44"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORY_ORDER.map((c) => (
                <SelectItem key={c} value={c}>{SEGMENT_CATEGORY_LABELS[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r} value={r}>{r === 'all' ? 'All roles' : r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as SegmentStatus | 'all')}>
            <SelectTrigger className="w-full md:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === 'all' ? 'All statuses' : SEGMENT_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Grouped grid */}
      {CATEGORY_ORDER.map((cat) => {
        const items = grouped[cat];
        if (items.length === 0) return null;
        return (
          <section key={cat}>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-lg font-semibold">{SEGMENT_CATEGORY_LABELS[cat]}</h2>
              <Badge variant="secondary">{items.length}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {items.map((s) => (
                <SegmentCard key={s.id} segment={s} />
              ))}
            </div>
          </section>
        );
      })}

      {filtered.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            No segments match these filters.
          </CardContent>
        </Card>
      )}

      <Card className="bg-muted/30">
        <CardContent className="p-4 text-xs text-muted-foreground">
          <strong>How it works:</strong> Click <em>Open Segment</em> to navigate to the real route with
          a <code className="px-1 bg-muted rounded">?testSegment=&lt;id&gt;</code> flag. A trace banner
          appears at the top of the page showing route, role mismatch, elapsed ms, and missing context.
          Each launch is recorded to localStorage (capped at 50 entries). Click <ExternalLink className="h-3 w-3 inline" /> to
          open in a new tab. Click the link icon to copy a shareable deep link.
        </CardContent>
      </Card>
    </div>
  );
}
