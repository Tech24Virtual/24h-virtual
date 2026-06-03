import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle2, Circle, Send, RotateCw } from 'lucide-react';
import { useWLHandoffItems } from '@/hooks/wl/useWLHandoffItems';
import { useWLHandoffRequests } from '@/hooks/wl/useWLHandoffRequests';
import { useWLFulfillmentSubmit } from '@/hooks/wl/useWLFulfillmentSubmit';
import {
  canSubmitOrResubmit,
  type WLSubmissionStatus,
} from '@/lib/wl/fulfillmentStatus';

interface Props {
  handoffId: string;
  proposalId: string;
  partnerId: string;
  submissionStatus: WLSubmissionStatus;
}

export function WLSubmitToFulfillmentCard({ handoffId, proposalId, partnerId, submissionStatus }: Props) {
  const { data: items } = useWLHandoffItems(handoffId);
  const { data: requests } = useWLHandoffRequests(handoffId);
  const submit = useWLFulfillmentSubmit();

  const { requiredDone, requiredTotal, openRequests, allRequiredProvided } = useMemo(() => {
    const list = items ?? [];
    const req = list.filter((i) => i.is_required);
    const done = req.filter((i) => i.status === 'provided' || i.status === 'na').length;
    const open = (requests ?? []).filter((r) => r.status === 'open').length;
    return {
      requiredDone: done,
      requiredTotal: req.length,
      openRequests: open,
      allRequiredProvided: req.length > 0 && done === req.length,
    };
  }, [items, requests]);

  const gate = canSubmitOrResubmit(submissionStatus, openRequests > 0);
  const buttonDisabled =
    !gate.canSubmit ||
    submit.isPending ||
    (!gate.isResubmit && !allRequiredProvided);

  const reason = !gate.canSubmit
    ? gate.reason
    : !gate.isResubmit && !allRequiredProvided
      ? 'Complete all required intake items before submitting.'
      : undefined;

  const checklistItems = [
    {
      label: `Required items provided (${requiredDone}/${requiredTotal})`,
      done: allRequiredProvided,
    },
    {
      label: gate.isResubmit
        ? `Open requests resolved (${openRequests} open)`
        : 'No open requests',
      done: openRequests === 0,
    },
  ];

  const button = (
    <Button
      className="w-full"
      disabled={buttonDisabled}
      onClick={() => submit.mutate({ handoffId, proposalId, partnerId })}
    >
      {gate.isResubmit ? (
        <>
          <RotateCw className="w-4 h-4 mr-2" /> Resubmit to fulfillment
        </>
      ) : (
        <>
          <Send className="w-4 h-4 mr-2" /> Submit to fulfillment
        </>
      )}
    </Button>
  );

  // Submitted and awaiting admin review — no open requests needing partner action
  const showSubmittedBanner =
    submissionStatus === 'submitted_to_fulfillment' && openRequests === 0;

  return (
    <Card className="p-4 space-y-4">
      <div>
        <h3 className="font-semibold text-sm">Readiness</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Submit a frozen package once everything is in place.
        </p>
      </div>
      <ul className="space-y-2 text-sm">
        {checklistItems.map((c, i) => (
          <li key={i} className="flex items-center gap-2">
            {c.done ? (
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
            <span className={c.done ? '' : 'text-muted-foreground'}>{c.label}</span>
          </li>
        ))}
      </ul>
      {showSubmittedBanner ? (
        <div className="rounded-md border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30 p-3 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
          <p className="text-xs text-green-700 dark:text-green-400">
            Submitted to fulfillment team. You'll be notified when your onboarding is reviewed.
          </p>
        </div>
      ) : reason ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>{button}</span>
          </TooltipTrigger>
          <TooltipContent>{reason}</TooltipContent>
        </Tooltip>
      ) : (
        button
      )}
    </Card>
  );
}
