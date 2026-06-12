import { useState, useEffect } from "react";
import { Receipt, CreditCard, Download, CheckCircle } from "lucide-react";
import { WhiteLabelLayout } from "@/components/white-label/WhiteLabelLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";

interface PartnerData {
  id: string;
  tier: string;
  monthly_fee: number;
  status: string;
  created_at: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  billing_period_start: string;
  billing_period_end: string;
  amount: number;
  status: string;
  created_at: string;
}

const tierDetails: Record<string, { name: string; price: number; features: string[] }> = {
  starter: {
    name: 'Starter',
    price: 49,
    features: ['Up to 10 clients', 'Unlimited campaigns', 'Basic analytics', 'Basic branding (logo, colors)']
  },
  professional: {
    name: 'Professional',
    price: 149,
    features: ['Up to 50 clients', 'Unlimited campaigns', 'Advanced analytics', 'Full branding & custom domain', 'Ticketing system', 'Knowledge base']
  },
  enterprise: {
    name: 'Enterprise',
    price: 299,
    features: ['Unlimited clients', 'Growth Hub (7 marketing tools)', 'Priority support', 'Dedicated account manager', 'API access', 'Custom SLA']
  },
  reseller: {
    name: 'Reseller',
    price: 299,
    features: ['Unlimited clients', 'Full white-label branding', 'Custom domain', 'Priority support', 'API access']
  },
};

export default function WhiteLabelBilling() {
  const { user } = useAuth();

  const { data: partnerData, isLoading: partnerLoading } = useQuery({
    queryKey: ["wl-partner-billing", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("white_label_partners")
        .select("id, tier, monthly_fee, status, created_at")
        .eq("user_id", user!.id)
        .single();
      return data as PartnerData | null;
    },
    enabled: !!user,
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["wl-invoices", partnerData?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("wl_invoices")
        .select("*")
        .eq("partner_id", partnerData!.id)
        .order("billing_period_start", { ascending: false });
      return (data || []) as Invoice[];
    },
    enabled: !!partnerData?.id,
  });

  const isLoading = partnerLoading || invoicesLoading;
  const currentTier = tierDetails[partnerData?.tier ?? ''] ?? tierDetails.starter;
  const displayPrice = partnerData?.monthly_fee ?? currentTier.price;

  // Calculate next payment date (1st of next month)
  const now = new Date();
  const nextPaymentDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextPaymentStr = nextPaymentDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <WhiteLabelLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-heading">Billing</h1>
          <p className="text-muted-foreground mt-1">Manage your subscription and view invoices</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <div className="grid gap-6">
            {/* Current Plan */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Current Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-heading">{currentTier.name}</h3>
                      <Badge variant="secondary" className="bg-cta/10 text-cta">
                        Active
                      </Badge>
                    </div>
                    <p className="text-3xl font-bold text-primary mb-4">
                      ${displayPrice}<span className="text-sm font-normal text-muted-foreground">/month</span>
                    </p>
                    <ul className="space-y-2">
                      {currentTier.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-cta" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button variant="outline">Change Plan</Button>
                    <Button variant="outline">Update Payment Method</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Billing Summary */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-1">Next Payment</p>
                  <p className="text-2xl font-bold text-heading">${displayPrice}</p>
                  <p className="text-xs text-muted-foreground">Due {nextPaymentStr}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-1">Payment Method</p>
                  <p className="text-lg font-medium text-heading">•••• 4242</p>
                  <p className="text-xs text-muted-foreground">Visa ending in 4242</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-1">Billing Cycle</p>
                  <p className="text-lg font-medium text-heading">Monthly</p>
                  <p className="text-xs text-muted-foreground">Billed on the 1st</p>
                </CardContent>
              </Card>
            </div>

            {/* Invoice History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-primary" />
                  Invoice History
                </CardTitle>
                <CardDescription>
                  View and download your past invoices
                </CardDescription>
              </CardHeader>
              <CardContent>
                {invoices && invoices.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-24"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                          <TableCell>
                            {new Date(invoice.billing_period_start).toLocaleDateString()} – {new Date(invoice.billing_period_end).toLocaleDateString()}
                          </TableCell>
                          <TableCell>${invoice.amount}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={
                              invoice.status === 'paid' ? 'bg-cta/10 text-cta' :
                              invoice.status === 'pending' ? 'bg-yellow-500/10 text-yellow-600' :
                              'bg-destructive/10 text-destructive'
                            }>
                              {invoice.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Download className="w-4 h-4 mr-1" />
                              PDF
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Receipt className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No invoices yet</p>
                    <p className="text-sm mt-1">Your first invoice will appear after your next billing cycle.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </WhiteLabelLayout>
  );
}
