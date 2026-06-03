import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fetchMissionEvents, type MissionEvent } from "@/lib/governance/missionControl";

const DOMAINS: MissionEvent["domain"][] = ["growth", "revenue", "delivery", "voice", "wl", "system"];

const SEVERITY_CLASS: Record<MissionEvent["severity"], string> = {
  warn: "bg-destructive/15 text-destructive border-destructive/30",
  notice: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  info: "bg-muted text-muted-foreground border-border",
};

export function MissionEventStream() {
  const [rows, setRows] = useState<MissionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [domain, setDomain] = useState<"all" | MissionEvent["domain"]>("all");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMissionEvents({ limit: 150 })
      .then((d) => { if (!cancelled) setRows(d); })
      .catch(() => { if (!cancelled) setRows([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(
    () => (domain === "all" ? rows : rows.filter((r) => r.domain === domain)),
    [rows, domain],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Lifecycle Event Stream</CardTitle>
        <Select value={domain} onValueChange={(v) => setDomain(v as any)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All domains</SelectItem>
            {DOMAINS.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No recent events</div>
        ) : (
          <ScrollArea className="h-[420px] pr-3">
            <div className="space-y-2">
              {filtered.map((e) => (
                <div key={`${e.source}-${e.id}`} className="flex items-start gap-3 rounded-lg border bg-card/50 p-2.5">
                  <Badge variant="outline" className={SEVERITY_CLASS[e.severity]}>{e.severity}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{e.event}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {e.domain} · {e.actor ?? "system"} {e.target ? `→ ${e.target}` : ""}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(e.occurred_at), { addSuffix: true })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
