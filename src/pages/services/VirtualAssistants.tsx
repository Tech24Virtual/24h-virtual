import { Users, ClipboardList, Mail, FolderKanban, DollarSign, ArrowUpRight } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ServiceHero } from "@/components/services/ServiceHero";
import { ServiceFeatureGrid } from "@/components/services/ServiceFeatureGrid";
import { ServicePricingCards } from "@/components/services/ServicePricingCards";
import { ServiceProcess } from "@/components/services/ServiceProcess";
import { ServiceFAQ } from "@/components/services/ServiceFAQ";
import { ServiceCTA } from "@/components/services/ServiceCTA";
import { SEO, createServiceSchema, createBreadcrumbSchema } from "@/components/SEO";
import virtualAssistantsHero from "@/assets/heroes/virtual-assistants.png";

const features = [
  {
    icon: ClipboardList,
    title: "Task Management",
    description: "From simple to-dos to complex project tasks, we track, prioritize, and execute so nothing falls through the cracks.",
  },
  {
    icon: Mail,
    title: "Email & Calendar Management",
    description: "Inbox zero is possible. We manage your email, respond on your behalf, and keep your calendar organized.",
  },
  {
    icon: FolderKanban,
    title: "Project Coordination",
    description: "Coordinate with team members, vendors, and clients. Keep projects on track with regular updates and follow-ups.",
  },
  {
    icon: DollarSign,
    title: "Cost Savings",
    description: "Get executive-level support at a fraction of a full-time hire. No benefits, no office space, no overhead.",
  },
  {
    icon: ArrowUpRight,
    title: "Flexibility & Scalability",
    description: "Scale support up or down based on your needs. From 20 hours to full-time coverage, we adapt to you.",
  },
  {
    icon: Users,
    title: "Dedicated Support",
    description: "Work with the same assistant who knows your business, preferences, and priorities inside and out.",
  },
];

const plans = [
  {
    name: "Offshore",
    price: "$1,899",
    period: "mo",
    description: "Full-time (40 hrs/wk) dedicated assistant",
    features: [
      "Full-time (40 hrs/wk)",
      "Hourly rate: $14/hr",
      "Dedicated assistant",
      "Email management",
      "Calendar management",
      "Task coordination",
      "No set-up fee",
    ],
  },
  {
    name: "Nearshore",
    price: "$2,499",
    period: "mo",
    description: "Full-time (40 hrs/wk) dedicated assistant",
    features: [
      "Full-time (40 hrs/wk)",
      "Hourly rate: $18/hr",
      "Dedicated assistant",
      "Complete inbox management",
      "Project management",
      "Team coordination",
      "Statutory holiday coverage",
    ],
    popular: true,
  },
  {
    name: "Onshore",
    price: "$4,899",
    period: "mo",
    description: "Full-time (40 hrs/wk) dedicated assistant",
    features: [
      "Full-time (40 hrs/wk)",
      "Hourly rate: $32/hr",
      "Senior dedicated assistant",
      "Process documentation",
      "Travel management",
      "Daily check-ins",
      "Premium US-based support",
    ],
  },
];

const steps = [
  {
    number: 1,
    title: "Discovery Call",
    description: "We learn about your business, challenges, and how a virtual assistant can best support your goals.",
  },
  {
    number: 2,
    title: "Custom Matching",
    description: "We match you with an assistant based on skills, experience, and personality fit for your needs.",
  },
  {
    number: 3,
    title: "Onboarding & Launch",
    description: "Your assistant learns your systems, preferences, and priorities. Then we hit the ground running.",
  },
];

const faqs = [
  {
    question: "What's the difference between a virtual secretary and virtual assistant?",
    answer: "Virtual secretaries focus primarily on administrative tasks like scheduling and correspondence. Virtual assistants provide broader support including project management, research, process improvement, and specialized tasks based on their skills.",
  },
  {
    question: "How do I communicate with my virtual assistant?",
    answer: "However works best for you: email, Slack, phone, video calls, or project management tools. We adapt to your preferred communication style and tools.",
  },
  {
    question: "What if I need specialized skills?",
    answer: "We have assistants with various backgrounds including marketing, finance, operations, and more. During the matching process, we identify the skills most important for your needs.",
  },
  {
    question: "Can I increase or decrease hours?",
    answer: "Absolutely. We offer flexibility to scale up during busy periods or scale down when things slow. Just give us a heads up and we'll adjust your plan.",
  },
];

const VirtualAssistants = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Virtual Assistants - Multiply Your Productivity"
        description="A dedicated assistant handling tasks so you can focus on growth. Offshore, nearshore, and onshore options available."
        canonical="/solutions/virtual-assistants"
        jsonLd={[
          createServiceSchema("Virtual Assistants", "Dedicated remote assistants for your business", "/solutions/virtual-assistants"),
          createBreadcrumbSchema([{ name: "Home", url: "/" }, { name: "Solutions", url: "/solutions" }, { name: "Virtual Assistants", url: "/solutions/virtual-assistants" }])
        ]}
      />
      <Navigation />
      <main>
        <ServiceHero
          title="Multiply Your Productivity"
          tagline="VIRTUAL ASSISTANTS"
          description="A dedicated assistant handling tasks so you can focus on growth. Your extended team for projects, operations, and everything that's eating your time."
          icon={Users}
          heroImage={virtualAssistantsHero}
          ctaText="Start with Virtual Assistant"
          ctaLink="/get-started?service=virtual-assistants"
          serviceSlug="virtual-assistants"
        />
        <ServiceFeatureGrid
          title="How We Help Your Business"
          subtitle="Comprehensive support that scales with your business and adapts to your needs"
          features={features}
        />
        <ServicePricingCards
          title={{ primary: "Simple", highlight: "Transparent Pricing" }}
          subtitle="Dedicated support at a fraction of full-time costs"
          plans={plans}
          serviceSlug="virtual-assistants"
        />
        <ServiceProcess
          title="Get Started in 3 Easy Steps"
          subtitle="We ensure the perfect match for your needs"
          steps={steps}
        />
        <ServiceFAQ
          title="Virtual Assistant FAQs"
          subtitle="Common questions about our dedicated support"
          faqs={faqs}
        />
        <ServiceCTA
          title="Ready for Dedicated Business Support?"
          subtitle="Your extended team is just a call away"
          ctaText="Get Started Today"
          ctaLink="/get-started?service=virtual-assistants"
        />
      </main>
      <Footer />
    </div>
  );
};

export default VirtualAssistants;
