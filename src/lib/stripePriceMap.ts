/**
 * Stripe Price ID Mappings for Dynamic Billing
 * 
 * Maps service types and minute tiers to Stripe price IDs.
 * Used by send-payment-link and stripe-webhook edge functions.
 */

export interface StripePriceMapping {
  priceId: string;
  productId: string;
  minutes: number;
  price: number; // in cents
}

// AI Receptionist prices
export const aiReceptionistPrices: Record<number, StripePriceMapping> = {
  50: { priceId: 'price_1SwqIDJ7jKy5oKiLP9tkjPsA', productId: 'prod_Tufdpdsmya6BHq', minutes: 50, price: 4900 },
  100: { priceId: 'price_1SwqIEJ7jKy5oKiLonqWDLdj', productId: 'prod_TufdTWHfiswEgv', minutes: 100, price: 9900 },
  250: { priceId: 'price_1SwpYnJ7jKy5oKiLu0ysfWuA', productId: 'prod_TuesgO0Q8KFBly', minutes: 250, price: 19900 },
  500: { priceId: 'price_1SwpYoJ7jKy5oKiL3GVTUvTc', productId: 'prod_Tues6Muq0MU6Jw', minutes: 500, price: 39900 },
  750: { priceId: 'price_1SwqIGJ7jKy5oKiLIWMRNiXS', productId: 'prod_TufdYG6KwURGs5', minutes: 750, price: 49900 },
  1000: { priceId: 'price_1SwqIHJ7jKy5oKiLLD5qXWeo', productId: 'prod_TufdXOUomqCIpS', minutes: 1000, price: 59900 },
  1250: { priceId: 'price_1SwqIIJ7jKy5oKiL4yhDOMn9', productId: 'prod_Tufdn0MXjUgKlY', minutes: 1250, price: 69900 },
  1500: { priceId: 'price_1SwqIJJ7jKy5oKiLHQ3geUj2', productId: 'prod_Tufd3DVj2CQbvK', minutes: 1500, price: 79900 },
  2000: { priceId: 'price_1SwqIKJ7jKy5oKiLL4yY4CrI', productId: 'prod_TufduO2qH0UfCx', minutes: 2000, price: 99900 },
  2500: { priceId: 'price_1SwqILJ7jKy5oKiLy4H0AcCH', productId: 'prod_TufdpbeRBHfY84', minutes: 2500, price: 129900 },
  5000: { priceId: 'price_1SwqIMJ7jKy5oKiLhINt9uNM', productId: 'prod_Tufd2DZnL0pnFs', minutes: 5000, price: 199900 },
};

// Message Assistant prices
export const messageAssistantPrices: Record<number, StripePriceMapping> = {
  50: { priceId: 'price_1SwqIRJ7jKy5oKiLRF2O1ZcQ', productId: 'prod_Tufd06CB8ZIZoQ', minutes: 50, price: 8900 },
  100: { priceId: 'price_1SwqISJ7jKy5oKiLBGghGfyD', productId: 'prod_TufdCkpJM4eQC2', minutes: 100, price: 14900 },
  250: { priceId: 'price_1SwqITJ7jKy5oKiLd7Owzwhf', productId: 'prod_TufdZ3pnSzJuJC', minutes: 250, price: 34900 },
  500: { priceId: 'price_1SwqIUJ7jKy5oKiLBOtD61eY', productId: 'prod_TufdoCqOfhbJrB', minutes: 500, price: 64900 },
  750: { priceId: 'price_1SwqIVJ7jKy5oKiLLT2DBOOL', productId: 'prod_TufdOxTtBpXMQc', minutes: 750, price: 94900 },
  1000: { priceId: 'price_1SwqIWJ7jKy5oKiLYXJQhd70', productId: 'prod_Tufd2ViUnMX4c7', minutes: 1000, price: 124900 },
  1250: { priceId: 'price_1SwqIXJ7jKy5oKiLw59K4r8C', productId: 'prod_Tufd5SsD744rGh', minutes: 1250, price: 154900 },
  1500: { priceId: 'price_1SwqIYJ7jKy5oKiLMiZDze5F', productId: 'prod_Tufdtdli8G7DDE', minutes: 1500, price: 184900 },
  2000: { priceId: 'price_1SwqIZJ7jKy5oKiLPnxo4hii', productId: 'prod_TufdEL1N9P1biW', minutes: 2000, price: 244900 },
  2500: { priceId: 'price_1SwqIaJ7jKy5oKiL1NEXypaa', productId: 'prod_Tufd1YB40rEpgx', minutes: 2500, price: 294900 },
  5000: { priceId: 'price_1SwqIbJ7jKy5oKiLEmvQmnBy', productId: 'prod_TufdSkwxdbhL7n', minutes: 5000, price: 574900 },
};

// Virtual Receptionist prices
export const virtualReceptionistPrices: Record<number, StripePriceMapping> = {
  50: { priceId: 'price_1SwqIgJ7jKy5oKiLdSUWxZjC', productId: 'prod_TufdFPyy7ZwPHp', minutes: 50, price: 14900 },
  100: { priceId: 'price_1SwqIhJ7jKy5oKiL4PB529Zf', productId: 'prod_TufdaeXUNjIJ9E', minutes: 100, price: 24900 },
  250: { priceId: 'price_1SwpYpJ7jKy5oKiLmXszjYL7', productId: 'prod_Tues2rtELVTLjU', minutes: 250, price: 49900 },
  500: { priceId: 'price_1SwpYqJ7jKy5oKiLvHCgxfti', productId: 'prod_TuesERT5n9R32L', minutes: 500, price: 79900 },
  750: { priceId: 'price_1SwqIiJ7jKy5oKiLvWRLHG9v', productId: 'prod_TufeWoY6S8F9FF', minutes: 750, price: 119900 },
  1000: { priceId: 'price_1SwqIjJ7jKy5oKiLt7rbMbQv', productId: 'prod_TufeJQAJgeXrwV', minutes: 1000, price: 149900 },
  1250: { priceId: 'price_1SwqIlJ7jKy5oKiLQZZrIKOu', productId: 'prod_TufeXblHhRFXxQ', minutes: 1250, price: 179900 },
  1500: { priceId: 'price_1SwqImJ7jKy5oKiLobOxfggw', productId: 'prod_TufeR5PtKlcfnp', minutes: 1500, price: 219900 },
  2000: { priceId: 'price_1SwqInJ7jKy5oKiLym59Y6mZ', productId: 'prod_TufeF5GeqZ8xth', minutes: 2000, price: 279900 },
  2500: { priceId: 'price_1SwqIoJ7jKy5oKiLj7H9zLjz', productId: 'prod_TufeLMRSkS3Wvs', minutes: 2500, price: 329900 },
  5000: { priceId: 'price_1SwqIpJ7jKy5oKiLUucWIhFP', productId: 'prod_TufelLk20UT0UI', minutes: 5000, price: 649900 },
};

// Virtual Secretary prices
export const virtualSecretaryPrices: Record<number, StripePriceMapping> = {
  50: { priceId: 'price_1SwqItJ7jKy5oKiLJeksHNVV', productId: 'prod_Tufe0m1wiiSygO', minutes: 50, price: 19900 },
  100: { priceId: 'price_1SwqIuJ7jKy5oKiLb4RdRhpl', productId: 'prod_Tufe4B4cDtQ7va', minutes: 100, price: 29900 },
  250: { priceId: 'price_1SwqIvJ7jKy5oKiLRzTS4YZ1', productId: 'prod_TufesCF9TTxJnB', minutes: 250, price: 69900 },
  500: { priceId: 'price_1SwqIwJ7jKy5oKiLN8KxFI0m', productId: 'prod_TufekxsmVwux2u', minutes: 500, price: 129900 },
  750: { priceId: 'price_1SwqIxJ7jKy5oKiLLG1qOXut', productId: 'prod_Tufex3OulErpFa', minutes: 750, price: 179900 },
  1000: { priceId: 'price_1SwqIyJ7jKy5oKiLHhTjtFyd', productId: 'prod_TufeVNZBv3lcT5', minutes: 1000, price: 199900 },
  1250: { priceId: 'price_1SwqIzJ7jKy5oKiL7izvTFOr', productId: 'prod_TufeIj8sHmNfnn', minutes: 1250, price: 229900 },
  1500: { priceId: 'price_1SwqJ0J7jKy5oKiLGN0MCoKr', productId: 'prod_TufehDh0lhDOh9', minutes: 1500, price: 259900 },
  2000: { priceId: 'price_1SwqJ2J7jKy5oKiL5W8mcH7A', productId: 'prod_Tufeh5lK8ESVsP', minutes: 2000, price: 319900 },
  2500: { priceId: 'price_1SwqJ3J7jKy5oKiLd5Vz4nXE', productId: 'prod_TufeoCTg3EPqgr', minutes: 2500, price: 379900 },
  5000: { priceId: 'price_1SwqJ4J7jKy5oKiLcqh0izfj', productId: 'prod_TufeJ2qNIk5sOo', minutes: 5000, price: 749900 },
};

// Service to prices mapping
export const servicePricesMap: Record<string, Record<number, StripePriceMapping>> = {
  'ai-receptionist': aiReceptionistPrices,
  'message-assistant': messageAssistantPrices,
  'virtual-receptionist': virtualReceptionistPrices,
  'virtual-secretary': virtualSecretaryPrices,
};

// Overage rates in dollars per minute
export const serviceOverageRates: Record<string, number> = {
  'ai-receptionist': 0.75,
  'message-assistant': 1.75,
  'virtual-receptionist': 2.00,
  'virtual-secretary': 2.50,
};

// Overage Stripe price IDs (per minute, metered)
export const overagePriceIds: Record<string, { usd: string; cad: string }> = {
  'ai-receptionist': { usd: 'price_1SwroTJ7jKy5oKiLB07FfEsZ', cad: 'price_1Swrp3J7jKy5oKiLWeW4Qig6' },
  'message-assistant': { usd: 'price_1SwroUJ7jKy5oKiLUnMMvLaK', cad: 'price_1Swrp4J7jKy5oKiLV9zaYfyB' },
  'virtual-receptionist': { usd: 'price_1SwroWJ7jKy5oKiLRIsUMGf9', cad: 'price_1Swrp5J7jKy5oKiLchdNCrEG' },
  'virtual-secretary': { usd: 'price_1SwroWJ7jKy5oKiLlxAoMuOz', cad: 'price_1Swrp7J7jKy5oKiLe1iOM6oI' },
};

// Get price mapping for a service and tier
export function getStripePriceMapping(
  serviceSlug: string,
  minutes: number
): StripePriceMapping | null {
  const servicePrices = servicePricesMap[serviceSlug];
  if (!servicePrices) return null;
  return servicePrices[minutes] || null;
}

// Get all available tiers for a service
export function getServiceTiers(serviceSlug: string): number[] {
  const servicePrices = servicePricesMap[serviceSlug];
  if (!servicePrices) return [];
  return Object.keys(servicePrices).map(Number).sort((a, b) => a - b);
}

// Check if a service is eligible for dynamic billing
export function isEligibleForDynamicBilling(serviceSlug: string): boolean {
  return serviceSlug in servicePricesMap;
}

// Get overage price ID for a service and currency
export function getOveragePriceId(serviceSlug: string, currency: 'usd' | 'cad'): string | null {
  const prices = overagePriceIds[serviceSlug];
  if (!prices) return null;
  return prices[currency];
}
