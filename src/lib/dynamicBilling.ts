/**
 * Dynamic Billing Algorithm
 * 
 * Calculates the optimal subscription tier for a client based on their actual usage.
 * This ensures clients are always charged the lowest possible amount by automatically
 * finding the tier that minimizes: base_price + (overage_minutes × overage_rate)
 * 
 * IMPORTANT: Dynamic billing is service-isolated. A client on Virtual Receptionist
 * will only be optimized across Virtual Receptionist tiers - never cross-applied
 * to AI Receptionist or any other service.
 */

import {
  getServiceBySlug,
  isEligibleForDynamicBilling,
  type ServicePricing,
  type PricingTier,
} from './pricingData';

export interface DynamicBillingResult {
  // Service isolation confirmation
  serviceSlug: string;
  serviceName: string;
  isEligible: boolean;
  tiersEvaluated: number;

  // Usage data
  minutesUsed: number;

  // Original tier info (what client signed up for)
  originalTier: {
    minutes: number;
    price: number;
  };

  // Optimal tier (calculated)
  optimalTier: {
    minutes: number;
    price: number;
  };

  // Cost breakdown
  breakdown: {
    baseCost: number;
    overageMinutes: number;
    overageRate: number;
    overageCost: number;
    totalCost: number;
    annualDiscount: number; // New field for annual discount amount
  };

  // Static billing comparison (if they stayed on original tier)
  staticBilling: {
    baseCost: number;
    overageMinutes: number;
    overageCost: number;
    totalCost: number;
  };

  // Savings
  savings: number;
  savingsPercentage: number;
  
  // Annual billing flag
  isAnnual: boolean;
}

export interface TierCostCalculation {
  tier: PricingTier;
  baseCost: number;
  overageMinutes: number;
  overageCost: number;
  totalCost: number;
  annualDiscount?: number;
}

// Annual discount rate (10% off base tier price only)
export const ANNUAL_DISCOUNT_RATE = 0.10;

/**
 * Calculate the cost for a specific tier given usage
 * @param isAnnual - If true, applies 10% discount to base tier price only (not overages)
 */
export function calculateTierCost(
  tier: PricingTier,
  minutesUsed: number,
  overageRate: number,
  isAnnual: boolean = false
): TierCostCalculation {
  const overageMinutes = Math.max(0, minutesUsed - tier.minutes);
  const overageCost = overageMinutes * overageRate;
  
  // Apply annual discount to base price only
  const annualDiscount = isAnnual ? tier.price * ANNUAL_DISCOUNT_RATE : 0;
  const discountedBasePrice = isAnnual ? tier.price * (1 - ANNUAL_DISCOUNT_RATE) : tier.price;
  const totalCost = discountedBasePrice + overageCost; // Overage is NOT discounted

  return {
    tier,
    baseCost: discountedBasePrice,
    overageMinutes,
    overageCost,
    totalCost,
    annualDiscount,
  };
}

/**
 * Calculate dynamic billing for a client
 * 
 * @param serviceSlug - The service type (e.g., 'virtual-receptionist')
 * @param minutesUsed - Total minutes used in the billing period
 * @param originalPlanMinutes - The tier the client originally signed up for
 * @param isAnnual - Whether the client has an annual billing commitment (10% discount on base tier)
 * @returns DynamicBillingResult with optimal tier and savings
 */
export function calculateDynamicBilling(
  serviceSlug: string,
  minutesUsed: number,
  originalPlanMinutes: number,
  isAnnual: boolean = false
): DynamicBillingResult | null {
  // Check if service is eligible for dynamic billing
  if (!isEligibleForDynamicBilling(serviceSlug)) {
    console.log(`[DYNAMIC-BILLING] Service ${serviceSlug} is not eligible for dynamic billing`);
    return null;
  }

  // Get service pricing data
  const service = getServiceBySlug(serviceSlug);
  if (!service) {
    console.log(`[DYNAMIC-BILLING] Service ${serviceSlug} not found`);
    return null;
  }

  const { tiers, overage: overageRate } = service;

  // Find original tier
  const originalTier = tiers.find(t => t.minutes === originalPlanMinutes);
  if (!originalTier) {
    console.log(`[DYNAMIC-BILLING] Original tier ${originalPlanMinutes} not found for ${serviceSlug}`);
    // Fall back to first tier if original not found
    const fallbackTier = tiers[0];
    return calculateDynamicBillingWithTiers(
      service,
      minutesUsed,
      fallbackTier,
      overageRate,
      isAnnual
    );
  }

  return calculateDynamicBillingWithTiers(
    service,
    minutesUsed,
    originalTier,
    overageRate,
    isAnnual
  );
}

/**
 * Internal function to calculate dynamic billing with validated tiers
 */
function calculateDynamicBillingWithTiers(
  service: ServicePricing,
  minutesUsed: number,
  originalTier: PricingTier,
  overageRate: number,
  isAnnual: boolean = false
): DynamicBillingResult {
  const { tiers, slug, name } = service;

  // Calculate cost for each tier to find the optimal one
  let optimalCalculation: TierCostCalculation | null = null;

  for (const tier of tiers) {
    const calculation = calculateTierCost(tier, minutesUsed, overageRate, isAnnual);

    if (!optimalCalculation || calculation.totalCost < optimalCalculation.totalCost) {
      optimalCalculation = calculation;
    }
  }

  // This should never happen if tiers exist, but TypeScript needs the check
  if (!optimalCalculation) {
    throw new Error(`No tiers available for service ${slug}`);
  }

  // Calculate static billing (staying on original tier)
  const staticCalculation = calculateTierCost(originalTier, minutesUsed, overageRate, isAnnual);

  // Calculate savings
  const savings = staticCalculation.totalCost - optimalCalculation.totalCost;
  const savingsPercentage = staticCalculation.totalCost > 0
    ? (savings / staticCalculation.totalCost) * 100
    : 0;

  return {
    // Service isolation confirmation
    serviceSlug: slug,
    serviceName: name,
    isEligible: true,
    tiersEvaluated: tiers.length,

    // Usage data
    minutesUsed,

    // Original tier
    originalTier: {
      minutes: originalTier.minutes,
      price: originalTier.price,
    },

    // Optimal tier
    optimalTier: {
      minutes: optimalCalculation.tier.minutes,
      price: optimalCalculation.tier.price,
    },

    // Cost breakdown for optimal tier
    breakdown: {
      baseCost: optimalCalculation.baseCost,
      overageMinutes: optimalCalculation.overageMinutes,
      overageRate,
      overageCost: optimalCalculation.overageCost,
      totalCost: optimalCalculation.totalCost,
      annualDiscount: optimalCalculation.annualDiscount || 0,
    },

    // Static billing comparison
    staticBilling: {
      baseCost: staticCalculation.baseCost,
      overageMinutes: staticCalculation.overageMinutes,
      overageCost: staticCalculation.overageCost,
      totalCost: staticCalculation.totalCost,
    },

    // Savings
    savings,
    savingsPercentage,
    
    // Annual billing flag
    isAnnual,
  };
}

/**
 * Get all tier calculations for a service (useful for displaying comparison)
 */
export function getAllTierCalculations(
  serviceSlug: string,
  minutesUsed: number
): TierCostCalculation[] | null {
  const service = getServiceBySlug(serviceSlug);
  if (!service) return null;

  return service.tiers.map(tier =>
    calculateTierCost(tier, minutesUsed, service.overage)
  );
}

/**
 * Find the breakeven point between two adjacent tiers
 * Returns the minute threshold where upgrading becomes beneficial
 */
export function findBreakevenPoint(
  lowerTier: PricingTier,
  higherTier: PricingTier,
  overageRate: number
): number {
  // At breakeven: lowerTier.price + (minutes - lowerTier.minutes) * rate = higherTier.price + (minutes - higherTier.minutes) * rate
  // Solving for minutes when higher tier has no overage (minutes <= higherTier.minutes):
  // lowerTier.price + (minutes - lowerTier.minutes) * rate = higherTier.price
  // (minutes - lowerTier.minutes) * rate = higherTier.price - lowerTier.price
  // minutes = lowerTier.minutes + (higherTier.price - lowerTier.price) / rate

  const priceDifference = higherTier.price - lowerTier.price;
  const breakeven = lowerTier.minutes + (priceDifference / overageRate);

  return Math.ceil(breakeven);
}

/**
 * Format currency for display with multi-currency support
 */
export function formatCurrency(amount: number, currency: string = 'usd'): string {
  const currencyCode = currency.toUpperCase();
  const locale = currencyCode === 'CAD' ? 'en-CA' : 'en-US';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
