/**
 * Hero Messaging — single source of truth for the homepage hero.
 *
 * Customer pain: business owners miss calls, lose leads after hours,
 *   and feel overwhelmed by routine customer communication.
 * Promised outcome: 24/7 trilingual coverage that answers, screens,
 *   books, and routes — without hiring an internal team.
 * Tone: inviting, plain-spoken, benefit-first, trustworthy.
 *   Avoid SaaS clichés ("unlock", "transform", "revolutionize"),
 *   feature-dumps, and dashes as punctuation.
 *
 * The renderer (src/components/home/HeroSection.tsx) picks one variant
 * at random per page load via pickHeroVariant(). To add a 7th variant,
 * append to heroVariants. To force one variant temporarily, comment
 * out the others rather than deleting them.
 */

export interface HeroVariant {
  id: string;
  headline: string;
  highlightedWord: string;
  description: string;
  ctaText: string;
  ctaLink: string;
}

export const heroVariants: HeroVariant[] = [
  {
    id: "never-miss-call",
    headline: "Never Miss Another",
    highlightedWord: "Important Call",
    description:
      "Live trilingual receptionists answer, screen, and book for your business 24/7, so every lead and customer gets a real human, not a voicemail.",
    ctaText: "Book FREE Consultation",
    ctaLink: "/get-started",
  },
  {
    id: "coverage-without-hiring",
    headline: "24/7 Coverage Without",
    highlightedWord: "Hiring a Team",
    description:
      "Trained receptionists handle your calls, follow your scripts, and route the right people to you. Launch in days, not months.",
    ctaText: "Book FREE Consultation",
    ctaLink: "/get-started",
  },
  {
    id: "capture-every-lead",
    headline: "Capture Every Lead,",
    highlightedWord: "Even After Hours",
    description:
      "Your callers reach a real person every time. We answer, qualify, and book appointments around your rules and your calendar.",
    ctaText: "Book FREE Consultation",
    ctaLink: "/get-started",
  },
  {
    id: "stay-responsive",
    headline: "Stay Responsive",
    highlightedWord: "Without the Overload",
    description:
      "Stop juggling every call yourself. Our trilingual team handles routine calls, screens noise, and forwards only what matters.",
    ctaText: "Book FREE Consultation",
    ctaLink: "/get-started",
  },
  {
    id: "real-receptionist",
    headline: "A Real Receptionist",
    highlightedWord: "for Your Business",
    description:
      "English, Spanish, and French support that follows your scripts, books your appointments, and logs every call in your portal.",
    ctaText: "Book FREE Consultation",
    ctaLink: "/get-started",
  },
  {
    id: "look-professional",
    headline: "Look Professional",
    highlightedWord: "on Every Call",
    description:
      "Polished receptionists, your branding, your workflow. Customers get fast, friendly answers while you focus on your business.",
    ctaText: "Book FREE Consultation",
    ctaLink: "/get-started",
  },
];

export const heroFeatures: string[] = [
  "Launch in Days",
  "Trilingual Receptionists",
  "Per-Second Billing",
  "Real Client Portal",
];

export function pickHeroVariant(): HeroVariant {
  const randomIndex = Math.floor(Math.random() * heroVariants.length);
  return heroVariants[randomIndex];
}
