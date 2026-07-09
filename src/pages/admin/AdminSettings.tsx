import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Save, Loader2, Plug, Banknote, Eye, EyeOff, CheckCircle, MessageSquare, RefreshCw, Copy, FlaskConical, ArrowRight, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PabblySettings } from '@/components/admin/PabblySettings';
import { LeadScoringConfig } from '@/components/admin/LeadScoringConfig';

interface AdminSettings {
  companyName: string;
  supportEmail: string;
  enableEmailNotifications: boolean;
  defaultCommissionRate: number;
}

export default function AdminSettings() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<AdminSettings>({
    companyName: '24H Virtual',
    supportEmail: 'support@24hvirtual.com',
    enableEmailNotifications: true,
    defaultCommissionRate: 10,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('admin_settings')
        .select('key, value');

      if (!error && data) {
        const settingsMap: Record<string, unknown> = {};
        data.forEach(row => {
          settingsMap[row.key] = row.value;
        });

        setSettings({
          companyName: (settingsMap.company_name as string) || '24H Virtual',
          supportEmail: (settingsMap.support_email as string) || 'support@24hvirtual.com',
          enableEmailNotifications: settingsMap.enable_email_notifications as boolean ?? true,
          defaultCommissionRate: (settingsMap.default_commission_rate as number) || 10,
        });
      }

      setIsLoading(false);
    };

    fetchSettings();
  }, []);

  const saveSetting = async (key: string, value: unknown) => {
    const { error } = await supabase
      .from('admin_settings')
      .upsert({
        key,
        value: JSON.stringify(value),
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'key',
      });

    return !error;
  };

  const handleSave = async () => {
    setIsSaving(true);

    const settingsToSave = [
      { key: 'company_name', value: settings.companyName },
      { key: 'support_email', value: settings.supportEmail },
      { key: 'enable_email_notifications', value: settings.enableEmailNotifications },
      { key: 'default_commission_rate', value: settings.defaultCommissionRate },
    ];

    const results = await Promise.all(
      settingsToSave.map(s => saveSetting(s.key, s.value))
    );

    setIsSaving(false);

    if (results.every(Boolean)) {
      toast.success('Settings saved', { description: 'Your settings have been updated successfully.' });
    } else {
      toast.error('Error', { description: 'Some settings failed to save. Please try again.' });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-heading">Settings</h1>
          <p className="text-muted-foreground mt-1">Configure your admin settings</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border p-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-heading">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your admin settings</p>
      </div>

      {/* Discovery banner: Product Testing */}
      <Link
        to="/admin/settings/product-testing"
        className="block group"
      >
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5 hover:shadow-elevated transition-all">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center text-primary shrink-0">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold flex items-center gap-2">
                🧪 Product Testing
                <Badge variant="outline" className="text-[10px]">Superadmin</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Open the segmented QA launcher to test each dashboard, onboarding flow, and product area in isolation.
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </CardContent>
        </Card>
      </Link>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="affiliates">Affiliates</TabsTrigger>
          <TabsTrigger value="lead-scoring">Lead Scoring</TabsTrigger>
          <TabsTrigger value="shifts" className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            Shifts
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-1">
            <Plug className="w-4 h-4" />
            Integrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Manage your company information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={settings.companyName}
                  onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                />
              </div>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Configure how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email notifications for new leads and calls
                  </p>
                </div>
                <Switch
                  checked={settings.enableEmailNotifications}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enableEmailNotifications: checked })
                  }
                />
              </div>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="affiliates" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Affiliate Settings</CardTitle>
              <CardDescription>Configure affiliate program settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="commissionRate">Default Commission Rate (%)</Label>
                <Input
                  id="commissionRate"
                  type="number"
                  min="0"
                  max="100"
                  value={settings.defaultCommissionRate}
                  onChange={(e) =>
                    setSettings({ ...settings, defaultCommissionRate: parseInt(e.target.value) || 0 })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  This rate will be applied to new affiliates by default
                </p>
              </div>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lead-scoring" className="space-y-6 mt-6">
          <LeadScoringConfig />
        </TabsContent>

        <TabsContent value="shifts" className="space-y-6 mt-6">
          <ShiftBreakSettingsCard />
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6 mt-6">
          <PabblySettings />

          {/* Slack Integration */}
          <SlackIntegrationCard />

          {/* Meeting Ingestion Webhook */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plug className="w-5 h-5" />
                Meeting Ingestion (Bookii via Pabbly)
              </CardTitle>
              <CardDescription>
                Configure Pabbly Connect to forward Bookii booking events to this webhook URL
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-meeting`}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  onClick={async () => {
                    await navigator.clipboard.writeText(
                      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-meeting`
                    );
                    toast.success('Copied!', { description: 'Meeting webhook URL copied to clipboard' });
                  }}
                >
                  Copy
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Add this URL to your Pabbly workflow with header: <code className="bg-muted px-1 rounded">X-Pabbly-Secret: your_secret</code>
              </p>
            </CardContent>
          </Card>

          {/* Bookii Direct Webhook */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plug className="w-5 h-5" />
                Bookii Direct Webhook
              </CardTitle>
              <CardDescription>
                Configure this URL in Bookii → Settings → Integrations → Webhooks. Handles booking.created, booking.cancelled, and booking.rescheduled events natively via HMAC-SHA256 signature verification.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bookii-webhook`}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  onClick={async () => {
                    await navigator.clipboard.writeText(
                      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bookii-webhook`
                    );
                    toast.success('Copied!', { description: 'Bookii webhook URL copied to clipboard' });
                  }}
                >
                  Copy
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Bookii signs each request with <code className="bg-muted px-1 rounded">X-Bookii-Signature: sha256=…</code> — set the signing secret once via: <code className="bg-muted px-1 rounded text-xs">npx supabase secrets set BOOKII_WEBHOOK_SECRET="…" --project-ref sdsxdqsomxuimrjpaylv</code>
              </p>
            </CardContent>
          </Card>

          {/* Airwallex Payouts */}
          <AirwallexSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ShiftBreakSettingsCard() {
  const [lunchMinutes, setLunchMinutes] = useState(30);
  const [bathroomMinutes, setBathroomMinutes] = useState(5);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await (supabase as any)
        .from('shift_break_settings')
        .select('setting_key, setting_value');
      if (data) {
        const map: Record<string, string> = {};
        (data as { setting_key: string; setting_value: string }[]).forEach((row) => {
          map[row.setting_key] = row.setting_value;
        });
        setLunchMinutes(parseInt(map.lunch_break_minutes ?? '30'));
        setBathroomMinutes(parseInt(map.bathroom_break_allowance_minutes ?? '5'));
      }
      setIsLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const { user } = (await supabase.auth.getUser()).data;
    const results = await Promise.all([
      (supabase as any).from('shift_break_settings').upsert(
        { setting_key: 'lunch_break_minutes', setting_value: String(lunchMinutes), updated_by: user?.id ?? null, updated_at: new Date().toISOString() },
        { onConflict: 'setting_key' },
      ),
      (supabase as any).from('shift_break_settings').upsert(
        { setting_key: 'bathroom_break_allowance_minutes', setting_value: String(bathroomMinutes), updated_by: user?.id ?? null, updated_at: new Date().toISOString() },
        { onConflict: 'setting_key' },
      ),
    ]);
    setIsSaving(false);
    if (results.every((r: any) => !r.error)) {
      toast.success('Break settings saved', { description: 'Break deduction rules updated for all agents.' });
    } else {
      toast.error('Error', { description: 'Failed to save break settings.' });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Shift &amp; Break Settings
        </CardTitle>
        <CardDescription>
          Configure break durations and deduction rules for agent timesheets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="lunch-minutes">Lunch Break Duration</Label>
          <Select value={String(lunchMinutes)} onValueChange={(v) => setLunchMinutes(Number(v))}>
            <SelectTrigger id="lunch-minutes">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="60">60 minutes</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Lunch is always unpaid — the full duration is deducted from billable hours.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bathroom-minutes">Bathroom Break Allowance (minutes)</Label>
          <Input
            id="bathroom-minutes"
            type="number"
            min="0"
            max="30"
            value={bathroomMinutes}
            onChange={(e) => setBathroomMinutes(parseInt(e.target.value) || 0)}
          />
          <p className="text-sm text-muted-foreground">
            Only bathroom time over this allowance is deducted from billable hours.
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Break Settings
        </Button>
      </CardContent>
    </Card>
  );
}

function SlackIntegrationCard() {
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/slack-events`;
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/slack-sync`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );
      const result = await resp.json();
      if (!resp.ok || result.error) throw new Error(result.error || 'Sync failed');
      toast.success('Slack sync complete', {
        description: `${result.channels_synced} channels, ${result.users_fetched} users synced.`,
      });
    } catch (err: any) {
      toast.error('Sync failed', { description: err.message });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Slack Integration
        </CardTitle>
        <CardDescription>
          Connect Slack to enable real-time messaging in the CRM. Add SLACK_BOT_TOKEN and SLACK_SIGNING_SECRET as secrets.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Events Webhook URL</Label>
          <div className="flex gap-2">
            <Input value={webhookUrl} readOnly className="font-mono text-sm" />
            <Button
              variant="outline"
              size="icon"
              onClick={async () => {
                await navigator.clipboard.writeText(webhookUrl);
                toast.success('Copied!', { description: 'Slack webhook URL copied.' });
              }}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Paste this URL into your Slack App's Event Subscriptions → Request URL.
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing} variant="outline">
          {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Sync Channels & Users
        </Button>
      </CardContent>
    </Card>
  );
}

function AirwallexSettings() {
  const [clientId, setClientId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasKeys, setHasKeys] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('admin_settings')
        .select('key, value')
        .in('key', ['airwallex_client_id', 'airwallex_api_key']);

      if (data) {
        const map: Record<string, string> = {};
        data.forEach(row => {
          map[row.key] = (row.value as string) || '';
        });
        setClientId(map.airwallex_client_id || '');
        setApiKey(map.airwallex_api_key || '');
        setHasKeys(!!(map.airwallex_client_id && map.airwallex_api_key));
      }
      setIsLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const { user } = (await supabase.auth.getUser()).data;

    const results = await Promise.all([
      supabase.from('admin_settings').upsert({
        key: 'airwallex_client_id',
        value: JSON.stringify(clientId),
        updated_by: user?.id || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' }),
      supabase.from('admin_settings').upsert({
        key: 'airwallex_api_key',
        value: JSON.stringify(apiKey),
        updated_by: user?.id || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' }),
    ]);

    setIsSaving(false);

    if (results.every(r => !r.error)) {
      setHasKeys(!!(clientId && apiKey));
      toast.success('Airwallex keys saved', { description: 'Your Airwallex API credentials have been updated.' });
    } else {
      toast.error('Error', { description: 'Failed to save Airwallex credentials.' });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="w-5 h-5" />
          Airwallex Payouts
          {hasKeys && (
            <Badge variant="default" className="ml-2 bg-cta text-cta-foreground">
              <CheckCircle className="w-3 h-3 mr-1" /> Connected
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Configure Airwallex API credentials for automated agent payouts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="airwallex_client_id">Client ID</Label>
          <Input
            id="airwallex_client_id"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="Enter your Airwallex Client ID"
            className="font-mono text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="airwallex_api_key">API Key</Label>
          <div className="flex gap-2">
            <Input
              id="airwallex_api_key"
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Airwallex API Key"
              className="font-mono text-sm"
            />
            <Button variant="ghost" size="icon" onClick={() => setShowApiKey(!showApiKey)}>
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Obtain your credentials from the{' '}
          <a href="https://www.airwallex.com/app/settings/api" target="_blank" rel="noopener noreferrer" className="text-primary underline">
            Airwallex dashboard → Settings → API Keys
          </a>
        </p>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Airwallex Keys
        </Button>
      </CardContent>
    </Card>
  );
}
