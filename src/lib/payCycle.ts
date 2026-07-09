import { addDays, subDays, format } from 'date-fns';

export interface PayCycleBounds {
  start: Date;
  end: Date;
  label: string; // e.g. "Jul 1 – Jul 15, 2026" or "Jul 16 – Jul 31, 2026"
  isFirstHalf: boolean;
}

export function getPayCycleBounds(refDate: Date): PayCycleBounds {
  const d = refDate.getDate();
  const y = refDate.getFullYear();
  const m = refDate.getMonth();
  const isFirstHalf = d <= 15;
  const start = isFirstHalf
    ? new Date(y, m, 1)
    : new Date(y, m, 16);
  const end = isFirstHalf
    ? new Date(y, m, 15)
    : new Date(y, m + 1, 0); // last day of month
  return { start, end, isFirstHalf, label: formatCycleLabel(start, end) };
}

export function getNextPayCycle(current: PayCycleBounds): PayCycleBounds {
  return getPayCycleBounds(addDays(current.end, 1));
}

export function getPrevPayCycle(current: PayCycleBounds): PayCycleBounds {
  return getPayCycleBounds(subDays(current.start, 1));
}

function formatCycleLabel(start: Date, end: Date): string {
  // "Jul 1 – Jul 15, 2026" or "Jul 16 – Jul 31, 2026"
  return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
}
