import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, AlertTriangle, ExternalLink, Eye } from "lucide-react";

interface PartnerHealth {
  id: string;
  company_name: string | null;
  partner_slug: string | null;
  status: string | null;
  branding: {
    has_logo: boolean;
    has_colors: boolean;
    has_fonts: boolean;
    has_support_email: boolean;
    has_footer: boolean;
    company_name: string | null;
  } | null;
  hostnames: { hostname: string; verified: boolean }[];
  client_count: number;
  enabled_modules_count: number;
  issues: string[];
  score: number;
}

export default function AdminWLHealth() {
  const [partners, setPartners] = useState<PartnerHealth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHealth();
  }, []);

  const loadHealth = async () => {
    setLoading(true);
    try {
      const { data: partnerRows } = await (supabase as any)
        .from("white_label_partners")
        .select("id, company_name, partner_slug, status, default_enabled_modules");

      const { data: brandings } = await (supabase as any)
        .from("white_label_branding")
        .select("*");

      const { data: aliases } = await (supabase as any)
        .from("white_label_domain_aliases")
        .select("partner_id, alias_hostname, cname_verified_at");

      const { data: clients } = await (supabase as any)
        .from("white_label_clients")
        .select("partner_id");

      const result: PartnerHealth[] = (partnerRows ?? []).map((p: any) => {
        const b = (brandings ?? []).find((x: any) => x.partner_id === p.id);
        const partnerAliases = (aliases ?? []).filter((a: any) => a.partner_id === p.id);
        const clientCount = (clients ?? []).filter((c: any) => c.partner_id === p.id).length;
        const enabledCount = Array.isArray(p.default_enabled_modules)
          ? p.default_enabled_modules.length
          : 0;

        const issues: string[] = [];
        if (!b) issues.push("Missing branding record");
        if (b && !b.logo_url) issues.push("No logo");
        if (b && !b.primary_color) issues.push("No primary color");
        if (b && !b.support_email) issues.push("No support email");
        if (b && !b.portal_footer_text) issues.push("No footer text");
        if (b && !b.company_name) issues.push("No company name");
        if (partnerAliases.length === 0) issues.push("No custom hostname configured");
        if (partnerAliases.some((a: any) => !a.cname_verified_at)) issues.push("Unverified hostname(s)");
        if (enabledCount === 0) issues.push("No default modules enabled");
        if (p.status !== "active") issues.push(`Partner status: ${p.status}`);

        const totalChecks = 9;
        const score = Math.round(((totalChecks - issues.length) / totalChecks) * 100);

        return {
          id: p.id,
          company_name: p.company_name,
          partner_slug: p.partner_slug,
          status: p.status,
          branding: b
            ? {
                has_logo: !!b.logo_url,
                has_colors: !!b.primary_color,
                has_fonts: !!(b.font_heading && b.font_body),
                has_support_email: !!b.support_email,
                has_footer: !!b.portal_footer_text,
                company_name: b.company_name,
              }
            : null,
          hostnames: partnerAliases.map((a: any) => ({
            hostname: a.alias_hostname,
            verified: !!a.cname_verified_at,
          })),
          client_count: clientCount,
          enabled_modules_count: enabledCount,
          issues,
          score: Math.max(0, score),
        };
      });

      result.sort((a, b) => a.score - b.score);
      setPartners(result);
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 90) return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
    if (score >= 70) return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
    return "bg-destructive/10 text-destructive border-destructive/20";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">White Label Health</h1>
          <p className="text-muted-foreground mt-1">
            Per-partner branding, hostname, and configuration readiness
          </p>
        </div>
        <Button variant="outline" onClick={loadHealth} disabled={loading}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : partners.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No partners configured yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {partners.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {p.company_name || "Unnamed partner"}
                      <Badge variant="outline" className="text-xs">
                        {p.partner_slug}
                      </Badge>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {p.client_count} clients · {p.enabled_modules_count} default modules
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={scoreColor(p.score)} variant="outline">
                      {p.score}% ready
                    </Badge>
                    <Link to={`/admin/wl-preview/${p.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                    </Link>
                    <Link to={`/admin/partners/${p.id}`}>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Open
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Hostnames</p>
                    {p.hostnames.length === 0 ? (
                      <span className="text-destructive">None</span>
                    ) : (
                      <div className="space-y-1 mt-1">
                        {p.hostnames.map((h) => (
                          <div key={h.hostname} className="flex items-center gap-1">
                            {h.verified ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 text-amber-500" />
                            )}
                            <code className="text-xs">{h.hostname}</code>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Branding</p>
                    {p.branding ? (
                      <div className="space-y-0.5 mt-1 text-xs">
                        <div>{p.branding.has_logo ? "✓" : "✗"} Logo</div>
                        <div>{p.branding.has_colors ? "✓" : "✗"} Colors</div>
                        <div>{p.branding.has_support_email ? "✓" : "✗"} Support email</div>
                        <div>{p.branding.has_footer ? "✓" : "✗"} Footer</div>
                      </div>
                    ) : (
                      <span className="text-destructive">No record</span>
                    )}
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Status</p>
                    <Badge variant={p.status === "active" ? "default" : "secondary"} className="mt-1">
                      {p.status || "unknown"}
                    </Badge>
                  </div>
                </div>

                {p.issues.length > 0 && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
                      {p.issues.length} issue{p.issues.length === 1 ? "" : "s"}
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {p.issues.map((issue, i) => (
                        <li key={i}>• {issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
