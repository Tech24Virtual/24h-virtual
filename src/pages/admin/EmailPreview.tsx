import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Mail } from "lucide-react";

type TemplateKey =
  | "welcome"
  | "invoice"
  | "payment_failed"
  | "ticket_reply"
  | "lead_alert"
  | "application_received";

const TEMPLATES: { value: TemplateKey; label: string; sendFn: string | null }[] = [
  { value: "welcome", label: "Welcome", sendFn: "send-client-welcome-email" },
  { value: "invoice", label: "Invoice", sendFn: "send-invoice-email" },
  { value: "payment_failed", label: "Payment failed", sendFn: "send-payment-failed-email" },
  { value: "ticket_reply", label: "Ticket reply", sendFn: null },
  { value: "lead_alert", label: "Lead alert", sendFn: null },
  { value: "application_received", label: "Application received", sendFn: null },
];

const DEFAULT_SAMPLES: Record<TemplateKey, Record<string, any>> = {
  welcome: { recipientName: "Alex", ctaUrl: "https://24hv.io/client-dashboard", ctaLabel: "Open dashboard" },
  invoice: { recipientName: "Alex", invoiceNumber: "INV-1042", amount: "$199.00 USD", dueDate: "Apr 30, 2026", invoiceUrl: "https://24hv.io/invoice/1042" },
  payment_failed: { recipientName: "Alex", amount: "$199.00 USD", retryDate: "Apr 19, 2026", updateCardUrl: "https://24hv.io/client-dashboard/billing" },
  ticket_reply: { recipientName: "Alex", ticketNumber: 1042, subject: "Forwarding number not working", authorName: "Support", message: "We've updated your forwarding number and tested it end-to-end.", isNewTicket: false },
  lead_alert: { name: "Jamie Rivera", email: "jamie@example.com", phone: "+1 555 123 4567", company: "Acme Co", service_type: "AI Receptionist", sourceLabel: "Cost Calculator", notes: "Looking for 24/7 coverage on inbound sales calls.", plan_minutes: 500 },
  application_received: { name: "Morgan Lee", email: "morgan@example.com", phone: "+1 555 987 6543", cover_letter: "I have 5+ years of customer support experience and would love to join the team." },
};

export default function EmailPreview() {
  const { toast } = useToast();
  const [template, setTemplate] = useState<TemplateKey>("welcome");
  const [partnerId, setPartnerId] = useState<string>("default");
  const [partners, setPartners] = useState<{ id: string; company_name: string }[]>([]);
  const [sample, setSample] = useState<Record<string, any>>(DEFAULT_SAMPLES.welcome);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewSubject, setPreviewSubject] = useState<string>("");
  const [previewBranding, setPreviewBranding] = useState<{ brandName: string; brandColor: string; fromAddress: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string>("");
  const debounceRef = useRef<number | null>(null);

  // Load partners + admin email once
  useEffect(() => {
    (async () => {
      const [{ data: partnersData }, { data: { user } }] = await Promise.all([
        supabase.from("white_label_partners").select("id, company_name").order("company_name"),
        supabase.auth.getUser(),
      ]);
      setPartners(partnersData || []);
      setAdminEmail(user?.email || "");
    })();
  }, []);

  // Reset sample when template changes
  useEffect(() => {
    setSample(DEFAULT_SAMPLES[template]);
  }, [template]);

  // Debounced live preview
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void renderPreview();
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, partnerId, JSON.stringify(sample)]);

  async function renderPreview() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("preview-email-template", {
        body: {
          template,
          partnerId: partnerId === "default" ? null : partnerId,
          sampleData: sample,
        },
      });
      if (error) throw error;
      setPreviewHtml(data.html);
      setPreviewSubject(data.subject);
      setPreviewBranding(data.branding);
    } catch (err: any) {
      toast({ title: "Preview failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function sendTestToMe() {
    if (!adminEmail) {
      toast({ title: "No admin email on file", variant: "destructive" });
      return;
    }
    const def = TEMPLATES.find((t) => t.value === template);
    if (!def?.sendFn) {
      toast({
        title: "Test send not available",
        description: "This template is fired by a system event (lead/application/ticket) and has no direct send wrapper. Use the live preview to verify.",
      });
      return;
    }

    setSending(true);
    try {
      const body: Record<string, any> = {
        recipientEmail: adminEmail,
        partnerId: partnerId === "default" ? null : partnerId,
        preview: true,
        ...sample,
      };
      const { data, error } = await supabase.functions.invoke(def.sendFn, { body });
      if (error) throw error;
      toast({
        title: "Test email sent",
        description: `Sent to ${adminEmail} (id: ${data?.emailId || "n/a"})`,
      });
    } catch (err: any) {
      toast({ title: "Send failed", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  const fields = useMemo(() => Object.keys(sample), [sample]);

  function setField(key: string, value: any) {
    setSample((s) => ({ ...s, [key]: value }));
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Mail className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Email preview</h1>
          <p className="text-sm text-muted-foreground">Inspect every transactional template across any tenant brand.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        {/* Controls */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Template & brand</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs">Template</Label>
                <Select value={template} onValueChange={(v) => setTemplate(v as TemplateKey)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEMPLATES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Brand as</Label>
                <Select value={partnerId} onValueChange={setPartnerId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">24H Virtual (default)</SelectItem>
                    {partners.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {previewBranding && (
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">From:</span>
                    <code className="text-[11px]">{previewBranding.fromAddress}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Color:</span>
                    <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: previewBranding.brandColor }} />
                    <code className="text-[11px]">{previewBranding.brandColor}</code>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Sample data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {fields.map((key) => {
                const value = sample[key];
                const isLong = typeof value === "string" && (value.length > 80 || key === "notes" || key === "cover_letter" || key === "message" || key === "intro");
                if (typeof value === "boolean") {
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <Label className="text-xs">{key}</Label>
                      <input type="checkbox" checked={value} onChange={(e) => setField(key, e.target.checked)} />
                    </div>
                  );
                }
                return (
                  <div key={key}>
                    <Label className="text-xs">{key}</Label>
                    {isLong ? (
                      <Textarea
                        value={String(value ?? "")}
                        onChange={(e) => setField(key, e.target.value)}
                        rows={3}
                        className="text-sm"
                      />
                    ) : (
                      <Input
                        value={String(value ?? "")}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setField(key, typeof value === "number" ? Number(raw) || 0 : raw);
                        }}
                        className="text-sm"
                      />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Button onClick={sendTestToMe} disabled={sending || !adminEmail} className="w-full">
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Send test to {adminEmail || "me"}
          </Button>
        </div>

        {/* Preview */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">Subject</div>
                <div className="font-medium truncate">{previewSubject || "—"}</div>
              </div>
              {loading && <Badge variant="secondary">Rendering…</Badge>}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <iframe
              title="Email preview"
              srcDoc={previewHtml}
              sandbox=""
              className="w-full"
              style={{ height: "calc(100vh - 240px)", minHeight: 600, border: 0, background: "#f3f4f6" }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
