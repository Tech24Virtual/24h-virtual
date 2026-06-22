import { useEffect, useState } from "react";
import { PartnerWelcomeModal } from '@/components/white-label/PartnerWelcomeModal';
import { motion } from "framer-motion";
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Headphones,
  ArrowUpRight,
  Plus
} from "lucide-react";
import { WhiteLabelLayout } from "@/components/white-label/WhiteLabelLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { WLFulfillmentStatusCard } from "@/components/wl/WLFulfillmentStatusCard";
import { WLPartnerReadinessCard } from "@/components/white-label/WLPartnerReadinessCard";
import { WLPartnerExportsCard } from "@/components/white-label/WLPartnerExportsCard";
import { WLPartnerInsightsCard } from "@/components/white-label/WLPartnerInsightsCard";
import { WLPartnerNudgesCard } from "@/components/white-label/WLPartnerNudgesCard";
import { WLPartnerActivationCard } from "@/components/white-label/WLPartnerActivationCard";
import { WLPartnerEconomicsCard } from "@/components/white-label/WLPartnerEconomicsCard";
import { WLPartnerExpansionCard } from "@/components/white-label/WLPartnerExpansionCard";

interface StatsData {
  totalClients: number;
  activeClients: number;
  monthlyRevenue: number;
  revenueGrowth: number;
}

export default function WhiteLabelDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StatsData>({
    totalClients: 0,
    activeClients: 0,
    monthlyRevenue: 0,
    revenueGrowth: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [partnerData, setPartnerData] = useState<any>(null);

  useEffect(() => {
    fetchPartnerData();
  }, [user]);

  const fetchPartnerData = async () => {
    if (!user) return;
    
    try {
      // Fetch partner info
      const { data: partner } = await supabase
        .from('white_label_partners')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (partner) {
        setPartnerData(partner);

        // Fetch clients count
        const { data: clients } = await supabase
          .from('white_label_clients')
          .select('*')
          .eq('partner_id', partner.id);

        if (clients) {
          const activeCount = clients.filter(c => c.status === 'active').length;
          const totalRevenue = clients.reduce((sum, c) => sum + (c.monthly_value || 0), 0);

          // Calculate revenue growth from clients added this month vs last month
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

          const thisMonthClients = clients.filter(c => c.created_at >= startOfMonth);
          const lastMonthClients = clients.filter(c => c.created_at >= startOfLastMonth && c.created_at < startOfMonth);

          const thisMonthRevenue = thisMonthClients.reduce((s, c) => s + (c.monthly_value || 0), 0);
          const lastMonthRevenue = lastMonthClients.reduce((s, c) => s + (c.monthly_value || 0), 0);

          // Calculate growth: compare total current revenue to (total - this month + last month)
          const previousRevenue = totalRevenue - thisMonthRevenue + lastMonthRevenue;
          const growth = previousRevenue > 0 
            ? Math.round(((totalRevenue - previousRevenue) / previousRevenue) * 1000) / 10
            : 0;

          setStats({
            totalClients: clients.length,
            activeClients: activeCount,
            monthlyRevenue: totalRevenue,
            revenueGrowth: growth,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching partner data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Clients",
      value: stats.totalClients,
      change: "+2 this month",
      icon: Users,
      color: "primary"
    },
    {
      title: "Active Subscriptions",
      value: stats.activeClients,
      change: `${Math.round((stats.activeClients / (stats.totalClients || 1)) * 100)}% active`,
      icon: Headphones,
      color: "secondary"
    },
    {
      title: "Monthly Revenue",
      value: `$${stats.monthlyRevenue.toLocaleString()}`,
      change: `+${stats.revenueGrowth}% vs last month`,
      icon: DollarSign,
      color: "cta"
    },
    {
      title: "Growth Rate",
      value: `${stats.revenueGrowth}%`,
      change: "Month over month",
      icon: TrendingUp,
      color: "primary"
    }
  ];

  return (
    <WhiteLabelLayout>
      <PartnerWelcomeModal partnerName={partnerData?.contact_name || partnerData?.company_name} />
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-heading">
              Welcome back{partnerData?.contact_name ? `, ${partnerData.contact_name}` : ''}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's what's happening with your white label business today.
            </p>
          </div>
          <Button asChild>
            <Link to="/white-label-dashboard/clients">
              <Plus className="w-4 h-4 mr-2" />
              Add Client
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-soft transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                      <p className="text-2xl font-bold text-heading">{stat.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-lg bg-${stat.color}/10 flex items-center justify-center`}>
                      <stat.icon className={`w-5 h-5 text-${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Phase 6 + Phase 12 + Phase 15: Readiness, activation, portfolio insights, nudges, exports */}
        {partnerData?.id && (
          <div className="space-y-6">
            <WLPartnerActivationCard partnerId={partnerData.id} />
            <WLPartnerEconomicsCard />
            <WLPartnerExpansionCard />
            <WLPartnerInsightsCard partnerId={partnerData.id} />
            <div className="grid lg:grid-cols-2 gap-6">
              <WLPartnerReadinessCard partnerId={partnerData.id} />
              <WLPartnerNudgesCard partnerId={partnerData.id} />
            </div>
            <WLPartnerExportsCard />
          </div>
        )}

        {/* Fulfillment status (partner-safe) */}
        <WLFulfillmentStatusCard />

        {/* Quick Actions & Status */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Partner Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Partner Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Account Status</span>
                <Badge variant="secondary" className="bg-cta/10 text-cta">
                  {partnerData?.status === 'active' ? 'Active' : 'Pending'}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Partner Tier</span>
                <span className="font-medium capitalize">{partnerData?.tier || 'Reseller'}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Monthly Fee</span>
                <span className="font-medium">${partnerData?.monthly_fee || 299}/month</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Member Since</span>
                <span className="font-medium">
                  {partnerData?.created_at 
                    ? new Date(partnerData.created_at).toLocaleDateString() 
                    : '-'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-between" asChild>
                <Link to="/white-label-dashboard/clients">
                  Manage Clients
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-between" asChild>
                <Link to="/white-label-dashboard/account/branding">
                  Customize Branding
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-between" asChild>
                <Link to="/white-label-dashboard/account/billing">
                  View Billing & Invoices
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-between" asChild>
                <Link to="/white-label-dashboard/account/settings">
                  Account Settings
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Onboarding Checklist (for new partners) */}
        {partnerData?.status === 'pending' && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Complete Your Setup</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-cta flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-muted-foreground line-through">Submit application</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-muted-foreground text-xs">2</span>
                  </div>
                  <span>Set up your branding</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-muted-foreground text-xs">3</span>
                  </div>
                  <span>Add your first client</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-muted-foreground text-xs">4</span>
                  </div>
                  <span>Configure payment method</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </WhiteLabelLayout>
  );
}
