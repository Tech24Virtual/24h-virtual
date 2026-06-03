import { PartyPopper, Calendar, Phone, Users, Clock, MessageSquare } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ServiceHero } from "@/components/services/ServiceHero";
import { ServiceFeatureGrid } from "@/components/services/ServiceFeatureGrid";
import { ServicePricingCards } from "@/components/services/ServicePricingCards";
import { ServiceProcess } from "@/components/services/ServiceProcess";
import { ServiceFAQ } from "@/components/services/ServiceFAQ";
import { ServiceCTA } from "@/components/services/ServiceCTA";
import { SEO, createServiceSchema, createFAQSchema, createBreadcrumbSchema } from "@/components/SEO";

const features = [
  {
    icon: Phone,
    title: "Inquiry Capture 24/7",
    description: "Never miss a bride calling about her dream wedding or a corporate client planning their next event.",
  },
  {
    icon: Calendar,
    title: "Consultation Booking",
    description: "Schedule venue tours, planning sessions, and tasting appointments directly into your calendar.",
  },
  {
    icon: Users,
    title: "Lead Qualification",
    description: "Gather event details like date, guest count, budget range, and vision so you're prepared for every consultation.",
  },
  {
    icon: Clock,
    title: "Event Day Support",
    description: "Handle vendor calls, guest inquiries, and last-minute changes while you focus on execution.",
  },
  {
    icon: MessageSquare,
    title: "Vendor Coordination",
    description: "Relay messages between caterers, florists, photographers, and other vendors seamlessly.",
  },
  {
    icon: PartyPopper,
    title: "Multi-Event Management",
    description: "Track calls across multiple events and venues, keeping everything organized and on schedule.",
  },
];

const plans = [
  {
    name: "50 Minutes",
    price: "$149",
    description: "For solo planners",
    features: [
      "50 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "Inquiry capture",
      "Consultation scheduling",
      "Message taking",
    ],
  },
  {
    name: "250 Minutes",
    price: "$499",
    description: "For planning companies",
    features: [
      "250 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "Lead qualification",
      "Multi-event tracking",
      "Vendor coordination",
      "Email notifications",
    ],
    popular: true,
  },
  {
    name: "1000 Minutes",
    price: "$1,499",
    description: "For venues & agencies",
    features: [
      "1000 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "Dedicated account team",
      "Event day support",
      "Guest RSVP handling",
      "Quality assurance",
    ],
  },
];

const steps = [
  {
    number: 1,
    title: "Share Your Services",
    description: "Tell us about your event types, venue details, and how you want inquiries qualified and scheduled.",
  },
  {
    number: 2,
    title: "Define Your Process",
    description: "We learn your booking flow, consultation structure, and vendor communication preferences.",
  },
  {
    number: 3,
    title: "Book More Events",
    description: "Focus on creating unforgettable experiences while we fill your calendar with qualified leads.",
  },
];

const faqs = [
  {
    question: "Can you handle calls during live events?",
    answer: "Absolutely. On event days, we can manage vendor check-ins, guest inquiries, and last-minute coordination calls so you can focus on making the event perfect.",
  },
  {
    question: "How do you qualify wedding inquiries?",
    answer: "We gather key details like date, venue preference, guest count, budget range, and vision so you know exactly what each couple is looking for before the consultation.",
  },
  {
    question: "Can you book venue tours and tastings?",
    answer: "Yes! We schedule all types of consultations directly into your calendar, send confirmations, and follow up to reduce no-shows.",
  },
  {
    question: "Do you work with corporate event planners?",
    answer: "Absolutely. We handle corporate inquiries, conference calls, and multi-day event coordination with the same professionalism as wedding and social events.",
  },
];

const EventPlanning = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Virtual Receptionist for Event Planners"
        description="Capture every event inquiry, schedule consultations, and coordinate vendors. Professional call handling for planners, venues, and agencies."
        canonical="/industries/event-planning"
        jsonLd={[
          createServiceSchema("Virtual Receptionist for Event Planning", "Inquiry capture, consultation booking, and vendor coordination for event planners and venues.", "/industries/event-planning"),
          createFAQSchema(faqs),
          createBreadcrumbSchema([{ name: "Home", url: "/" }, { name: "Industries", url: "/industries" }, { name: "Event Planning", url: "/industries/event-planning" }])
        ]}
      />
      <Navigation />
      <main>
        <ServiceHero
          title={{ primary: "Book More Events", highlight: "Stress Less" }}
          tagline="EVENT PLANNING"
          description="Capture every inquiry, schedule more consultations, and coordinate vendors seamlessly so you can focus on creating unforgettable experiences."
          icon={PartyPopper}
          ctaText="Get Started Today"
          ctaLink="/get-started?industry=event-planning"
        />
        <ServiceFeatureGrid
          title="Built for Event Professionals"
          subtitle="From solo planners to venues and agencies, we keep your calendar full"
          features={features}
        />
        <ServicePricingCards
          title="Plans for Every Event Business"
          subtitle="Flexible options that scale with your bookings"
          plans={plans}
          serviceSlug="event-planning"
        />
        <ServiceProcess
          title="Getting Started is Easy"
          subtitle="Be up and running in days, not weeks"
          steps={steps}
        />
        <ServiceFAQ
          title="Event Planning FAQs"
          subtitle="Common questions from planners and venues"
          faqs={faqs}
        />
        <ServiceCTA
          title="Ready to Book More Events?"
          subtitle="Join hundreds of event professionals who never miss an inquiry"
          ctaText="Start Today"
          ctaLink="/get-started?industry=event-planning"
        />
      </main>
      <Footer />
    </div>
  );
};

export default EventPlanning;
