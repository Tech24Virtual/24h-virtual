import { useState } from "react";
import { WhiteLabelLayout } from "@/components/white-label/WhiteLabelLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Globe, Loader2, CheckCircle2, XCircle, ArrowLeft, Info } from "lucide-react";
import { Link } from "react-router-dom";

export default function GrowthHubWordPress() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [siteUrl, setSiteUrl] = useState("");
  const [wpUsername, setWpUsername] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [autoPublish, setAutoPublish] = useState(false);
  const [defaultCategory, setDefaultCategory] = useState("");

  const { data: partner } = useQuery({
    queryKey: ["wl-partner", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("white_label_partners").select("id").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: connection, isLoading } = useQuery({
    queryKey: ["wl-wp-connection", partner?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("wl_wordpress_connections")
        .select("*")
        .eq("partner_id", partner!.id)
        .maybeSingle();
      if (data) {
        setSiteUrl(data.site_url || "");
        setWpUsername(data.wp_username || "");
        setAutoPublish(data.auto_publish || false);
        setDefaultCategory(data.default_category || "");
      }
      return data;
    },
    enabled: !!partner?.id,
  });

  const testConnection = useMutation({
    mutationFn: async () => {
      if (!siteUrl || !wpUsername || !appPassword) throw new Error("All fields are required");
      const { data, error } = await supabase.functions.invoke("wl-test-wp-connection", {
        body: { site_url: siteUrl, wp_username: wpUsername, app_password: appPassword },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Connection failed");
      return data;
    },
    onSuccess: () => toast.success("WordPress connection verified!"),
    onError: (e: any) => toast.error(e.message),
  });

  const saveConnection = useMutation({
    mutationFn: async () => {
      if (!siteUrl || !wpUsername || !appPassword) throw new Error("All fields are required");

      const payload = {
        partner_id: partner!.id,
        site_url: siteUrl.replace(/\/+$/, ""),
        wp_username: wpUsername,
        app_password: appPassword,
        auto_publish: autoPublish,
        default_category: defaultCategory || null,
        status: "connected",
        last_tested_at: new Date().toISOString(),
      };

      if (connection) {
        const { error } = await supabase
          .from("wl_wordpress_connections")
          .update(payload)
          .eq("id", connection.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("wl_wordpress_connections").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wl-wp-connection"] });
      toast.success("WordPress connection saved!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      if (!connection) return;
      const { error } = await supabase
        .from("wl_wordpress_connections")
        .update({ status: "disconnected" })
        .eq("id", connection.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wl-wp-connection"] });
      toast.success("Disconnected");
    },
  });

  return (
    <WhiteLabelLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/white-label-dashboard/growth"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-heading">WordPress Connection</h1>
            <p className="text-muted-foreground">Connect your WordPress site to auto-publish blog posts.</p>
          </div>
        </div>

        {/* Status */}
        {connection && (
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {connection.status === "connected" ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive" />
                )}
                <div>
                  <p className="font-medium">{connection.site_url}</p>
                  <p className="text-xs text-muted-foreground">
                    Last tested: {connection.last_tested_at ? new Date(connection.last_tested_at).toLocaleString() : "Never"}
                  </p>
                </div>
              </div>
              <Badge variant={connection.status === "connected" ? "default" : "destructive"}>
                {connection.status}
              </Badge>
            </CardContent>
          </Card>
        )}

        {/* Setup Instructions */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">How to get your Application Password:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Log in to your WordPress admin dashboard</li>
                  <li>Go to <strong>Users → Profile</strong></li>
                  <li>Scroll to <strong>Application Passwords</strong></li>
                  <li>Enter a name (e.g. "24H Growth Hub") and click <strong>Add New</strong></li>
                  <li>Copy the generated password and paste it below</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connection Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4" />
              {connection ? "Update Connection" : "Connect WordPress"}
            </CardTitle>
            <CardDescription>Enter your WordPress site credentials to enable auto-publishing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>WordPress Site URL</Label>
              <Input
                placeholder="https://yourblog.com"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>WordPress Username</Label>
              <Input
                placeholder="admin"
                value={wpUsername}
                onChange={(e) => setWpUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Application Password</Label>
              <Input
                type="password"
                placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Default Category (optional)</Label>
              <Input
                placeholder="Blog"
                value={defaultCategory}
                onChange={(e) => setDefaultCategory(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <Label>Auto-Publish</Label>
                <p className="text-xs text-muted-foreground">Publish posts immediately instead of as drafts</p>
              </div>
              <Switch checked={autoPublish} onCheckedChange={setAutoPublish} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => testConnection.mutate()} disabled={testConnection.isPending}>
                {testConnection.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                Test Connection
              </Button>
              <Button onClick={() => saveConnection.mutate()} disabled={saveConnection.isPending}>
                {saveConnection.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                Save Connection
              </Button>
              {connection?.status === "connected" && (
                <Button variant="ghost" className="text-destructive" onClick={() => disconnect.mutate()}>
                  Disconnect
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </WhiteLabelLayout>
  );
}
