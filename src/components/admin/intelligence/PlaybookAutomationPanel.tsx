/**
 * Phase 31 — Success Playbook Automation Panel
 *
 * Three sub-tabs: Templates · Suggested Plays · Reminders.
 * Admin-only (gated by underlying RLS).
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Sparkles, Bell, ListChecks, Zap, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  fetchPlaybookTemplates,
  updatePlaybookTemplate,
  fetchOpenSuggestions,
  generateSuggestions,
  acceptSuggestion,
  dismissSuggestion,
  fetchOverduePartnerPlays,
  fetchOverdueDirectPlays,
  touchPlay,
  TRIGGER_TYPE_LABEL,
  type PlaybookTemplate,
  type PlaySuggestion,
  type OverduePartnerPlay,
  type OverdueDirectPlay,
} from "@/lib/governance/playbookAutomation";

export default function PlaybookAutomationPanel() {
  const [templates, setTemplates] = useState<PlaybookTemplate[] | undefined>(undefined);
  const [suggestions, setSuggestions] = useState<PlaySuggestion[]>([]);
  const [overduePartner, setOverduePartner] = useState<OverduePartnerPlay[]>([]);
  const [overdueDirect, setOverdueDirect] = useState<OverdueDirectPlay[]>([]);
  const [running, setRunning] = useState(false);

  async function reloadAll() {
    const [t, s, op, od] = await Promise.all([
      fetchPlaybookTemplates(),
      fetchOpenSuggestions(),
      fetchOverduePartnerPlays(),
      fetchOverdueDirectPlays(),
    ]);
    setTemplates(t);
    setSuggestions(s);
    setOverduePartner(op);
    setOverdueDirect(od);
  }

  useEffect(() => {
    reloadAll();
  }, []);

  async function runScan() {
    setRunning(true);
    const res = await generateSuggestions();
    setRunning(false);
    if (res) {
      toast({
        title: "Trigger scan complete",
        description: `${res.pending_inserted} new suggestions · ${res.auto_created} auto-created plays`,
      });
      reloadAll();
    } else {
      toast({ title: "Scan failed", variant: "destructive" });
    }
  }

  const reminderCount = overduePartner.length + overdueDirect.length;

  if (templates === undefined) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Lightweight automation around success plays. Templates map to existing opportunity rules; scanning
          turns matching opportunities into <strong>suggestions</strong> by default. Templates flagged{" "}
          <strong>auto-create</strong> generate plays directly. No outbound comms; internal surfaces only.
        </AlertDescription>
      </Alert>

      <div className="flex justify-end">
        <Button onClick={runScan} disabled={running} size="sm">
          {running ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
          Run trigger scan
        </Button>
      </div>

      <Tabs defaultValue="suggestions">
        <TabsList>
          <TabsTrigger value="suggestions">
            <Sparkles className="h-4 w-4 mr-1" />
            Suggested Plays
            <span className="ml-1 text-[10px] text-muted-foreground">({suggestions.length})</span>
          </TabsTrigger>
          <TabsTrigger value="reminders">
            <Bell className="h-4 w-4 mr-1" />
            Reminders
            <span className="ml-1 text-[10px] text-muted-foreground">({reminderCount})</span>
          </TabsTrigger>
          <TabsTrigger value="templates">
            <ListChecks className="h-4 w-4 mr-1" />
            Templates
            <span className="ml-1 text-[10px] text-muted-foreground">({templates.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Suggestions */}
        <TabsContent value="suggestions">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Suggested plays queue</CardTitle>
              <CardDescription>
                Approve to instantiate a play with the template's default follow-up. Dismiss to skip.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {suggestions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending suggestions. Run a trigger scan.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Scope</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suggestions.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{s.scope}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{s.target_label ?? s.target_id.slice(0, 8)}</TableCell>
                        <TableCell>
                          <div className="text-sm">{s.template_title}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {s.template_play_type} · +{s.default_followup_days}d follow-up
                          </div>
                        </TableCell>
                        <TableCell className="text-xs max-w-md">{s.reason}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={async () => {
                              const id = await acceptSuggestion(s.id);
                              if (id) {
                                toast({ title: "Play created" });
                                reloadAll();
                              }
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              if (await dismissSuggestion(s.id)) reloadAll();
                            }}
                          >
                            Dismiss
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reminders */}
        <TabsContent value="reminders" className="space-y-4">
          <ReminderCard
            title="Partner plays due / overdue"
            empty="No partner plays needing attention."
            rows={overduePartner.map((r) => ({
              id: r.id,
              label: r.company_name ?? r.partner_id.slice(0, 8),
              play_type: r.play_type,
              template: r.template_title,
              due_date: r.due_date,
              days_overdue: r.days_overdue,
              scope: "partner" as const,
            }))}
            onTouch={async (id) => { if (await touchPlay("partner", id)) reloadAll(); }}
          />
          <ReminderCard
            title="Direct account plays due / overdue"
            empty="No direct plays needing attention."
            rows={overdueDirect.map((r) => ({
              id: r.id,
              label: r.company ?? r.name ?? r.lead_id.slice(0, 8),
              play_type: r.play_type,
              template: r.template_title,
              due_date: r.due_date,
              days_overdue: r.days_overdue,
              scope: "direct" as const,
            }))}
            onTouch={async (id) => { if (await touchPlay("direct", id)) reloadAll(); }}
          />
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Playbook templates</CardTitle>
              <CardDescription>
                Edit follow-up cadence, toggle active, opt into auto-create for low-risk nudges.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scope</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead className="w-32">Follow-up (d)</TableHead>
                    <TableHead className="w-24">Auto-create</TableHead>
                    <TableHead className="w-24">Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((t) => (
                    <TemplateRow key={t.id} template={t} onChanged={reloadAll} />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TemplateRow({ template, onChanged }: { template: PlaybookTemplate; onChanged: () => void }) {
  const [days, setDays] = useState(String(template.default_followup_days));
  const dirty = useMemo(() => Number(days) !== template.default_followup_days, [days, template.default_followup_days]);

  return (
    <TableRow>
      <TableCell><Badge variant="outline" className="text-[10px]">{template.scope}</Badge></TableCell>
      <TableCell>
        <div className="font-medium text-sm">{template.title}</div>
        {template.description && (
          <div className="text-[11px] text-muted-foreground">{template.description}</div>
        )}
      </TableCell>
      <TableCell><Badge variant="outline" className="text-[10px]">{template.play_type}</Badge></TableCell>
      <TableCell className="text-xs">{TRIGGER_TYPE_LABEL[template.trigger_type]}</TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Input
            className="h-7 w-16 text-xs"
            type="number"
            min={1}
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
          {dirty && (
            <Button size="sm" variant="outline" className="h-7"
              onClick={async () => {
                const n = parseInt(days, 10);
                if (Number.isFinite(n) && n > 0) {
                  await updatePlaybookTemplate(template.id, { default_followup_days: n });
                  onChanged();
                }
              }}
            >
              Save
            </Button>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Switch
          checked={template.auto_create}
          onCheckedChange={async (v) => {
            await updatePlaybookTemplate(template.id, { auto_create: v });
            onChanged();
          }}
        />
      </TableCell>
      <TableCell>
        <Switch
          checked={template.active}
          onCheckedChange={async (v) => {
            await updatePlaybookTemplate(template.id, { active: v });
            onChanged();
          }}
        />
      </TableCell>
    </TableRow>
  );
}

interface ReminderRow {
  id: string;
  label: string;
  play_type: string;
  template: string | null;
  due_date: string;
  days_overdue: number;
  scope: "partner" | "direct";
}

function ReminderCard({
  title, empty, rows, onTouch,
}: {
  title: string;
  empty: string;
  rows: ReminderRow[];
  onTouch: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Target</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.label}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{r.play_type}</Badge></TableCell>
                  <TableCell className="text-xs">{r.template ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.due_date}</TableCell>
                  <TableCell>
                    {r.days_overdue > 0 ? (
                      <Badge variant="destructive" className="text-[10px]">{r.days_overdue}d overdue</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Due soon</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => onTouch(r.id)}>
                      Mark touched
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
