export interface Industry {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  keywords: string[];
}

// All 15 industries from the existing industry pages
export const industries: Industry[] = [
  {
    slug: "medical-practices",
    name: "Medical Practices",
    shortName: "Medical",
    description: "HIPAA-compliant call answering for healthcare providers",
    keywords: ["medical", "healthcare", "doctor", "clinic", "hospital", "HIPAA"],
  },
  {
    slug: "legal-services",
    name: "Legal Services",
    shortName: "Legal",
    description: "Professional call handling for law firms and attorneys",
    keywords: ["legal", "law firm", "attorney", "lawyer", "paralegal"],
  },
  {
    slug: "home-services",
    name: "Home Services",
    shortName: "Home Services",
    description: "24/7 call answering for contractors and home service providers",
    keywords: ["home services", "contractor", "plumber", "electrician", "HVAC"],
  },
  {
    slug: "real-estate",
    name: "Real Estate",
    shortName: "Real Estate",
    description: "Never miss a lead with real estate call answering",
    keywords: ["real estate", "realtor", "property", "broker", "agent"],
  },
  {
    slug: "financial-services",
    name: "Financial Services",
    shortName: "Financial",
    description: "Secure call handling for financial advisors and firms",
    keywords: ["financial", "finance", "advisor", "investment", "banking"],
  },
  {
    slug: "it-tech-support",
    name: "IT & Tech Support",
    shortName: "IT/Tech",
    description: "Technical support call answering for IT companies",
    keywords: ["IT", "tech support", "technology", "software", "helpdesk"],
  },
  {
    slug: "beauty-wellness",
    name: "Beauty & Wellness",
    shortName: "Beauty",
    description: "Appointment booking for salons, spas, and wellness centers",
    keywords: ["beauty", "wellness", "salon", "spa", "massage", "aesthetic"],
  },
  {
    slug: "emergency-services",
    name: "Emergency Services",
    shortName: "Emergency",
    description: "24/7 emergency dispatch and call answering",
    keywords: ["emergency", "urgent", "dispatch", "24/7", "after-hours"],
  },
  {
    slug: "educational-services",
    name: "Educational Services",
    shortName: "Education",
    description: "Call answering for schools, tutors, and educational institutions",
    keywords: ["education", "school", "tutor", "university", "learning"],
  },
  {
    slug: "maintenance-repair",
    name: "Maintenance & Repair",
    shortName: "Maintenance",
    description: "Service call handling for repair and maintenance companies",
    keywords: ["maintenance", "repair", "service", "technician", "field service"],
  },
  {
    slug: "counseling-therapy",
    name: "Counseling & Therapy",
    shortName: "Counseling",
    description: "Confidential call handling for therapists and counselors",
    keywords: ["counseling", "therapy", "mental health", "psychologist", "therapist"],
  },
  {
    slug: "event-planning",
    name: "Event Planning",
    shortName: "Events",
    description: "Call answering for event planners and venues",
    keywords: ["event", "wedding", "party", "venue", "catering", "planning"],
  },
  {
    slug: "veterinary",
    name: "Veterinary Services",
    shortName: "Veterinary",
    description: "Pet care call answering for veterinary clinics",
    keywords: ["veterinary", "vet", "animal", "pet", "clinic"],
  },
  {
    slug: "transportation-logistics",
    name: "Transportation & Logistics",
    shortName: "Transport",
    description: "Dispatch and call handling for transport companies",
    keywords: ["transportation", "logistics", "trucking", "delivery", "shipping"],
  },
  {
    slug: "nonprofits",
    name: "Nonprofits",
    shortName: "Nonprofit",
    description: "Donor and volunteer call handling for nonprofits",
    keywords: ["nonprofit", "charity", "donation", "volunteer", "foundation"],
  },
];

// Helper to find industry by slug
export const getIndustryBySlug = (slug: string): Industry | undefined => {
  return industries.find(industry => industry.slug === slug);
};

// Get all industry slugs for sitemap generation
export const getAllIndustrySlugs = (): string[] => {
  return industries.map(industry => industry.slug);
};
