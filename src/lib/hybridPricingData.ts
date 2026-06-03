// Hybrid Receptionist Pricing Data
// Bundles AI + Human services at discounted rates

export type HybridPlanType = "lite" | "pro" | "executive";

export interface HybridTier {
  id: string;
  name: string;
  aiMinutes: number;
  humanMinutes: number;
  bundlePrice: number;
  individualPrice: number;
  savings: number;
  savingsPercent: number;
  popular?: boolean;
}

export interface HybridPlan {
  id: HybridPlanType;
  name: string;
  shortName: string;
  description: string;
  humanService: string;
  humanServiceSlug: string;
  aiOverageRate: number;
  humanOverageRate: number;
  tiers: HybridTier[];
  popular?: boolean;
}

// Hybrid Lite: AI + Message Assistant
export const hybridLitePricing: HybridPlan = {
  id: "lite",
  name: "Hybrid Lite",
  shortName: "Lite",
  description: "AI Receptionist + Message Assistant",
  humanService: "Message Assistant",
  humanServiceSlug: "message-assistant",
  aiOverageRate: 0.75,
  humanOverageRate: 1.75,
  tiers: [
    { id: "essential", name: "Essential", aiMinutes: 50, humanMinutes: 25, bundlePrice: 99, individualPrice: 94, savings: -5, savingsPercent: 0 },
    { id: "starter", name: "Starter", aiMinutes: 50, humanMinutes: 50, bundlePrice: 119, individualPrice: 138, savings: 19, savingsPercent: 14 },
    { id: "growth", name: "Growth", aiMinutes: 100, humanMinutes: 100, bundlePrice: 199, individualPrice: 248, savings: 49, savingsPercent: 20, popular: true },
    { id: "business", name: "Business", aiMinutes: 250, humanMinutes: 250, bundlePrice: 449, individualPrice: 548, savings: 99, savingsPercent: 18 },
    { id: "professional", name: "Professional", aiMinutes: 500, humanMinutes: 500, bundlePrice: 849, individualPrice: 1048, savings: 199, savingsPercent: 19 },
    { id: "enterprise", name: "Enterprise", aiMinutes: 1000, humanMinutes: 1000, bundlePrice: 1499, individualPrice: 1848, savings: 349, savingsPercent: 19 },
  ],
};

// Hybrid Pro: AI + Virtual Receptionist (Most Popular)
export const hybridProPricing: HybridPlan = {
  id: "pro",
  name: "Hybrid Pro",
  shortName: "Pro",
  description: "AI Receptionist + Virtual Receptionist",
  humanService: "Virtual Receptionist",
  humanServiceSlug: "virtual-receptionist",
  aiOverageRate: 0.75,
  humanOverageRate: 2.00,
  popular: true,
  tiers: [
    { id: "essential", name: "Essential", aiMinutes: 50, humanMinutes: 25, bundlePrice: 109, individualPrice: 124, savings: 15, savingsPercent: 12 },
    { id: "starter", name: "Starter", aiMinutes: 50, humanMinutes: 50, bundlePrice: 169, individualPrice: 198, savings: 29, savingsPercent: 15 },
    { id: "growth", name: "Growth", aiMinutes: 100, humanMinutes: 100, bundlePrice: 279, individualPrice: 348, savings: 69, savingsPercent: 20, popular: true },
    { id: "business", name: "Business", aiMinutes: 250, humanMinutes: 250, bundlePrice: 569, individualPrice: 698, savings: 129, savingsPercent: 18 },
    { id: "professional", name: "Professional", aiMinutes: 500, humanMinutes: 500, bundlePrice: 969, individualPrice: 1198, savings: 229, savingsPercent: 19 },
    { id: "enterprise", name: "Enterprise", aiMinutes: 1000, humanMinutes: 1000, bundlePrice: 1699, individualPrice: 2098, savings: 399, savingsPercent: 19 },
  ],
};

// Hybrid Executive: AI + Virtual Secretary
export const hybridExecutivePricing: HybridPlan = {
  id: "executive",
  name: "Hybrid Executive",
  shortName: "Executive",
  description: "AI Receptionist + Virtual Secretary",
  humanService: "Virtual Secretary",
  humanServiceSlug: "virtual-secretary",
  aiOverageRate: 0.75,
  humanOverageRate: 2.50,
  tiers: [
    { id: "essential", name: "Essential", aiMinutes: 50, humanMinutes: 25, bundlePrice: 129, individualPrice: 149, savings: 20, savingsPercent: 13 },
    { id: "starter", name: "Starter", aiMinutes: 50, humanMinutes: 50, bundlePrice: 209, individualPrice: 248, savings: 39, savingsPercent: 16 },
    { id: "growth", name: "Growth", aiMinutes: 100, humanMinutes: 100, bundlePrice: 319, individualPrice: 398, savings: 79, savingsPercent: 20, popular: true },
    { id: "business", name: "Business", aiMinutes: 250, humanMinutes: 250, bundlePrice: 729, individualPrice: 898, savings: 169, savingsPercent: 19 },
    { id: "professional", name: "Professional", aiMinutes: 500, humanMinutes: 500, bundlePrice: 1369, individualPrice: 1698, savings: 329, savingsPercent: 19 },
    { id: "enterprise", name: "Enterprise", aiMinutes: 1000, humanMinutes: 1000, bundlePrice: 2099, individualPrice: 2598, savings: 499, savingsPercent: 19 },
  ],
};

// All hybrid plans array
export const allHybridPlans: HybridPlan[] = [
  hybridLitePricing,
  hybridProPricing,
  hybridExecutivePricing,
];

// Helper functions
export function getHybridPlanById(id: HybridPlanType): HybridPlan {
  return allHybridPlans.find(plan => plan.id === id) || hybridProPricing;
}

export function getHybridTierById(planId: HybridPlanType, tierId: string): HybridTier | undefined {
  const plan = getHybridPlanById(planId);
  return plan.tiers.find(tier => tier.id === tierId);
}

export function formatSavings(savings: number): string {
  if (savings <= 0) return "Entry Tier";
  return `Save $${savings}`;
}

export function getPopularTiers(plan: HybridPlan): HybridTier[] {
  // Return Essential, Growth, and Business as the 3 featured tiers
  return plan.tiers.filter(tier => 
    tier.id === "essential" || tier.id === "growth" || tier.id === "business"
  );
}

export function calculateAnnualPrice(monthlyPrice: number): number {
  // 10% discount for annual billing
  return Math.round(monthlyPrice * 0.9);
}

export function calculateAnnualSavings(monthlyPrice: number): number {
  const annual = calculateAnnualPrice(monthlyPrice);
  return (monthlyPrice * 12) - (annual * 12);
}
