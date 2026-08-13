import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { SITE_URL } from '@/lib/siteUrl';
import { is24HHost } from '@/lib/wlHostResolver';

type AppRole = Database['public']['Enums']['app_role'];

interface Profile {
  id: string;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  onboarding_completed?: boolean;
  onboarding_completed_at?: string | null;
  wl_partner_id: string | null;
}

interface AffiliateData {
  id: string;
  affiliate_code: string;
  commission_rate: number | null;
  total_earnings: number | null;
  status: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  affiliateData: AffiliateData | null;
  loading: boolean;
  rolesLoaded: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
  isClient: boolean;
  isAgent: boolean;
  isAffiliate: boolean;
  isWhiteLabel: boolean;
  isSales: boolean;
  isBilling: boolean;
  isSupervisor: boolean;
  isWLClient: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (data) {
      setProfile(data);
    }
  };

  const fetchRoles = async (userId: string): Promise<AppRole[]> => {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      const fetched = data ? data.map(r => r.role) : [];
      setRoles(fetched);
      return fetched;
    } catch {
      setRoles([]);
      return [];
    } finally {
      // Always mark rolesLoaded so post-login redirect can proceed even if the
      // role fetch failed (D-1.1: never strand the user on a loading screen).
      setRolesLoaded(true);
    }
  };

  const fetchAffiliateData = async (userId: string) => {
    const { data } = await supabase
      .from('affiliates')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (data) {
      setAffiliateData(data);
    }
  };

  useEffect(() => {
    // Set up auth state listener BEFORE checking session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // D-1.1: reset rolesLoaded BEFORE scheduling the fetch so any
          // pending post-login redirect waits until roles are actually
          // fetched for THIS user (not a stale `true` from the prior
          // signed-out INITIAL_SESSION event).
          setRolesLoaded(false);
          // Use setTimeout to avoid Supabase client deadlock
          setTimeout(async () => {
            await fetchProfile(session.user.id);
            const fetchedRoles = await fetchRoles(session.user.id);
            if (fetchedRoles.includes('affiliate' as AppRole)) fetchAffiliateData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setRolesLoaded(true);
          setAffiliateData(null);
        }

        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setRolesLoaded(false);
        await fetchProfile(session.user.id);
        const fetchedRoles = await fetchRoles(session.user.id);
        if (fetchedRoles.includes('affiliate' as AppRole)) fetchAffiliateData(session.user.id);
      } else {
        setRolesLoaded(true);
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    // Use canonical SITE_URL on 24H hosts; preserve partner host for white-label sign-ups.
    const hostname = window.location.hostname;
    const emailRedirectTo = is24HHost(hostname) ? SITE_URL : window.location.origin;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setRolesLoaded(false);
    setAffiliateData(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    roles,
    affiliateData,
    loading,
    rolesLoaded,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    isAdmin: roles.includes('admin'),
    isClient: roles.includes('client'),
    isAgent: roles.includes('agent'),
    isAffiliate: affiliateData !== null || roles.includes('affiliate' as AppRole),
    isWhiteLabel: roles.includes('white_label' as AppRole),
    isSales: roles.includes('sales' as AppRole),
    isBilling: roles.includes('billing' as AppRole),
    isSupervisor: roles.includes('supervisor' as AppRole),
    isWLClient: roles.includes('wl_client' as AppRole),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
