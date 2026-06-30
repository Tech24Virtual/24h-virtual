import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

interface Row {
  id: string;
  slug: string;
  page_title: string | null;
  publish_status: string;
  indexation_status: string;
  include_in_sitemap: boolean;
  updated_at: string;
}

export function SitemapControlsPanel() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const { data: rows = [], isLoading: loading } = useQuery<Row[]>({
    queryKey: ["disc-sitemap-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("disc_generated_pages")
        .select("id,slug,page_title,publish_status,indexation_status,include_in_sitemap,updated_at")
        .eq("publish_status", "published")
        .order("updated_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data as Row[]) ?? [];
    },
  });

  const stats = useMemo(() => ({
    total: rows.length,
    inSitemap: rows.filter((r) => r.include_in_sitemap).length,
    indexed: rows.filter((r) => r.indexation_status === "index").length,
  }), [rows]);

  async function toggle(id: string, field: "include_in_sitemap" | "indexation_status", value: any) {
    setBusy(id);
    const { error } = await supabase.from("disc_generated_pages").update({ [field]: value }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Updated");
    queryClient.invalidateQueries({ queryKey: ["disc-sitemap-pages"] });
    setBusy(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sitemap Controls</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Govern indexation and sitemap inclusion for every published discoverability page.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Published</p><p className="text-3xl font-semibold mt-1">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">In Sitemap</p><p className="text-3xl font-semibold mt-1">{stats.inSitemap}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Indexable</p><p className="text-3xl font-semibold mt-1">{stats.indexed}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Published Pages</CardTitle>
          <CardDescription>Toggle sitemap inclusion and indexation for each published discoverability page.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No published pages yet. Approve and publish pages from the Generated Pages tab.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left">Title</th>
                    <th className="px-3 py-2 text-left">Slug</th>
                    <th className="px-3 py-2 text-left">In Sitemap</th>
                    <th className="px-3 py-2 text-left">Indexable</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2">{r.page_title ?? "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.slug}</td>
                      <td className="px-3 py-2">
                        <Switch
                          checked={r.include_in_sitemap}
                          disabled={busy === r.id}
                          onCheckedChange={(v) => toggle(r.id, "include_in_sitemap", v)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Switch
                          checked={r.indexation_status === "index"}
                          disabled={busy === r.id}
                          onCheckedChange={(v) => toggle(r.id, "indexation_status", v ? "index" : "noindex")}
                        />
                        <Badge variant="outline" className="ml-2 text-xs">{r.indexation_status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
