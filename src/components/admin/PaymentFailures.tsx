import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CreditCard, RefreshCw, Mail, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";

interface PaymentFailure {
  id: string;
  lead_id: string;
  stripe_invoice_id: string | null;
  failure_code: string | null;
  failure_message: string | null;
  attempt_number: number;
  failed_at: string;
  retry_scheduled_at: string | null;
  resolved_at: string | null;
  resolution_type: string | null;
  leads?: {
    name: string;
    email: string;
    company: string | null;
  };
}

export function PaymentFailures() {
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { data: failures, isLoading, refetch } = useQuery({
    queryKey: ["payment-failures"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_failures")
        .select(`
          *,
          leads:lead_id (name, email, company)
        `)
        .is("resolved_at", null)
        .order("failed_at", { ascending: false });

      if (error) throw error;
      return data as PaymentFailure[];
    },
  });

  const handleSendUpdateLink = async (failure: PaymentFailure) => {
    setProcessingId(failure.id);
    try {
      const { data, error } = await supabase.functions.invoke("send-card-update-link", {
        body: { leadId: failure.lead_id, paymentFailureId: failure.id },
      });

      if (error) throw error;

      toast({
        title: "Card update link sent",
        description: data.email_sent 
          ? "Email sent to customer" 
          : "Portal URL generated - share manually",
      });

      if (data.portal_url) {
        window.open(data.portal_url, "_blank");
      }

      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate link",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkResolved = async (failureId: string, resolutionType: string) => {
    setProcessingId(failureId);
    try {
      const { error } = await supabase
        .from("payment_failures")
        .update({
          resolved_at: new Date().toISOString(),
          resolution_type: resolutionType,
        })
        .eq("id", failureId);

      if (error) throw error;

      toast({
        title: "Marked as resolved",
        description: `Payment issue marked as ${resolutionType}`,
      });

      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getFailureCodeLabel = (code: string | null) => {
    const labels: Record<string, string> = {
      card_declined: "Card Declined",
      insufficient_funds: "Insufficient Funds",
      expired_card: "Expired Card",
      processing_error: "Processing Error",
    };
    return labels[code || ""] || code || "Unknown";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Issues</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Payment Issues
              {failures && failures.length > 0 && (
                <Badge variant="destructive">{failures.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Failed payments requiring attention
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!failures || failures.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50 text-cta" />
            <p>No payment issues</p>
            <p className="text-sm">All payments are up to date</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Failed</TableHead>
                <TableHead>Next Retry</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {failures.map((failure) => (
                <TableRow key={failure.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {failure.leads?.name || "Unknown"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {failure.leads?.company || failure.leads?.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="destructive">
                      {getFailureCodeLabel(failure.failure_code)}
                    </Badge>
                    {failure.failure_message && (
                      <p className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">
                        {failure.failure_message}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{failure.attempt_number}</span>
                    <span className="text-muted-foreground">/3</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {formatDistanceToNow(new Date(failure.failed_at), { addSuffix: true })}
                    </span>
                  </TableCell>
                  <TableCell>
                    {failure.retry_scheduled_at ? (
                      <span className="text-sm">
                        {format(new Date(failure.retry_scheduled_at), "MMM d")}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendUpdateLink(failure)}
                        disabled={processingId === failure.id}
                      >
                        <Mail className="h-4 w-4 mr-1" />
                        Update Link
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkResolved(failure.id, "paid")}
                        disabled={processingId === failure.id}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Resolved
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
