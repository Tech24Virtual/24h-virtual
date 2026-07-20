import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw, CheckCircle } from "lucide-react";
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
import { formatDistanceToNow } from "date-fns";
import { PaymentIssueSheet } from "@/components/admin/PaymentIssueSheet";

interface PaymentFailure {
  id: string;
  lead_id: string;
  amount: number | null;
  failure_code: string | null;
  failure_message: string | null;
  attempt_number: number;
  retry_count: number | null;
  status: string | null;
  failed_at: string;
  resolved_at: string | null;
  leads?: {
    name: string;
    email: string;
    company: string | null;
  };
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  failed: { label: "Failed", className: "bg-destructive/10 text-destructive" },
  retrying: { label: "Retrying", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  needs_attention: { label: "Needs Attention", className: "bg-destructive text-destructive-foreground" },
  resolved: { label: "Resolved", className: "bg-cta/10 text-cta" },
  cancelled: { label: "Retries Cancelled", className: "bg-muted text-muted-foreground" },
};

const FAILURE_CODE_LABELS: Record<string, string> = {
  card_declined: "Card Declined",
  insufficient_funds: "Insufficient Funds",
  expired_card: "Expired Card",
  processing_error: "Processing Error",
  declined: "Declined",
  error: "Gateway Error",
};

export function PaymentFailures() {
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  const { data: failures, isLoading, error, refetch } = useQuery({
    queryKey: ["payment-failures"],
    staleTime: 60_000,
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

  const getFailureCodeLabel = (code: string | null) =>
    FAILURE_CODE_LABELS[code || ""] || code || "Unknown";

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

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Payment Issues
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-destructive/80">
          <p className="font-medium">Failed to load payment failures</p>
          <p className="text-xs text-muted-foreground mt-1">
            Verify <code className="font-mono">GRANT SELECT ON public.payment_failures</code> is applied.
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
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
                Failed payments requiring attention — click a row for details and retry actions
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
                  <TableHead>Amount</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Failed</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failures.map((failure) => {
                  const statusInfo = STATUS_LABELS[failure.status ?? "failed"] ?? STATUS_LABELS.failed;
                  return (
                    <TableRow
                      key={failure.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedIssueId(failure.id)}
                    >
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
                        {failure.amount != null ? `$${Number(failure.amount).toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{(failure.retry_count ?? 0) + 1}</span>
                        <span className="text-muted-foreground">/3</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {formatDistanceToNow(new Date(failure.failed_at), { addSuffix: true })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PaymentIssueSheet
        issueId={selectedIssueId}
        open={!!selectedIssueId}
        onOpenChange={(open) => !open && setSelectedIssueId(null)}
      />
    </>
  );
}
