/**
 * Call Data Parser Utilities
 * 
 * Parses time formats from call center reports and calculates billable metrics.
 * Used by the ingest-call-report edge function and admin UI.
 */

/**
 * Parses time string formats (HH:MM:SS or MM:SS) to seconds
 * @param timeStr Time string in format "04:32" or "00:04:32"
 * @returns Total seconds
 */
export function parseTimeToSeconds(timeStr: string | null | undefined): number {
  if (!timeStr) return 0;
  
  const parts = timeStr.trim().split(':').map(p => parseInt(p, 10));
  
  if (parts.some(isNaN)) return 0;
  
  if (parts.length === 3) {
    // HH:MM:SS format
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // MM:SS format
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    // Just seconds
    return parts[0];
  }
  
  return 0;
}

/**
 * Formats seconds into human-readable duration (e.g., "4h 32m 15s")
 */
export function formatSecondsToReadable(seconds: number): string {
  if (seconds <= 0) return '0s';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}

/**
 * Formats seconds into MM:SS or HH:MM:SS format
 */
export function formatSecondsToDuration(seconds: number): string {
  if (seconds <= 0) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

/**
 * Calculates handle time from talk time and ACW
 * Handle Time = Talk Time + After Call Work
 */
export function calculateHandleTime(talkTimeSeconds: number, acwSeconds: number): number {
  return talkTimeSeconds + acwSeconds;
}

/**
 * Calculates billable minutes from handle time
 * Rounds up to the nearest minute
 */
export function calculateBillableMinutes(handleTimeSeconds: number): number {
  return Math.ceil(handleTimeSeconds / 60);
}

/**
 * Calculate total billable minutes from an array of calls
 */
export function calculateTotalBillableMinutes(
  calls: Array<{ talk_time_seconds?: number | null; acw_seconds?: number | null }>
): number {
  return calls.reduce((total, call) => {
    const talkTime = call.talk_time_seconds || 0;
    const acw = call.acw_seconds || 0;
    const handleTime = calculateHandleTime(talkTime, acw);
    return total + calculateBillableMinutes(handleTime);
  }, 0);
}

/**
 * Calculate aggregate stats from call logs
 */
export function calculateCallStats(calls: Array<{
  talk_time_seconds?: number | null;
  acw_seconds?: number | null;
  handle_time_seconds?: number | null;
  billable_minutes?: number | null;
}>) {
  const totalCalls = calls.length;
  let totalTalkTimeSeconds = 0;
  let totalAcwSeconds = 0;
  let totalHandleTimeSeconds = 0;
  let totalBillableMinutes = 0;

  for (const call of calls) {
    const talkTime = call.talk_time_seconds || 0;
    const acw = call.acw_seconds || 0;
    const handleTime = call.handle_time_seconds || calculateHandleTime(talkTime, acw);
    const billable = call.billable_minutes || calculateBillableMinutes(handleTime);

    totalTalkTimeSeconds += talkTime;
    totalAcwSeconds += acw;
    totalHandleTimeSeconds += handleTime;
    totalBillableMinutes += billable;
  }

  return {
    totalCalls,
    totalTalkTimeSeconds,
    totalAcwSeconds,
    totalHandleTimeSeconds,
    totalBillableMinutes,
    avgHandleTimeSeconds: totalCalls > 0 ? Math.round(totalHandleTimeSeconds / totalCalls) : 0,
  };
}

/**
 * Parse phone number to consistent E.164 format
 */
export function normalizePhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  
  // Remove all non-digit characters except leading +
  const cleaned = phone.replace(/[^\\d+]/g, '');
  
  // If it starts with +, keep it
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // If 10 digits, assume North American
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  
  // If 11 digits and starts with 1, add +
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  
  return cleaned || null;
}

/**
 * Parse date string to Date object (handles various formats)
 */
export function parseDateString(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  
  // Try ISO format first
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }
  
  // Try MM/DD/YYYY format
  const mmddyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const match = dateStr.match(mmddyyyy);
  if (match) {
    const [, month, day, year] = match;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // Try YYYY-MM-DD format
  const yyyymmdd = /^(\d{4})-(\d{2})-(\d{2})$/;
  const match2 = dateStr.match(yyyymmdd);
  if (match2) {
    const [, year, month, day] = match2;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  return null;
}

/**
 * Generate a deduplication key for a call
 */
export function generateCallDeduplicationKey(call: {
  external_call_id?: string;
  caller_phone?: string;
  call_date?: string;
  call_time?: string;
}): string {
  if (call.external_call_id) {
    return `ext:${call.external_call_id}`;
  }
  
  // Fallback to phone + date + time
  return `${call.caller_phone || 'unknown'}_${call.call_date || ''}_${call.call_time || ''}`;
}
