import { Heart, Phone, Users, Calendar, MessageSquare, HandHeart } from "lucide-react";
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
    title: "Donor Call Handling",
    description: "Every donor call answered professionally. Capture donation inquiries, pledge information, and supporter questions.",
  },
  {
    icon: Users,
    title: "Volunteer Coordination",
    description: "Manage volunteer sign-ups, schedule shifts, and answer questions about opportunities to serve.",
  },
  {
    icon: Calendar,
    title: "Event Registration",
    description: "Handle RSVPs for fundraisers, galas, and community events. Keep your events well-attended.",
  },
  {
    icon: MessageSquare,
    title: "Program Inquiries",
    description: "Answer questions about your programs, services, and how community members can get involved or receive help.",
  },
  {
    icon: HandHeart,
    title: "Compassionate Service",
    description: "Many nonprofits serve vulnerable populations. Our team handles every call with empathy and care.",
  },
  {
    icon: Heart,
    title: "Mission-Aligned",
    description: "We represent your organization's values and mission in every interaction with donors and community members.",
  },
];

const plans = [
  {
    name: "50 Minutes",
    price: "$149",
    description: "For small organizations",
    features: [
      "50 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "Donor inquiries",
      "Volunteer sign-ups",
      "Message taking",
    ],
  },
  {
    name: "250 Minutes",
    price: "$499",
    description: "For growing nonprofits",
    features: [
      "250 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "Event registration",
      "Program inquiries",
      "Multi-location support",
      "Email notifications",
    ],
    popular: true,
  },
  {
    name: "1000 Minutes",
    price: "$1,499",
    description: "For large organizations",
    features: [
      "1000 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "Dedicated account team",
      "Campaign support",
      "Detailed reporting",
      "Quality assurance",
    ],
  },
];

const steps = [
  {
    number: 1,
    title: "Share Your Mission",
    description: "Tell us about your organization, programs, and how you want donor and volunteer calls handled.",
  },
  {
    number: 2,
    title: "Train Our Team",
    description: "We learn your messaging, values, and the specific information callers typically need.",
  },
  {
    number: 3,
    title: "Focus on Impact",
    description: "Spend your time on mission-critical work while we ensure every caller feels valued and heard.",
  },
];

const faqs = [
  {
    question: "Can you handle donation calls?",
    answer: "We capture donation inquiries and pledge information, then route them to your development team. For actual payment processing, we transfer to your staff or direct callers to your online giving platform.",
  },
  {
    question: "How do you handle calls from people seeking services?",
    answer: "We're trained to handle sensitive calls with empathy. We gather the information you need, provide program details, and connect callers with the right resources at your organization.",
  },
  {
    question: "Can you manage volunteer sign-ups?",
    answer: "Absolutely. We capture volunteer information, answer questions about opportunities, and can schedule volunteers for specific shifts or events based on your calendar.",
  },
  {
    question: "Do you offer nonprofit discounts?",
    answer: "We understand budget constraints. Contact us to discuss your specific needs. We work with many nonprofits and can often find solutions that fit your resources.",
  },
];

const Nonprofits = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Virtual Receptionist for Nonprofits"
        description="Professional call handling for mission-driven organizations. Donor call support, volunteer coordination, and event registration."
        canonical="/industries/nonprofits"
        jsonLd={[
          createServiceSchema("Virtual Receptionist for Nonprofits", "Donor call handling, volunteer coordination, and event registration for nonprofit organizations.", "/industries/nonprofits"),
          createFAQSchema(faqs),
          createBreadcrumbSchema([{ name: "Home", url: "/" }, { name: "Industries", url: "/industries" }, { name: "Nonprofits", url: "/industries/nonprofits" }])
        ]}
      />
      <Navigation />
      <main>
        <ServiceHero
          title={{ primary: "Focus on Your Mission", highlight: "Not the Phone" }}
          tagline="NONPROFITS"
          description="Capture every donor call, coordinate volunteers, and serve your community with professional call handling that represents your values."
          icon={Heart}
          ctaText="Get Started Today"
          ctaLink="/get-started?industry=nonprofits"
        />
        <ServiceFeatureGrid
          title="Built for Mission-Driven Organizations"
          subtitle="From small charities to large nonprofits, we support your work"
          features={features}
        />
        <ServicePricingCards
          title="Plans for Every Organization"
          subtitle="Flexible options that respect your budget"
          plans={plans}
          serviceSlug="nonprofits"
        />
        <ServiceProcess
          title="Getting Started is Easy"
          subtitle="Be up and running in days, not weeks"
          steps={steps}
        />
        <ServiceFAQ
          title="Nonprofit FAQs"
          subtitle="Common questions from mission-driven organizations"
          faqs={faqs}
        />
        <ServiceCTA
          title="Ready to Amplify Your Impact?"
          subtitle="Join hundreds of nonprofits that never miss a donor or volunteer call"
          ctaText="Start Today"
          ctaLink="/get-started?industry=nonprofits"
        />
      </main>
      <Footer />
    </div>
  );
};

export default Nonprofits;
