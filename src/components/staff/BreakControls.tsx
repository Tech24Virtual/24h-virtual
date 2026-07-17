import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export type BreakType = 'bathroom' | 'lunch' | 'general';

const BREAK_LABELS: Record<BreakType, string> = {
  bathroom: '🚻 Bathroom Break',
  lunch: '🍽️ Lunch Break',
  general: '☕ Break',
};

interface BreakButtonsProps {
  onStartBreak: (type: 'bathroom' | 'lunch', durationMinutes: number) => void;
  isPending: boolean;
  bathroomAllowanceMinutes: number;
  lunchMinutes: number;
}

/** Bathroom starts immediately at the admin allowance; Lunch opens a 30/60 min picker. */
export function BreakButtons({ onStartBreak, isPending, bathroomAllowanceMinutes, lunchMinutes }: BreakButtonsProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        className="h-auto flex-col items-center gap-0.5 py-2"
        onClick={() => onStartBreak('bathroom', bathroomAllowanceMinutes)}
        disabled={isPending}
      >
        <span>🚻 Bathroom Break</span>
        <span className="text-xs text-muted-foreground">{bathroomAllowanceMinutes} min</span>
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-auto flex-col items-center gap-0.5 py-2"
            disabled={isPending}
          >
            <span>🍽️ Lunch Break</span>
            <span className="text-xs text-muted-foreground">30 or 60 min</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2 space-y-2">
          <p className="text-xs font-medium text-muted-foreground px-1">Select duration</p>
          {[30, 60].map((mins) => (
            <Button
              key={mins}
              className="w-full justify-between"
              variant="outline"
              size="sm"
              onClick={() => onStartBreak('lunch', mins)}
              disabled={isPending}
            >
              {mins} minutes
              {mins === lunchMinutes && <span className="text-xs text-muted-foreground">Default</span>}
            </Button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface BreakTimerProps {
  breakType: BreakType;
  durationMinutes: number;
  startedAt: string;
  onEndBreak: () => void;
  isPending: boolean;
}

/** Countdown from durationMinutes; flips to an overtime warning once it hits zero. */
export function BreakTimer({ breakType, durationMinutes, startedAt, onEndBreak, isPending }: BreakTimerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const totalSeconds = Math.max(0, durationMinutes) * 60;
  const elapsedSeconds = Math.floor((now - new Date(startedAt).getTime()) / 1000);
  const remainingSeconds = totalSeconds - elapsedSeconds;
  const isOvertime = remainingSeconds <= 0;
  const overtimeMinutes = Math.ceil(Math.abs(remainingSeconds) / 60);
  const mm = Math.floor(Math.max(0, remainingSeconds) / 60);
  const ss = Math.max(0, remainingSeconds) % 60;
  const progress = totalSeconds > 0 ? Math.min(100, (elapsedSeconds / totalSeconds) * 100) : 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse shrink-0" />
        <span className="text-sm font-medium text-muted-foreground">{BREAK_LABELS[breakType]}</span>
      </div>
      {isOvertime ? (
        <p className="text-2xl font-mono font-bold text-red-600 text-center">
          ⚠️ {overtimeMinutes} min overtime
        </p>
      ) : (
        <p className="text-3xl font-mono font-bold text-orange-600 text-center">
          {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')} remaining
        </p>
      )}
      <Progress value={progress} className={isOvertime ? '[&>div]:bg-red-500 h-2' : 'h-2'} />
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={onEndBreak}
        disabled={isPending}
      >
        End Break
      </Button>
    </div>
  );
}
