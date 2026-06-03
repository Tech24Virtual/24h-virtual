import { describe, it, expect } from 'vitest';
import { dispositionBucket } from '@/lib/campaign-os/dispositionBucket';

describe('dispositionBucket', () => {
  it('classifies resolved outcomes', () => {
    expect(dispositionBucket('Sale Completed')).toBe('resolved');
    expect(dispositionBucket('booked appointment')).toBe('resolved');
  });

  it('classifies escalations', () => {
    expect(dispositionBucket('Escalated to supervisor')).toBe('escalated');
    expect(dispositionBucket('transfer to billing')).toBe('escalated');
  });

  it('classifies no_contact dispositions', () => {
    expect(dispositionBucket('Missed call')).toBe('no_contact');
    expect(dispositionBucket('Voicemail left')).toBe('no_contact');
    expect(dispositionBucket('abandoned')).toBe('no_contact');
  });

  it('is case-insensitive', () => {
    expect(dispositionBucket('RESOLVED')).toBe('resolved');
    expect(dispositionBucket('MISSED')).toBe('no_contact');
  });

  it('falls back to other for unseen dispositions', () => {
    expect(dispositionBucket('Unknown weird label')).toBe('other');
    expect(dispositionBucket('NeedsReview')).toBe('other');
  });

  it('returns other for empty/null', () => {
    expect(dispositionBucket(null)).toBe('other');
    expect(dispositionBucket(undefined)).toBe('other');
    expect(dispositionBucket('')).toBe('other');
    expect(dispositionBucket('   ')).toBe('other');
  });
});
