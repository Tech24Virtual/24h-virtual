import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWLHostResolver } from '@/contexts/WLHostContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { wlClientUrl } from '@/lib/wlClientUrl';

interface Branding {
  logo_url: string | null;
  primary_color: string | null;
  company_name: string | null;
  login_page_title: string | null;
  welcome_message: string | null;
  favicon_url: string | null;
  font_heading: string | null;
  font_body: string | null;
}

export default function WLPortalLogin() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const hostCtx = useWLHostResolver();
  const isPartnerHost = hostCtx.isPartnerHostname;
  const hostPartnerId = hostCtx.partnerId;

  const [branding, setBranding] = useState<Branding | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // If on partner hostname, use branding from host context
  useEffect(() => {
    if (isPartnerHost && hostCtx.branding) {
      setBranding({
        logo_url: hostCtx.branding.logo_url,
        primary_color: hostCtx.branding.primary_color,
        company_name: hostCtx.branding.company_name,
        login_page_title: hostCtx.branding.login_page_title,
        welcome_message: hostCtx.branding.welcome_message,
        favicon_url: hostCtx.branding.favicon_url,
        font_heading: hostCtx.branding.font_heading,
        font_body: hostCtx.branding.font_body,
      });
      setLoading(false);
    } else if (!isPartnerHost) {
      fetchBranding();
    }
  }, [isPartnerHost, hostCtx.branding, slug]);

  // Post-login redirect
  useEffect(() => {
    if (!user) return;

    if (isPartnerHost && hostPartnerId) {
      // On partner hostname: find user's client slug for this partner
      supabase
        .from('white_label_clients')
        .select('client_portal_slug')
        .eq('user_id', user.id)
        .eq('partner_id', hostPartnerId)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.client_portal_slug) {
            navigate(`/${data.client_portal_slug}`, { replace: true });
          }
        });
    } else if (slug) {
      navigate(wlClientUrl(slug), { replace: true });
    }
  }, [user, slug, navigate, isPartnerHost, hostPartnerId]);

  // Apply favicon
  useEffect(() => {
    if (!branding?.favicon_url) return;
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = branding.favicon_url;
  }, [branding?.favicon_url]);

  // Load Google Fonts for login page
  useEffect(() => {
    if (!branding) return;
    const fonts = [branding.font_heading, branding.font_body].filter(Boolean) as string[];
    if (fonts.length === 0) return;
    const families = fonts.map(f => f.replace(/ /g, '+')).join('&family=');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`;
    document.head.appendChild(link);
    return () => { link.remove(); };
  }, [branding]);

  const fetchBranding = async () => {
    try {
      const { data: clients } = await supabase
        .from('white_label_clients')
        .select('partner_id')
        .eq('client_portal_slug', slug)
        .limit(1);

      let pid: string | null = null;
      if (clients && clients.length > 0) {
        pid = clients[0].partner_id;
      }

      if (pid) {
        const { data } = await supabase
          .from('white_label_branding')
          .select('logo_url, primary_color, company_name, login_page_title, welcome_message, favicon_url, font_heading, font_body')
          .eq('partner_id', pid)
          .single();
        if (data) setBranding(data as Branding);
      }
    } catch (err) {
      console.error('Error fetching branding:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Post-login redirect handled by useEffect above
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign in');
    } finally {
      setSubmitting(false);
    }
  };

  const primaryColor = branding?.primary_color;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background px-4"
      style={branding?.font_body ? { fontFamily: `'${branding.font_body}', sans-serif` } : undefined}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          {branding?.logo_url && (
            <img
              src={branding.logo_url}
              alt={branding.company_name || 'Portal'}
              className="h-12 mx-auto object-contain"
            />
          )}
          <CardTitle
            className="text-2xl"
            style={branding?.font_heading ? { fontFamily: `'${branding.font_heading}', sans-serif` } : undefined}
          >
            {branding?.login_page_title || branding?.company_name || 'Client Portal'}
          </CardTitle>
          {branding?.welcome_message && (
            <CardDescription>{branding.welcome_message}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={submitting}
              style={primaryColor ? { backgroundColor: primaryColor, borderColor: primaryColor } : undefined}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
