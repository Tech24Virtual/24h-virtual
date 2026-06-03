import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

function getRoleBasedRedirect(roles: string[], isAffiliate: boolean, isWhiteLabel: boolean): string {
  if (roles.includes('admin')) return '/admin';
  if (roles.includes('sales')) return '/staff/sales';
  if (roles.includes('supervisor')) return '/staff/supervisor';
  if (roles.includes('billing')) return '/staff/billing';
  if (roles.includes('agent')) return '/staff/agent';
  if (roles.includes('tech')) return '/staff/tech';
  if (roles.includes('hr')) return '/hr-portal';
  if (isWhiteLabel) return '/white-label-dashboard';
  if (isAffiliate) return '/affiliate';
  return '/client-dashboard';
}

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState(false);
  const { signIn, roles, isAffiliate, isWhiteLabel, user, loading, rolesLoaded } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
  const hasRedirected = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Watch for roles to load after sign-in, then redirect.
  // We must wait for `rolesLoaded` (not just `loading`) because the session
  // loading flag flips to false before the role fetch resolves, which would
  // otherwise cause admin users to be routed before their roles are known.
  useEffect(() => {
    if (!pendingRedirect || !user || loading || !rolesLoaded || hasRedirected.current) return;

    hasRedirected.current = true;
    setPendingRedirect(false);
    setIsLoading(false);

    if (from) {
      navigate(from, { replace: true });
      return;
    }

    if (roles.includes('wl_client')) {
      supabase
        .from('white_label_clients')
        .select('client_portal_slug')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data: clientRecord }) => {
          const destination = clientRecord?.client_portal_slug
            ? `/portal/${clientRecord.client_portal_slug}`
            : '/client-dashboard';
          navigate(destination, { replace: true });
        });
      return;
    }

    navigate(getRoleBasedRedirect(roles, isAffiliate, isWhiteLabel), { replace: true });
  }, [pendingRedirect, user, roles, loading, rolesLoaded, isAffiliate, isWhiteLabel, from, navigate]);

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    hasRedirected.current = false;
    const { error } = await signIn(data.email, data.password);
    
    if (error) {
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive',
      });
      setIsLoading(false);
    } else {
      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });
      setPendingRedirect(true);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Welcome Back</CardTitle>
        <CardDescription>
          Sign in to access your dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              {...register('email')}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register('password')}
              className={errors.password ? 'border-destructive' : ''}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" variant="cta" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Sign In
                <ArrowRight className="ml-2 w-4 h-4" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <p className="text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
