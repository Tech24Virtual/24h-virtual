import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  FileText,
  MapPin,
  Search,
  Users,
  HelpCircle,
  Link2,
  FileStack,
  AlertTriangle,
  Sparkles,
  Globe,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Counts {
  templates: number;
  locations: number;
  keywords: number;
  audiences: number;
  faqSets: number;
  faqs: number;
  linkSets: number;
  pages: number;
  pagesByStatus: Record<string, number>;
}

export default function DiscoverabilityOverview() {
  const { data: counts, isLoading, isError, refetch } = useQuery<Counts>({
    queryKey: ["discoverability-overview"],
    queryFn: async () => {
      const tables = [
        "disc_templates",
        "disc_locations",
        "disc_keywords",
        "disc_audiences",
        "disc_faq_sets",
        "disc_faqs",
        "disc_internal_link_sets",
        "disc_generated_pages",
      ] as const;

      const results = await Promise.all(
        tables.map((t) =>
          supabase.from(t).select("*", { count: "exact", head: true })
        )
      );

      if (results[0].error) throw results[0].error;

      const pagesByStatusRes = await supabase
        .from("disc_generated_pages")
        .select("readiness_state");

      const byStatus: Record<string, number> = {};
      (pagesByStatusRes.data ?? []).forEach((r: any) => {
        byStatus[r.readiness_state] = (byStatus[r.readiness_state] ?? 0) + 1;
      });

      return {
        templates: results[0].count ?? 0,
        locations: results[1].count ?? 0,
        keywords: results[2].count ?? 0,
        audiences: results[3].count ?? 0,
        faqSets: results[4].count ?? 0,
        faqs: results[5].count ?? 0,
        linkSets: results[6].count ?? 0,
        pages: results[7].count ?? 0,
        pagesByStatus: byStatus,
      };
    },
  });

  const totalCombinations =
    (counts?.templates ?? 0) * (counts?.locations ?? 0) * (counts?.keywords ?? 0);

  const missingData: string[] = [];
  if (counts && counts.templates === 0) missingData.push("No templates defined yet.");
  if (counts && counts.locations === 0) missingData.push("No locations seeded yet.");
  if (counts && counts.keywords === 0) missingData.push("No keywords defined yet.");
  if (counts && counts.faqs === 0) missingData.push("No FAQs in the library yet.");

  const tiles = [
    { label: "Templates", value: counts?.templates ?? 0, icon: FileText },
    { label: "Locations", value: counts?.locations ?? 0, icon: MapPin },
    { label: "Keywords", value: counts?.keywords ?? 0, icon: Search },
    { label: "Audiences", value: counts?.audiences ?? 0, icon: Users },
    { label: "FAQ Sets", value: counts?.faqSets ?? 0, icon: HelpCircle },
    { label: "FAQs", value: counts?.faqs ?? 0, icon: HelpCircle },
    { label: "Link Sets", value: counts?.linkSets ?? 0, icon: Link2 },
    { label: "Generated Pages", value: counts?.pages ?? 0, icon: FileStack },
  ];

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-heading">Discoverability Engine</h1>
            <p className="text-muted-foreground mt-1">
              Quality-gated content operations for SEO, AEO, and GEO discoverability.
            </p>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 flex items-center gap-4">
          <AlertTriangle className="h-8 w-8 text-destructive shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-destructive">Failed to load discoverability data</p>
            <p className="text-sm text-muted-foreground mt-1">Check your connection and try again.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />Retry
          </Button>
        </div>
      )}

      {!isLoading && !isError && missingData.length > 0 && (
        <Alert variant="default" className="border-destructive/40 bg-destructive/5">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <AlertTitle>Setup gaps detected</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside text-sm mt-1">
              {missingData.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !isError && counts && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {tiles.map((t) => (
              <Card key={t.label}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t.label}</p>
                      <p className="text-3xl font-semibold mt-2">{t.value}</p>
                    </div>
                    <t.icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Total Possible Combinations
                </CardTitle>
                <CardDescription>
                  Templates × Locations × Keywords. Audience overlays optional.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">{totalCombinations.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {counts.templates} templates × {counts.locations} locations × {counts.keywords} keywords
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Page Readiness</CardTitle>
                <CardDescription>Status breakdown of generated pages.</CardDescription>
              </CardHeader>
              <CardContent>
                {counts.pages === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No pages generated yet. Generation engine ships in Phase 3.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(counts.pagesByStatus).map(([status, n]) => (
                      <Badge key={status} variant="secondary">
                        {status}: {n}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recommended Next Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>1. Review seeded templates in Templates and adjust copy where needed.</p>
              <p>2. Expand the Locations list beyond the 12 starter metros.</p>
              <p>3. Add specialty keywords for each industry vertical.</p>
              <p>4. Build out FAQ sets per topic cluster (3 to 6 questions each).</p>
              <p>5. Wait for Phase 2 to use the data management UIs and template engine.</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
