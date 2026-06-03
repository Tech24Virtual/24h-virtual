import { City } from "./cities";
import { Industry } from "./industries";

export interface LocationContent {
  title: string;
  metaDescription: string;
  h1: string;
  subtitle: string;
  intro: string;
  benefits: {
    title: string;
    description: string;
  }[];
  localBusinessSchema: object;
}

export const generateLocationContent = (city: City, industry: Industry): LocationContent => {
  const cityWithState = city.country === "US" 
    ? `${city.name}, ${city.stateCode}` 
    : `${city.name}, ${city.state}`;
  
  const countryName = city.country === "US" ? "United States" : "Canada";
  
  return {
    title: `${industry.name} Virtual Receptionist in ${city.name}`,
    metaDescription: `Professional virtual receptionist services for ${industry.name.toLowerCase()} in ${cityWithState}. 24/7 call answering, appointment scheduling, and lead capture. Serving ${city.name} businesses.`,
    h1: `Virtual Receptionist for ${industry.name} in ${city.name}`,
    subtitle: `Professional 24/7 call answering services tailored for ${industry.shortName.toLowerCase()} businesses in the ${city.name} area`,
    intro: `Looking for reliable virtual receptionist services for your ${industry.name.toLowerCase()} business in ${cityWithState}? 24H Virtual provides professional call answering, appointment scheduling, and customer service solutions designed specifically for ${industry.shortName.toLowerCase()} professionals in the greater ${city.name} area.`,
    benefits: [
      {
        title: `Local ${city.name} Expertise`,
        description: `Our receptionists are trained to handle calls from the ${city.name} area, understanding local business practices and customer expectations.`,
      },
      {
        title: `${industry.shortName} Industry Specialists`,
        description: `We specialize in ${industry.name.toLowerCase()}, ensuring your callers receive knowledgeable and professional service every time.`,
      },
      {
        title: "24/7 Availability",
        description: `Never miss a call from ${city.name} clients, whether it's during business hours, after hours, or on weekends.`,
      },
      {
        title: "Cost-Effective Solution",
        description: `Save up to 70% compared to hiring a full-time receptionist in ${city.name} while maintaining premium service quality.`,
      },
      {
        title: "Seamless Integration",
        description: `We integrate with your existing systems and can transfer urgent calls directly to you or your ${city.name} team.`,
      },
      {
        title: "Trilingual Support",
        description: city.country === "CA" || ["los-angeles", "san-antonio", "houston", "dallas", "phoenix", "san-diego", "san-jose", "austin", "san-francisco", "albuquerque", "tucson"].includes(city.slug)
          ? `Serve your diverse ${city.name} clientele with trilingual English, Spanish, and French support. Spanish and French available during business hours.`
          : `Serve your ${city.name} clientele with trilingual support in English, Spanish, and French during business hours.`,
      },
    ],
    localBusinessSchema: {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": `24H Virtual - ${industry.name} Virtual Receptionist`,
      "description": `Professional virtual receptionist services for ${industry.name.toLowerCase()} in ${cityWithState}`,
      "url": `https://24hv.io/locations/${city.slug}/${industry.slug}`,
      "areaServed": {
        "@type": "City",
        "name": city.name,
        "containedInPlace": {
          "@type": city.country === "US" ? "State" : "AdministrativeArea",
          "name": city.state,
        },
      },
      "address": {
        "@type": "PostalAddress",
        "addressLocality": city.name,
        "addressRegion": city.stateCode,
        "addressCountry": countryName,
      },
      "priceRange": "$$",
      "openingHoursSpecification": {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        "opens": "00:00",
        "closes": "23:59",
      },
      "serviceType": [
        "Virtual Receptionist",
        "Call Answering Service",
        "Appointment Scheduling",
        `${industry.name} Phone Answering`,
      ],
    },
  };
};

// Generate page-specific FAQ content
export const generateLocationFAQs = (city: City, industry: Industry) => [
  {
    question: `How does virtual receptionist service work for ${industry.name.toLowerCase()} in ${city.name}?`,
    answer: `Our virtual receptionists answer calls on behalf of your ${city.name} ${industry.shortName.toLowerCase()} business using a customized script. We can schedule appointments, take messages, answer FAQs, and transfer urgent calls, all while providing a professional experience for your callers.`,
  },
  {
    question: `What are the benefits of using a virtual receptionist for my ${city.name} business?`,
    answer: `${city.name} ${industry.shortName.toLowerCase()} businesses benefit from 24/7 call coverage, reduced overhead costs (save up to 70% vs. in-house staff), professional call handling, and never missing potential leads or client calls.`,
  },
  {
    question: `Do you provide after-hours answering for ${industry.name.toLowerCase()} in ${city.name}?`,
    answer: `Yes! We provide 24/7 call answering services for ${industry.name.toLowerCase()} businesses in ${city.name}. Whether it's evenings, weekends, or holidays, your callers will always reach a live, professional receptionist.`,
  },
  {
    question: `How quickly can I get started with virtual receptionist services in ${city.name}?`,
    answer: `Most ${city.name} ${industry.shortName.toLowerCase()} businesses are up and running within 24-48 hours. We'll work with you to create a customized call script and train our team on your specific needs.`,
  },
  {
    question: `What does virtual receptionist service cost for ${industry.name.toLowerCase()} in ${city.name}?`,
    answer: `Our plans start at just $85/month for basic service. ${industry.name} businesses in ${city.name} typically choose our mid-tier plans which include appointment scheduling and CRM integration. Contact us for a custom quote.`,
  },
];
