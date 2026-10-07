// Agent payout display helpers shared by AgentPayoutsList and AgentPayoutSheet.

export interface AgentPayoutProfile {
  agent_id: string;
  full_name: string | null;
  has_banking: boolean;
  pay_type: 'hourly' | 'monthly';
  hourly_rate: number | null;
  monthly_rate: number | null;
  hours_per_month: number | null;
  overtime_hourly_rate: number | null;
  payment_method: string | null;
  bank_name: string | null;
  account_last4: string | null;
  routing_masked: string | null;
  e_transfer_email: string | null;
  currency: string | null;
  country: string | null;
}

export interface PayoutInvoiceLike {
  net_hours: number;
  payout_amount: number | null;
}

export interface PayoutAmount {
  amount: number | null;
  basis: 'recorded' | 'hourly' | 'monthly' | 'unset';
  overtimeAmount: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Gross amount for an invoice.
 *  - a recorded payout_amount always wins (it is what was / will be paid)
 *  - monthly agents show monthly_rate (+ overtime above hours_per_month) instead of hours x hourly rate
 * NOTE: shift_invoices cover short periods (the existing one is a week), so a monthly rate shown per
 * invoice is the agent's monthly figure, not a prorated slice. "Mark as Paid" lets billing enter the
 * actual amount.
 */
export function calcPayoutAmount(inv: PayoutInvoiceLike, profile: AgentPayoutProfile | undefined): PayoutAmount {
  if (inv.payout_amount) return { amount: inv.payout_amount, basis: 'recorded', overtimeAmount: 0 };
  if (!profile) return { amount: null, basis: 'unset', overtimeAmount: 0 };

  if (profile.pay_type === 'monthly') {
    if (!profile.monthly_rate) return { amount: null, basis: 'unset', overtimeAmount: 0 };
    const overtimeHours =
      profile.hours_per_month && profile.overtime_hourly_rate ? Math.max(0, inv.net_hours - profile.hours_per_month) : 0;
    const overtimeAmount = round2(overtimeHours * (profile.overtime_hourly_rate ?? 0));
    return { amount: round2(profile.monthly_rate + overtimeAmount), basis: 'monthly', overtimeAmount };
  }

  if (!profile.hourly_rate) return { amount: null, basis: 'unset', overtimeAmount: 0 };
  return { amount: round2(inv.net_hours * profile.hourly_rate), basis: 'hourly', overtimeAmount: 0 };
}

/**
 * Can the Airwallex payout function pay this agent? process-agent-payout only understands
 * hours x hourly_rate and rejects agents without an hourly rate, so monthly agents must be marked
 * paid manually (payroll for monthly pay is deferred).
 */
export function canProcessAutomatically(profile: AgentPayoutProfile | undefined): boolean {
  return !!profile && profile.has_banking && profile.pay_type === 'hourly' && !!profile.hourly_rate;
}

export function describeRate(profile: AgentPayoutProfile | undefined): string | null {
  if (!profile) return null;
  if (profile.pay_type === 'monthly') {
    if (!profile.monthly_rate) return null;
    return `$${profile.monthly_rate.toFixed(2)} / month`;
  }
  return profile.hourly_rate ? `$${profile.hourly_rate.toFixed(2)} / hr` : null;
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Direct Deposit / Bank Transfer',
  e_transfer: 'E-Transfer',
  paypal: 'PayPal',
  wise: 'Wise',
};
