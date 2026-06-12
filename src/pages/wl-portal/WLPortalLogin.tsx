import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWLPortal } from '@/contexts/WLPortalContext';
import { useWLHostResolver } from '@/contexts/WLHostContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { wlClientUrl } from '@/lib/wlClientUrl';
import { useState } from 'react';

export default function WLPortalLogin() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const hostCtx = useWLHostResolver();
  const isPartnerHost = hostCtx.isPartnerHostname;
  const hostPartnerId = hostCtx.partnerId;

  // Branding and loading come from the WLPortalProvider that wraps this page
  // (both path-based /portal/:slug/login and hostname-based /login routes).
  // WLPortalProvider's own useEffect already applies document.title, favicon,
  // CSS vars and Google Fonts — no duplicate DOM work needed here.
  const { branding, loading } = useWLPortal();

  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
