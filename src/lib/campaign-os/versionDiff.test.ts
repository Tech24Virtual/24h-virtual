import { describe, expect, it } from 'vitest';
import { diffSnapshots, diffSummary } from './versionDiff';

const before = {
  scenarios: [
    { id: 's1', title: 'Refund', body: 'old body' },
    { id: 's2', title: 'Cancel', body: 'cancel body' },
  ],
  faqs: [{ id: 'f1', question: 'Hours?', answer: 'M-F 9-5' }],
  training_modules: [],
};

const after = {
  scenarios: [
    { id: 's1', title: 'Refund', body: 'NEW body' },
    { id: 's3', title: 'Upgrade', body: 'upgrade body' },
  ],
  faqs: [{ id: 'f1', question: 'Hours?', answer: 'M-F 9-5' }],
  training_modules: [{ id: 't1', title: 'Intro' }],
};

describe('versionDiff', () => {
  it('detects added, removed, and changed entries', () => {
    const sections = diffSnapshots(before, after);
    const summary = diffSummary(sections);
    expect(summary.added).toBe(2); // s3 + t1
    expect(summary.removed).toBe(1); // s2
    expect(summary.changed).toBe(1); // s1 body
  });

  it('returns empty diff for identical snapshots', () => {
    const sections = diffSnapshots(before, before);
    const summary = diffSummary(sections);
    expect(summary.added).toBe(0);
    expect(summary.removed).toBe(0);
    expect(summary.changed).toBe(0);
  });

  it('handles missing sections gracefully', () => {
    const sections = diffSnapshots({}, { faqs: [{ id: 'x', question: 'New?' }] });
    const summary = diffSummary(sections);
    expect(summary.added).toBe(1);
  });
});
