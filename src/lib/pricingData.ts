// Centralized pricing data for the entire application

export interface PricingTier {
  minutes: number;
  price: number;
  priceFormatted: string;
}

export interface ServicePricing {
  name: string;
  slug: string;
  tagline: string;
  coverage: string;
  overage: number;
  overageFormatted: string;
  tiers: PricingTier[];
}

export interface VirtualAssistantPricing {
  type: "offshore" | "nearshore" | "onshore";
  label: string;
  fullTime: number;
  hourly: number;
}

export interface EmailAddOn {
  emails: number;
  price: number;
  priceFormatted: string;
}

export interface FeatureAddOn {
  name: string;
  price: string;
  included: boolean;
  description?: string;
}

// Calculate annual pricing (10% off, paid monthly)
export function getAnnualPrice(monthlyPrice: number): number {
  return Math.round(monthlyPrice * 0.9);
}

export function formatPrice(price: number): string {
  return price >= 1000
    ? `$${price.toLocaleString()}`
    : `$${price}`;
}

// AI Receptionist
export const aiReceptionistPricing: ServicePricing = {
  name: "AI Receptionist",
  slug: "ai-receptionist",
  tagline: "24/7 AI-powered call handling",
  coverage: "24/7 Coverage Daily - All Time Zones",
  overage: 0.75,
  overageFormatted: "$0.75/min",
  tiers: [
    { minutes: 50, price: 49, priceFormatted: "$49" },
    { minutes: 100, price: 99, priceFormatted: "$99" },
    { minutes: 250, price: 199, priceFormatted: "$199" },
    { minutes: 500, price: 399, priceFormatted: "$399" },
    { minutes: 750, price: 499, priceFormatted: "$499" },
    { minutes: 1000, price: 599, priceFormatted: "$599" },
    { minutes: 1250, price: 699, priceFormatted: "$699" },
    { minutes: 1500, price: 799, priceFormatted: "$799" },
    { minutes: 2000, price: 999, priceFormatted: "$999" },
    { minutes: 2500, price: 1299, priceFormatted: "$1,299" },
    { minutes: 5000, price: 1999, priceFormatted: "$1,999" },
  ],
};

// Message Assistant
export const messageAssistantPricing: ServicePricing = {
  name: "Message Assistant",
  slug: "message-assistant",
  tagline: "Call answering and message taking",
  coverage: "14 Hour Coverage Daily + Afterhours",
  overage: 1.75,
  overageFormatted: "$1.75/min",
  tiers: [
    { minutes: 50, price: 89, priceFormatted: "$89" },
    { minutes: 100, price: 149, priceFormatted: "$149" },
    { minutes: 250, price: 349, priceFormatted: "$349" },
    { minutes: 500, price: 649, priceFormatted: "$649" },
    { minutes: 750, price: 949, priceFormatted: "$949" },
    { minutes: 1000, price: 1249, priceFormatted: "$1,249" },
    { minutes: 1250, price: 1549, priceFormatted: "$1,549" },
    { minutes: 1500, price: 1849, priceFormatted: "$1,849" },
    { minutes: 2000, price: 2449, priceFormatted: "$2,449" },
    { minutes: 2500, price: 2949, priceFormatted: "$2,949" },
    { minutes: 5000, price: 5749, priceFormatted: "$5,749" },
  ],
};

// Virtual Receptionist
export const virtualReceptionistPricing: ServicePricing = {
  name: "Virtual Receptionist",
  slug: "virtual-receptionist",
  tagline: "Call answering, message taking & call transfer",
  coverage: "14 Hour Coverage Daily + Afterhours",
  overage: 2.0,
  overageFormatted: "$2.00/min",
  tiers: [
    { minutes: 50, price: 149, priceFormatted: "$149" },
    { minutes: 100, price: 249, priceFormatted: "$249" },
    { minutes: 250, price: 499, priceFormatted: "$499" },
    { minutes: 500, price: 799, priceFormatted: "$799" },
    { minutes: 750, price: 1199, priceFormatted: "$1,199" },
    { minutes: 1000, price: 1499, priceFormatted: "$1,499" },
    { minutes: 1250, price: 1799, priceFormatted: "$1,799" },
    { minutes: 1500, price: 2199, priceFormatted: "$2,199" },
    { minutes: 2000, price: 2799, priceFormatted: "$2,799" },
    { minutes: 2500, price: 3299, priceFormatted: "$3,299" },
    { minutes: 5000, price: 6499, priceFormatted: "$6,499" },
  ],
};

// Virtual Secretary
export const virtualSecretaryPricing: ServicePricing = {
  name: "Virtual Secretary",
  slug: "virtual-secretary",
  tagline: "Full administrative support",
  coverage: "14 Hour Coverage Daily + Afterhours",
  overage: 2.5,
  overageFormatted: "$2.50/min",
  tiers: [
    { minutes: 50, price: 199, priceFormatted: "$199" },
    { minutes: 100, price: 299, priceFormatted: "$299" },
    { minutes: 250, price: 699, priceFormatted: "$699" },
    { minutes: 500, price: 1299, priceFormatted: "$1,299" },
    { minutes: 750, price: 1799, priceFormatted: "$1,799" },
    { minutes: 1000, price: 1999, priceFormatted: "$1,999" },
    { minutes: 1250, price: 2299, priceFormatted: "$2,299" },
    { minutes: 1500, price: 2599, priceFormatted: "$2,599" },
    { minutes: 2000, price: 3199, priceFormatted: "$3,199" },
    { minutes: 2500, price: 3799, priceFormatted: "$3,799" },
    { minutes: 5000, price: 7499, priceFormatted: "$7,499" },
  ],
};

// Virtual Assistants (Dedicated)
export const virtualAssistantsPricing: VirtualAssistantPricing[] = [
  {
    type: "offshore",
    label: "Offshore",
    fullTime: 1899,
    hourly: 14,
  },
  {
    type: "nearshore",
    label: "Nearshore",
    fullTime: 2499,
    hourly: 18,
  },
  {
    type: "onshore",
    label: "Onshore",
    fullTime: 4899,
    hourly: 32,
  },
];

// Email Add-On
export const emailAddOns: EmailAddOn[] = [
  { emails: 50, price: 200, priceFormatted: "$200" },
  { emails: 100, price: 350, priceFormatted: "$350" },
  { emails: 250, price: 600, priceFormatted: "$600" },
  { emails: 500, price: 1250, priceFormatted: "$1,250" },
  { emails: 1000, price: 2000, priceFormatted: "$2,000" },
];

// Features & Add-Ons
export const includedFeatures: FeatureAddOn[] = [
  { name: "Custom Call Scripts", price: "Included", included: true, description: "Creating custom call scripts for the campaign" },
  { name: "Unlimited Call Patching", price: "Included", included: true, description: "Transferring calls to campaigns" },
  { name: "1 Local DID Number", price: "Included", included: true, description: "One free local number for forwarding calls" },
  { name: "Appointment Scheduling", price: "Included", included: true, description: "Use of Calendly or any other appointment booking software" },
  { name: "Use Client Website", price: "Included", included: true, description: "Using campaign website to fill forms or book appointments" },
  { name: "FAQ Integration", price: "Included", included: true, description: "Adding a campaign FAQ form into 24H Virtual's system" },
  { name: "Live Relay - Call Transfer", price: "Included", included: true, description: "Live call transferring - cold or warm transfer" },
  { name: "Custom Hold Music", price: "Included", included: true, description: "Multiple custom hold music options" },
  { name: "Custom Voicemail", price: "Included", included: true, description: "Custom voicemail where mp3 file of voicemails will be emailed - after hours only" },
  { name: "Custom Hold Messages", price: "Included", included: true, description: "Adding custom hold messages to the hold queue - must be provided by client" },
  { name: "Custom Caller Call Back", price: "Included", included: true, description: "Custom caller call back option if all agents are busy" },
  { name: "After Hours Call Forwarding", price: "Included", included: true, description: "Forward calls afterhours to an external number" },
  { name: "Call Screening", price: "Included", included: true, description: "Identify and filter incoming phone calls before answering" },
  { name: "Number Block", price: "Included", included: true, description: "Blocking a phone number to prevent calls" },
  { name: "Custom Hold Advertising", price: "Included", included: true, description: "Custom promotional messages while callers wait on hold" },
  { name: "Statutory Holiday Coverage", price: "Included", included: true, description: "Coverage for all holidays" },
  { name: "24/7 Coverage On Request", price: "Included", included: true, description: "24/7 campaign coverage on request" },
];

export const paidAddOns: FeatureAddOn[] = [
  { name: "Third Party Software Training", price: "$500", included: false, description: "Training agents on new software" },
  { name: "Voicemail Management", price: "$50/mo", included: false, description: "Our team will manage your voicemail box" },
  { name: "Record Custom Greeting", price: "$25/100 words", included: false, description: "Record a real human greeting" },
  { name: "Interactive Voice Response (IVR)", price: "$25/500 min", included: false, description: "We will set up and manage your IVR" },
  { name: "Additional Campaign(s)", price: "$50/mo", included: false, description: "If we need to set up multiple campaigns - different departments" },
  { name: "Call Report", price: "$25/mo", included: false, description: "Daily or weekly call report set up" },
  { name: "Additional Number(s)", price: "$10/mo", included: false },
  { name: "Toll Free Number", price: "$15/mo", included: false },
  { name: "Vanity Number(s)", price: "$25/mo", included: false },
  { name: "Number Porting & Manage", price: "$50/port - $10/manage", included: false },
  { name: "Dedicated Local Business Number", price: "$25/mo", included: false, description: "Forward Only" },
  { name: "Dedicated 1800 Business Number", price: "$50/mo", included: false, description: "Forward Only" },
  { name: "Trilingual Service", price: "$50/mo", included: false, description: "English, Spanish & French support. Spanish and French during business hours." },
  { name: "Add 5 Extra Questions", price: "$50/mo", included: false, description: "Add 5 extra questions to campaigns" },
];

// All services for comparison
export const allServicesPricing: ServicePricing[] = [
  aiReceptionistPricing,
  messageAssistantPricing,
  virtualReceptionistPricing,
  virtualSecretaryPricing,
];

// Service lookup map for dynamic billing (4 core services only)
export const servicePricingMap: Record<string, ServicePricing> = {
  'ai-receptionist': aiReceptionistPricing,
  'message-assistant': messageAssistantPricing,
  'virtual-receptionist': virtualReceptionistPricing,
  'virtual-secretary': virtualSecretaryPricing,
};

// Services eligible for dynamic billing
export const DYNAMIC_BILLING_SERVICES = [
  'ai-receptionist',
  'message-assistant',
  'virtual-receptionist',
  'virtual-secretary',
] as const;

export type DynamicBillingService = typeof DYNAMIC_BILLING_SERVICES[number];

// Helper to get service pricing by slug
export function getServiceBySlug(slug: string): ServicePricing | null {
  return servicePricingMap[slug] || null;
}

// Check if a service is eligible for dynamic billing
export function isEligibleForDynamicBilling(serviceSlug: string): boolean {
  return DYNAMIC_BILLING_SERVICES.includes(serviceSlug as DynamicBillingService);
}

// Get tier by minutes for a service
export function getTierByMinutes(serviceSlug: string, minutes: number): PricingTier | null {
  const service = getServiceBySlug(serviceSlug);
  if (!service) return null;
  return service.tiers.find(t => t.minutes === minutes) || null;
}

// Helper to get popular tiers for service cards (3 tiers)
export function getPopularTiers(pricing: ServicePricing, indices: [number, number, number] = [0, 2, 5]) {
  return indices.map(i => pricing.tiers[i]).filter(Boolean);
}
