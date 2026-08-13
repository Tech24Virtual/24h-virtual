import { useState, useEffect, useRef } from "react";
import { Palette, Save, Globe, Upload, Building, Mail, Phone, CheckCircle, AlertCircle, Clock, RefreshCw, Eye, Type, Monitor, ImageIcon, X, LayoutDashboard, FileText, Calendar, CreditCard, LifeBuoy, Settings as SettingsIcon, User, LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface BrandingData {
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  custom_domain: string;
  phone_greeting: string;
  email_footer: string;
  company_name: string;
  support_email: string;
  support_phone: string;
  favicon_url: string;
  login_page_title: string;
  welcome_message: string;
  sidebar_style: string;
  font_heading: string;
  font_body: string;
  portal_footer_text: string;
  powered_by_visible: boolean;
  cname_status: string;
}

const GOOGLE_FONTS = [
  "", "Inter", "Poppins", "Roboto", "Open Sans", "Montserrat", "Lato", "Raleway",
  "Playfair Display", "Merriweather", "Source Sans Pro", "Nunito", "Work Sans",
  "DM Sans", "Space Grotesk", "Outfit", "Plus Jakarta Sans",
];

export default function WhiteLabelBranding() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [brandingId, setBrandingId] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [previewTab, setPreviewTab] = useState<string>("portal");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const [branding, setBranding] = useState<BrandingData>({
    logo_url: "", primary_color: "#0B60B0", secondary_color: "#40A578", accent_color: "",
    custom_domain: "", phone_greeting: "Thank you for calling [Your Company]. How may I assist you?",
    email_footer: "", company_name: "", support_email: "", support_phone: "",
    favicon_url: "", login_page_title: "Client Portal", welcome_message: "",
    sidebar_style: "light", font_heading: "", font_body: "",
    portal_footer_text: "", powered_by_visible: true, cname_status: "pending",
  });

  useEffect(() => { fetchBranding(); }, [user]);

  const fetchBranding = async () => {
    if (!user) return;
    try {
      const { data: partner } = await supabase.from('white_label_partners').select('id').eq('user_id', user.id).maybeSingle();
      if (partner) {
        setPartnerId(partner.id);
        const { data: bd } = await supabase.from('white_label_branding').select('*').eq('partner_id', partner.id).maybeSingle();
        if (bd) {
          setBrandingId(bd.id);
          const d = bd as any;
          setBranding({
            logo_url: d.logo_url || "", primary_color: d.primary_color || "#0B60B0",
            secondary_color: d.secondary_color || "#40A578", accent_color: d.accent_color || "",
            custom_domain: d.custom_domain || "", phone_greeting: d.phone_greeting || "",
            email_footer: d.email_footer || "", company_name: d.company_name || "",
            support_email: d.support_email || "", support_phone: d.support_phone || "",
            favicon_url: d.favicon_url || "", login_page_title: d.login_page_title || "Client Portal",
            welcome_message: d.welcome_message || "", sidebar_style: d.sidebar_style || "light",
            font_heading: d.font_heading || "", font_body: d.font_body || "",
            portal_footer_text: d.portal_footer_text || "", powered_by_visible: d.powered_by_visible ?? true,
            cname_status: d.cname_status || "pending",
          });
        }
      }
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  const handleSave = async () => {
    if (!partnerId) return;
    setIsSaving(true);
    try {
      const payload = { ...branding } as any;
      if (brandingId) {
        const { error } = await supabase.from('white_label_branding').update(payload).eq('id', brandingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('white_label_branding').insert({ ...payload, partner_id: partnerId });
        if (error) throw error;
      }
      toast({ title: "Branding Saved" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save branding.", variant: "destructive" });
    } finally { setIsSaving(false); }
  };

  const handleFileUpload = async (file: File, type: 'logo' | 'favicon') => {
    if (!partnerId) return;
    const setter = type === 'logo' ? setUploadingLogo : setUploadingFavicon;
    setter(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${partnerId}/${type}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('wl-branding-assets')
        .upload(path, file, { cacheControl: '3600', upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('wl-branding-assets')
        .getPublicUrl(path);

      const field = type === 'logo' ? 'logo_url' : 'favicon_url';
      setBranding(prev => ({ ...prev, [field]: publicUrl }));
      toast({ title: `${type === 'logo' ? 'Logo' : 'Favicon'} uploaded` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally { setter(false); }
  };

  const handleVerifyCname = async () => {
    if (!partnerId) return;
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-wl-cname', { body: { partnerId } });
      if (error) throw error;
      setBranding(prev => ({ ...prev, cname_status: data.status }));
      toast({
        title: data.verified ? "Domain Verified!" : "Verification Failed",
        description: data.verified
          ? `${data.domain} is correctly pointed to ${data.expectedTarget}`
          : `CNAME not found. Point ${data.domain} to ${data.expectedTarget}`,
        variant: data.verified ? "default" : "destructive",
      });
    } catch (err) {
      toast({ title: "Error", description: "Failed to verify DNS.", variant: "destructive" });
    } finally { setIsVerifying(false); }
  };

  const handleChange = (field: keyof BrandingData, value: string | boolean) => {
    setBranding(prev => ({ ...prev, [field]: value }));
  };

  const cnameTarget = partnerId ? `portal-${partnerId}.${import.meta.env.VITE_CNAME_TARGET || 'app.24hvirtual.com'}` : '';

  const cnameStatusBadge = () => {
    switch (branding.cname_status) {
      case 'active': return <Badge className="bg-green-500/10 text-green-600 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'verifying': return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Verifying</Badge>;
      case 'failed': return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default: return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  // Preview nav items
  const previewNavItems = [
    { name: 'Dashboard', icon: LayoutDashboard, active: true },
    { name: 'Call Logs', icon: Phone },
    { name: 'Scripts', icon: FileText },
    { name: 'Schedule', icon: Calendar },
    { name: 'Billing', icon: CreditCard },
    { name: 'Support', icon: LifeBuoy },
    { name: 'Settings', icon: SettingsIcon },
  ];

  return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-heading">Branding</h1>
            <p className="text-muted-foreground mt-1">Customize your white label experience. Your clients will never see our branding</p>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />{isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <div className="grid gap-6">
            {/* Company Identity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building className="w-5 h-5 text-primary" />Company Identity</CardTitle>
                <CardDescription>This name and contact info will appear in all client-facing communications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Company Display Name</Label>
                  <Input value={branding.company_name} onChange={e => handleChange("company_name", e.target.value)} placeholder="Your company name (shown to clients)" />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Mail className="w-3 h-3" />Support Email</Label>
                    <Input type="email" value={branding.support_email} onChange={e => handleChange("support_email", e.target.value)} placeholder="support@yourcompany.com" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Phone className="w-3 h-3" />Support Phone</Label>
                    <Input value={branding.support_phone} onChange={e => handleChange("support_phone", e.target.value)} placeholder="+1 (555) 123-4567" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Visual Identity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Palette className="w-5 h-5 text-primary" />Visual Identity</CardTitle>
                <CardDescription>Colors, logo, fonts: everything your clients see</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo Upload */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label>Company Logo</Label>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'logo');
                      }}
                    />
                    {branding.logo_url ? (
                      <div className="relative group border rounded-lg p-4 bg-muted/30">
                        <img src={branding.logo_url} alt="Logo" className="h-12 max-w-[200px] object-contain" />
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                            <Upload className="w-3 h-3" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleChange('logo_url', '')}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="w-full border-2 border-dashed rounded-lg p-6 flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {uploadingLogo ? (
                          <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-muted-foreground" />
                        )}
                        <span className="text-sm text-muted-foreground">{uploadingLogo ? 'Uploading...' : 'Click to upload logo'}</span>
                        <span className="text-xs text-muted-foreground">PNG, JPG, SVG up to 5MB</span>
                      </button>
                    )}
                    <div className="flex gap-2">
                      <Input
                        value={branding.logo_url}
                        onChange={e => handleChange("logo_url", e.target.value)}
                        placeholder="Or paste URL..."
                        className="text-xs"
                      />
                    </div>
                  </div>

                  {/* Favicon Upload */}
                  <div className="space-y-3">
                    <Label>Favicon</Label>
                    <input
                      ref={faviconInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'favicon');
                      }}
                    />
                    {branding.favicon_url ? (
                      <div className="relative group border rounded-lg p-4 bg-muted/30">
                        <img src={branding.favicon_url} alt="Favicon" className="h-8 w-8 object-contain" />
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => faviconInputRef.current?.click()} disabled={uploadingFavicon}>
                            <Upload className="w-3 h-3" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleChange('favicon_url', '')}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => faviconInputRef.current?.click()}
                        disabled={uploadingFavicon}
                        className="w-full border-2 border-dashed rounded-lg p-6 flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {uploadingFavicon ? (
                          <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                        )}
                        <span className="text-sm text-muted-foreground">{uploadingFavicon ? 'Uploading...' : 'Click to upload favicon'}</span>
                        <span className="text-xs text-muted-foreground">32×32 or 64×64 recommended</span>
                      </button>
                    )}
                    <Input
                      value={branding.favicon_url}
                      onChange={e => handleChange("favicon_url", e.target.value)}
                      placeholder="Or paste URL..."
                      className="text-xs"
                    />
                  </div>
                </div>

                {/* Colors */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Primary Color</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={branding.primary_color} onChange={e => handleChange("primary_color", e.target.value)} className="w-12 h-10 p-1 cursor-pointer" />
                      <Input value={branding.primary_color} onChange={e => handleChange("primary_color", e.target.value)} className="flex-1" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={branding.secondary_color} onChange={e => handleChange("secondary_color", e.target.value)} className="w-12 h-10 p-1 cursor-pointer" />
                      <Input value={branding.secondary_color} onChange={e => handleChange("secondary_color", e.target.value)} className="flex-1" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Accent Color</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={branding.accent_color || "#FF6B35"} onChange={e => handleChange("accent_color", e.target.value)} className="w-12 h-10 p-1 cursor-pointer" />
                      <Input value={branding.accent_color} onChange={e => handleChange("accent_color", e.target.value)} className="flex-1" placeholder="#FF6B35" />
                    </div>
                  </div>
                </div>

                {/* Fonts & Style */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Type className="w-3 h-3" />Heading Font</Label>
                    <Select value={branding.font_heading} onValueChange={v => handleChange("font_heading", v)}>
                      <SelectTrigger><SelectValue placeholder="Default (system)" /></SelectTrigger>
                      <SelectContent>
                        {GOOGLE_FONTS.map(f => (
                          <SelectItem key={f || 'default'} value={f || ' '}>{f || 'Default (system)'}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Type className="w-3 h-3" />Body Font</Label>
                    <Select value={branding.font_body} onValueChange={v => handleChange("font_body", v)}>
                      <SelectTrigger><SelectValue placeholder="Default (system)" /></SelectTrigger>
                      <SelectContent>
                        {GOOGLE_FONTS.map(f => (
                          <SelectItem key={f || 'default'} value={f || ' '}>{f || 'Default (system)'}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Monitor className="w-3 h-3" />Sidebar Style</Label>
                    <Select value={branding.sidebar_style} onValueChange={v => handleChange("sidebar_style", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client Portal Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Eye className="w-5 h-5 text-primary" />Client Portal</CardTitle>
                <CardDescription>Customize the login and portal experience for your clients</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Login Page Title</Label>
                    <Input value={branding.login_page_title} onChange={e => handleChange("login_page_title", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Welcome Message</Label>
                    <Input value={branding.welcome_message} onChange={e => handleChange("welcome_message", e.target.value)} placeholder="Welcome to your client portal" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Portal Footer Text</Label>
                  <Input value={branding.portal_footer_text} onChange={e => handleChange("portal_footer_text", e.target.value)} placeholder="© 2026 Your Company. All rights reserved." />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="text-sm font-medium">Show "Powered by" badge</p>
                    <p className="text-xs text-muted-foreground">Display a small attribution badge in the portal footer</p>
                  </div>
                  <Switch checked={branding.powered_by_visible} onCheckedChange={v => handleChange("powered_by_visible", v)} />
                </div>
              </CardContent>
            </Card>

            {/* Custom Domain (link to dedicated page) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5 text-primary" />Custom Domain</CardTitle>
                <CardDescription>Connect your own hostname so clients see your brand in the URL</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border p-4 bg-muted/20 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Canonical domain</div>
                    <div className="font-mono text-sm font-medium mt-1">
                      {branding.custom_domain || <span className="italic text-muted-foreground">Not configured</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {branding.custom_domain && cnameStatusBadge()}
                    <Button variant="outline" size="sm" asChild>
                      <a href="/white-label-dashboard/account/branding/custom-domain">
                        Manage domains
                      </a>
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Set up DNS records, manage aliases, and verify SSL from the dedicated Custom Domain page.
                </p>
              </CardContent>
            </Card>

            {/* Communication Templates */}
            <Card>
              <CardHeader>
                <CardTitle>Communication Templates</CardTitle>
                <CardDescription>Customize how calls and emails are handled for your clients</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Phone Greeting Script</Label>
                  <Textarea value={branding.phone_greeting} onChange={e => handleChange("phone_greeting", e.target.value)} rows={3} />
                  <p className="text-xs text-muted-foreground">Use [Company Name] as a placeholder</p>
                </div>
                <div className="space-y-2">
                  <Label>Email Footer</Label>
                  <Textarea value={branding.email_footer} onChange={e => handleChange("email_footer", e.target.value)} rows={4} />
                </div>
              </CardContent>
            </Card>

            {/* Full Portal Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Eye className="w-5 h-5 text-primary" />Portal Preview</CardTitle>
                <CardDescription>See exactly what your clients will see. Updates in real-time as you edit</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs value={previewTab} onValueChange={setPreviewTab}>
                  <TabsList>
                    <TabsTrigger value="portal">Dashboard View</TabsTrigger>
                    <TabsTrigger value="login">Login Page</TabsTrigger>
                  </TabsList>

                  <TabsContent value="portal" className="mt-4">
                    <div
                      className="border rounded-xl overflow-hidden shadow-sm"
                      style={branding.font_body ? { fontFamily: `'${branding.font_body}', sans-serif` } : undefined}
                    >
                      <div className="flex min-h-[420px]">
                        {/* Sidebar Preview */}
                        <div className={cn(
                          'w-56 flex flex-col border-r shrink-0',
                          branding.sidebar_style === 'dark' ? 'bg-gray-900 text-gray-100 border-gray-800' : 'bg-card'
                        )}>
                          <div className={cn('p-5 border-b', branding.sidebar_style === 'dark' && 'border-gray-800')}>
                            {branding.logo_url ? (
                              <img src={branding.logo_url} alt="Logo" className="h-7 max-w-[140px] object-contain" />
                            ) : (
                              <span className={cn('text-sm font-bold', branding.sidebar_style === 'dark' ? 'text-white' : 'text-foreground')}>
                                {branding.company_name || 'Your Company'}
                              </span>
                            )}
                          </div>
                          <nav className="flex-1 p-3 space-y-0.5">
                            {previewNavItems.map((item) => (
                              <div
                                key={item.name}
                                className={cn(
                                  'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors',
                                  !item.active && (branding.sidebar_style === 'dark'
                                    ? 'text-gray-400'
                                    : 'text-muted-foreground')
                                )}
                                style={item.active ? {
                                  backgroundColor: `${branding.primary_color}1a`,
                                  color: branding.primary_color,
                                } : undefined}
                              >
                                <item.icon className="w-4 h-4" />
                                {item.name}
                              </div>
                            ))}
                          </nav>
                          {branding.portal_footer_text && (
                            <div className={cn('p-3 text-[10px]', branding.sidebar_style === 'dark' ? 'text-gray-600' : 'text-muted-foreground')}>
                              {branding.portal_footer_text}
                            </div>
                          )}
                        </div>

                        {/* Main Content Preview */}
                        <div className="flex-1 bg-background flex flex-col">
                          {/* Header */}
                          <div className="h-12 border-b bg-card flex items-center justify-end px-5 gap-3">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center"
                              style={{
                                backgroundColor: `${branding.primary_color}1a`,
                                color: branding.primary_color,
                              }}
                            >
                              <User className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-medium text-foreground">Jane Smith</span>
                          </div>

                          {/* Page Content */}
                          <div className="p-6 flex-1">
                            <h3
                              className="text-base font-bold mb-4 text-foreground"
                              style={branding.font_heading ? { fontFamily: `'${branding.font_heading}', sans-serif` } : undefined}
                            >
                              Dashboard
                            </h3>
                            <div className="grid grid-cols-3 gap-3 mb-4">
                              <div className="rounded-lg border bg-card p-3">
                                <p className="text-[10px] text-muted-foreground mb-1">Total Calls</p>
                                <p className="text-lg font-bold" style={{ color: branding.primary_color }}>1,284</p>
                              </div>
                              <div className="rounded-lg border bg-card p-3">
                                <p className="text-[10px] text-muted-foreground mb-1">This Month</p>
                                <p className="text-lg font-bold" style={{ color: branding.secondary_color }}>342</p>
                              </div>
                              <div className="rounded-lg border bg-card p-3">
                                <p className="text-[10px] text-muted-foreground mb-1">Avg Duration</p>
                                <p className="text-lg font-bold" style={{ color: branding.accent_color || branding.primary_color }}>3:42</p>
                              </div>
                            </div>
                            <div className="rounded-lg border bg-card p-4 h-24">
                              <p className="text-xs text-muted-foreground">Recent Activity</p>
                              <div className="mt-2 space-y-1">
                                <div className="h-2 w-3/4 bg-muted rounded" />
                                <div className="h-2 w-1/2 bg-muted rounded" />
                                <div className="h-2 w-2/3 bg-muted rounded" />
                              </div>
                            </div>
                          </div>

                          {/* Footer */}
                          {branding.powered_by_visible && (
                            <div className="px-6 py-2 text-[10px] text-muted-foreground border-t">
                              Powered by 24H Virtual
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="login" className="mt-4">
                    <div
                      className="border rounded-xl overflow-hidden shadow-sm bg-background flex items-center justify-center min-h-[420px]"
                      style={branding.font_body ? { fontFamily: `'${branding.font_body}', sans-serif` } : undefined}
                    >
                      <div className="w-full max-w-sm mx-auto p-6">
                        <div className="bg-card rounded-xl border shadow-sm p-6 space-y-5">
                          <div className="text-center space-y-3">
                            {branding.logo_url && (
                              <img src={branding.logo_url} alt="Logo" className="h-10 mx-auto object-contain" />
                            )}
                            <h2
                              className="text-xl font-bold text-foreground"
                              style={branding.font_heading ? { fontFamily: `'${branding.font_heading}', sans-serif` } : undefined}
                            >
                              {branding.login_page_title || branding.company_name || 'Client Portal'}
                            </h2>
                            {branding.welcome_message && (
                              <p className="text-sm text-muted-foreground">{branding.welcome_message}</p>
                            )}
                          </div>
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-foreground">Email</label>
                              <div className="h-9 rounded-md border bg-background px-3 flex items-center text-xs text-muted-foreground">jane@company.com</div>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-foreground">Password</label>
                              <div className="h-9 rounded-md border bg-background px-3 flex items-center text-xs text-muted-foreground">••••••••</div>
                            </div>
                            <div
                              className="h-9 rounded-md flex items-center justify-center text-xs font-medium text-white"
                              style={{ backgroundColor: branding.primary_color }}
                            >
                              Sign In
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
  );
}
