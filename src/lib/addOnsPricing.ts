// Centralized add-on pricing data for billing management

export type BillingType = 'one_time' | 'recurring' | 'usage_based';
export type Currency = 'usd' | 'cad';

export interface StripePriceIds {
  usd: string;
  cad: string;
}

export interface AddOnProduct {
  slug: string;
  name: string;
  price: number;
  billingType: BillingType;
  description?: string;
  unit?: string;
  stripePriceId?: StripePriceIds;
  stripeProductId?: { usd: string; cad: string };
}

// Recurring Add-Ons (monthly billing)
export const recurringAddOns: AddOnProduct[] = [
  { 
    slug: 'voicemail-management', 
    name: 'Voicemail Management', 
    price: 50, 
    billingType: 'recurring',
    description: 'Our team processes and handles your voicemail',
    stripePriceId: { usd: 'price_1SwrnzJ7jKy5oKiLudoZ49Pp', cad: 'price_1SwrobJ7jKy5oKiLWH26Muud' },
  },
  { 
    slug: 'additional-campaign', 
    name: 'Additional Campaign', 
    price: 50, 
    billingType: 'recurring',
    description: 'Multiple campaign setup and management',
    stripePriceId: { usd: 'price_1Swro0J7jKy5oKiL3WxnOKHN', cad: 'price_1SwrocJ7jKy5oKiLxicPrkai' },
  },
  { 
    slug: 'call-report-additional', 
    name: 'Call Report (Additional)', 
    price: 25, 
    billingType: 'recurring',
    description: 'Beyond first monthly report included free',
    stripePriceId: { usd: 'price_1Swro2J7jKy5oKiLJ1fm5EQK', cad: 'price_1SwroeJ7jKy5oKiLjdY4AdRh' },
  },
  { 
    slug: 'additional-number', 
    name: 'Additional Number', 
    price: 10, 
    billingType: 'recurring',
    description: 'Extra phone numbers for your account',
    stripePriceId: { usd: 'price_1Swro3J7jKy5oKiL5SWWD12s', cad: 'price_1SwrofJ7jKy5oKiLLc2Z8ZaX' },
  },
  { 
    slug: 'toll-free', 
    name: 'Toll Free Number', 
    price: 15, 
    billingType: 'recurring',
    description: '1-800 style toll-free number',
    stripePriceId: { usd: 'price_1Swro4J7jKy5oKiLorNGTgVr', cad: 'price_1SwrogJ7jKy5oKiL6I8Xllmi' },
  },
  { 
    slug: 'vanity-number', 
    name: 'Vanity Number', 
    price: 25, 
    billingType: 'recurring',
    description: 'Custom memorable phone number',
    stripePriceId: { usd: 'price_1Swro5J7jKy5oKiLdbfKrLAk', cad: 'price_1SwroiJ7jKy5oKiLDMzeoY3H' },
  },
  { 
    slug: 'ported-number-mgmt', 
    name: 'Ported Number Management', 
    price: 10, 
    billingType: 'recurring',
    description: 'Ongoing management of ported numbers',
    stripePriceId: { usd: 'price_1Swro6J7jKy5oKiLuUcLKJmF', cad: 'price_1SwrojJ7jKy5oKiLnoH4GLsu' },
  },
  { 
    slug: 'local-business-number', 
    name: 'Dedicated Local Business Number', 
    price: 25, 
    billingType: 'recurring',
    description: 'Forward only local number',
    stripePriceId: { usd: 'price_1Swro7J7jKy5oKiL8i75seKW', cad: 'price_1SwrokJ7jKy5oKiLP8KfSgoM' },
  },
  { 
    slug: '1800-business-number', 
    name: 'Dedicated 1800 Business Number', 
    price: 50, 
    billingType: 'recurring',
    description: 'Forward only 1800 number',
    stripePriceId: { usd: 'price_1Swro9J7jKy5oKiLnwX2Ylsy', cad: 'price_1SwrolJ7jKy5oKiLrOVxT17x' },
  },
  { 
    slug: 'bilingual', 
    name: 'Trilingual Service', 
    price: 50, 
    billingType: 'recurring',
    description: 'English, Spanish & French support. Spanish and French during business hours.',
    stripePriceId: { usd: 'price_1SwroAJ7jKy5oKiL71kLWMtk', cad: 'price_1SwromJ7jKy5oKiLvCab7H7E' },
  },
  { 
    slug: 'extra-questions', 
    name: 'Add 5 Extra Questions', 
    price: 50, 
    billingType: 'recurring',
    description: 'Additional campaign questions',
    stripePriceId: { usd: 'price_1SwroBJ7jKy5oKiLnRY3z9qI', cad: 'price_1SwronJ7jKy5oKiLLxNl43vU' },
  },
];

// One-Time Add-Ons (single charge)
export const oneTimeAddOns: AddOnProduct[] = [
  { 
    slug: 'software-training-basic', 
    name: 'Software Training (Basic)', 
    price: 500, 
    billingType: 'one_time',
    description: 'Standard software training',
    stripePriceId: { usd: 'price_1SwroKJ7jKy5oKiLTAEQBeMi', cad: 'price_1SwroxJ7jKy5oKiLEDdHl4zr' },
  },
  { 
    slug: 'software-training-complex', 
    name: 'Software Training (Complex)', 
    price: 1000, 
    billingType: 'one_time',
    description: 'Complex software training',
    stripePriceId: { usd: 'price_1SwroLJ7jKy5oKiLyun53X6q', cad: 'price_1SwroyJ7jKy5oKiLJO37IrDh' },
  },
  { 
    slug: 'custom-greeting', 
    name: 'Custom Greeting Recording', 
    price: 25, 
    billingType: 'one_time',
    unit: '100 words',
    description: 'Professional recording by real human voice',
    stripePriceId: { usd: 'price_1SwroMJ7jKy5oKiLrB2eZv8G', cad: 'price_1Swrp0J7jKy5oKiL9ZxpUBoc' },
  },
  { 
    slug: 'number-porting', 
    name: 'Number Porting', 
    price: 50, 
    billingType: 'one_time',
    description: 'Port existing number to our system',
    stripePriceId: { usd: 'price_1SwroNJ7jKy5oKiL0qRq196H', cad: 'price_1Swrp1J7jKy5oKiLMC5bvy9q' },
  },
];

// Usage-Based Add-Ons (metered billing)
export const usageAddOns: AddOnProduct[] = [
  { 
    slug: 'ivr', 
    name: 'IVR Setup & Management', 
    price: 25, 
    billingType: 'usage_based',
    unit: '500 min',
    description: 'Interactive Voice Response management',
    stripePriceId: { usd: 'price_1SwroOJ7jKy5oKiLOY1JOuih', cad: 'price_1Swrp2J7jKy5oKiLBSc14p6m' },
  },
];

// Email Add-Ons (monthly billing)
export const emailAddOns: AddOnProduct[] = [
  { 
    slug: 'email-50', 
    name: 'Email Support (50)', 
    price: 200, 
    billingType: 'recurring',
    stripePriceId: { usd: 'price_1SwroFJ7jKy5oKiLvaG3DRmZ', cad: 'price_1SwrotJ7jKy5oKiLrTAhDH1V' },
  },
  { 
    slug: 'email-100', 
    name: 'Email Support (100)', 
    price: 350, 
    billingType: 'recurring',
    stripePriceId: { usd: 'price_1SwroGJ7jKy5oKiLmCBS6Y6w', cad: 'price_1SwrotJ7jKy5oKiLIaL19xOf' },
  },
  { 
    slug: 'email-250', 
    name: 'Email Support (250)', 
    price: 600, 
    billingType: 'recurring',
    stripePriceId: { usd: 'price_1SwroHJ7jKy5oKiLJ6AU2QI9', cad: 'price_1SwrouJ7jKy5oKiLU7J9KmuG' },
  },
  { 
    slug: 'email-500', 
    name: 'Email Support (500)', 
    price: 1250, 
    billingType: 'recurring',
    stripePriceId: { usd: 'price_1SwroIJ7jKy5oKiLJWa262ad', cad: 'price_1SwrovJ7jKy5oKiL96jWQJxx' },
  },
  { 
    slug: 'email-1000', 
    name: 'Email Support (1000)', 
    price: 2000, 
    billingType: 'recurring',
    stripePriceId: { usd: 'price_1SwroJJ7jKy5oKiLvr0fCtkC', cad: 'price_1SwrowJ7jKy5oKiL338RYblK' },
  },
];

// All add-ons combined
export const allAddOns: AddOnProduct[] = [
  ...recurringAddOns,
  ...oneTimeAddOns,
  ...usageAddOns,
  ...emailAddOns,
];

// Helper functions
export function getAddOnBySlug(slug: string): AddOnProduct | undefined {
  return allAddOns.find(addon => addon.slug === slug);
}

export function getRecurringAddOns(): AddOnProduct[] {
  return [...recurringAddOns, ...emailAddOns];
}

// Get add-on Stripe price ID by currency
export function getAddOnPriceId(slug: string, currency: Currency): string | null {
  const addon = getAddOnBySlug(slug);
  if (!addon?.stripePriceId) return null;
  return addon.stripePriceId[currency];
}

export function formatAddOnPrice(addon: AddOnProduct): string {
  const price = addon.price >= 1000 
    ? `$${addon.price.toLocaleString()}`
    : `$${addon.price}`;
  
  switch (addon.billingType) {
    case 'recurring':
      return `${price}/mo`;
    case 'one_time':
      return addon.unit ? `${price}/${addon.unit}` : price;
    case 'usage_based':
      return addon.unit ? `${price}/${addon.unit}` : price;
    default:
      return price;
  }
}

export function calculateMonthlyAddOnsTotal(activeAddOns: { slug: string; quantity: number }[]): number {
  return activeAddOns.reduce((total, active) => {
    const addon = getAddOnBySlug(active.slug);
    if (addon && addon.billingType === 'recurring') {
      return total + (addon.price * active.quantity);
    }
    return total;
  }, 0);
}
