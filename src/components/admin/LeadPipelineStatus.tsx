import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
import { PIPELINE_STAGES, ALLOWED_TRANSITIONS, canTransition, type PipelineStage } from '@/lib/revenue/pipeline';

interface LeadPipelineStatusProps {
  currentStage: string;
  onStageChange: (stage: string) => void;
  disabled?: boolean;
}

const stages = PIPELINE_STAGES;

const QUICK_ACTION_LABELS: Record<PipelineStage, string> = {
  new: 'Mark New',
  contacted: 'Mark Contacted',
  qualified: 'Mark Qualified',
  proposal: 'Send Proposal',
  sales: 'Assign to Sales',
  won: 'Mark as Won',
  onboarding: 'Pass to Onboarding',
  ready_for_billing: 'Ready for Billing',
  active: 'Activate Client',
  lost: 'Mark as Lost',
  churned: 'Mark as Churned',
};

export function LeadPipelineStatus({ currentStage, onStageChange, disabled }: LeadPipelineStatusProps) {
  const [pendingStage, setPendingStage] = useState<string | null>(null);
  const currentIndex = stages.findIndex(s => s.key === currentStage);
  const isTerminal = currentStage === 'churned';

  const requestStageChange = (stage: string) => {
    if (stage === currentStage) return;
    // Invalid transitions skip the confirmation and go straight to the caller,
    // which surfaces its own "invalid stage transition" feedback.
    if (!canTransition(currentStage as PipelineStage, stage as PipelineStage)) {
      onStageChange(stage);
      return;
    }
    setPendingStage(stage);
  };

  const confirmStageChange = () => {
    if (pendingStage) onStageChange(pendingStage);
    setPendingStage(null);
  };

  const nextTransitions = ALLOWED_TRANSITIONS[currentStage as PipelineStage] || [];
  const pendingLabel = pendingStage
    ? stages.find(s => s.key === pendingStage)?.label || pendingStage
    : '';

  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-heading">Pipeline Status</h3>
        <span className="text-sm text-muted-foreground capitalize">
          Current: {stages.find(s => s.key === currentStage)?.label || currentStage}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="relative mb-6 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[720px]">
          {stages.map((stage, index) => {
            const isCompleted = currentIndex >= 0 && index < currentIndex;
            const isCurrent = stage.key === currentStage;

            return (
              <div key={stage.key} className="flex flex-col items-center flex-1">
                <button
                  onClick={() => requestStageChange(stage.key)}
                  disabled={disabled}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all z-10 relative",
                    isCompleted && "bg-secondary text-secondary-foreground",
                    isCurrent && !isTerminal && cn(stage.color, "text-white ring-2 ring-offset-2 ring-offset-background"),
                    isCurrent && isTerminal && "bg-muted text-muted-foreground ring-2 ring-offset-2 ring-offset-background ring-muted",
                    !isCompleted && !isCurrent && "bg-muted text-muted-foreground hover:bg-muted/80",
                    disabled && "cursor-not-allowed opacity-50"
                  )}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                </button>
                <span className={cn(
                  "text-xs mt-2 text-center whitespace-nowrap",
                  isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
                )}>
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Connecting Line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted -z-0 min-w-[720px]">
          <div
            className="h-full bg-secondary transition-all"
            style={{ width: `${Math.max(0, (currentIndex / (stages.length - 1)) * 100)}%` }}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {nextTransitions.map(target => (
          <Button
            key={target}
            size="sm"
            variant={target === 'lost' || target === 'churned' ? 'destructive' : 'default'}
            onClick={() => requestStageChange(target)}
            disabled={disabled}
          >
            {QUICK_ACTION_LABELS[target] || target}
          </Button>
        ))}
      </div>

      <AlertDialog open={!!pendingStage} onOpenChange={open => !open && setPendingStage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move lead to "{pendingLabel}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This changes the lead's pipeline stage from "{stages.find(s => s.key === currentStage)?.label || currentStage}" to "{pendingLabel}". This action is visible to everyone working this lead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStageChange}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
