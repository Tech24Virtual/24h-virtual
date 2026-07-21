import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { GenerateBatchDialog } from "./GenerateBatchDialog";
import { GeneratedPageEditor } from "./GeneratedPageEditor";

interface Row {
  id: string;
  page_title: string | null;
  page_type: string;
  slug: string;
  quality_score: number;
  readiness_state: string;
  publish_status: string;
  include_in_sitemap: boolean;
  word_count: number;
  updated_at: string;
  location_id: string | null;
  keyword_id: string | null;
  audience_id: string | null;
  template_id: string | null;
}

interface Filters {
  country: "all" | "United States" | "Canada";
  readiness: string;
  publish: string;
  search: string;
  qualityMin: string;
}

export interface GeneratedPagesTableProps {
  initialFilter?: Partial<Filters>;
  emptyMessage?: string;
  showBatchButton?: boolean;
}

export function GeneratedPagesTable({ initialFilter, emptyMessage, showBatchButton = true }: GeneratedPagesTableProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchOpen, setBatchOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [refsMap, setRefsMap] = useState<{
    locations: Record<string, { city: string; country: string; state_or_province_abbr: string | null }>;
    keywords: Record<string, { keyword: string }>;
    audiences: Record<string, { audience_name: string }>;
    templates: Record<string, { name: string; page_type: string }>;
  }>({ locations: {}, keywords: {}, audiences: {}, templates: {} });

  const [filters, setFilters] = useState<Filters>({
    country: (initialFilter?.country as Filters["country"]) ?? "all",
    readiness: initialFilter?.readiness ?? "all",
    publish: initialFilter?.publish ?? "all",
    search: "",
    qualityMin: initialFilter?.qualityMin ?? "0",
  });

  async function load() {
    setLoading(true);
    const [pagesRes, locRes, kwRes, audRes, tplRes] = await Promise.all([
      supabase.from("disc_generated_pages").select("id,page_title,page_type,slug,quality_score,readiness_state,publish_status,include_in_sitemap,word_count,updated_at,location_id,keyword_id,audience_id,template_id").order("updated_at", { ascending: false }).limit(500),
      supabase.from("disc_locations").select("id,city,country,state_or_province_abbr"),
      supabase.from("disc_keywords").select("id,keyword"),
      supabase.from("disc_audiences").select("id,audience_name"),
      supabase.from("disc_templates").select("id,name,page_type"),
    ]);
    setRows((pagesRes.data ?? []) as Row[]);
    setRefsMap({
      locations: Object.fromEntries((locRes.data ?? []).map((l: any) => [l.id, l])),
      keywords: Object.fromEntries((kwRes.data ?? []).map((k: any) => [k.id, k])),
      audiences: Object.fromEntries((audRes.data ?? []).map((a: any) => [a.id, a])),
      templates: Object.fromEntries((tplRes.data ?? []).map((t: any) => [t.id, t])),
    });
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const min = parseInt(filters.qualityMin) || 0;
    return rows.filter((r) => {
      const loc = r.location_id ? refsMap.locations[r.location_id] : null;
      if (filters.country !== "all" && loc?.country !== filters.country) return false;
      if (filters.readiness !== "all" && r.readiness_state !== filters.readiness) return false;
      if (filters.publish !== "all" && r.publish_status !== filters.publish) return false;
      if (r.quality_score < min) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const hay = [r.page_title, r.slug, loc?.city, refsMap.keywords[r.keyword_id ?? ""]?.keyword].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filters, refsMap]);

  async function setStatus(id: string, patch: Partial<Row>) {
    const { error } = await supabase.from("disc_generated_pages").update(patch).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Updated"); load(); }
  }

  async function runAction(id: string, action: "approve" | "publish" | "unpublish" | "request_rewrite") {
    const { publishDiscPage } = await import("@/lib/governance/growthOverview");
    const { error } = await publishDiscPage(id, action);
    if (error) toast.error(error.message); else { toast.success(`Page ${action}`); load(); }
  }

  function qualityVariant(s: number): "default" | "secondary" | "destructive" {
    if (s >= 85) return "default";
    if (s >= 70) return "secondary";
    return "destructive";
  }

  function readinessColor(state: string) {
    return state === "blocked" ? "destructive" : state === "needs_rewrite" ? "destructive" : "secondary";
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Search title or slug..." className="w-64" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          <Select value={filters.country} onValueChange={(v) => setFilters({ ...filters, country: v as Filters["country"] })}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All countries</SelectItem>
              <SelectItem value="United States">United States</SelectItem>
              <SelectItem value="Canada">Canada</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.readiness} onValueChange={(v) => setFilters({ ...filters, readiness: v })}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All readiness</SelectItem>
              <SelectItem value="needs_review">Needs review</SelectItem>
              <SelectItem value="needs_rewrite">Needs rewrite</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.publish} onValueChange={(v) => setFilters({ ...filters, publish: v })}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All publish</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Input type="number" placeholder="Min quality" className="w-28" value={filters.qualityMin} onChange={(e) => setFilters({ ...filters, qualityMin: e.target.value })} />
        </div>
        {showBatchButton && (
          <Button onClick={() => setBatchOpen(true)} className="gap-2">
            <Sparkles className="w-4 h-4" /> Generate batch
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">{emptyMessage ?? "No pages match these filters. Click Generate batch to create some."}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium">Page</th>
                    <th className="px-3 py-2 font-medium">Country</th>
                    <th className="px-3 py-2 font-medium">City</th>
                    <th className="px-3 py-2 font-medium">Keyword</th>
                    <th className="px-3 py-2 font-medium">Template</th>
                    <th className="px-3 py-2 font-medium">Quality</th>
                    <th className="px-3 py-2 font-medium">Readiness</th>
                    <th className="px-3 py-2 font-medium">Publish</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const loc = r.location_id ? refsMap.locations[r.location_id] : null;
                    const kw = r.keyword_id ? refsMap.keywords[r.keyword_id] : null;
                    const tpl = r.template_id ? refsMap.templates[r.template_id] : null;
                    return (
                      <tr key={r.id} className="border-t hover:bg-muted/20">
                        <td className="px-3 py-2 max-w-xs">
                          <div className="font-medium truncate" title={r.page_title || r.slug}>{r.page_title || r.slug}</div>
                          <div className="text-xs text-muted-foreground truncate">{r.slug}</div>
                        </td>
                        <td className="px-3 py-2 text-xs">{loc?.country ?? "—"}</td>
                        <td className="px-3 py-2 text-xs">{loc?.city ?? "—"}</td>
                        <td className="px-3 py-2 text-xs max-w-[160px]">
                          <span className="truncate block" title={kw?.keyword ?? undefined}>{kw?.keyword ?? "—"}</span>
                        </td>
                        <td className="px-3 py-2 text-xs max-w-[140px]">
                          <span className="truncate block" title={tpl?.name ?? r.page_type}>{tpl?.name ?? r.page_type}</span>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={qualityVariant(r.quality_score)}>{r.quality_score}</Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={readinessColor(r.readiness_state) as "secondary" | "destructive"}>{r.readiness_state}</Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="outline">{r.publish_status}</Badge>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1 flex-wrap">
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(r.id)}>Edit</Button>
                            {r.readiness_state !== "approved" && r.publish_status !== "published" && (
                              <Button size="sm" variant="ghost" onClick={() => runAction(r.id, "approve")}>Approve</Button>
                            )}
                            {r.publish_status !== "published" ? (
                              <Button size="sm" variant="ghost" disabled={r.readiness_state !== "approved"} onClick={() => runAction(r.id, "publish")}>Publish</Button>
                            ) : (
                              <Button size="sm" variant="ghost" onClick={() => runAction(r.id, "unpublish")}>Unpublish</Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground">{filtered.length} of {rows.length} pages</div>

      <GenerateBatchDialog open={batchOpen} onOpenChange={setBatchOpen} onComplete={load} />

      <Sheet open={!!editingId} onOpenChange={(o) => !o && setEditingId(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader><SheetTitle>Edit Generated Page</SheetTitle></SheetHeader>
          {editingId && <GeneratedPageEditor pageId={editingId} onSaved={() => { load(); setEditingId(null); }} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}
