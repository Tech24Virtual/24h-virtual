import { describe, expect, it } from 'vitest';
import { calcPayoutAmount, canProcessAutomatically, describeRate, type AgentPayoutProfile } from './payout';

const base: AgentPayoutProfile = {
  agent_id: 'a1', full_name: 'Test Agent', has_banking: true, pay_type: 'hourly',
  hourly_rate: 20, monthly_rate: null, hours_per_month: null, overtime_hourly_rate: null,
  payment_method: 'bank_transfer', bank_name: null, account_last4: null, routing_masked: null,
  e_transfer_email: null, currency: 'CAD', country: 'CA',
};
const monthly: AgentPayoutProfile = { ...base, pay_type: 'monthly', hourly_rate: null, monthly_rate: 1000, hours_per_month: 160, overtime_hourly_rate: 7.5 };

describe('calcPayoutAmount', () => {
  it('hourly agents are paid net hours x rate', () => {
    expect(calcPayoutAmount({ net_hours: 38.5, payout_amount: null }, base)).toMatchObject({ amount: 770, basis: 'hourly' });
  });

  it('monthly agents show the monthly rate instead of hours x rate', () => {
    expect(calcPayoutAmount({ net_hours: 38.5, payout_amount: null }, monthly)).toMatchObject({ amount: 1000, basis: 'monthly', overtimeAmount: 0 });
  });

  it('adds overtime only for hours above the monthly threshold', () => {
    expect(calcPayoutAmount({ net_hours: 170, payout_amount: null }, monthly)).toMatchObject({ amount: 1075, overtimeAmount: 75 });
  });

  it('a recorded payout_amount always wins', () => {
    expect(calcPayoutAmount({ net_hours: 38.5, payout_amount: 650 }, monthly)).toMatchObject({ amount: 650, basis: 'recorded' });
  });

  it('is unset when the relevant rate is missing', () => {
    expect(calcPayoutAmount({ net_hours: 10, payout_amount: null }, { ...base, hourly_rate: 0 }).amount).toBeNull();
    expect(calcPayoutAmount({ net_hours: 10, payout_amount: null }, { ...monthly, monthly_rate: null }).amount).toBeNull();
    expect(calcPayoutAmount({ net_hours: 10, payout_amount: null }, undefined).amount).toBeNull();
  });
});

describe('canProcessAutomatically', () => {
  it('only hourly agents with banking and a rate can use the payout function', () => {
    expect(canProcessAutomatically(base)).toBe(true);
    expect(canProcessAutomatically(monthly)).toBe(false);
    expect(canProcessAutomatically({ ...base, has_banking: false })).toBe(false);
    expect(canProcessAutomatically({ ...base, hourly_rate: null })).toBe(false);
    expect(canProcessAutomatically(undefined)).toBe(false);
  });
});

describe('describeRate', () => {
  it('describes each pay type', () => {
    expect(describeRate(base)).toBe('$20.00 / hr');
    expect(describeRate(monthly)).toBe('$1000.00 / month');
    expect(describeRate({ ...base, hourly_rate: null })).toBeNull();
  });
});
