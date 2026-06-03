import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle } from "lucide-react";

const ALL_MODULES = [
  "dashboard",
  "calls",
  "scripts",
  "schedule",
  "billing",
  "support",
  "settings",
  "outbound-requests",
  "activity",
  "leads",
  "reviews",
];

export default function AdminWLConfigDiff() {
  const [partners, setPartners] = useState<any[]>([]);
  const [brandings, setBrandings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: p }, { data: b }] = await Promise.all([
        (supabase as any)
          .from("white_label_partners")
          .select("id, company_name, partner_slug, status, default_enabled_modules")
          .order("company_name"),
        (supabase as any).from("white_label_branding").select("*"),
      ]);

      setPartners(p ?? []);
      const map: Record<string, any> = {};
      (b ?? []).forEach((row: any) => {
        map[row.partner_id] = row;
      });
      setBrandings(map);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">WL Configuration Diff</h1>
        <p className="text-muted-foreground mt-1">
          Side-by-side comparison of partner branding, modules, and identity
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Modules per partner</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium sticky left-0 bg-background">Partner</th>
                {ALL_MODULES.map((m) => (
                  <th key={m} className="text-center p-2 font-medium text-xs">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => {
                const enabled = Array.isArray(p.default_enabled_modules)
                  ? p.default_enabled_modules
                  : [];
                return (
                  <tr key={p.id} className="border-b hover:bg-muted/30">
                    <td className="p-2 font-medium sticky left-0 bg-background">
                      <div>{p.company_name}</div>
                      <code className="text-xs text-muted-foreground">{p.partner_slug}</code>
                    </td>
                    {ALL_MODULES.map((m) => (
                      <td key={m} className="text-center p-2">
                        {enabled.includes(m) ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 inline" />
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground/30 inline" />
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Branding completeness</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium">Partner</th>
                <th className="text-center p-2 font-medium text-xs">Logo</th>
                <th className="text-center p-2 font-medium text-xs">Primary</th>
                <th className="text-center p-2 font-medium text-xs">Heading font</th>
                <th className="text-center p-2 font-medium text-xs">Body font</th>
                <th className="text-center p-2 font-medium text-xs">Support email</th>
                <th className="text-center p-2 font-medium text-xs">Footer</th>
                <th className="text-center p-2 font-medium text-xs">Favicon</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => {
                const b = brandings[p.id];
                const cell = (val: any) =>
                  val ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 inline" />
                  ) : (
                    <XCircle className="w-4 h-4 text-muted-foreground/30 inline" />
                  );
                return (
                  <tr key={p.id} className="border-b hover:bg-muted/30">
                    <td className="p-2 font-medium">{p.company_name}</td>
                    <td className="text-center p-2">{cell(b?.logo_url)}</td>
                    <td className="text-center p-2">{cell(b?.primary_color)}</td>
                    <td className="text-center p-2">{cell(b?.font_heading)}</td>
                    <td className="text-center p-2">{cell(b?.font_body)}</td>
                    <td className="text-center p-2">{cell(b?.support_email)}</td>
                    <td className="text-center p-2">{cell(b?.portal_footer_text)}</td>
                    <td className="text-center p-2">{cell(b?.favicon_url)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
