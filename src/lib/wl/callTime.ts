import { format } from 'date-fns';

const CLIENT_TIME_ZONE = 'America/Toronto';

/**
 * Calls carry a dedicated call_date/call_time pair (the telephony system's
 * recorded wall-clock time) separate from created_at (DB insert time, which
 * can lag behind the actual call and isn't reliable for display). Prefer
 * call_date/call_time — parsed with no timezone suffix so JS treats it as a
 * literal wall-clock value rather than reinterpreting it through the
 * viewer's browser timezone. Fall back to created_at (a true UTC instant)
 * rendered explicitly in the client's America/Toronto timezone.
 */
export function formatCallDateTime(call: any, pattern: string): string {
  if (call.call_date) {
    const local = new Date(`${call.call_date}T${call.call_time || '00:00:00'}`);
    return format(local, pattern);
  }
  return new Intl.DateTimeFormat('en-US', {
    timeZone: CLIENT_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(call.created_at));
}

export function callDateKey(call: any): string {
  if (call.call_date) return call.call_date;
  // Derive the Toronto calendar date from created_at for calls without call_date.
  return new Intl.DateTimeFormat('en-CA', { timeZone: CLIENT_TIME_ZONE }).format(new Date(call.created_at));
}
