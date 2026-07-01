import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Gift, Users, DollarSign, Send, CheckCircle2, Clock, X } from 'lucide-react';
import { format } from 'date-fns';

export default function Referrals() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    referred_company_name: '',
    referred_contact_name: '',
    referred_email: '',
    referred_phone: '',
    relationship: '',
    expected_needs: '',
  });

  // Fetch user's referrals
  const { data: referrals, isLoading } = useQuery({
    queryKey: ['my-referrals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_partners')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const submitReferralMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('referral_partners').insert({
        referrer_name: profile?.full_name || user?.email || 'Unknown',
        referrer_email: user?.email || '',
        referrer_company_name: profile?.company_name || 'N/A',
        referrer_phone: profile?.phone,
        is_current_client: true,
        user_id: user?.id,
        ...formData,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-referrals'] });
      toast.success('Referral submitted successfully!');
      setFormData({
        referred_company_name: '',
        referred_contact_name: '',
        referred_email: '',
        referred_phone: '',
        relationship: '',
        expected_needs: '',
      });
    },
    onError: () => {
      toast.error('Failed to submit referral');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.referred_company_name || !formData.referred_contact_name || !formData.referred_email) {
      toast.error('Please fill in all required fields');
      return;
    }
    submitReferralMutation.mutate();
  };

  const stats = {
    total: referrals?.length || 0,
    pending: referrals?.filter((r) => r.status === 'pending').length || 0,
    converted: referrals?.filter((r) => r.status === 'converted').length || 0,
    totalRewards: referrals?.reduce((sum, r) => sum + (r.reward_amount || 0), 0) || 0,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'converted':
        return <Badge variant="outline" className={cn("border-green-500/30", "bg-green-500/10 text-green-700 dark:text-green-400")}><CheckCircle2 className="h-3 w-3 mr-1" />Converted</Badge>;
      case 'rejected':
        return <Badge variant="outline" className={cn("border-destructive/30", "bg-destructive/10 text-destructive")}><X className="h-3 w-3 mr-1" />Not Qualified</Badge>;
      default:
        return <Badge variant="outline" className={cn("border-yellow-500/30", "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400")}><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <DashboardLayout>
      {/* Gradient header */}
      <div className="rounded-2xl border border-border p-6 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 mb-6">
        <h1 className="text-2xl font-bold text-heading">Referral Program</h1>
        <p className="text-muted-foreground mt-0.5">Refer businesses and earn rewards</p>
      </div>

      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Converted</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.converted}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rewards</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalRewards}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Submit Referral Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Submit a Referral
              </CardTitle>
              <CardDescription>
                Know a business that could benefit from our services? Earn $150 for every successful referral!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="company">Company Name *</Label>
                    <Input
                      id="company"
                      value={formData.referred_company_name}
                      onChange={(e) => setFormData({ ...formData, referred_company_name: e.target.value })}
                      placeholder="Acme Corp"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact">Contact Name *</Label>
                    <Input
                      id="contact"
                      value={formData.referred_contact_name}
                      onChange={(e) => setFormData({ ...formData, referred_contact_name: e.target.value })}
                      placeholder="John Smith"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.referred_email}
                      onChange={(e) => setFormData({ ...formData, referred_email: e.target.value })}
                      placeholder="john@acme.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.referred_phone}
                      onChange={(e) => setFormData({ ...formData, referred_phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="relationship">Your Relationship</Label>
                  <Input
                    id="relationship"
                    value={formData.relationship}
                    onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                    placeholder="e.g., Business partner, Friend, Former colleague"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="needs">Expected Needs</Label>
                  <Textarea
                    id="needs"
                    value={formData.expected_needs}
                    onChange={(e) => setFormData({ ...formData, expected_needs: e.target.value })}
                    placeholder="What services might they need?"
                    rows={3}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitReferralMutation.isPending}>
                  <Send className="h-4 w-4 mr-2" />
                  {submitReferralMutation.isPending ? 'Submitting...' : 'Submit Referral'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* My Referrals List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                My Referrals
              </CardTitle>
              <CardDescription>Track the status of your referrals</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-md" />
                  ))}
                </div>
              ) : referrals?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Gift className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No referrals yet</p>
                  <p className="text-sm">Submit your first referral to get started!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {referrals?.map((referral) => (
                    <div
                      key={referral.id}
                      className="p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{referral.referred_company_name}</span>
                        {getStatusBadge(referral.status || 'pending')}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {referral.referred_contact_name} • {referral.referred_email}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Submitted {format(new Date(referral.created_at), 'MMM d, yyyy')}
                      </p>
                      {referral.reward_amount && referral.reward_amount > 0 && (
                        <p className="text-sm font-medium text-green-600 mt-1">
                          Reward: ${referral.reward_amount}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
