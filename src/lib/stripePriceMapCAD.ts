/**
 * Stripe Price ID Mappings for CAD Currency
 * 
 * Maps service types and minute tiers to Stripe price IDs for Canadian Dollar billing.
 * Used alongside stripePriceMap.ts for multi-currency support.
 */

import type { StripePriceMapping } from './stripePriceMap';

// AI Receptionist CAD prices
export const aiReceptionistPricesCAD: Record<number, StripePriceMapping> = {
  50: { priceId: 'price_1SwrpCJ7jKy5oKiLfTNs5ngw', productId: 'prod_TuhDv3aP9m5CXq', minutes: 50, price: 4900 },
  100: { priceId: 'price_1SwrpDJ7jKy5oKiLt2C8aJzT', productId: 'prod_TuhDLTVqzTpTat', minutes: 100, price: 9900 },
  250: { priceId: 'price_1SwrpEJ7jKy5oKiLh0e1SKRV', productId: 'prod_TuhD5aBJ1FuBIg', minutes: 250, price: 19900 },
  500: { priceId: 'price_1SwrpFJ7jKy5oKiLz3IMAjOF', productId: 'prod_TuhDxQKttrUhxR', minutes: 500, price: 39900 },
  750: { priceId: 'price_1SwrpGJ7jKy5oKiLMlOrelz2', productId: 'prod_TuhDBmdL6E8q13', minutes: 750, price: 49900 },
  1000: { priceId: 'price_1SwrpHJ7jKy5oKiL3myqbCXz', productId: 'prod_TuhDLPFsEFId8q', minutes: 1000, price: 59900 },
  1250: { priceId: 'price_1SwrpIJ7jKy5oKiLxE3MI7uf', productId: 'prod_TuhD1aNcupixUQ', minutes: 1250, price: 69900 },
  1500: { priceId: 'price_1SwrpJJ7jKy5oKiL8Fkh5ENw', productId: 'prod_TuhDad5UofRwn2', minutes: 1500, price: 79900 },
  2000: { priceId: 'price_1SwrpKJ7jKy5oKiLYJm2ow2D', productId: 'prod_TuhD38n5ljPDvg', minutes: 2000, price: 99900 },
  2500: { priceId: 'price_1SwrpLJ7jKy5oKiLG9hiIlCp', productId: 'prod_TuhDRY3naeKDMz', minutes: 2500, price: 129900 },
  5000: { priceId: 'price_1SwrpMJ7jKy5oKiL9ogrObf9', productId: 'prod_TuhDyyqu9l13Fk', minutes: 5000, price: 199900 },
};

// Message Assistant CAD prices
export const messageAssistantPricesCAD: Record<number, StripePriceMapping> = {
  50: { priceId: 'price_1SwrpUJ7jKy5oKiLbIgKoWDu', productId: 'prod_TuhDyDtCij74lt', minutes: 50, price: 8900 },
  100: { priceId: 'price_1SwrpWJ7jKy5oKiLNSh3tb3J', productId: 'prod_TuhDsuI9vylZpa', minutes: 100, price: 14900 },
  250: { priceId: 'price_1SwrpWJ7jKy5oKiLfnBt6HKW', productId: 'prod_TuhDrk9bxEfwZd', minutes: 250, price: 34900 },
  500: { priceId: 'price_1SwrpXJ7jKy5oKiLY2ilo5dn', productId: 'prod_TuhDmrJA6fUSQD', minutes: 500, price: 64900 },
  750: { priceId: 'price_1SwrpYJ7jKy5oKiLo8DxdN8H', productId: 'prod_TuhElBMtN5H8Y1', minutes: 750, price: 94900 },
  1000: { priceId: 'price_1SwrpZJ7jKy5oKiLIKeq2rSJ', productId: 'prod_TuhEN7Ymr8BBmH', minutes: 1000, price: 124900 },
  1250: { priceId: 'price_1SwrpaJ7jKy5oKiLohClgveR', productId: 'prod_TuhEafOcePndT3', minutes: 1250, price: 154900 },
  1500: { priceId: 'price_1SwrpbJ7jKy5oKiL4TCdRnpI', productId: 'prod_TuhEUMCZ6QVpcl', minutes: 1500, price: 184900 },
  2000: { priceId: 'price_1SwrpcJ7jKy5oKiLwRCnqL9W', productId: 'prod_TuhE1ejoQHynaG', minutes: 2000, price: 244900 },
  2500: { priceId: 'price_1SwrpdJ7jKy5oKiLKrwLv9Z9', productId: 'prod_TuhEIAFGoFZJJU', minutes: 2500, price: 294900 },
  5000: { priceId: 'price_1SwrpeJ7jKy5oKiLslHCW9DF', productId: 'prod_TuhESyNfAffAOd', minutes: 5000, price: 574900 },
};

// Virtual Receptionist CAD prices
export const virtualReceptionistPricesCAD: Record<number, StripePriceMapping> = {
  50: { priceId: 'price_1SwrpjJ7jKy5oKiLdA5dylJX', productId: 'prod_TuhE3N9pXfvFud', minutes: 50, price: 14900 },
  100: { priceId: 'price_1SwrpkJ7jKy5oKiLhFXMRMVi', productId: 'prod_TuhEBS44cRxDyJ', minutes: 100, price: 24900 },
  250: { priceId: 'price_1SwrplJ7jKy5oKiL6vklFZlq', productId: 'prod_TuhEm0LXzzzuPD', minutes: 250, price: 49900 },
  500: { priceId: 'price_1SwrpnJ7jKy5oKiLE0KOBMPG', productId: 'prod_TuhEUhCTOxt5Al', minutes: 500, price: 79900 },
  750: { priceId: 'price_1SwrpoJ7jKy5oKiLnShD8XrS', productId: 'prod_TuhERKEioYSlxp', minutes: 750, price: 119900 },
  1000: { priceId: 'price_1SwrppJ7jKy5oKiLCdYuBrYd', productId: 'prod_TuhERJoIzbJguS', minutes: 1000, price: 149900 },
  1250: { priceId: 'price_1SwrpqJ7jKy5oKiL1nh1iKwA', productId: 'prod_TuhEfbPK12Va9j', minutes: 1250, price: 179900 },
  1500: { priceId: 'price_1SwrpsJ7jKy5oKiLZhsY3TVb', productId: 'prod_TuhEh74QNlqA7s', minutes: 1500, price: 219900 },
  2000: { priceId: 'price_1SwrptJ7jKy5oKiLzzBN8ZMO', productId: 'prod_TuhEpSRXjGywq2', minutes: 2000, price: 279900 },
  2500: { priceId: 'price_1SwrpuJ7jKy5oKiLxDsBsfj2', productId: 'prod_TuhEqD0Gj01egK', minutes: 2500, price: 329900 },
  5000: { priceId: 'price_1SwrpvJ7jKy5oKiLKAFYLq24', productId: 'prod_TuhELmEmTxB9o7', minutes: 5000, price: 649900 },
};

// Virtual Secretary CAD prices
export const virtualSecretaryPricesCAD: Record<number, StripePriceMapping> = {
  50: { priceId: 'price_1Swrq0J7jKy5oKiLSZ6uEu88', productId: 'prod_TuhEiy46hLy37H', minutes: 50, price: 19900 },
  100: { priceId: 'price_1Swrq1J7jKy5oKiLQb3IPwbY', productId: 'prod_TuhEJ2k7RUUEUt', minutes: 100, price: 29900 },
  250: { priceId: 'price_1Swrq2J7jKy5oKiLu90BnJTK', productId: 'prod_TuhEsQePgFdqC8', minutes: 250, price: 69900 },
  500: { priceId: 'price_1Swrq3J7jKy5oKiLGZNKg510', productId: 'prod_TuhEr4ZHG0QWEv', minutes: 500, price: 129900 },
  750: { priceId: 'price_1Swrq4J7jKy5oKiLhEQyCteZ', productId: 'prod_TuhEIQsMUMkaxh', minutes: 750, price: 179900 },
  1000: { priceId: 'price_1Swrq5J7jKy5oKiLaq5ao49t', productId: 'prod_TuhEXxtc9X4A6a', minutes: 1000, price: 199900 },
  1250: { priceId: 'price_1Swrq6J7jKy5oKiLF1pD7wnk', productId: 'prod_TuhElZQaLi7uKc', minutes: 1250, price: 229900 },
  1500: { priceId: 'price_1Swrq7J7jKy5oKiLh7uWuMbv', productId: 'prod_TuhELVEm5Qd1KY', minutes: 1500, price: 259900 },
  2000: { priceId: 'price_1Swrq8J7jKy5oKiLSY9eDzxl', productId: 'prod_TuhESBBKJD8ZX2', minutes: 2000, price: 319900 },
  2500: { priceId: 'price_1Swrq9J7jKy5oKiLuJ7HaBiB', productId: 'prod_TuhEqQIoKF5KOu', minutes: 2500, price: 379900 },
  5000: { priceId: 'price_1SwrqAJ7jKy5oKiL6K2iHdDZ', productId: 'prod_TuhEzUCiLM9oMt', minutes: 5000, price: 749900 },
};

// Service to CAD prices mapping
export const servicePricesMapCAD: Record<string, Record<number, StripePriceMapping>> = {
  'ai-receptionist': aiReceptionistPricesCAD,
  'message-assistant': messageAssistantPricesCAD,
  'virtual-receptionist': virtualReceptionistPricesCAD,
  'virtual-secretary': virtualSecretaryPricesCAD,
};

// Get CAD price mapping for a service and tier
export function getStripePriceMappingCAD(
  serviceSlug: string,
  minutes: number
): StripePriceMapping | null {
  const servicePrices = servicePricesMapCAD[serviceSlug];
  if (!servicePrices) return null;
  return servicePrices[minutes] || null;
}
