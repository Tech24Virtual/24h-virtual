import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneCall, Loader2, Save, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  fetchReceptionistConfig,
  fetchReadinessForFlow,
  upsertReceptionistConfig,
  setReceptionistEnabled,
  READINESS_LABEL,
  type ReceptionistConfig,
  type ReadinessRow,
  type ReceptionistMode,
  type AfterHoursBehavior,
  type EscalationStrategy,
} from "@/lib/governance/voiceOverview";

interface Props {
  callFlowId: string;
}

/**
 * Phase 5 — AI Voice / Hybrid Receptionist config panel.
 * Operates on canonical call_flow_receptionist_configs (1:1 with client_departments).
 * Enable toggle is gated by set_receptionist_enabled RPC (admin/supervisor + audit).
 */
export function ReceptionistConfigCard({ callFlowId }: Props) {
  const [cfg, setCfg] = useState<ReceptionistConfig | null>(null);
  const [readiness, setReadiness] = useState<ReadinessRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [mode, setMode] = useState<ReceptionistMode>("hybrid");
  const [greeting, setGreeting] = useState("");
  const [afterHours, setAfterHours] = useState<AfterHoursBehavior>("voicemail");
  const [escalation, setEscalation] = useState<EscalationStrategy>("transfer_human");
  const [overflowNumber, setOverflowNumber] = useState("");
  const [voicemailEmail, setVoicemailEmail] = useState("");
  const [groundInCampaign, setGroundInCampaign] = useState(true);
  const [knowledgeNotes, setKnowledgeNotes] = useState("");

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const [c, r] = await Promise.all([
        fetchReceptionistConfig(callFlowId),
        fetchReadinessForFlow(callFlowId),
      ]);
      setCfg(c);
      setReadiness(r);
      if (c) {
        setMode(c.mode);
        setGreeting(c.greeting ?? "");
        setAfterHours(c.after_hours);
        setEscalation(c.escalation);
        setOverflowNumber(c.overflow_number ?? "");
        setVoicemailEmail(c.voicemail_email ?? "");
        setGroundInCampaign(c.ground_in_campaign);
        setKnowledgeNotes(c.knowledge_notes ?? "");
      }
    } catch (e: any) {
      setLoadError(e?.message ?? "Failed to load receptionist configuration");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [callFlowId]);

  async function handleSave() {
    setSaving(true);
    try {
      const next = await upsertReceptionistConfig({
        client_department_id: callFlowId,
        mode,
        greeting: greeting || null,
        after_hours: afterHours,
        escalation,
        overflow_number: overflowNumber || null,
        voicemail_email: voicemailEmail || null,
        ground_in_campaign: groundInCampaign,
        knowledge_notes: knowledgeNotes || null,
      });
      setCfg(next);
      await load();
      toast.success("Receptionist saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(enabled: boolean) {
    if (!cfg) {
      toast.error("Save the configuration first");
      return;
    }
    try {
      const updated = await setReceptionistEnabled(cfg.id, enabled, enabled ? "Operator activation" : "Taken offline");
      setCfg(updated);
      await load();
      toast.success(enabled ? "Receptionist live" : "Receptionist offline");
    } catch (e: any) {
      toast.error(e?.message ?? "Action failed");
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading receptionist…
        </CardContent>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-6 text-center space-y-2">
          <AlertTriangle className="h-6 w-6 text-destructive mx-auto" />
          <p className="text-sm font-medium text-destructive">Failed to load receptionist config</p>
          <p className="text-xs text-muted-foreground">{loadError}</p>
          <Button variant="outline" size="sm" onClick={load}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const liveReady = readiness?.readiness_state === "live" || readiness?.readiness_state === "ready_to_activate";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <PhoneCall className="h-4 w-4 text-primary" /> AI Receptionist
          </CardTitle>
          {readiness && (
            <Badge variant={readiness.readiness_state === "live" ? "default" : "secondary"}>
              {READINESS_LABEL[readiness.readiness_state]}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {readiness && (
          <div className="rounded-md border p-3 text-xs grid sm:grid-cols-3 gap-2">
            <ReadinessChip label="Published Script" ok={readiness.has_published_script} />
            <ReadinessChip label="Active Number" ok={readiness.has_active_number} />
            <ReadinessChip label="Config Enabled" ok={!!readiness.receptionist_enabled} />
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as ReceptionistMode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ai_only">AI Only</SelectItem>
                <SelectItem value="hybrid">Hybrid (AI + Human Fallback)</SelectItem>
                <SelectItem value="human_only">Human Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>After Hours</Label>
            <Select value={afterHours} onValueChange={(v) => setAfterHours(v as AfterHoursBehavior)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="voicemail">Voicemail</SelectItem>
                <SelectItem value="forward">Forward To Number</SelectItem>
                <SelectItem value="overflow">Overflow Flow</SelectItem>
                <SelectItem value="message_only">Take A Message</SelectItem>
                <SelectItem value="closed">Announce Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Greeting</Label>
            <Textarea rows={2} value={greeting} onChange={(e) => setGreeting(e.target.value)} placeholder="e.g. Thank you for calling Acme, how may I help?" />
          </div>
          <div>
            <Label>Escalation</Label>
            <Select value={escalation} onValueChange={(v) => setEscalation(v as EscalationStrategy)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="transfer_human">Transfer To Human</SelectItem>
                <SelectItem value="callback_request">Schedule A Callback</SelectItem>
                <SelectItem value="supervisor">Page Supervisor</SelectItem>
                <SelectItem value="overflow_number">Overflow Number</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Overflow Number</Label>
            <Input value={overflowNumber} onChange={(e) => setOverflowNumber(e.target.value)} placeholder="+1…" />
          </div>
          <div>
            <Label>Voicemail Email</Label>
            <Input value={voicemailEmail} onChange={(e) => setVoicemailEmail(e.target.value)} placeholder="ops@client.com" />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label className="text-sm">Ground In Campaign</Label>
              <p className="text-xs text-muted-foreground">Use the published Campaign script + FAQs as canonical knowledge.</p>
            </div>
            <Switch checked={groundInCampaign} onCheckedChange={setGroundInCampaign} />
          </div>
          <div className="sm:col-span-2">
            <Label>Knowledge Notes</Label>
            <Textarea rows={2} value={knowledgeNotes} onChange={(e) => setKnowledgeNotes(e.target.value)} placeholder="Any out-of-band guidance for the receptionist." />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-3">
            <Switch
              checked={!!cfg?.enabled}
              disabled={!cfg}
              onCheckedChange={handleToggle}
            />
            <div className="text-sm">
              <div className="font-medium">{cfg?.enabled ? "Live" : "Offline"}</div>
              <div className="text-xs text-muted-foreground">
                {cfg ? "Toggle gated by audit log" : "Save first to enable"}
              </div>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            Save
          </Button>
        </div>

        {!liveReady && readiness && (
          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-amber-500" />
            {readiness.readiness_state === "awaiting_script_publish" && "Publish the campaign script before going live."}
            {readiness.readiness_state === "awaiting_number" && "Attach an active phone number to this call flow."}
            {readiness.readiness_state === "configured_offline" && "Configuration is saved; flip Live to start."}
            {readiness.readiness_state === "unconfigured" && "Save a configuration to begin."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ReadinessChip({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {ok ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
      )}
      <span className={ok ? "" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}
