import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building, Mail, Phone, Palette, Eye, Globe, Type, Monitor, Save, ExternalLink, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const GOOGLE_FONTS = [
  '', 'Inter', 'Poppins', 'Roboto', 'Open Sans', 'Montserrat', 'Lato', 'Raleway',
  'Playfair Display', 'Merriweather', 'Source Sans Pro', 'Nunito', 'Work Sans',
  'DM Sans', 'Space Grotesk', 'Outfit', 'Plus Jakarta Sans',
];

interface BrandingForm {
  company_name: string;
  support_email: string;
  support_phone: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  login_page_title: string;
  welcome_message: string;
  portal_footer_text: string;
  powered_by_visible: boolean;
  font_heading: string;
  font_body: string;
  sidebar_style: string;
  email_from_name: string;
  email_from_address: string;
  email_reply_to: string;
  phone_greeting: string;
  email_footer: string;
  custom_domain: string;
  cname_status: string;
}

const DEFAULT_FORM: BrandingForm = {
  company_name: '',
  support_email: '',
  support_phone: '',
  logo_url: '',
  favicon_url: '',
  primary_color: '#0B60B0',
  secondary_color: '#40A578',
  accent_color: '',
  login_page_title: 'Client Portal',
  welcome_message: '',
  portal_footer_text: '',
  powered_by_visible: true,
  font_heading: '',
  font_body: '',
  sidebar_style: 'light',
  email_from_name: '',
  email_from_address: '',
  email_reply_to: '',
  phone_greeting: '',
  email_footer: '',
  custom_domain: '',
  cname_status: 'pending',
};

export function AdminPartnerBrandingTab({ partnerId }: { partnerId: string }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<BrandingForm>(DEFAULT_FORM);

  const { data: branding, isLoading } = useQuery({
    queryKey: ['admin-partner-branding', partnerId],
    queryFn: async () => {
      const { data } = await supabase
        .from('white_label_branding')
        .select('*')
        .eq('partner_id', partnerId)
        .maybeSingle();
      return data;
    },
    enabled: !!partnerId,
  });

  useEffect(() => {
    if (!branding) return;
    const d = branding as any;
    setForm({
      company_name: d.company_name || '',
      support_email: d.support_email || '',
      support_phone: d.support_phone || '',
      logo_url: d.logo_url || '',
      favicon_url: d.favicon_url || '',
      primary_color: d.primary_color || '#0B60B0',
      secondary_color: d.secondary_color || '#40A578',
      accent_color: d.accent_color || '',
      login_page_title: d.login_page_title || 'Client Portal',
      welcome_message: d.welcome_message || '',
      portal_footer_text: d.portal_footer_text || '',
      powered_by_visible: d.powered_by_visible ?? true,
      font_heading: d.font_heading || '',
      font_body: d.font_body || '',
      sidebar_style: d.sidebar_style || 'light',
      email_from_name: d.email_from_name || '',
      email_from_address: d.email_from_address || '',
      email_reply_to: d.email_reply_to || '',
      phone_greeting: d.phone_greeting || '',
      email_footer: d.email_footer || '',
      custom_domain: d.custom_domain || '',
      cname_status: d.cname_status || 'pending',
    });
  }, [branding]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // cname_status is managed by the verify edge function, not editable here
      const { cname_status, ...editableFields } = form;
      const { error } = await supabase
        .from('white_label_branding')
        .upsert({ ...editableFields, partner_id: partnerId }, { onConflict: 'partner_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      // Refreshes the branding query shared between this tab and the page header
      queryClient.invalidateQueries({ queryKey: ['admin-partner-branding', partnerId] });
      // Refreshes the partner query — key used by the Overview tab (white_label_partners row)
      // and the page-level header <h1> that shows partner.company_name
      queryClient.invalidateQueries({ queryKey: ['admin-partner', partnerId] });
      // Invalidates useWLPartnerBranding — used by preview page if opened in-session
      queryClient.invalidateQueries({ queryKey: ['wl-partner-branding', partnerId] });
      toast.success('Branding saved');
    },
    onError: (err: any) => {
      toast.error('Failed to save: ' + err.message);
    },
  });

  const set = (field: keyof BrandingForm, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const cnameStatusBadge = () => {
    switch (form.cname_status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-600 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'verifying':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Verifying</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="admin-branding-tab">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lg font-semibold text-heading">Partner Branding</h3>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <a
                href={`/admin/wl-preview/${partnerId}`}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="preview-portal-link"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Preview Portal
              </a>
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              data-testid="save-branding-btn"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? 'Saving...' : 'Save Branding'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground" data-testid="preview-hint">
            Save changes before previewing
          </p>
        </div>
      </div>

      {/* Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building className="w-4 h-4 text-primary" />Identity
          </CardTitle>
          <CardDescription>Name and contact info shown in all client-facing communications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4" data-testid="section-identity">
          <div className="space-y-2">
            <Label htmlFor="company_name">Company Display Name</Label>
            <Input
              id="company_name"
              data-testid="input-company-name"
              value={form.company_name}
              onChange={e => set('company_name', e.target.value)}
              placeholder="Partner company name"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="support_email" className="flex items-center gap-1">
                <Mail className="w-3 h-3" />Support Email
              </Label>
              <Input
                id="support_email"
                data-testid="input-support-email"
                type="email"
                value={form.support_email}
                onChange={e => set('support_email', e.target.value)}
                placeholder="support@partner.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support_phone" className="flex items-center gap-1">
                <Phone className="w-3 h-3" />Support Phone
              </Label>
              <Input
                id="support_phone"
                data-testid="input-support-phone"
                value={form.support_phone}
                onChange={e => set('support_phone', e.target.value)}
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="w-4 h-4 text-primary" />Visual Identity
          </CardTitle>
          <CardDescription>Colors, logo, and favicon</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6" data-testid="section-visual">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input
                id="logo_url"
                data-testid="input-logo-url"
                value={form.logo_url}
                onChange={e => set('logo_url', e.target.value)}
                placeholder="https://..."
              />
              {form.logo_url && (
                <div className="border rounded-lg p-3 bg-muted/30">
                  <img
                    src={form.logo_url}
                    alt="Logo preview"
                    className="h-10 max-w-[180px] object-contain"
                    data-testid="logo-preview"
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="favicon_url">Favicon URL</Label>
              <Input
                id="favicon_url"
                data-testid="input-favicon-url"
                value={form.favicon_url}
                onChange={e => set('favicon_url', e.target.value)}
                placeholder="https://..."
              />
              {form.favicon_url && (
                <div className="border rounded-lg p-3 bg-muted/30">
                  <img
                    src={form.favicon_url}
                    alt="Favicon preview"
                    className="h-8 w-8 object-contain"
                    data-testid="favicon-preview"
                  />
                </div>
              )}
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={form.primary_color}
                  onChange={e => set('primary_color', e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer"
                  data-testid="color-primary"
                />
                <Input
                  value={form.primary_color}
                  onChange={e => set('primary_color', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={form.secondary_color}
                  onChange={e => set('secondary_color', e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer"
                  data-testid="color-secondary"
                />
                <Input
                  value={form.secondary_color}
                  onChange={e => set('secondary_color', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Accent Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={form.accent_color || '#FF6B35'}
                  onChange={e => set('accent_color', e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer"
                  data-testid="color-accent"
                />
                <Input
                  value={form.accent_color}
                  onChange={e => set('accent_color', e.target.value)}
                  className="flex-1"
                  placeholder="#FF6B35"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Portal Copy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="w-4 h-4 text-primary" />Portal Copy
          </CardTitle>
          <CardDescription>Text and settings shown inside the client portal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4" data-testid="section-portal-copy">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="login_page_title">Login Page Title</Label>
              <Input
                id="login_page_title"
                data-testid="input-login-title"
                value={form.login_page_title}
                onChange={e => set('login_page_title', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="welcome_message">Welcome Message</Label>
              <Input
                id="welcome_message"
                data-testid="input-welcome-message"
                value={form.welcome_message}
                onChange={e => set('welcome_message', e.target.value)}
                placeholder="Welcome to your client portal"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="portal_footer_text">Portal Footer Text</Label>
            <Input
              id="portal_footer_text"
              data-testid="input-portal-footer"
              value={form.portal_footer_text}
              onChange={e => set('portal_footer_text', e.target.value)}
              placeholder="© 2026 Partner Co. All rights reserved."
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">Show "Powered by" badge</p>
              <p className="text-xs text-muted-foreground">Attribution badge in the portal footer</p>
            </div>
            <Switch
              checked={form.powered_by_visible}
              onCheckedChange={v => set('powered_by_visible', v)}
              data-testid="toggle-powered-by"
            />
          </div>
        </CardContent>
      </Card>

      {/* Typography */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Type className="w-4 h-4 text-primary" />Typography
          </CardTitle>
          <CardDescription>Fonts and sidebar style for the partner portal</CardDescription>
        </CardHeader>
        <CardContent data-testid="section-typography">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Heading Font</Label>
              <Select value={form.font_heading} onValueChange={v => set('font_heading', v)}>
                <SelectTrigger data-testid="select-font-heading">
                  <SelectValue placeholder="Default (system)" />
                </SelectTrigger>
                <SelectContent>
                  {GOOGLE_FONTS.map(f => (
                    <SelectItem key={f || 'default'} value={f || ' '}>{f || 'Default (system)'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Body Font</Label>
              <Select value={form.font_body} onValueChange={v => set('font_body', v)}>
                <SelectTrigger data-testid="select-font-body">
                  <SelectValue placeholder="Default (system)" />
                </SelectTrigger>
                <SelectContent>
                  {GOOGLE_FONTS.map(f => (
                    <SelectItem key={f || 'default'} value={f || ' '}>{f || 'Default (system)'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Monitor className="w-3 h-3" />Sidebar Style
              </Label>
              <Select value={form.sidebar_style} onValueChange={v => set('sidebar_style', v)}>
                <SelectTrigger data-testid="select-sidebar-style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Branding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="w-4 h-4 text-primary" />Email Branding
          </CardTitle>
          <CardDescription>Sender identity and communication templates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4" data-testid="section-email-branding">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email_from_name">From Name</Label>
              <Input
                id="email_from_name"
                data-testid="input-email-from-name"
                value={form.email_from_name}
                onChange={e => set('email_from_name', e.target.value)}
                placeholder="Partner Support"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email_from_address">From Address</Label>
              <Input
                id="email_from_address"
                data-testid="input-email-from-address"
                type="email"
                value={form.email_from_address}
                onChange={e => set('email_from_address', e.target.value)}
                placeholder="noreply@partner.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email_reply_to">Reply-To</Label>
              <Input
                id="email_reply_to"
                data-testid="input-email-reply-to"
                type="email"
                value={form.email_reply_to}
                onChange={e => set('email_reply_to', e.target.value)}
                placeholder="support@partner.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone_greeting">Phone Greeting Script</Label>
            <Textarea
              id="phone_greeting"
              data-testid="input-phone-greeting"
              value={form.phone_greeting}
              onChange={e => set('phone_greeting', e.target.value)}
              rows={3}
              placeholder="Thank you for calling [Company]. How may I assist you?"
            />
            <p className="text-xs text-muted-foreground">Use [Company Name] as a placeholder</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email_footer">Email Footer</Label>
            <Textarea
              id="email_footer"
              data-testid="input-email-footer"
              value={form.email_footer}
              onChange={e => set('email_footer', e.target.value)}
              rows={3}
              placeholder="Email footer / signature"
            />
          </div>
        </CardContent>
      </Card>

      {/* Domain */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="w-4 h-4 text-primary" />Custom Domain
          </CardTitle>
          <CardDescription>Partner's custom hostname for their client portal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4" data-testid="section-domain">
          <div className="space-y-2">
            <Label htmlFor="custom_domain">Custom Domain</Label>
            <Input
              id="custom_domain"
              data-testid="input-custom-domain"
              value={form.custom_domain}
              onChange={e => set('custom_domain', e.target.value)}
              placeholder="portal.partner.com"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">CNAME Status:</span>
            <span data-testid="cname-status-badge">{cnameStatusBadge()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
