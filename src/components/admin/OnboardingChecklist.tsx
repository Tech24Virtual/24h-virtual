import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface OnboardingChecklistProps {
  checklist: Record<string, boolean>;
  onChange: (key: string, value: boolean) => void;
  disabled?: boolean;
}

const checklistItems = [
  { key: 'consultation_completed', label: 'Initial consultation completed' },
  { key: 'call_flows_created', label: 'Call flows created' },
  { key: 'scripts_written', label: 'Agent scripts written' },
  { key: 'dispositions_configured', label: 'Dispositions configured' },
  { key: 'post_call_flow_setup', label: 'Post-call notes flow set up' },
  { key: 'forwarding_number_assigned', label: 'Forwarding number assigned' },
  { key: 'test_call_completed', label: 'Client test call completed' },
];

export function OnboardingChecklist({ checklist, onChange, disabled }: OnboardingChecklistProps) {
  const completedCount = checklistItems.filter(item => checklist[item.key]).length;
  const progress = (completedCount / checklistItems.length) * 100;

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{completedCount}/{checklistItems.length} completed</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-secondary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Checklist Items */}
      <div className="space-y-3">
        {checklistItems.map((item) => (
          <div key={item.key} className="flex items-center gap-3">
            <Checkbox
              id={item.key}
              checked={checklist[item.key] || false}
              onCheckedChange={(checked) => onChange(item.key, checked === true)}
              disabled={disabled}
            />
            <Label 
              htmlFor={item.key} 
              className={checklist[item.key] ? 'text-muted-foreground line-through' : ''}
            >
              {item.label}
            </Label>
          </div>
        ))}
      </div>

      {/* Completion Status */}
      {completedCount === checklistItems.length && (
        <div className="bg-secondary/10 text-secondary rounded-md p-3 text-sm">
          ✓ All onboarding steps completed! Ready to send payment link.
        </div>
      )}
    </div>
  );
}
