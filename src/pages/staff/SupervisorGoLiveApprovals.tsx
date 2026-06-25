/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CheckCircle2, XCircle, Clock, Loader2, Rocket } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { supabase } from '@/integrations/supabase/client';
import {
  usePendingGoLiveApprovals,
  useSupervisorApproveGoLive,
  useAllGoLiveSnapshots,
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
  const { data: allSnapshots } = useAllGoLiveSnapshots();
  const approve = useSupervisorApproveGoLive();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const pendingCount = pending?.length ?? 0;
  const approvedCount = allSnapshots?.filter(s => s.supervisor_approved).length ?? 0;
  const totalCount = allSnapshots?.length ?? 0;

  const confirmName =
    pending?.find(r => r.campaign_id === confirmId)?.campaign_name ?? 'Campaign';

  const handleApprove = async (campaignId: string, campaignName: string) => {
    setApprovingId(campaignId);
    try {
      await approve.mutateAsync(campaignId);
      toast.success(`"${campaignName}" approved for go-live. Admin has been notified.`);

      // Fire-and-forget: notify the client
      (async () => {
        try {
          const { data: camp } = await (supabase as any)
            .from('campaigns')
            .select('client_lead_id')
            .eq('id', campaignId)
            .maybeSingle();
          if (!camp?.client_lead_id) return;
          const { data: lead } = await supabase
            .from('leads')
            .select('user_id')
            .eq('id', camp.client_lead_id)
            .maybeSingle();
          if (!lead?.user_id) return;
          await supabase.from('notifications').insert({
            user_id: lead.user_id,
            title: 'Go-Live Approved!',
            message: `Your campaign "${campaignName}" has been approved for go-live by the supervisor. An admin will complete the final activation shortly.`,
            category: 'campaign',
            action_url: '/client-dashboard/go-live',
          });
        } catch {}
      })();
    } catch (e: any) {
      toast.error(e?.message ?? 'Approval failed');
    } finally {
      setApprovingId(null);
      setConfirmId(null);
    }
  };

  return (
    <StaffLayout role="supervisor">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50/30 rounded-2xl border border-border p-6">
          <div className="flex items-center gap-3">
            <Rocket className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Go-Live Approvals</h1>
              <p className="text-muted-foreground mt-0.5">
                Campaigns where the client has confirmed readiness and is waiting for your sign-off
                before activation.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                  <p className="text-xs text-muted-foreground">Pending Approval</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{approvedCount}</p>
                  <p className="text-xs text-muted-foreground">Fully Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Rocket className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalCount}</p>
                  <p className="text-xs text-muted-foreground">Total Campaigns</p>
                </div>
              </div>
            </CardContent>
          </Card>
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

        {!isLoading && !error && pendingCount === 0 && (
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

        {pendingCount > 0 && (
          <Card>
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
                        <Badge variant="outline" className="text-xs mt-1">
                          {row.campaign_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          <CheckPill ok={row.snapshot.script_published} label="Script" />
                          <CheckPill ok={row.snapshot.faqs_ok} label="FAQs" />
                          <CheckPill ok={row.snapshot.policies_ok} label="Policies" />
                          <CheckPill ok={row.snapshot.training_ok} label="Training" />
                          <CheckPill ok={row.snapshot.five9_ok} label="Five9" />
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
                          onClick={() => setConfirmId(row.campaign_id)}
                          disabled={approve.isPending && approvingId === row.campaign_id}
                        >
                          {approve.isPending && approvingId === row.campaign_id ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          )}
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

      <AlertDialog open={!!confirmId} onOpenChange={() => setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve for Go-Live?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark <strong>{confirmName}</strong> as supervisor-approved. The client will
              be notified and an admin will complete the final activation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleApprove(confirmId!, confirmName)}>
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </StaffLayout>
  );
}
