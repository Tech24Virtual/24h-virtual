import { useState } from "react";
import { WhiteLabelLayout } from "@/components/white-label/WhiteLabelLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Mail, Loader2, ArrowLeft, CheckCircle2, XCircle, Plus, Trash2, Users } from "lucide-react";
import { Link } from "react-router-dom";

export default function GrowthHubEmail() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState("");
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactName, setNewContactName] = useState("");

  const { data: partner } = useQuery({
    queryKey: ["wl-partner", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("white_label_partners").select("id").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: connection } = useQuery({
    queryKey: ["wl-email-connection", partner?.id],
    queryFn: async () => {
      const { data } = await supabase.from("wl_email_connections").select("*").eq("partner_id", partner!.id).limit(1).maybeSingle();
      if (data) { setFromName(data.from_name); setFromEmail(data.from_email); }
      return data;
    },
    enabled: !!partner?.id,
  });

  const { data: contacts } = useQuery({
    queryKey: ["wl-email-contacts", partner?.id],
    queryFn: async () => {
      const { data } = await supabase.from("wl_email_contacts").select("*").eq("partner_id", partner!.id).eq("subscribed", true).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!partner?.id,
  });

  const { data: sends } = useQuery({
    queryKey: ["wl-email-sends", partner?.id],
    queryFn: async () => {
      const { data } = await supabase.from("wl_email_sends").select("*").eq("partner_id", partner!.id).order("created_at", { ascending: false }).limit(10);
      return data || [];
    },
    enabled: !!partner?.id,
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      if (!apiKey || !fromEmail) throw new Error("API key and from email are required");
      const { data, error } = await supabase.functions.invoke("wl-test-email-connection", {
        body: { api_key: apiKey, from_email: fromEmail },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => toast({ title: "Connection verified!" }),
    onError: (e: Error) => toast({ title: "Test failed", description: e.message, variant: "destructive" }),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!apiKey || !fromEmail || !fromName) throw new Error("All fields required");
      const payload = { partner_id: partner!.id, provider: "resend" as const, api_key_encrypted: apiKey, from_name: fromName, from_email: fromEmail, status: "connected", last_tested_at: new Date().toISOString() };
      if (connection) {
        const { error } = await supabase.from("wl_email_connections").update(payload).eq("id", connection.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("wl_email_connections").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wl-email-connection"] });
      toast({ title: "Email connection saved!" });
    },
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const addContactMutation = useMutation({
    mutationFn: async () => {
      if (!newContactEmail) throw new Error("Email is required");
      const { error } = await supabase.from("wl_email_contacts").insert({ partner_id: partner!.id, email: newContactEmail, name: newContactName || null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wl-email-contacts"] });
      setNewContactEmail(""); setNewContactName("");
      toast({ title: "Contact added!" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wl_email_contacts").update({ subscribed: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wl-email-contacts"] }),
  });

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
            <h1 className="text-2xl font-bold text-heading">Email Integration</h1>
            <p className="text-muted-foreground text-sm">Connect Resend to send newsletters directly.</p>
          </div>
        </div>

        <Tabs defaultValue="connection">
          <TabsList>
            <TabsTrigger value="connection">Connection</TabsTrigger>
            <TabsTrigger value="contacts">Contacts ({contacts?.length || 0})</TabsTrigger>
            <TabsTrigger value="history">Send History</TabsTrigger>
          </TabsList>

          <TabsContent value="connection" className="space-y-4 mt-4">
            {connection && (
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {connection.status === "connected" ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-destructive" />}
                    <div>
                      <p className="font-medium">{connection.from_email}</p>
                      <p className="text-xs text-muted-foreground">Resend • {connection.from_name}</p>
                    </div>
                  </div>
                  <Badge variant={connection.status === "connected" ? "default" : "destructive"}>{connection.status}</Badge>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resend Configuration</CardTitle>
                <CardDescription>Enter your Resend API key and sender details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label>Resend API Key</Label><Input type="password" placeholder="re_..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} /></div>
                <div className="space-y-2"><Label>From Name</Label><Input placeholder="Your Company" value={fromName} onChange={(e) => setFromName(e.target.value)} /></div>
                <div className="space-y-2"><Label>From Email</Label><Input placeholder="newsletter@yourdomain.com" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} /></div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => testMutation.mutate()} disabled={testMutation.isPending}>
                    {testMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Test
                  </Button>
                  <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contacts" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">Add Contact</CardTitle></CardHeader>
              <CardContent className="flex gap-3">
                <Input placeholder="Email" value={newContactEmail} onChange={(e) => setNewContactEmail(e.target.value)} className="flex-1" />
                <Input placeholder="Name (optional)" value={newContactName} onChange={(e) => setNewContactName(e.target.value)} className="flex-1" />
                <Button onClick={() => addContactMutation.mutate()} disabled={addContactMutation.isPending}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="w-4 h-4" /> Subscribers ({contacts?.length || 0})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(contacts || []).map(c => (
                  <div key={c.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{c.email}</p>
                      {c.name && <p className="text-xs text-muted-foreground">{c.name}</p>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteContactMutation.mutate(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                ))}
                {(!contacts || contacts.length === 0) && <p className="text-sm text-muted-foreground text-center py-4">No contacts yet.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">Recent Sends</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(sends || []).map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{s.subject}</p>
                      <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()} • {s.recipients_count} recipients</p>
                    </div>
                    <Badge variant={s.status === "sent" ? "default" : "secondary"}>{s.status}</Badge>
                  </div>
                ))}
                {(!sends || sends.length === 0) && <p className="text-sm text-muted-foreground text-center py-4">No sends yet.</p>}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </WhiteLabelLayout>
  );
}
