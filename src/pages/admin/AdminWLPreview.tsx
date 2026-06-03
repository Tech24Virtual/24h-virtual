import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ExternalLink, Monitor, Smartphone } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function AdminWLPreview() {
  const { partnerId } = useParams<{ partnerId: string }>();
  const [partner, setPartner] = useState<any>(null);
  const [branding, setBranding] = useState<any>(null);
  const [aliases, setAliases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");

  useEffect(() => {
    if (!partnerId) return;
    load();
  }, [partnerId]);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: p }, { data: b }, { data: a }] = await Promise.all([
        (supabase as any).from("white_label_partners").select("*").eq("id", partnerId).maybeSingle(),
        (supabase as any).from("white_label_branding").select("*").eq("partner_id", partnerId).maybeSingle(),
        (supabase as any).from("white_label_domain_aliases").select("*").eq("partner_id", partnerId),
      ]);
      setPartner(p);
      setBranding(b);
      setAliases(a ?? []);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!partner) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Partner not found.
        </CardContent>
      </Card>
    );
  }

  const previewUrl = partner.partner_slug ? `/portal/${partner.partner_slug}` : null;
  const verifiedAlias = aliases.find((a) => a.verified);
  const hostUrl = verifiedAlias ? `https://${verifiedAlias.hostname}` : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/admin/wl-health">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Preview: {partner.company_name}</h1>
            <p className="text-sm text-muted-foreground">
              Superadmin preview of partner-facing portal
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewport === "desktop" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewport("desktop")}
          >
            <Monitor className="w-4 h-4" />
          </Button>
          <Button
            variant={viewport === "mobile" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewport("mobile")}
          >
            <Smartphone className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Company name</p>
                <p className="font-medium">{branding?.company_name || partner.company_name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Slug</p>
                <code className="text-xs">{partner.partner_slug}</code>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Hostnames</p>
                {aliases.length === 0 ? (
                  <span className="text-xs text-destructive">None</span>
                ) : (
                  aliases.map((a) => (
                    <div key={a.hostname} className="flex items-center gap-2 text-xs mt-1">
                      <code>{a.hostname}</code>
                      <Badge variant={a.verified ? "default" : "secondary"} className="text-[10px]">
                        {a.verified ? "verified" : "pending"}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Branding tokens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {branding?.logo_url && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Logo</p>
                  <div className="bg-muted rounded p-2">
                    <img src={branding.logo_url} alt="" className="h-8 object-contain" />
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                {[
                  { label: "Primary", value: branding?.primary_color },
                  { label: "Secondary", value: branding?.secondary_color },
                  { label: "Accent", value: branding?.accent_color },
                ].map((c) => (
                  <div key={c.label} className="flex-1 text-center">
                    <div
                      className="h-10 rounded border"
                      style={{ background: c.value || "transparent" }}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">{c.label}</p>
                    <code className="text-[10px]">{c.value || "—"}</code>
                  </div>
                ))}
              </div>
              <div className="text-xs space-y-1 pt-2 border-t">
                <div>Heading: <code>{branding?.font_heading || "default"}</code></div>
                <div>Body: <code>{branding?.font_body || "default"}</code></div>
                <div>Sidebar: <code>{branding?.sidebar_style || "light"}</code></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Default modules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {Array.isArray(partner.default_enabled_modules) && partner.default_enabled_modules.length > 0 ? (
                  partner.default_enabled_modules.map((m: string) => (
                    <Badge key={m} variant="secondary" className="text-xs">
                      {m}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">None</span>
                )}
              </div>
            </CardContent>
          </Card>

          {hostUrl && (
            <Button asChild variant="outline" className="w-full">
              <a href={hostUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open live host
              </a>
            </Button>
          )}
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Portal preview</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="portal">
                <TabsList>
                  <TabsTrigger value="portal">Portal</TabsTrigger>
                  <TabsTrigger value="login">Login</TabsTrigger>
                </TabsList>
                <TabsContent value="portal" className="mt-4">
                  {previewUrl ? (
                    <div
                      className="mx-auto border rounded-lg overflow-hidden bg-background"
                      style={{
                        maxWidth: viewport === "mobile" ? 390 : "100%",
                        height: 600,
                      }}
                    >
                      <iframe
                        src={previewUrl}
                        className="w-full h-full"
                        title="Portal preview"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-12">
                      Partner has no slug configured.
                    </p>
                  )}
                </TabsContent>
                <TabsContent value="login" className="mt-4">
                  {previewUrl ? (
                    <div
                      className="mx-auto border rounded-lg overflow-hidden bg-background"
                      style={{
                        maxWidth: viewport === "mobile" ? 390 : "100%",
                        height: 600,
                      }}
                    >
                      <iframe
                        src={`${previewUrl}/login`}
                        className="w-full h-full"
                        title="Login preview"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-12">
                      Partner has no slug configured.
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
