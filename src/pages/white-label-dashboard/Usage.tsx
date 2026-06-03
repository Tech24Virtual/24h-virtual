import { useState, useEffect } from "react";
import { Clock, TrendingUp, Users, DollarSign, Zap } from "lucide-react";
import { WhiteLabelLayout } from "@/components/white-label/WhiteLabelLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function WLUsageDashboard() {
  const { user } = useAuth();
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [clientUsage, setClientUsage] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    try {
      const { data: partner } = await supabase
        .from("white_label_partners").select("id").eq("user_id", user.id).single();
      if (!partner) return;
      setPartnerId(partner.id);

      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

      const [summaryRes, usageRes, pricingRes, trendRes] = await Promise.all([
        supabase.from("wl_partner_usage_summary").select("*")
          .eq("partner_id", partner.id).eq("billing_period_start", periodStart).maybeSingle(),
        supabase.from("wl_usage_records").select("*, white_label_clients(client_name, service_type, language_support)")
          .eq("partner_id", partner.id).eq("billing_period_start", periodStart),
        supabase.from("wl_wholesale_pricing").select("*").eq("partner_id", partner.id).maybeSingle(),
        supabase.from("wl_partner_usage_summary").select("*")
          .eq("partner_id", partner.id).order("billing_period_start", { ascending: false }).limit(6),
      ]);

      setSummary(summaryRes.data);
      setClientUsage(usageRes.data || []);
      setPricing(pricingRes.data);
      setTrendData((trendRes.data || []).reverse().map((d: any) => ({
        month: new Date(d.billing_period_start).toLocaleDateString("en-US", { month: "short" }),
        minutes: Number(d.total_minutes_all_clients),
        cost: Number(d.total_wholesale_cost),
      })));
    } catch (err) {
      console.error("Error fetching usage:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const totalMinutes = summary?.total_minutes_all_clients || 0;
  const minThreshold = pricing?.volume_discount_min_minutes || 10000;
  const activeClients = summary?.active_client_count || 0;
  const minuteProgress = Math.min((totalMinutes / minThreshold) * 100, 100);
  const volumeActive = summary?.volume_discount_active || false;

  return (
    <WhiteLabelLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-heading">Usage & Billing</h1>
          <p className="text-muted-foreground mt-1">Track minutes, costs, and volume discount progress</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Minutes</p>
                      <p className="text-xl font-bold">{Number(totalMinutes).toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Active Clients</p>
                      <p className="text-xl font-bold">{activeClients}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Wholesale Cost</p>
                      <p className="text-xl font-bold">${Number(summary?.total_wholesale_cost || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Campaign Fees</p>
                      <p className="text-xl font-bold">${Number(summary?.total_campaign_fees || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Volume Discount Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Zap className="w-5 h-5 text-primary" />
                  Volume Discount Status
                  {volumeActive && (
                    <Badge className="bg-cta/10 text-cta ml-2">Active</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {volumeActive ? (
                  <div className="p-4 rounded-lg bg-cta/5 border border-cta/20">
                    <p className="font-medium text-cta">Volume discount active!</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Fixed rate of ${Number(summary?.volume_discount_rate || 0).toFixed(2)}/min applied across all clients.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Minutes: {Number(totalMinutes).toLocaleString()} / {minThreshold.toLocaleString()}</span>
                        <span>{minuteProgress.toFixed(0)}%</span>
                      </div>
                      <Progress value={minuteProgress} className="h-2" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Reach {minThreshold.toLocaleString()} minutes to unlock a fixed per-minute rate.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Usage Trend Chart */}
            {trendData.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Monthly Usage Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip />
                        <Line type="monotone" dataKey="minutes" stroke="hsl(var(--primary))" strokeWidth={2} name="Minutes" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Per-Client Usage Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Client Usage Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {clientUsage.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No usage data for this billing period.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client</TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead>Language</TableHead>
                          <TableHead className="text-right">Minutes</TableHead>
                          <TableHead className="text-right">Calls</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientUsage.map((u: any) => (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">
                              {(u as any).white_label_clients?.client_name || "Unknown"}
                            </TableCell>
                            <TableCell className="capitalize">
                              {((u as any).white_label_clients?.service_type || "receptionist").replace("virtual_", "")}
                            </TableCell>
                            <TableCell className="capitalize">
                              {((u as any).white_label_clients?.language_support || "english_only").replace("_", " ")}
                            </TableCell>
                            <TableCell className="text-right">{Number(u.total_minutes_used).toFixed(0)}</TableCell>
                            <TableCell className="text-right">{u.total_calls}</TableCell>
                            <TableCell className="text-right">${Number(u.effective_rate).toFixed(2)}</TableCell>
                            <TableCell className="text-right font-medium">${Number(u.wholesale_cost).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </WhiteLabelLayout>
  );
}
