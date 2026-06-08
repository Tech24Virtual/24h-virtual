/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle2, XCircle, Clock, Loader2, Rocket, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { StaffLayout } from '@/components/staff/StaffLayout';
import {
  usePendingGoLiveApprovals,
  useSupervisorApproveGoLive,
} from '@/hooks/campaign-os/useSupervisorGoLive';

function CheckPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${
        ok
          ? 'bg-status-success-bg text-status-success'
          : 'bg-status-warning-bg text-status-warning'
      }`}
    >
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label}
    </span>
  );
}

export default function SupervisorGoLiveApprovals() {
  const { data: pending, isLoading, error, refetch } = usePendingGoLiveApprovals();
  const approve = useSupervisorApproveGoLive();

  const handleApprove = async (campaignId: string, campaignName: string) => {
    if (
      !window.confirm(
        `Approve "${campaignName}" for go-live?\n\nThis confirms the campaign configuration is correct and the client's team is ready. The admin can then activate the campaign.`
      )
    )
      return;
    try {
      await approve.mutateAsync(campaignId);
      toast.success(`"${campaignName}" approved for go-live. Admin has been notified.`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Approval failed');
    }
  };

  return (
    <StaffLayout role="supervisor">
      <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Rocket className="h-5 w-5" />
          Go-Live Approvals
        </h1>
        <p className="text-sm text-muted-foreground">
          Campaigns where the client has confirmed readiness and is waiting for your sign-off
          before activation.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading approvals…
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="p-6 text-sm text-destructive">
            Could not load approvals.{' '}
            <Button variant="link" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && (pending?.length ?? 0) === 0 && (
        <Card>
          <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <div className="font-medium">No pending approvals</div>
              <div className="text-sm text-muted-foreground">
                All campaigns are either waiting for client confirmation or already approved.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {(pending?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Awaiting your sign-off</CardTitle>
            <CardDescription>
              {pending!.length} campaign{pending!.length === 1 ? '' : 's'} confirmed by the client
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead className="hidden md:table-cell">Checklist</TableHead>
                  <TableHead className="hidden sm:table-cell">Client confirmed</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending!.map((row) => (
                  <TableRow key={row.campaign_id}>
                    <TableCell>
                      <div className="font-medium">{row.campaign_name}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {row.campaign_status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 p-0 text-xs text-muted-foreground hover:text-foreground"
                          asChild
                        >
                          <Link
                            to={`/admin/campaign-os/campaigns/${row.campaign_id}?tab=go-live`}
                            target="_blank"
                          >
                            View <ExternalLink className="h-3 w-3 ml-0.5" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        <CheckPill ok={row.snapshot.script_published} label="Script" />
                        <CheckPill ok={row.snapshot.faqs_ok} label="FAQs" />
                        <CheckPill ok={row.snapshot.policies_ok} label="Policies" />
                        <CheckPill ok={row.snapshot.training_ok} label="Training" />
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {row.client_confirmed_at
                        ? formatDistanceToNow(new Date(row.client_confirmed_at), {
                            addSuffix: true,
                          })
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(row.campaign_id, row.campaign_name)}
                        disabled={approve.isPending}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Approve
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      </div>
    </StaffLayout>
  );
}
