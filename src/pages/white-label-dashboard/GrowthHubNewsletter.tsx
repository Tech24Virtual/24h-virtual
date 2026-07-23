import { WhiteLabelLayout } from "@/components/white-label/WhiteLabelLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Mail, Copy, Check, Loader2, ArrowLeft, Eye, Code, Send } from "lucide-react";
import { Link } from "react-router-dom";

const sanitizeHtml = (html: string) =>
  html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/g, '');

function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-US", { month: "long", year: "numeric" });
    options.push({ value, label });
  }
  return options;
}

export default function GrowthHubNewsletter() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const monthOptions = getMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value || "");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"preview" | "html">("preview");

  const { data: partner } = useQuery({
    queryKey: ["wl-partner", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("white_label_partners").select("id").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: drafts, isLoading } = useQuery({
    queryKey: ["wl-newsletter-drafts", partner?.id, selectedMonth],
    queryFn: async () => {
      const { data } = await supabase
        .from("wl_newsletter_drafts")
        .select("*")
        .eq("partner_id", partner!.id)
        .eq("draft_month", selectedMonth + "-01")
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!partner?.id && !!selectedMonth,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("wl-generate-newsletter", {
        body: { partner_id: partner!.id, draft_month: selectedMonth },
      });
      if (error) throw error;
      if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : data.error?.message ?? 'Unknown error');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wl-newsletter-drafts", partner?.id, selectedMonth] });
      toast({ title: "Newsletter generated!", description: "Your email draft is ready." });
    },
    onError: (e: Error) => {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    },
  });

  const copyText = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const CopyButton = ({ text, field, label }: { text: string; field: string; label: string }) => (
    <Button variant="outline" size="sm" onClick={() => copyText(text, field)}>
      {copiedField === field ? <><Check className="w-3.5 h-3.5 mr-1" /> Copied</> : <><Copy className="w-3.5 h-3.5 mr-1" /> {label}</>}
    </Button>
  );

  const SendViaEmailButton = ({ draft, partnerId }: { draft: any; partnerId?: string }) => {
    const sendMutation = useMutation({
      mutationFn: async () => {
        const { data, error } = await supabase.functions.invoke("wl-send-newsletter", {
          body: {
            scope: "partner",
            partner_id: partnerId,
            newsletter_draft_id: draft.id,
            subject: draft.subject_line,
            html_content: draft.html_content,
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : data.error?.message ?? 'Unknown error');
        return data;
      },
      onSuccess: (data) => {
        toast({ title: "Newsletter sent!", description: `Sent to ${data.sent} contacts.` });
      },
      onError: (e: Error) => {
        toast({ title: "Send failed", description: e.message, variant: "destructive" });
      },
    });

    return (
      <Button size="sm" onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending}>
        {sendMutation.isPending ? (
          <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Sending...</>
        ) : (
          <><Send className="w-3.5 h-3.5 mr-1" /> Send via Email</>
        )}
      </Button>
    );
  };

  const latestDraft = drafts?.[0];

  return (
    <WhiteLabelLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/white-label-dashboard/growth"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-heading">Newsletter Generator</h1>
            <p className="text-muted-foreground text-sm">Auto-draft email newsletters from your recent blog posts.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Generate Newsletter</CardTitle>
            <CardDescription>Select a month to create a newsletter from that month's blog posts.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
              {generateMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
              ) : (
                <><Mail className="w-4 h-4 mr-2" /> Generate Newsletter</>
              )}
            </Button>
          </CardContent>
        </Card>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {latestDraft && (
          <>
            {/* Subject Line */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Subject Line</CardTitle>
                  <CopyButton text={latestDraft.subject_line || ""} field="subject" label="Copy" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{latestDraft.subject_line}</p>
              </CardContent>
            </Card>

            {/* Email Content */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Email Content</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === "preview" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("preview")}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> Preview
                    </Button>
                    <Button
                      variant={viewMode === "html" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("html")}
                    >
                      <Code className="w-3.5 h-3.5 mr-1" /> HTML
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {viewMode === "preview" ? (
                  <div
                    className="border rounded-lg p-4 bg-background"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(latestDraft.html_content || "") }}
                  />
                ) : (
                  <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-96">
                    {latestDraft.html_content}
                  </pre>
                )}
              </CardContent>
            </Card>

            {/* Copy & Send Actions */}
            <div className="flex gap-3">
              <CopyButton text={latestDraft.html_content || ""} field="html" label="Copy HTML" />
              <CopyButton text={latestDraft.plain_text || ""} field="plain" label="Copy Plain Text" />
              <SendViaEmailButton draft={latestDraft} partnerId={partner?.id} />
            </div>

            {/* Previous Drafts */}
            {drafts && drafts.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Previous Drafts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {drafts.slice(1).map(draft => (
                    <div key={draft.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="text-sm font-medium">{draft.subject_line}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(draft.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <CopyButton text={draft.html_content || ""} field={`html-${draft.id}`} label="Copy HTML" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {!latestDraft && !isLoading && selectedMonth && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              No newsletter drafts for this month. Click "Generate Newsletter" to create one.
            </CardContent>
          </Card>
        )}
      </div>
    </WhiteLabelLayout>
  );
}
