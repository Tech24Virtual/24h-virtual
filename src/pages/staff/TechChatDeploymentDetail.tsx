import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Copy, RefreshCw } from 'lucide-react';

export default function TechChatDeploymentDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: deployment, isLoading } = useQuery({
    queryKey: ['chat-deployment', id],
    queryFn: async () => {
      const { data } = await supabase.from('chat_deployments').select('*').eq('id', id!).maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const { data: brand } = useQuery({
    queryKey: ['chat-brand', id],
    queryFn: async () => {
      const { data } = await supabase.from('chat_brand_configs').select('*').eq('deployment_id', id!).maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const { data: ai } = useQuery({
    queryKey: ['chat-ai', id],
    queryFn: async () => {
      const { data } = await supabase.from('chat_ai_configs').select('*').eq('deployment_id', id!).maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  // Branding state
  const [bForm, setBForm] = useState<any>({});
  useEffect(() => { if (brand) setBForm(brand); }, [brand]);

  // AI state
  const [aForm, setAForm] = useState<any>({});
  useEffect(() => { if (ai) setAForm(ai); }, [ai]);

  if (isLoading || !deployment) {
    return <StaffLayout role="tech"><p className="text-muted-foreground">Loading...</p></StaffLayout>;
  }

  const saveBranding = async () => {
    const { error } = await supabase.from('chat_brand_configs').update({
      logo_url: bForm.logo_url, accent_color: bForm.accent_color,
      launcher_label: bForm.launcher_label, greeting: bForm.greeting,
      offline_message: bForm.offline_message, online_label: bForm.online_label,
      offline_label: bForm.offline_label, pre_chat_form_enabled: bForm.pre_chat_form_enabled,
    }).eq('deployment_id', id!);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Saved', description: 'Branding updated' });
  };

  const saveAI = async () => {
    const { error } = await supabase.from('chat_ai_configs').update({
      mode: aForm.mode,
      faqs: aForm.faqs,
      system_instructions: aForm.system_instructions,
      escalation_keywords: typeof aForm.escalation_keywords === 'string'
        ? (aForm.escalation_keywords as string).split(',').map((s: string) => s.trim()).filter(Boolean)
        : aForm.escalation_keywords,
      handoff_on_low_confidence: aForm.handoff_on_low_confidence,
      handoff_after_intake: aForm.handoff_after_intake,
    }).eq('deployment_id', id!);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Saved', description: 'AI config updated' });
  };

  const toggleStatus = async (next: 'active' | 'paused' | 'draft') => {
    await supabase.from('chat_deployments').update({ status: next }).eq('id', id!);
    queryClient.invalidateQueries({ queryKey: ['chat-deployment', id] });
    toast({ title: 'Updated', description: `Status: ${next}` });
  };

  const regenerateToken = async () => {
    const newToken = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    const { error } = await supabase.from('chat_deployments').update({ widget_token: newToken }).eq('id', id!);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    queryClient.invalidateQueries({ queryKey: ['chat-deployment', id] });
    toast({ title: 'Regenerated', description: 'New widget token generated' });
  };

  const origin = window.location.origin;
  const snippet = `<script src="${origin}/widget/loader.js" data-token="${deployment.widget_token}" async></script>`;

  return (
    <StaffLayout role="tech">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold">{deployment.display_name}</h1>
            <div className="flex gap-2 mt-2">
              <Badge variant={deployment.ownership_mode === 'wl' ? 'secondary' : 'default'}>
                {deployment.ownership_mode === 'wl' ? 'WL Partner Client' : 'Direct Client'}
              </Badge>
              <Badge variant="outline" className="capitalize">{deployment.status}</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            {deployment.status !== 'active' && <Button onClick={() => toggleStatus('active')}>Activate</Button>}
            {deployment.status === 'active' && <Button variant="outline" onClick={() => toggleStatus('paused')}>Pause</Button>}
          </div>
        </div>

        <Tabs defaultValue="branding">
          <TabsList>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="ai">AI</TabsTrigger>
            <TabsTrigger value="embed">Embed</TabsTrigger>
          </TabsList>

          <TabsContent value="branding">
            <Card>
              <CardHeader><CardTitle>Branding</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Logo URL</Label>
                    <Input value={bForm.logo_url || ''} onChange={e => setBForm({ ...bForm, logo_url: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Accent Color</Label>
                    <Input type="color" value={bForm.accent_color || '#3B82F6'} onChange={e => setBForm({ ...bForm, accent_color: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Launcher Label</Label>
                    <Input value={bForm.launcher_label || ''} onChange={e => setBForm({ ...bForm, launcher_label: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Online Label</Label>
                    <Input value={bForm.online_label || ''} onChange={e => setBForm({ ...bForm, online_label: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Greeting</Label>
                  <Textarea value={bForm.greeting || ''} onChange={e => setBForm({ ...bForm, greeting: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Offline Message</Label>
                  <Textarea value={bForm.offline_message || ''} onChange={e => setBForm({ ...bForm, offline_message: e.target.value })} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={!!bForm.pre_chat_form_enabled} onCheckedChange={v => setBForm({ ...bForm, pre_chat_form_enabled: v })} />
                  <Label>Pre-chat form enabled</Label>
                </div>
                <Button onClick={saveBranding}>Save Branding</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai">
            <Card>
              <CardHeader><CardTitle>AI Configuration</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Chat Mode</Label>
                  <Select value={aForm.mode || 'agent_only'} onValueChange={v => setAForm({ ...aForm, mode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent_only">Agent only</SelectItem>
                      <SelectItem value="ai_first">AI first, then handoff</SelectItem>
                      <SelectItem value="ai_only">AI only</SelectItem>
                      <SelectItem value="offline_capture">Offline capture</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>System Instructions</Label>
                  <Textarea
                    value={aForm.system_instructions || ''}
                    onChange={e => setAForm({ ...aForm, system_instructions: e.target.value })}
                    rows={4}
                    placeholder="You are a friendly assistant for [client]..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>FAQs (JSON)</Label>
                  <Textarea
                    value={JSON.stringify(aForm.faqs || [], null, 2)}
                    onChange={e => { try { setAForm({ ...aForm, faqs: JSON.parse(e.target.value) }); } catch {} }}
                    rows={6}
                    className="font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground">Format: [{'{'}"question": "...", "answer": "..."{'}'}]</p>
                </div>
                <div className="space-y-2">
                  <Label>Escalation Keywords (comma-separated)</Label>
                  <Input
                    value={Array.isArray(aForm.escalation_keywords) ? aForm.escalation_keywords.join(', ') : (aForm.escalation_keywords || '')}
                    onChange={e => setAForm({ ...aForm, escalation_keywords: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={!!aForm.handoff_on_low_confidence} onCheckedChange={v => setAForm({ ...aForm, handoff_on_low_confidence: v })} />
                  <Label>Handoff on low AI confidence</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={!!aForm.handoff_after_intake} onCheckedChange={v => setAForm({ ...aForm, handoff_after_intake: v })} />
                  <Label>Handoff after intake</Label>
                </div>
                <Button onClick={saveAI}>Save AI Config</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="embed">
            <Card>
              <CardHeader><CardTitle>Embed Snippet</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Widget Token</Label>
                  <div className="flex gap-2">
                    <Input value={deployment.widget_token} readOnly className="font-mono text-xs" />
                    <Button variant="outline" size="icon" onClick={regenerateToken} title="Regenerate token">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Snippet</Label>
                  <Textarea value={snippet} readOnly rows={3} className="font-mono text-xs" />
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(snippet); toast({ title: 'Copied' }); }}>
                    <Copy className="h-3 w-3 mr-1" /> Copy snippet
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Paste this into the &lt;body&gt; of any website (WordPress, Squarespace, Wix, Shopify, custom HTML).
                  {deployment.ownership_mode === 'wl' && ' WL deployments show only configured branding — no platform branding.'}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </StaffLayout>
  );
}
