import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, MessageSquarePlus, CheckCircle2, Mail } from 'lucide-react';
import { SEO } from '@/components/SEO';
import {
  useFulfillmentIntake,
  useFulfillmentIntakeMutations,
} from '@/hooks/admin/useFulfillmentIntakes';
import {
  INTAKE_STATUS_LABEL,
  INTAKE_STATUS_VARIANT,
  INTAKE_PRIORITY_LABEL,
  canTransitionIntake,
  type IntakeStatus,
  type IntakePriority,
} from '@/lib/wl/fulfillmentStatus';
import { FulfillmentIntakeDetail } from '@/components/admin/fulfillment/FulfillmentIntakeDetail';
import { FulfillmentNotesPanel } from '@/components/admin/fulfillment/FulfillmentNotesPanel';
import { FulfillmentActivityList } from '@/components/admin/fulfillment/FulfillmentActivityList';
import { FulfillmentRequestDialog } from '@/components/admin/fulfillment/FulfillmentRequestDialog';

interface SnapshotShape {
  items?: Array<{ item_key: string; label: string }>;
}

export default function AdminFulfillmentIntakeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: intake, isLoading } = useFulfillmentIntake(id);
  const { updateStatus, updatePriority } = useFulfillmentIntakeMutations();
  const [requestOpen, setRequestOpen] = useState(false);

  const snapshotItems = useMemo(() => {
    const snap = (intake?.snapshot_json as unknown as SnapshotShape) ?? {};
    return snap.items ?? [];
  }, [intake]);

  if (isLoading) {
    return (
      <div className="max-w-6xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!intake) {
    return (
      <Card className="p-12 text-center max-w-2xl">
        <p className="font-medium">Intake not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/admin/fulfillment-intake')}>
          Back to queue
        </Button>
      </Card>
    );
  }

  const allStatuses: IntakeStatus[] = [
    'new_submission',
    'received',
    'under_review',
    'needs_partner_update',
    'approved',
    'activation_in_progress',
    'activated',
    'closed',
  ];

  return (
    <>
      <SEO title={`Intake ${intake.intake_number} — Admin`} description="Fulfillment intake detail" />
      <div className="max-w-7xl space-y-6">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2"
            onClick={() => navigate('/admin/fulfillment-intake')}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to queue
          </Button>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold font-mono">{intake.intake_number}</h1>
                <Badge variant={INTAKE_STATUS_VARIANT[intake.status]}>
                  {INTAKE_STATUS_LABEL[intake.status]}
                </Badge>
                <Badge variant="outline" className="text-xs">v{intake.snapshot_version}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {intake.partner?.company_name ?? 'Unknown partner'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <FulfillmentIntakeDetail intake={intake} />
          </div>

          <div className="space-y-4">
            <Card className="p-4 space-y-3">
              <h3 className="text-sm font-semibold">Workflow</h3>
              <div className="space-y-2">
                <Label className="text-xs">Status</Label>
                <Select
                  value={intake.status}
                  onValueChange={(v) =>
                    updateStatus.mutate({ id: intake.id, status: v as IntakeStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allStatuses.map((s) => {
                      const allowed = s === intake.status || canTransitionIntake(intake.status, s);
                      return (
                        <SelectItem key={s} value={s} disabled={!allowed}>
                          {INTAKE_STATUS_LABEL[s]}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Priority</Label>
                <Select
                  value={intake.priority}
                  onValueChange={(v) =>
                    updatePriority.mutate({ id: intake.id, priority: v as IntakePriority })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(INTAKE_PRIORITY_LABEL) as IntakePriority[]).map((p) => (
                      <SelectItem key={p} value={p}>
                        {INTAKE_PRIORITY_LABEL[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setRequestOpen(true)}
              >
                <MessageSquarePlus className="w-4 h-4 mr-2" /> Request more info
              </Button>

              {intake.status === 'activated' && (
                <div className="rounded-md border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Client Activated
                  </div>
                  <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-500">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    Welcome email sent
                  </div>
                  {intake.activated_at && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(intake.activated_at).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </Card>

            <FulfillmentActivityList intakeId={intake.id} />
            <FulfillmentNotesPanel intakeId={intake.id} />
          </div>
        </div>

        <FulfillmentRequestDialog
          open={requestOpen}
          onOpenChange={setRequestOpen}
          intakeId={intake.id}
          partnerId={intake.partner_id}
          handoffId={intake.source_handoff_id}
          snapshotItems={snapshotItems}
        />
      </div>
    </>
  );
}
