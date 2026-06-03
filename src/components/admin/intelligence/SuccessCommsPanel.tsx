/**
 * Phase 32 — Success Communications & Renewal Automation
 * Admin-only panel: templates, actions queue, renewal pipeline.
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, MessageSquare, CalendarClock, FileText } from "lucide-react";
import {
  fetchCommunicationTemplates, updateCommunicationTemplate,
  fetchOpenCommunicationActions, generateCommunicationActions,
  approveCommunicationAction, dismissCommunicationAction, markCommunicationSent,
  fetchRenewalPipeline, upsertRenewalWorkflow,
  ACTION_STATUS_LABEL, STAGE_LABEL,
  type CommunicationTemplate, type CommunicationAction, type RenewalWorkflow, type RenewalStage,
} from "@/lib/governance/successComms";

const STAGES: RenewalStage[] = [
  "approaching","outreach_started","awaiting_response","in_progress",
  "renewed","downgraded","churned","lapsed",
];

export default function SuccessCommsPanel() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [actions, setActions] = useState<CommunicationAction[]>([]);
  const [renewals, setRenewals] = useState<RenewalWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const [t, a, r] = await Promise.all([
      fetchCommunicationTemplates(),
      fetchOpenCommunicationActions(),
      fetchRenewalPipeline(),
    ]);
    setTemplates(t); setActions(a); setRenewals(r);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const runScan = async () => {
    setScanning(true);
    const res = await generateCommunicationActions();
    setScanning(false);
    if (res) {
      toast({
        title: "Trigger scan complete",
        description: `Inserted ${res.inserted}, suppressed ${res.suppressed}, auto-sent ${res.auto_sent}.`,
      });
      refresh();
    } else {
      toast({ title: "Scan failed", variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Success Comms & Renewals
          </h2>
          <p className="text-sm text-muted-foreground">
            Bounded, template-driven communications and renewal workflows. Suggest first, approve, then send.
          </p>
        </div>
        <Button onClick={runScan} disabled={scanning} size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${scanning ? "animate-spin" : ""}`} />
          Run Trigger Scan
        </Button>
      </div>

      <Tabs defaultValue="actions">
        <TabsList>
          <TabsTrigger value="actions">Queue ({actions.length})</TabsTrigger>
          <TabsTrigger value="renewals">Renewals ({renewals.length})</TabsTrigger>
          <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="actions" className="space-y-3 pt-4">
          {actions.length === 0 && <p className="text-sm text-muted-foreground">No open actions. Run a trigger scan.</p>}
          {actions.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{a.scope}</Badge>
                    <Badge variant="secondary">{a.play_type}</Badge>
                    <Badge>{ACTION_STATUS_LABEL[a.status]}</Badge>
                    <span className="text-xs text-muted-foreground">{a.template_key}</span>
                  </div>
                  <p className="text-sm font-medium truncate">{a.template_subject}</p>
                  {a.suppression_reason && (
                    <p className="text-xs text-amber-600">Suppressed: {a.suppression_reason}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {a.status === "suggested" && (
                    <Button size="sm" variant="outline" onClick={async () => {
                      if (await approveCommunicationAction(a.id)) refresh();
                    }}>Approve</Button>
                  )}
                  {(a.status === "approved" || a.status === "queued") && (
                    <Button size="sm" onClick={async () => {
                      if (await markCommunicationSent(a.id)) refresh();
                    }}>Mark sent</Button>
                  )}
                  {a.status !== "sent" && a.status !== "dismissed" && (
                    <Button size="sm" variant="ghost" onClick={async () => {
                      if (await dismissCommunicationAction(a.id)) refresh();
                    }}>Dismiss</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="renewals" className="space-y-3 pt-4">
          {renewals.length === 0 && <p className="text-sm text-muted-foreground">No upcoming renewals.</p>}
          {renewals.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {new Date(r.renewal_date).toLocaleDateString()}
                    </span>
                    <Badge variant="outline">{r.scope}</Badge>
                    <Badge>{STAGE_LABEL[r.stage]}</Badge>
                    <span className="text-xs text-muted-foreground">{r.days_to_renewal}d</span>
                  </div>
                  <p className="text-xs text-muted-foreground">target: {r.target_id.slice(0,8)}…</p>
                </div>
                <select
                  className="text-sm border rounded px-2 py-1 bg-background"
                  value={r.stage}
                  onChange={async (e) => {
                    await upsertRenewalWorkflow(r.scope, r.target_id, r.renewal_date, e.target.value as RenewalStage);
                    refresh();
                  }}
                >
                  {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
                </select>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="templates" className="space-y-3 pt-4">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
                  <FileText className="h-4 w-4" />
                  {t.template_key}
                  <Badge variant="outline">{t.scope}</Badge>
                  <Badge variant="secondary">{t.play_type}</Badge>
                  <Badge variant="outline">{t.channel}</Badge>
                  {t.sequence_key && <Badge variant="outline">step {t.step_number}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  defaultValue={t.subject}
                  onBlur={(e) => updateCommunicationTemplate(t.id, { subject: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">{t.body}</p>
                <div className="flex items-center gap-6 text-xs">
                  <label className="flex items-center gap-2">
                    <Switch
                      checked={t.active}
                      onCheckedChange={(v) => updateCommunicationTemplate(t.id, { active: v }).then(refresh)}
                    />
                    Active
                  </label>
                  <label className="flex items-center gap-2">
                    <Switch
                      checked={t.auto_send}
                      onCheckedChange={(v) => updateCommunicationTemplate(t.id, { auto_send: v }).then(refresh)}
                    />
                    Auto-send
                  </label>
                  <label className="flex items-center gap-2">
                    <Switch
                      checked={t.requires_approval}
                      onCheckedChange={(v) => updateCommunicationTemplate(t.id, { requires_approval: v }).then(refresh)}
                    />
                    Requires approval
                  </label>
                  <span className="text-muted-foreground">
                    Suppression: {t.suppression_hours}h
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
