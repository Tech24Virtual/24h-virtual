import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface LeadPipelineStatusProps {
  currentStage: string;
  onStageChange: (stage: string) => void;
  disabled?: boolean;
}

const stages = [
  { id: 'new', label: 'New', color: 'bg-primary' },
  { id: 'qualified', label: 'Qualified', color: 'bg-indigo-500' },
  { id: 'sales', label: 'Sales', color: 'bg-yellow-500' },
  { id: 'onboarding', label: 'Onboarding', color: 'bg-purple-500' },
  { id: 'ready_for_billing', label: 'Ready for Billing', color: 'bg-cta' },
  { id: 'active', label: 'Active', color: 'bg-secondary' },
  { id: 'lost', label: 'Lost', color: 'bg-rose-500' },
  { id: 'churned', label: 'Churned', color: 'bg-muted' },
];

export function LeadPipelineStatus({ currentStage, onStageChange, disabled }: LeadPipelineStatusProps) {
  const currentIndex = stages.findIndex(s => s.id === currentStage);

  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-heading">Pipeline Status</h3>
        <span className="text-sm text-muted-foreground capitalize">
          Current: {stages.find(s => s.id === currentStage)?.label || currentStage}
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="relative mb-6">
        <div className="flex items-center justify-between">
          {stages.map((stage, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = stage.id === currentStage;
            const isChurned = currentStage === 'churned';
            
            return (
              <div key={stage.id} className="flex flex-col items-center flex-1">
                <button
                  onClick={() => onStageChange(stage.id)}
                  disabled={disabled}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all z-10 relative",
                    isCompleted && "bg-secondary text-secondary-foreground",
                    isCurrent && !isChurned && cn(stage.color, "text-white ring-2 ring-offset-2 ring-offset-background"),
                    isCurrent && isChurned && "bg-muted text-muted-foreground ring-2 ring-offset-2 ring-offset-background ring-muted",
                    !isCompleted && !isCurrent && "bg-muted text-muted-foreground hover:bg-muted/80",
                    disabled && "cursor-not-allowed opacity-50"
                  )}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                </button>
                <span className={cn(
                  "text-xs mt-2 text-center",
                  isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
                )}>
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* Connecting Line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted -z-0">
          <div 
            className="h-full bg-secondary transition-all"
            style={{ width: `${Math.max(0, (currentIndex / (stages.length - 1)) * 100)}%` }}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {currentStage === 'new' && (
          <Button size="sm" onClick={() => onStageChange('qualified')} disabled={disabled}>
            Mark Qualified
          </Button>
        )}
        {currentStage === 'qualified' && (
          <Button size="sm" onClick={() => onStageChange('sales')} disabled={disabled}>
            Assign to Sales
          </Button>
        )}
        {currentStage === 'sales' && (
          <>
            <Button size="sm" onClick={() => onStageChange('onboarding')} disabled={disabled}>
              Pass to Onboarding
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onStageChange('lost')} disabled={disabled}>
              Mark as Lost
            </Button>
          </>
        )}
        {currentStage === 'onboarding' && (
          <Button size="sm" onClick={() => onStageChange('ready_for_billing')} disabled={disabled}>
            Ready for Billing
          </Button>
        )}
        {currentStage === 'active' && (
          <Button size="sm" variant="destructive" onClick={() => onStageChange('churned')} disabled={disabled}>
            Mark as Churned
          </Button>
        )}
      </div>
    </div>
  );
}
