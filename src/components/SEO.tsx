import { Helmet } from 'react-helmet-async';
import { SITE_URL } from '@/lib/siteUrl';

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  noindex?: boolean;
  jsonLd?: object | object[];
  suppressBranding?: boolean;
}

export const SEO = ({
  title,
  description,
  canonical,
  ogImage = '/og-image.png',
  ogType = 'website',
  noindex = false,
  jsonLd,
  suppressBranding = false,
}: SEOProps) => {
  if (suppressBranding) {
    return <Helmet><title>{title}</title></Helmet>;
  }
  const siteName = '24H Virtual';
  const fullTitle = `${title} | ${siteName}`;
  const baseUrl = SITE_URL;
  const fullCanonical = canonical ? `${baseUrl}${canonical}` : undefined;
  const fullOgImage = ogImage.startsWith('http') ? ogImage : `${baseUrl}${ogImage}`;

  const jsonLdArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      {fullCanonical && <link rel="canonical" href={fullCanonical} />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={fullOgImage} />
      <meta property="og:site_name" content={siteName} />
      {fullCanonical && <meta property="og:url" content={fullCanonical} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullOgImage} />

      {/* JSON-LD Structured Data */}
      {jsonLdArray.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};

// Organization schema for homepage (with AggregateRating)
export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "24H Virtual",
  "url": "https://24hv.io",
  "logo": "https://24hv.io/logo.png",
  "description": "Professional virtual receptionist services for businesses. 24/7 call answering, appointment scheduling, and lead capture across the US and Canada.",
  "telephone": "1-800-825-2587",
  "email": "hello@24hvirtual.com",
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+1-800-825-2587",
    "contactType": "customer service",
    "availableLanguage": ["English", "Spanish", "French"],
    "areaServed": ["US", "CA"]
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "5.0",
    "reviewCount": "12",
    "bestRating": "5",
    "worstRating": "1"
  },
  "sameAs": [
    "https://clutch.co/profile/24h-virtual"
  ]
};

// Service schema generator
export const createServiceSchema = (name: string, description: string, url: string) => ({
  "@context": "https://schema.org",
  "@type": "Service",
  "name": name,
  "description": description,
  "provider": {
    "@type": "Organization",
    "name": "24H Virtual",
    "url": "https://24hv.io"
  },
  "areaServed": ["US", "CA"],
  "url": `https://24hv.io${url}`
});

// FAQ schema generator
export const createFAQSchema = (faqs: { question: string; answer: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqs.map(faq => ({
    "@type": "Question",
    "name": faq.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.answer
    }
  }))
});

// BreadcrumbList schema for navigation
export const createBreadcrumbSchema = (items: { name: string; url: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": items.map((item, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": item.name,
    "item": `https://24hv.io${item.url}`
  }))
});

// Pricing schema for pricing pages
export const createOfferCatalogSchema = (offers: { name: string; price: number; currency: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "OfferCatalog",
  "name": "24H Virtual Receptionist Plans",
  "itemListElement": offers.map(offer => ({
    "@type": "Offer",
    "name": offer.name,
    "price": offer.price,
    "priceCurrency": offer.currency,
    "availability": "https://schema.org/InStock"
  }))
});

// HowTo schema for step-by-step processes
export const createHowToSchema = (
  name: string,
  description: string,
  steps: { name: string; text: string }[],
  totalTime?: string
) => ({
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": name,
  "description": description,
  ...(totalTime && { "totalTime": totalTime }),
  "step": steps.map((step, index) => ({
    "@type": "HowToStep",
    "position": index + 1,
    "name": step.name,
    "text": step.text
  }))
});

// Speakable schema for voice search / answer engines
export const createSpeakableSchema = (url: string, cssSelectors: string[] = ["h1", ".speakable"]) => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  "url": `https://24hv.io${url}`,
  "speakable": {
    "@type": "SpeakableSpecification",
    "cssSelector": cssSelectors
  }
});
