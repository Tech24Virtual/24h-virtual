import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { format } from "date-fns";
import { AlertTriangle, Loader2, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AuditEntry {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  tenant_context: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const PAGE_SIZE = 50;

function actionBadgeVariant(action: string): "default" | "secondary" | "destructive" | "outline" {
  if (action.startsWith("role.")) return "destructive";
  if (action.includes(".deleted")) return "destructive";
  if (action.startsWith("impersonation.")) return "secondary";
  if (action.startsWith("billing.")) return "default";
  if (action.startsWith("wl_")) return "outline";
  return "default";
}

export default function AdminAuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState<AuditEntry | null>(null);

  const load = async (pageIndex: number) => {
    const from = pageIndex * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from("audit_log" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (actionFilter !== "all") {
      query = query.like("action", `${actionFilter}%`);
    }
    if (search.trim()) {
      const term = search.trim();
      query = query.or(
        `actor_email.ilike.%${term}%,action.ilike.%${term}%,target_id.ilike.%${term}%,target_table.ilike.%${term}%`
      );
    }

    const { data, error } = await query;
    if (error) {
      console.error(error);
      setEntries([]);
      setHasMore(false);
      setLoadError(error.message);
      return;
    }
    setLoadError(null);
    const rows = (data ?? []) as unknown as AuditEntry[];
    setEntries(rows);
    setHasMore(rows.length === PAGE_SIZE);
  };

  useEffect(() => {
    setLoading(true);
    load(0).finally(() => setLoading(false));
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter]);

  const handleSearch = async () => {
    setRefreshing(true);
    setPage(0);
    await load(0);
    setRefreshing(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await load(page);
    setRefreshing(false);
  };

  const goPage = async (next: number) => {
    if (next < 0) return;
    setRefreshing(true);
    await load(next);
    setPage(next);
    setRefreshing(false);
  };

  const actionPrefixes = useMemo(
    () => [
      { value: "all", label: "All actions" },
      { value: "role.", label: "Role changes" },
      { value: "impersonation.", label: "Impersonation" },
      { value: "wl_branding.", label: "WL Branding" },
      { value: "wl_domain_alias.", label: "WL Domains" },
      { value: "lead.", label: "Leads" },
      { value: "billing.", label: "Billing" },
    ],
    []
  );

  return (
    <>
      <Helmet>
        <title>Audit Log | Admin | 24H Virtual</title>
        <meta name="description" content="Sensitive-action audit trail for the 24H Virtual platform." />
      </Helmet>

      <div className="space-y-6 pb-24">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <ShieldCheck className="w-7 h-7 text-primary" />
                Audit Log
              </h1>
              <p className="text-muted-foreground mt-1">
                Immutable record of role changes, impersonation, branding edits, lead deletions and billing changes.
              </p>
            </div>
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {loadError && !loading && (
          <Card className="border-destructive/50">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-3" />
              <p className="font-medium">Failed to load audit log</p>
              <p className="text-sm text-muted-foreground mt-1">{loadError}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-[1fr_220px_auto]">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search actor email, action, target..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {actionPrefixes.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} disabled={refreshing}>
              Apply
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : entries.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                No audit entries match the current filters.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[170px]">When</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => (
                    <TableRow key={e.id} className="cursor-pointer" onClick={() => setSelected(e)}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(e.created_at), "MMM d, HH:mm:ss")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={actionBadgeVariant(e.action)} className="font-mono text-xs">
                          {e.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {e.actor_email ?? <span className="text-muted-foreground italic">system</span>}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground">
                        {e.target_table ? `${e.target_table}` : "—"}
                        {e.target_id ? <span className="ml-1 opacity-60">#{e.target_id.slice(0, 8)}</span> : null}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={(ev) => { ev.stopPropagation(); setSelected(e); }}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page + 1}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0 || refreshing} onClick={() => goPage(page - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={!hasMore || refreshing} onClick={() => goPage(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-mono text-base">{selected?.action}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">When</p>
                  <p>{format(new Date(selected.created_at), "PPpp")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Actor</p>
                  <p>{selected.actor_email ?? "system"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Target table</p>
                  <p className="font-mono">{selected.target_table ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Target id</p>
                  <p className="font-mono text-xs break-all">{selected.target_id ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">IP</p>
                  <p className="font-mono text-xs">{selected.ip_address ?? "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">User agent</p>
                  <p className="text-xs break-all">{selected.user_agent ?? "—"}</p>
                </div>
              </div>

              {selected.tenant_context && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tenant context</p>
                  <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto">
                    {JSON.stringify(selected.tenant_context, null, 2)}
                  </pre>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground mb-1">Metadata</p>
                <pre className="bg-muted rounded-md p-3 text-xs overflow-x-auto max-h-80">
                  {JSON.stringify(selected.metadata ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
