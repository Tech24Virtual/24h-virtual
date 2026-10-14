// Billing rules shared by every Five9 data path (ingest-five9-call webhook,
// pull-five9-call-report, pull-wl-five9-calls). Confirmed with Paul, 2026-10-14:
//  1. Abandoned calls (status 'missed') are not billed.
//  2. Dispositions containing any NON_BILLABLE_DISPOSITIONS term are not billed.
//  3. Otherwise bill handle time (talk + ACW), rounded up to the minute.

export const NON_BILLABLE_DISPOSITIONS = ['wrong number', 'testing', 'marketing', 'internal testing'];

export function isNonBillableDisposition(disposition: string | null | undefined): boolean {
  if (!disposition) return false;
  const lower = disposition.toLowerCase();
  return NON_BILLABLE_DISPOSITIONS.some(term => lower.includes(term));
}

export function calcBillableMinutes(params: {
  status: 'completed' | 'missed';
  talkTimeSeconds: number;
  acwSeconds: number;
  disposition: string | null | undefined;
}): number {
  // Abandoned calls = $0
  if (params.status === 'missed') return 0;
  // Non-billable dispositions = $0
  if (isNonBillableDisposition(params.disposition)) return 0;
  // Handle time = talk + ACW, rounded up to minute
  return Math.ceil((params.talkTimeSeconds + params.acwSeconds) / 60);
}
