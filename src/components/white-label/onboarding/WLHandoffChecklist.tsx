import { useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface ChecklistItem {
  key: string;
  completed: boolean;
  completed_at?: string | null;
}

const DEFAULT_STEPS: { key: string; label: string }[] = [
  { key: 'kickoff_date', label: 'Confirm kickoff date with client' },
  { key: 'intake_info', label: 'Collect required intake information' },
  { key: 'scripts_callflows', label: 'Set up scripts and call flows' },
  { key: 'training_session', label: 'Schedule training session' },
  { key: 'service_active', label: 'Activate service and confirm go-live' },
];

interface Props {
  state: ChecklistItem[];
  onChange: (next: ChecklistItem[]) => void;
  disabled?: boolean;
  /**
   * Optional template steps. When provided, these replace the hardcoded
   * defaults (used by checklist templates per proposal type). Falls back
   * to DEFAULT_STEPS for backward compatibility.
   */
  templateSteps?: { key: string; label: string }[];
}

export function WLHandoffChecklist({ state, onChange, disabled, templateSteps }: Props) {
  const stepDefs = templateSteps && templateSteps.length > 0 ? templateSteps : DEFAULT_STEPS;

  const merged = useMemo(() => {
    const byKey = new Map(state.map((i) => [i.key, i]));
    return stepDefs.map((s) => ({
      key: s.key,
      label: s.label,
      completed: byKey.get(s.key)?.completed ?? false,
      completed_at: byKey.get(s.key)?.completed_at ?? null,
    }));
  }, [state, stepDefs]);

  const completedCount = merged.filter((i) => i.completed).length;
  const total = merged.length;
  const pct = total === 0 ? 0 : Math.round((completedCount / total) * 100);

  const toggle = (key: string) => {
    if (disabled) return;
    const next: ChecklistItem[] = merged.map((i) => {
      if (i.key !== key) {
        return { key: i.key, completed: i.completed, completed_at: i.completed_at };
      }
      const willComplete = !i.completed;
      return {
        key: i.key,
        completed: willComplete,
        completed_at: willComplete ? new Date().toISOString() : null,
      };
    });
    onChange(next);
  };

  if (total === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        This proposal uses a custom checklist. Steps will be added manually as the
        engagement progresses.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {completedCount}/{total} complete
        </span>
        <span>{pct}%</span>
      </div>
      <Progress value={pct} className="h-1.5" />
      <ul className="space-y-2 mt-2">
        {merged.map((item) => (
          <li key={item.key} className="flex items-start gap-3 text-sm">
            <Checkbox
              id={`chk-${item.key}`}
              checked={item.completed}
              onCheckedChange={() => toggle(item.key)}
              disabled={disabled}
              className="mt-0.5"
            />
            <label
              htmlFor={`chk-${item.key}`}
              className={cn(
                'flex-1 cursor-pointer leading-relaxed',
                item.completed && 'line-through text-muted-foreground',
              )}
            >
              {item.label}
              {item.completed && item.completed_at && (
                <span className="block text-xs text-muted-foreground mt-0.5 no-underline">
                  Completed {new Date(item.completed_at).toLocaleDateString()}
                </span>
              )}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
