import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight, Undo2, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  campaignId: string;
  clientLeadId: string | null;
  wlClientId: string | null;
  legacyCutoverAt: string | null;
  onChange?: () => void;
}

interface LegacyClientScript {
  id: string;
  client_id: string;
  greeting: string | null;
  migrated_to_campaign_id: string | null;
  migrated_at: string | null;
  updated_at: string;
}

interface LegacyWlClientScript {
  id: string;
  wl_client_id: string;
  greeting: string | null;
  migrated_to_campaign_id: string | null;
  migrated_at: string | null;
  updated_at: string;
}

export function LegacyCutoverPanel({
  campaignId,
  clientLeadId,
  wlClientId,
  legacyCutoverAt,
  onChange,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [clientScripts, setClientScripts] = useState<LegacyClientScript[]>([]);
  const [wlScripts, setWlScripts] = useState<LegacyWlClientScript[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [csRes, wlRes] = await Promise.all([
        clientLeadId
          ? supabase
              .from("client_scripts")
              .select("id, client_id, greeting, migrated_to_campaign_id, migrated_at, updated_at")
              .eq("client_id", clientLeadId)
          : Promise.resolve({ data: [] as LegacyClientScript[], error: null }),
        wlClientId
          ? supabase
              .from("wl_client_scripts")
              .select("id, wl_client_id, greeting, migrated_to_campaign_id, migrated_at, updated_at")
              .eq("wl_client_id", wlClientId)
          : Promise.resolve({ data: [] as LegacyWlClientScript[], error: null }),
      ]);

      setClientScripts((csRes.data ?? []) as LegacyClientScript[]);
      setWlScripts((wlRes.data ?? []) as LegacyWlClientScript[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load legacy scripts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientLeadId, wlClientId]);

  const handleCutover = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("cutover_legacy_scripts", {
        p_campaign_id: campaignId,
        p_client_script_ids: clientScripts.filter((s) => !s.migrated_to_campaign_id).map((s) => s.id),
        p_wl_client_script_ids: wlScripts.filter((s) => !s.migrated_to_campaign_id).map((s) => s.id),
      });
      if (error) throw error;
      toast.success("Legacy scripts cut over to this campaign", {
        description: `Migrated ${(data as { client_scripts_migrated?: number; wl_client_scripts_migrated?: number })?.client_scripts_migrated ?? 0} client + ${(data as { wl_client_scripts_migrated?: number })?.wl_client_scripts_migrated ?? 0} WL records`,
      });
      await load();
      onChange?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cutover failed");
    } finally {
      setBusy(false);
    }
  };

  const handleReverse = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("clear_legacy_script_cutover", {
        p_campaign_id: campaignId,
      });
      if (error) throw error;
      toast.success("Cutover reversed");
      await load();
      onChange?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reverse failed");
    } finally {
      setBusy(false);
    }
  };

  const totalLegacy = clientScripts.length + wlScripts.length;
  const migratedHere =
    clientScripts.filter((s) => s.migrated_to_campaign_id === campaignId).length +
    wlScripts.filter((s) => s.migrated_to_campaign_id === campaignId).length;
  const allMigrated = totalLegacy > 0 && migratedHere === totalLegacy;
  const noTenant = !clientLeadId && !wlClientId;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" /> Legacy script cutover
        </CardTitle>
        <CardDescription>
          Reversibly point legacy <code>client_scripts</code> / <code>wl_client_scripts</code> rows at this campaign.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {legacyCutoverAt && (
          <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
            <span className="font-semibold">Cutover recorded:</span>{" "}
            {new Date(legacyCutoverAt).toLocaleString()}
          </div>
        )}

        {noTenant && (
          <div className="flex items-start gap-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
            <span>This campaign has no client or WL client tenant link, so there are no legacy scripts to migrate.</span>
          </div>
        )}

        {!noTenant && loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading legacy rows…
          </div>
        )}

        {!noTenant && !loading && totalLegacy === 0 && (
          <p className="text-xs text-muted-foreground">No legacy script rows for this tenant.</p>
        )}

        {!noTenant && !loading && totalLegacy > 0 && (
          <div className="space-y-2">
            <ul className="space-y-1.5 text-xs">
              {clientScripts.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 rounded border bg-muted/30 px-2 py-1.5">
                  <span className="truncate">
                    Client script <code className="text-[10px]">{s.id.slice(0, 8)}</code>
                  </span>
                  {s.migrated_to_campaign_id === campaignId ? (
                    <Badge variant="default" className="text-[10px]">Migrated</Badge>
                  ) : s.migrated_to_campaign_id ? (
                    <Badge variant="secondary" className="text-[10px]">Migrated elsewhere</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Legacy</Badge>
                  )}
                </li>
              ))}
              {wlScripts.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 rounded border bg-muted/30 px-2 py-1.5">
                  <span className="truncate">
                    WL client script <code className="text-[10px]">{s.id.slice(0, 8)}</code>
                  </span>
                  {s.migrated_to_campaign_id === campaignId ? (
                    <Badge variant="default" className="text-[10px]">Migrated</Badge>
                  ) : s.migrated_to_campaign_id ? (
                    <Badge variant="secondary" className="text-[10px]">Migrated elsewhere</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Legacy</Badge>
                  )}
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-2 pt-2">
              {!allMigrated && (
                <Button onClick={handleCutover} disabled={busy} size="sm">
                  {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="mr-1.5 h-3.5 w-3.5" />}
                  Cut over to this campaign
                </Button>
              )}
              {migratedHere > 0 && (
                <Button onClick={handleReverse} disabled={busy} size="sm" variant="outline">
                  {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Undo2 className="mr-1.5 h-3.5 w-3.5" />}
                  Reverse cutover
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
