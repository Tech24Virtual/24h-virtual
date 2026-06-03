import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, AlertTriangle, Loader2 } from "lucide-react";
import { fetchBlastRadius, type BlastRadiusItem } from "@/lib/governance/missionControl";

export function BlastRadiusPanel() {
  const [items, setItems] = useState<BlastRadiusItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchBlastRadius()
      .then((d) => { if (!cancelled) setItems(d); })
      .catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Risk / Blast Radius
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items === null ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No outstanding risks detected.</div>
        ) : (
          <div className="space-y-2">
            {items.map((it) => (
              <div key={it.kind} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium flex items-center gap-2">
                    {it.label}
                    <Badge variant="outline">{it.count}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{it.detail}</div>
                </div>
                <Button asChild size="sm" variant="ghost">
                  <Link to={it.drillRoute}>Open <ArrowRight className="h-3 w-3 ml-1" /></Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
