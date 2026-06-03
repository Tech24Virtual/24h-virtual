/**
 * Phase 34 — Approval Policies Manager
 *
 * Admin-only CRUD UI for `approval_policies`, with versioned audit history
 * (sourced from `approval_policy_versions`, written by DB triggers on every
 * insert/update/delete). Mounted inside CommercialApprovalsPanel → Policies tab.
 *
 * Capabilities:
 *   - Create new policy
 *   - Edit any field of an existing policy (re-uses upsertPolicy by id)
 *   - Toggle active / inactive
 *   - Delete policy (with version trail preserved as `deleted` snapshot)
 *   - View per-policy audit trail: version_no, action, changed_by, diff
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Pencil, Trash2, History, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchPolicies,
  upsertPolicy,
  setPolicyActive,
  deletePolicy,
  fetchPolicyVersions,
  type ApprovalPolicy,
  type ApprovalPolicyVersion,
  type PolicyScope,
  type PolicyDealType,
} from "@/lib/governance/approvals";

type EditorMode = { kind: "closed" } | { kind: "create" } | { kind: "edit"; policy: ApprovalPolicy };

export default function ApprovalPoliciesManager() {
  const { toast } = useToast();
  const [policies, setPolicies] = useState<ApprovalPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<EditorMode>({ kind: "closed" });
  const [historyFor, setHistoryFor] = useState<ApprovalPolicy | null>(null);

  async function reload() {
    setLoading(true);
    setPolicies(await fetchPolicies());
    setLoading(false);
  }
  useEffect(() => { reload(); }, []);

  async function onDelete(p: ApprovalPolicy) {
    if (!confirm(`Delete policy "${p.name}"? Its version history is preserved.`)) return;
    const ok = await deletePolicy(p.id);
    toast({ title: ok ? "Policy deleted" : "Delete failed", variant: ok ? "default" : "destructive" });
    if (ok) reload();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {policies.length} policies. Every change is recorded as an immutable version.
        </p>
        <Button size="sm" variant="outline" onClick={() => setMode({ kind: "create" })}>
          <Plus className="h-4 w-4 mr-1" /> New policy
        </Button>
      </div>

      {mode.kind !== "closed" && (
        <PolicyForm
          initial={mode.kind === "edit" ? mode.policy : null}
          onCancel={() => setMode({ kind: "closed" })}
          onSaved={() => { setMode({ kind: "closed" }); reload(); }}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {policies.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No policies yet. Create one to start gating deals.
            </p>
          )}
          {policies.map((p) => (
            <div key={p.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{p.name}</span>
                    <Badge variant="outline">{p.scope}</Badge>
                    <Badge>{p.deal_type}</Badge>
                    <Badge variant="secondary">Tier {p.tier}</Badge>
                    <Badge variant="outline">{p.required_approver_role}</Badge>
                    <Badge variant="outline">SLA {p.sla_hours}h</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {p.min_discount_pct != null && `Discount ≥ ${p.min_discount_pct}% · `}
                    {p.triggers_on_non_standard_term && "non-standard term · "}
                    {p.triggers_on_exception && "exception · "}
                    {p.triggers_on_unknown_discount && "unknown discount · "}
                    {p.description || (
                      <span className="italic">No description</span>
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Updated {new Date(p.updated_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Label className="text-xs">{p.active ? "Active" : "Off"}</Label>
                  <Switch
                    checked={p.active}
                    onCheckedChange={async (v) => {
                      const ok = await setPolicyActive(p.id, v);
                      if (ok) reload();
                    }}
                  />
                  <Button size="sm" variant="outline" onClick={() => setHistoryFor(p)}>
                    <History className="h-3.5 w-3.5 mr-1" /> History
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setMode({ kind: "edit", policy: p })}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onDelete(p)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>

              {historyFor?.id === p.id && (
                <PolicyHistory policy={p} onClose={() => setHistoryFor(null)} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PolicyForm({
  initial, onCancel, onSaved,
}: {
  initial: ApprovalPolicy | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [scope, setScope] = useState<PolicyScope>((initial?.scope as PolicyScope) ?? "both");
  const [dealType, setDealType] = useState<PolicyDealType>((initial?.deal_type as PolicyDealType) ?? "any");
  const [minDiscount, setMinDiscount] = useState<string>(
    initial?.min_discount_pct != null ? String(initial.min_discount_pct) : "",
  );
  const [nonStd, setNonStd] = useState<boolean>(initial?.triggers_on_non_standard_term ?? false);
  const [exception, setException] = useState<boolean>(initial?.triggers_on_exception ?? false);
  const [unknown, setUnknown] = useState<boolean>(initial?.triggers_on_unknown_discount ?? false);
  const [tier, setTier] = useState<string>(String(initial?.tier ?? 1));
  const [role, setRole] = useState<string>(initial?.required_approver_role ?? "admin");
  const [slaHours, setSlaHours] = useState<string>(String(initial?.sla_hours ?? 24));
  const [active, setActive] = useState<boolean>(initial?.active ?? true);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    const md = minDiscount === "" ? null : Number(minDiscount);
    if (md != null && (Number.isNaN(md) || md < 0 || md > 100)) {
      toast({ title: "Min discount must be 0–100", variant: "destructive" }); return;
    }
    setSaving(true);
    const ok = await upsertPolicy({
      ...(initial?.id ? { id: initial.id } : {}),
      name: name.trim(),
      description: description.trim() || null,
      scope, deal_type: dealType,
      min_discount_pct: md,
      triggers_on_non_standard_term: nonStd,
      triggers_on_exception: exception,
      triggers_on_unknown_discount: unknown,
      tier: Number(tier) || 1,
      required_approver_role: role.trim() || "admin",
      sla_hours: Number(slaHours) || 24,
      active,
    });
    setSaving(false);
    if (ok) { toast({ title: initial ? "Policy updated" : "Policy created" }); onSaved(); }
    else toast({ title: "Save failed", variant: "destructive" });
  }

  return (
    <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">
          {initial ? `Edit policy: ${initial.name}` : "New policy"}
        </h4>
        <Button size="icon" variant="ghost" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <Label className="text-xs">Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Discount > 20%" />
        </div>
        <div>
          <Label className="text-xs">Tier</Label>
          <Input value={tier} onChange={(e) => setTier(e.target.value)} />
        </div>

        <div>
          <Label className="text-xs">Scope</Label>
          <Select value={scope} onValueChange={(v) => setScope(v as PolicyScope)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="both">Both</SelectItem>
              <SelectItem value="direct">Direct</SelectItem>
              <SelectItem value="partner">Partner</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Deal type</Label>
          <Select value={dealType} onValueChange={(v) => setDealType(v as PolicyDealType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="renewal">Renewal</SelectItem>
              <SelectItem value="expansion">Expansion</SelectItem>
              <SelectItem value="downsell">Downsell</SelectItem>
              <SelectItem value="save">Save</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Approver role</Label>
          <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="admin" />
        </div>

        <div>
          <Label className="text-xs">Min discount % (trigger)</Label>
          <Input value={minDiscount} onChange={(e) => setMinDiscount(e.target.value)} placeholder="optional" />
        </div>
        <div>
          <Label className="text-xs">SLA hours</Label>
          <Input value={slaHours} onChange={(e) => setSlaHours(e.target.value)} placeholder="24" />
        </div>
        <div className="flex items-end gap-2">
          <Switch checked={active} onCheckedChange={setActive} />
          <Label className="text-xs">Active</Label>
        </div>

        <div className="flex items-end gap-2">
          <Switch checked={nonStd} onCheckedChange={setNonStd} />
          <Label className="text-xs">Non-standard term</Label>
        </div>
        <div className="flex items-end gap-2">
          <Switch checked={exception} onCheckedChange={setException} />
          <Label className="text-xs">Exception</Label>
        </div>
        <div className="flex items-end gap-2">
          <Switch checked={unknown} onCheckedChange={setUnknown} />
          <Label className="text-xs">Unknown discount</Label>
        </div>

        <div className="md:col-span-3">
          <Label className="text-xs">Description / rationale</Label>
          <Textarea
            value={description ?? ""}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Why this policy exists, who reviews it, etc."
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
          {initial ? "Save changes" : "Create policy"}
        </Button>
      </div>
    </div>
  );
}

function PolicyHistory({ policy, onClose }: { policy: ApprovalPolicy; onClose: () => void }) {
  const [versions, setVersions] = useState<ApprovalPolicyVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchPolicyVersions(policy.id).then((v) => {
      if (alive) { setVersions(v); setLoading(false); }
    });
    return () => { alive = false; };
  }, [policy.id]);

  return (
    <div className="mt-2 border-t pt-2 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground">
          Version history ({versions.length})
        </div>
        <Button size="icon" variant="ghost" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      {loading ? (
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading…
        </div>
      ) : versions.length === 0 ? (
        <p className="text-xs text-muted-foreground">No versions recorded.</p>
      ) : (
        <div className="space-y-2">
          {versions.map((v) => {
            const diffKeys = Object.keys(v.diff || {});
            return (
              <div key={v.id} className="rounded-md border p-2 text-xs space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">v{v.version_no}</Badge>
                  <Badge
                    variant={
                      v.action === "deleted" ? "destructive"
                      : v.action === "created" ? "default"
                      : "outline"
                    }
                  >
                    {v.action}
                  </Badge>
                  <span className="text-muted-foreground">
                    {new Date(v.changed_at).toLocaleString()}
                  </span>
                  {v.changed_by && (
                    <span className="text-muted-foreground">
                      by user {v.changed_by.slice(0, 8)}…
                    </span>
                  )}
                </div>
                {v.action === "updated" && diffKeys.length > 0 && (
                  <div className="space-y-0.5">
                    {diffKeys.map((k) => (
                      <div key={k} className="font-mono text-[11px] break-all">
                        <span className="text-muted-foreground">{k}:</span>{" "}
                        <span className="text-destructive line-through">
                          {fmt(v.diff[k]?.from)}
                        </span>{" "}
                        →{" "}
                        <span className="text-primary">{fmt(v.diff[k]?.to)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {(v.action === "created" || v.action === "deleted") && (
                  <div className="text-[11px] text-muted-foreground">
                    Snapshot: {summarizeSnapshot(v.snapshot)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function fmt(v: any): string {
  if (v === null || v === undefined) return "∅";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function summarizeSnapshot(s: Record<string, any>): string {
  const bits: string[] = [];
  if (s.scope) bits.push(`scope=${s.scope}`);
  if (s.deal_type) bits.push(`type=${s.deal_type}`);
  if (s.tier != null) bits.push(`tier=${s.tier}`);
  if (s.required_approver_role) bits.push(`role=${s.required_approver_role}`);
  if (s.min_discount_pct != null) bits.push(`min%=${s.min_discount_pct}`);
  if (s.sla_hours != null) bits.push(`sla=${s.sla_hours}h`);
  bits.push(s.active ? "active" : "inactive");
  return bits.join(" · ");
}
