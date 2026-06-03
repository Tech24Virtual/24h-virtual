import { addHours } from 'date-fns';

/**
 * Get due date based on task priority
 * Urgent: 1 hour
 * High: 4 hours
 * Medium: 8 hours (1 business day)
 * Low: 48 hours (2-3 business days)
 */
export const getPriorityDueDate = (priority: string): Date => {
  const now = new Date();
  switch (priority) {
    case 'urgent':
      return addHours(now, 1);
    case 'high':
      return addHours(now, 4);
    case 'medium':
      return addHours(now, 8);
    case 'low':
      return addHours(now, 48);
    default:
      return addHours(now, 24);
  }
};

/**
 * Get expiration status of a task
 * Returns 'expired' if past due, 'warning' if 75% time elapsed, 'normal' otherwise
 */
export const getExpirationStatus = (
  dueDate: string | null,
  createdAt: string,
  status: string
): 'expired' | 'warning' | 'normal' => {
  if (!dueDate || status === 'completed') return 'normal';

  const now = new Date();
  const due = new Date(dueDate);
  const created = new Date(createdAt);

  if (now > due) return 'expired';

  // Warning when 75% of time has passed
  const totalDuration = due.getTime() - created.getTime();
  const elapsed = now.getTime() - created.getTime();

  if (elapsed / totalDuration >= 0.75) return 'warning';

  return 'normal';
};

/**
 * Get priority time frame label
 */
export const getPriorityTimeFrame = (priority: string): string => {
  switch (priority) {
    case 'urgent':
      return 'Within 1 hour';
    case 'high':
      return 'Within 4 hours';
    case 'medium':
      return 'Within 8 hours';
    case 'low':
      return 'Within 2-3 days';
    default:
      return 'Within 24 hours';
  }
};
