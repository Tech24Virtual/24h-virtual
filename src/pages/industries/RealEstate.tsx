import { Home, Clock, Calendar, Phone, Users, MapPin } from "lucide-react";
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
    title: "Lead Capture 24/7",
    description: "Never miss a buyer or seller inquiry. We answer calls around the clock when leads are ready to act.",
  },
  {
    icon: Calendar,
    title: "Showing Scheduling",
    description: "Coordinate property showings with buyers, sellers, and agents. We manage your calendar seamlessly.",
  },
  {
    icon: MapPin,
    title: "Property Inquiries",
    description: "Answer questions about listings, provide property details, and qualify buyer interest levels.",
  },
  {
    icon: Users,
    title: "Lead Qualification",
    description: "Screen callers to identify serious buyers and sellers. Get the information you need to prioritize follow-ups.",
  },
  {
    icon: Clock,
    title: "After-Hours Coverage",
    description: "Buyers browse listings at night and on weekends. We're there to capture their interest when they call.",
  },
  {
    icon: Home,
    title: "Real Estate Expertise",
    description: "Our team understands real estate terminology and can speak knowledgeably with your clients.",
  },
];

const plans = [
  {
    name: "50 Minutes",
    price: "$149",
    description: "For independent agents",
    features: [
      "50 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "Lead capture",
      "Showing scheduling",
      "Message taking",
    ],
  },
  {
    name: "250 Minutes",
    price: "$499",
    description: "For top producers",
    features: [
      "250 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "Lead qualification",
      "Multi-listing support",
      "Buyer/seller screening",
      "Email notifications",
    ],
    popular: true,
  },
  {
    name: "1000 Minutes",
    price: "$1,499",
    description: "For teams & brokerages",
    features: [
      "1000 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "Multi-agent routing",
      "Open house support",
      "Vendor coordination",
      "Analytics dashboard",
    ],
  },
];

const steps = [
  {
    number: 1,
    title: "Share Your Listings",
    description: "Provide your current listings, showing instructions, and how you want inquiries handled.",
  },
  {
    number: 2,
    title: "Define Your Preferences",
    description: "Tell us your qualification criteria, scheduling preferences, and communication style.",
  },
  {
    number: 3,
    title: "Close More Deals",
    description: "Focus on showings and closings while we handle the phones and fill your calendar.",
  },
];

const faqs = [
  {
    question: "Can you handle calls for multiple listings?",
    answer: "Absolutely. We track all your active listings and can provide property-specific information to callers. When you add or remove listings, we update our information accordingly.",
  },
  {
    question: "How do you qualify buyer leads?",
    answer: "We ask your preferred qualification questions, including timeline, financing status, price range, and property requirements. You receive detailed lead information so you can prioritize follow-ups.",
  },
  {
    question: "Can you coordinate with other agents for showings?",
    answer: "Yes! We handle the back-and-forth of scheduling showings, including coordinating with buyer's agents, confirming with sellers, and sending reminders to all parties.",
  },
  {
    question: "What CRMs do you integrate with?",
    answer: "We work with popular real estate CRMs including Follow Up Boss, BoomTown, kvCORE, Real Geeks, and others. Leads flow directly into your system.",
  },
];

const RealEstate = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Virtual Receptionist for Real Estate"
        description="Capture buyer and seller inquiries 24/7. Schedule showings, qualify leads, and never miss a hot prospect, even during open houses."
        canonical="/industries/real-estate"
        jsonLd={[
          createServiceSchema("Virtual Receptionist for Real Estate", "24/7 lead capture, showing scheduling, and buyer qualification for real estate professionals.", "/industries/real-estate"),
          createFAQSchema(faqs),
          createBreadcrumbSchema([{ name: "Home", url: "/" }, { name: "Industries", url: "/industries" }, { name: "Real Estate", url: "/industries/real-estate" }])
        ]}
      />
      <Navigation />
      <main>
        <ServiceHero
          title={{ primary: "Capture Every Buyer", highlight: "Schedule More Showings" }}
          tagline="REAL ESTATE"
          description="Never miss an inquiry from hot leads. Schedule more showings, close more deals, and grow your business, even when you're at a listing."
          icon={Home}
          ctaText="Get Started Today"
          ctaLink="/get-started?industry=real-estate"
        />
        <ServiceFeatureGrid
          title="Built for Real Estate Professionals"
          subtitle="From solo agents to large brokerages, we help you capture every opportunity"
          features={features}
        />
        <ServicePricingCards
          title="Plans for Every Agent"
          subtitle="Flexible options that scale with your business"
          plans={plans}
          serviceSlug="real-estate"
        />
        <ServiceProcess
          title="Getting Started is Easy"
          subtitle="Be up and running in days, not weeks"
          steps={steps}
        />
        <ServiceFAQ
          title="Real Estate FAQs"
          subtitle="Common questions from agents and brokerages"
          faqs={faqs}
        />
        <ServiceCTA
          title="Ready to Grow Your Business?"
          subtitle="Join hundreds of real estate professionals who never miss a lead"
          ctaText="Start Today"
          ctaLink="/get-started?industry=real-estate"
        />
      </main>
      <Footer />
    </div>
  );
};

export default RealEstate;
