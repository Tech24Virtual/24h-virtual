import { useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const DEFAULT_STEPS: { key: string; label: string }[] = [
  { key: 'consultation_completed', label: 'Initial consultation completed' },
  { key: 'call_flows_created', label: 'Call flows created' },
  { key: 'scripts_written', label: 'Agent scripts written' },
  { key: 'dispositions_configured', label: 'Dispositions configured' },
  { key: 'post_call_flow_setup', label: 'Post-call notes flow set up' },
  { key: 'forwarding_number_assigned', label: 'Forwarding number assigned' },
  { key: 'test_call_completed', label: 'Client test call completed' },
];

interface Props {
  state: Record<string, unknown>;
  onChange: (next: Record<string, boolean>) => void;
  disabled?: boolean;
}

export function ClientHandoffChecklist({ state, onChange, disabled }: Props) {
  const merged = useMemo(
    () =>
      DEFAULT_STEPS.map((s) => ({
        key: s.key,
        label: s.label,
        completed: !!(state as Record<string, boolean>)?.[s.key],
      })),
    [state],
  );

  const completedCount = merged.filter((i) => i.completed).length;
  const total = merged.length;
  const pct = total === 0 ? 0 : Math.round((completedCount / total) * 100);

  const toggle = (key: string) => {
    if (disabled) return;
    const next: Record<string, boolean> = {};
    for (const m of merged) next[m.key] = m.key === key ? !m.completed : m.completed;
    onChange(next);
  };

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
              id={`oc-${item.key}`}
              checked={item.completed}
              onCheckedChange={() => toggle(item.key)}
              disabled={disabled}
              className="mt-0.5"
            />
            <label
              htmlFor={`oc-${item.key}`}
              className={cn(
                'flex-1 cursor-pointer leading-relaxed',
                item.completed && 'line-through text-muted-foreground',
              )}
            >
              {item.label}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
