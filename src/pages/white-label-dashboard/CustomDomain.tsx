import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Globe,
  Plus,
  RefreshCw,
  Trash2,
  AlertTriangle,
  ExternalLink,
  Info,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { buildDnsInstructions, describeStatus, validateHostname } from "@/lib/dnsInstructions";
import { cn } from "@/lib/utils";

interface AliasRow {
  id: string;
  alias_hostname: string;
  cname_status: string | null;
  cname_verified_at: string | null;
  cname_last_checked_at: string | null;
}

type SubdomainStyle = "portal" | "clients";

export default function WLCustomDomain() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [brandingId, setBrandingId] = useState<string | null>(null);

  // Canonical
  const [canonical, setCanonical] = useState<string>("");
  const [canonicalStatus, setCanonicalStatus] = useState<string>("pending");
  const [canonicalVerifiedAt, setCanonicalVerifiedAt] = useState<string | null>(null);
  const [canonicalLastCheckedAt, setCanonicalLastCheckedAt] = useState<string | null>(null);
  const [editingCanonical, setEditingCanonical] = useState(false);
  const [draftCanonical, setDraftCanonical] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [style, setStyle] = useState<SubdomainStyle>("portal");
  const [showChangeWarning, setShowChangeWarning] = useState(false);
  const [verifyingCanonical, setVerifyingCanonical] = useState(false);
  const [savingCanonical, setSavingCanonical] = useState(false);

  // Aliases
  const [aliases, setAliases] = useState<AliasRow[]>([]);
  const [showAddAlias, setShowAddAlias] = useState(false);
  const [aliasInput, setAliasInput] = useState("");
  const [aliasError, setAliasError] = useState<string | null>(null);
  const [savingAlias, setSavingAlias] = useState(false);
  const [verifyingAliasId, setVerifyingAliasId] = useState<string | null>(null);
  const [deleteAliasId, setDeleteAliasId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);
    try {
      const { data: partner } = await supabase
        .from("white_label_partners")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (!partner) {
        setLoading(false);
        return;
      }
      setPartnerId(partner.id);

      const { data: branding } = await supabase
        .from("white_label_branding")
        .select("id, custom_domain, cname_status, cname_verified_at, cname_last_checked_at")
        .eq("partner_id", partner.id)
        .maybeSingle();
      if (branding) {
        setBrandingId(branding.id);
        setCanonical(branding.custom_domain || "");
        setCanonicalStatus(branding.cname_status || "pending");
        setCanonicalVerifiedAt((branding as any).cname_verified_at || null);
        setCanonicalLastCheckedAt((branding as any).cname_last_checked_at || null);
        if (branding.custom_domain?.startsWith("clients.")) setStyle("clients");
      }

      const { data: aliasRows } = await supabase
        .from("white_label_domain_aliases")
        .select("id, alias_hostname, cname_status, cname_verified_at, cname_last_checked_at")
        .eq("partner_id", partner.id)
        .order("created_at", { ascending: true });
      setAliases((aliasRows as AliasRow[]) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openCanonicalEditor() {
    setDraftCanonical(canonical || "");
    setDraftError(null);
    if (canonical) {
      setShowChangeWarning(true);
    } else {
      setEditingCanonical(true);
    }
  }

  function confirmChangeCanonical() {
    setShowChangeWarning(false);
    setEditingCanonical(true);
  }

  async function saveCanonical() {
    if (!partnerId) return;
    const validation = validateHostname(draftCanonical);
    if (!validation.valid) {
      setDraftError(validation.error || "Invalid domain");
      return;
    }
    setSavingCanonical(true);
    try {
      const payload = {
        custom_domain: validation.normalized!,
        cname_status: "pending",
        cname_verified_at: null,
      };
      if (brandingId) {
        const { error } = await supabase
          .from("white_label_branding")
          .update(payload)
          .eq("id", brandingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("white_label_branding")
          .insert({ ...payload, partner_id: partnerId })
          .select("id")
          .single();
        if (error) throw error;
        setBrandingId(data.id);
      }
      setCanonical(validation.normalized!);
      setCanonicalStatus("pending");
      setCanonicalVerifiedAt(null);
      setCanonicalLastCheckedAt(null);
      setEditingCanonical(false);
      toast({ title: "Domain saved", description: "Add the DNS records below, then verify." });
    } catch (err: any) {
      toast({
        title: "Could not save domain",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingCanonical(false);
    }
  }

  async function verifyCanonical() {
    if (!partnerId) return;
    setVerifyingCanonical(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-wl-cname", {
        body: { partnerId },
      });
      if (error) throw error;
      setCanonicalStatus(data.status);
      const checkedAt = data.lastCheckedAt || new Date().toISOString();
      setCanonicalLastCheckedAt(checkedAt);
      if (data.verified) setCanonicalVerifiedAt(checkedAt);
      toast({
        title: data.verified ? "Domain connected" : "Verification failed",
        description: data.verified
          ? "DNS records look correct. SSL may take a few more minutes."
          : `DNS not found yet. Double-check your records and try again in a few minutes.`,
        variant: data.verified ? "default" : "destructive",
      });
    } catch (err: any) {
      toast({ title: "Verification error", description: err.message, variant: "destructive" });
    } finally {
      setVerifyingCanonical(false);
    }
  }

  async function addAlias() {
    if (!partnerId) return;
    const validation = validateHostname(aliasInput);
    if (!validation.valid) {
      setAliasError(validation.error || "Invalid domain");
      return;
    }
    if (validation.normalized === canonical) {
      setAliasError("Alias must be different from your canonical domain.");
      return;
    }
    if (aliases.some((a) => a.alias_hostname === validation.normalized)) {
      setAliasError("This alias is already added.");
      return;
    }
    setSavingAlias(true);
    try {
      const { data, error } = await supabase
        .from("white_label_domain_aliases")
        .insert({
          partner_id: partnerId,
          alias_hostname: validation.normalized!,
          cname_status: "pending",
        })
        .select("id, alias_hostname, cname_status, cname_verified_at")
        .single();
      if (error) throw error;
      setAliases((prev) => [...prev, data as AliasRow]);
      setShowAddAlias(false);
      setAliasInput("");
      setAliasError(null);
      toast({ title: "Alias added", description: "Add the DNS records, then verify below." });
    } catch (err: any) {
      toast({
        title: "Could not add alias",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingAlias(false);
    }
  }

  async function verifyAlias(alias: AliasRow) {
    if (!partnerId) return;
    setVerifyingAliasId(alias.id);
    try {
      const { data, error } = await supabase.functions.invoke("verify-wl-cname", {
        body: { partnerId, aliasId: alias.id },
      });
      if (error) throw error;
      const checkedAt = data.lastCheckedAt || new Date().toISOString();
      setAliases((prev) =>
        prev.map((a) =>
          a.id === alias.id
            ? {
                ...a,
                cname_status: data.status,
                cname_verified_at: data.verified ? checkedAt : a.cname_verified_at,
                cname_last_checked_at: checkedAt,
              }
            : a,
        ),
      );
      toast({
        title: data.verified ? "Alias connected" : "Verification failed",
        description: data.verified
          ? `${alias.alias_hostname} now redirects to your canonical domain.`
          : "DNS not found yet. Try again in a few minutes.",
        variant: data.verified ? "default" : "destructive",
      });
    } catch (err: any) {
      toast({ title: "Verification error", description: err.message, variant: "destructive" });
    } finally {
      setVerifyingAliasId(null);
    }
  }

  async function deleteAlias() {
    if (!deleteAliasId) return;
    try {
      const { error } = await supabase
        .from("white_label_domain_aliases")
        .delete()
        .eq("id", deleteAliasId);
      if (error) throw error;
      setAliases((prev) => prev.filter((a) => a.id !== deleteAliasId));
      toast({ title: "Alias removed" });
    } catch (err: any) {
      toast({
        title: "Could not delete",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setDeleteAliasId(null);
    }
  }

  function StatusBadge({ status }: { status: string | null | undefined }) {
    const meta = describeStatus(status);
    const cls =
      meta.tone === "success"
        ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
        : meta.tone === "info"
        ? "bg-blue-500/10 text-blue-600 border-blue-200"
        : meta.tone === "error"
        ? "bg-destructive/10 text-destructive border-destructive/30"
        : "bg-muted text-muted-foreground border-border";
    const Icon =
      meta.tone === "success" ? CheckCircle2 : meta.tone === "error" ? AlertTriangle : Clock;
    return (
      <Badge variant="outline" className={cn("gap-1", cls)}>
        <Icon className="w-3 h-3" />
        {meta.label}
      </Badge>
    );
  }

  function DnsRecordsTable({ hostname }: { hostname: string }) {
    const { records, isApex } = buildDnsInstructions(hostname);
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Add the following record{records.length > 1 ? "s" : ""} at your DNS provider:
        </p>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Type</th>
                <th className="text-left px-3 py-2 font-medium">Host / Name</th>
                <th className="text-left px-3 py-2 font-medium">Value</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              {records.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2">{r.type}</td>
                  <td className="px-3 py-2">{r.host}</td>
                  <td className="px-3 py-2 break-all">{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isApex && (
          <p className="text-xs text-muted-foreground">
            Apex domain detected. If your DNS provider supports CNAME flattening (e.g. Cloudflare, DNSimple),
            you can use that instead.
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="space-y-2">
          <Button variant="ghost" size="sm" asChild className="-ml-2 h-8">
            <Link to="/white-label-dashboard/account/branding">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Branding
            </Link>
          </Button>
          <div className="flex items-start gap-3">
            <Globe className="w-7 h-7 text-primary mt-1" />
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-heading">Custom Domain</h1>
              <p className="text-muted-foreground mt-1">
                Connect your own domain so your clients see your brand in the URL.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading…</div>
        ) : (
          <>
            {/* Canonical Domain */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle>Canonical Domain</CardTitle>
                    <CardDescription>
                      The main hostname your clients will visit. All other domains redirect here.
                    </CardDescription>
                  </div>
                  {canonical && <StatusBadge status={canonicalStatus} />}
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {!canonical && !editingCanonical && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-3 block">Choose a subdomain style</Label>
                      <RadioGroup
                        value={style}
                        onValueChange={(v) => setStyle(v as SubdomainStyle)}
                        className="grid sm:grid-cols-2 gap-3"
                      >
                        <label
                          className={cn(
                            "flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
                            style === "portal" ? "border-primary bg-primary/5" : "hover:bg-muted/30",
                          )}
                        >
                          <RadioGroupItem value="portal" className="mt-1" />
                          <div>
                            <div className="font-medium">portal.yourdomain.com</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Most common. Reads as a dedicated client portal.
                            </div>
                          </div>
                        </label>
                        <label
                          className={cn(
                            "flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
                            style === "clients" ? "border-primary bg-primary/5" : "hover:bg-muted/30",
                          )}
                        >
                          <RadioGroupItem value="clients" className="mt-1" />
                          <div>
                            <div className="font-medium">clients.yourdomain.com</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Friendlier alternative if you serve direct customers.
                            </div>
                          </div>
                        </label>
                      </RadioGroup>
                    </div>
                    <Button onClick={openCanonicalEditor}>
                      <Plus className="w-4 h-4 mr-1" />
                      Connect a domain
                    </Button>
                  </div>
                )}

                {canonical && !editingCanonical && (
                  <div className="space-y-4">
                    <div className="rounded-lg border bg-muted/20 p-4 flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">
                          Connected domain
                        </div>
                        <div className="font-mono text-base font-medium mt-1">{canonical}</div>
                        {canonicalVerifiedAt && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Last verified {new Date(canonicalVerifiedAt).toLocaleString()}
                          </div>
                        )}
                        {canonicalLastCheckedAt && (
                          <div className="text-xs text-muted-foreground">
                            Last checked {new Date(canonicalLastCheckedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={verifyCanonical}
                          disabled={verifyingCanonical}
                        >
                          <RefreshCw
                            className={cn("w-4 h-4 mr-1", verifyingCanonical && "animate-spin")}
                          />
                          Check status
                        </Button>
                        <Button variant="outline" size="sm" onClick={openCanonicalEditor}>
                          Change domain
                        </Button>
                      </div>
                    </div>

                    {canonicalStatus !== "active" && canonicalStatus !== "verified" && (
                      <div className="rounded-lg border border-blue-200 bg-blue-500/5 p-4 space-y-4">
                        <DnsRecordsTable hostname={canonical} />
                        <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
                          <li>Log in to your domain registrar (GoDaddy, Namecheap, Cloudflare…).</li>
                          <li>Open the DNS / Zone settings for your domain.</li>
                          <li>Add the record shown above.</li>
                          <li>Save changes, wait 5–30 min, then click <strong>Check status</strong>.</li>
                        </ol>
                      </div>
                    )}

                    {(canonicalStatus === "active" || canonicalStatus === "verified") && (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-500/5 p-4 text-sm">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-emerald-700 dark:text-emerald-400">
                              Your domain is connected.
                            </p>
                            <p className="text-muted-foreground mt-1">
                              SSL and global caching may take a few more minutes to fully propagate.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {editingCanonical && (
                  <div className="space-y-3 rounded-lg border p-4">
                    <Label htmlFor="canonical-input">Enter your full hostname</Label>
                    <Input
                      id="canonical-input"
                      value={draftCanonical}
                      onChange={(e) => {
                        setDraftCanonical(e.target.value);
                        setDraftError(null);
                      }}
                      placeholder={`${style}.yourdomain.com`}
                      autoFocus
                    />
                    {draftError && <p className="text-xs text-destructive">{draftError}</p>}
                    <div className="flex gap-2 justify-end pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingCanonical(false);
                          setDraftError(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button size="sm" onClick={saveCanonical} disabled={savingCanonical}>
                        {savingCanonical ? "Saving…" : "Save & show DNS"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Aliases */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle>Domain Aliases (Optional)</CardTitle>
                    <CardDescription>
                      Extra hostnames that automatically redirect to your canonical domain.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowAddAlias(true);
                      setAliasInput("");
                      setAliasError(null);
                    }}
                    disabled={!canonical}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add alias
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {!canonical && (
                  <p className="text-sm text-muted-foreground">
                    Connect a canonical domain first to add aliases.
                  </p>
                )}
                {canonical && aliases.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No aliases yet. Add one to redirect e.g. <code>clients.yourdomain.com</code>{" "}
                    to your canonical hostname.
                  </p>
                )}
                {aliases.map((alias) => {
                  const verified =
                    alias.cname_status === "active" || alias.cname_status === "verified";
                  return (
                    <div key={alias.id} className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <div className="font-mono text-sm font-medium">{alias.alias_hostname}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Redirects to <span className="font-mono">{canonical}</span>
                          </div>
                          {alias.cname_last_checked_at && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Last checked {new Date(alias.cname_last_checked_at).toLocaleString()}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={alias.cname_status} />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => verifyAlias(alias)}
                            disabled={verifyingAliasId === alias.id}
                          >
                            <RefreshCw
                              className={cn(
                                "w-4 h-4 mr-1",
                                verifyingAliasId === alias.id && "animate-spin",
                              )}
                            />
                            Check
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteAliasId(alias.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {!verified && <DnsRecordsTable hostname={alias.alias_hostname} />}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* How it works */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Info className="w-5 h-5 text-primary" />
                  How it works
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="why">
                    <AccordionTrigger>Why use a custom domain?</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground space-y-2">
                      A custom domain replaces our default URL with your own brand, so clients
                      log in at <code>portal.yourdomain.com</code> instead of a generic address.
                      It increases trust and keeps your brand visible end-to-end.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="see">
                    <AccordionTrigger>What will my clients see?</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground space-y-2">
                      Once verified, every client URL uses your domain — login, dashboard, billing,
                      and all internal links. Our branding never appears in the address bar.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="propagation">
                    <AccordionTrigger>How long does setup take?</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground space-y-2">
                      DNS changes typically propagate in 5–30 minutes, but can take up to 24 hours
                      depending on your provider. SSL certificates are issued automatically and
                      usually activate within minutes after DNS verifies.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="aliases">
                    <AccordionTrigger>What's the difference between canonical and aliases?</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground space-y-2">
                      The <strong>canonical</strong> domain is the main address clients use. Any
                      <strong> alias</strong> automatically issues a 301 redirect to the canonical
                      domain, so links keep working if you change branding or migrate.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="pitfalls">
                    <AccordionTrigger>Common pitfalls</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground space-y-2">
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Conflicting existing DNS records on the same hostname.</li>
                        <li>Cloudflare proxy enabled (orange cloud) — set to DNS only first.</li>
                        <li>CAA records that exclude Let's Encrypt.</li>
                        <li>Apex domains require A records, not CNAME.</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Change canonical warning */}
      <AlertDialog open={showChangeWarning} onOpenChange={setShowChangeWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change your canonical domain?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">Changing your canonical domain has real-world impact:</span>
              <ul className="list-disc pl-5 space-y-1">
                <li>Existing client login links pointing to <code>{canonical}</code> may stop working.</li>
                <li>SSL provisioning for the new domain can take several minutes.</li>
                <li>DNS propagation can take up to 24 hours depending on your provider.</li>
              </ul>
              <span className="block">Continue?</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmChangeCanonical}>Yes, change it</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add alias modal */}
      <Dialog open={showAddAlias} onOpenChange={setShowAddAlias}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add an alias domain</DialogTitle>
            <DialogDescription>
              Traffic to this hostname will redirect to your canonical domain.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="alias-input">Alias hostname</Label>
            <Input
              id="alias-input"
              value={aliasInput}
              onChange={(e) => {
                setAliasInput(e.target.value);
                setAliasError(null);
              }}
              placeholder="clients.yourdomain.com"
              autoFocus
            />
            {aliasError && <p className="text-xs text-destructive">{aliasError}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddAlias(false)}>
              Cancel
            </Button>
            <Button onClick={addAlias} disabled={savingAlias}>
              {savingAlias ? "Adding…" : "Add alias"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete alias confirm */}
      <AlertDialog open={!!deleteAliasId} onOpenChange={(o) => !o && setDeleteAliasId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this alias?</AlertDialogTitle>
            <AlertDialogDescription>
              Any traffic to this alias will stop being routed to your portal. You can re-add it
              later, but you'll need to re-verify DNS.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteAlias}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
