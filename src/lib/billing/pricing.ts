// Invoice projection for the billing Client Lookup.
//
// This deliberately MIRRORS supabase/functions/run-call-billing so the projection shows what the next
// billing run would actually charge. Notes on that function's behaviour:
//   - it bills OVERAGE only (billing_summaries.overage_amount); the base subscription is charged
//     separately through Stripe/NMI
//   - included minutes come from leads.plan_minutes only (the catalog plan's included_minutes is not used)
//   - overage rate = plan overage_rate || minute_rate, else leads.custom_minute_rate, else 1.39
//   - an enabled custom plan takes priority over the catalog plan, and if it is enabled but missing the
//     run does NOT fall back to the catalog plan

export const DEFAULT_OVERAGE_RATE = 1.39;

export interface PlanRow {
  name?: string | null;
  fixed_amount?: number | null;
  minute_rate?: number | null;
  overage_rate?: number | null;
  overage_grace_minutes?: number | null;
  overage_cap_amount?: number | null;
  included_minutes?: number | null;
}

export interface LeadPricingInput {
  plan_minutes: number | null;
  custom_minute_rate: number | null;
  custom_plan_enabled: boolean | null;
}

export interface PlanTerms {
  source: 'custom' | 'catalog' | 'none';
  planName: string | null;
  fixedAmount: number | null;
  rate: number | null;
  graceMinutes: number;
  capAmount: number | null;
}

export function resolvePlanTerms(
  lead: LeadPricingInput,
  catalogPlan: PlanRow | null | undefined,
  customPlan: PlanRow | null | undefined,
): PlanTerms {
  const from = (plan: PlanRow, source: 'custom' | 'catalog', name: string | null): PlanTerms => ({
    source,
    planName: name,
    fixedAmount: plan.fixed_amount ?? null,
    rate: plan.overage_rate || plan.minute_rate || null,
    graceMinutes: plan.overage_grace_minutes ?? 0,
    capAmount: plan.overage_cap_amount ?? null,
  });

  if (lead.custom_plan_enabled) {
    return customPlan
      ? from(customPlan, 'custom', customPlan.name ?? 'Custom plan')
      : { source: 'none', planName: null, fixedAmount: catalogPlan?.fixed_amount ?? null, rate: null, graceMinutes: 0, capAmount: null };
  }
  if (catalogPlan) return from(catalogPlan, 'catalog', catalogPlan.name ?? null);
  return { source: 'none', planName: null, fixedAmount: null, rate: null, graceMinutes: 0, capAmount: null };
}

export interface InvoiceProjection {
  includedMinutes: number;
  minutesUsed: number;
  overageMinutes: number;
  overageRate: number;
  overageAmount: number;
  baseAmount: number;
  total: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function projectInvoice(lead: LeadPricingInput, terms: PlanTerms, minutesUsed: number): InvoiceProjection {
  const includedMinutes = lead.plan_minutes || 0;
  const overageMinutes = Math.max(0, minutesUsed - includedMinutes - terms.graceMinutes);
  const overageRate = terms.rate ?? lead.custom_minute_rate ?? DEFAULT_OVERAGE_RATE;
  const uncapped = overageMinutes * overageRate;
  const overageAmount = round2(terms.capAmount != null ? Math.min(uncapped, terms.capAmount) : uncapped);
  const baseAmount = round2(terms.fixedAmount ?? 0);
  return {
    includedMinutes,
    minutesUsed,
    overageMinutes,
    overageRate,
    overageAmount,
    baseAmount,
    total: round2(baseAmount + overageAmount),
  };
}

export function formatMoney(value: number | null | undefined, currency = 'USD'): string {
  const n = Number(value ?? 0);
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}
