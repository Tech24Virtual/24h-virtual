/**
 * Pure helper — mirrors public.disposition_bucket(text) SQL function.
 * Keep the two seeded maps in sync. Tested by src/__tests__/dispositionBucket.test.ts.
 */

export type DispositionBucket = 'resolved' | 'escalated' | 'no_contact' | 'other';

export const DISPOSITION_BUCKET_MAP: Record<Exclude<DispositionBucket, 'other'>, RegExp> = {
  resolved: /(resolved|completed|success|sale|booked|scheduled|answered|handled)/i,
  escalated: /(escalat|transfer|supervisor|callback requested)/i,
  no_contact: /(missed|no answer|no-answer|abandon|voicemail|hang|busy|not reached)/i,
};

export function dispositionBucket(disposition: string | null | undefined): DispositionBucket {
  if (!disposition || disposition.trim().length === 0) return 'other';
  if (DISPOSITION_BUCKET_MAP.resolved.test(disposition)) return 'resolved';
  if (DISPOSITION_BUCKET_MAP.escalated.test(disposition)) return 'escalated';
  if (DISPOSITION_BUCKET_MAP.no_contact.test(disposition)) return 'no_contact';
  return 'other';
}
