import { describe, expect, it } from 'vitest';
import { projectInvoice, resolvePlanTerms } from './pricing';

const lead = { plan_minutes: 100, custom_minute_rate: null, custom_plan_enabled: false };

describe('resolvePlanTerms', () => {
  it('uses the catalog plan when no custom plan is enabled', () => {
    const t = resolvePlanTerms(lead, { name: 'Starter', fixed_amount: 149, overage_rate: 2, minute_rate: 3 }, null);
    expect(t).toMatchObject({ source: 'catalog', planName: 'Starter', fixedAmount: 149, rate: 2 });
  });

  it('prefers an enabled custom plan and does not fall back to catalog overage terms when it is missing', () => {
    const custom = resolvePlanTerms({ ...lead, custom_plan_enabled: true }, { fixed_amount: 149, overage_rate: 2 }, { name: 'Acme', fixed_amount: 300, overage_rate: 1 });
    expect(custom).toMatchObject({ source: 'custom', fixedAmount: 300, rate: 1 });

    const missing = resolvePlanTerms({ ...lead, custom_plan_enabled: true }, { fixed_amount: 149, overage_rate: 2 }, null);
    expect(missing.rate).toBeNull();
    expect(missing.source).toBe('none');
  });

  it('returns empty terms for a client with no plan', () => {
    expect(resolvePlanTerms(lead, null, null)).toMatchObject({ source: 'none', fixedAmount: null, rate: null });
  });
});

describe('projectInvoice', () => {
  it('has no overage inside the included minutes', () => {
    const terms = resolvePlanTerms(lead, { fixed_amount: 149, overage_rate: 2 }, null);
    expect(projectInvoice(lead, terms, 80)).toMatchObject({ overageMinutes: 0, overageAmount: 0, baseAmount: 149, total: 149 });
  });

  it('charges overage beyond included minutes plus grace', () => {
    const terms = resolvePlanTerms(lead, { fixed_amount: 149, overage_rate: 2, overage_grace_minutes: 10 }, null);
    const p = projectInvoice(lead, terms, 130);
    expect(p.overageMinutes).toBe(20);
    expect(p.overageAmount).toBe(40);
    expect(p.total).toBe(189);
  });

  it('applies the overage cap', () => {
    const terms = resolvePlanTerms(lead, { fixed_amount: 0, overage_rate: 2, overage_cap_amount: 25 }, null);
    expect(projectInvoice(lead, terms, 500).overageAmount).toBe(25);
  });

  it('falls back to the client custom rate, then 1.39, when the plan has no rate', () => {
    const noPlan = resolvePlanTerms(lead, null, null);
    expect(projectInvoice({ ...lead, custom_minute_rate: 0.5 }, noPlan, 110).overageAmount).toBe(5);
    expect(projectInvoice(lead, noPlan, 110).overageAmount).toBe(13.9);
  });

  it('mirrors the billing run: included minutes come from leads.plan_minutes only', () => {
    const noMinutes = { ...lead, plan_minutes: null };
    const terms = resolvePlanTerms(noMinutes, { fixed_amount: 149, overage_rate: 2, included_minutes: 50 }, null);
    expect(projectInvoice(noMinutes, terms, 30)).toMatchObject({ includedMinutes: 0, overageMinutes: 30, overageAmount: 60 });
  });
});
