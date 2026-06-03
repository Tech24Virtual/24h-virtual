import { Briefcase, ListChecks, Calendar, Mail, HeadphonesIcon, Clock } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ServiceHero } from "@/components/services/ServiceHero";
import { ServiceFeatureGrid } from "@/components/services/ServiceFeatureGrid";
import { ServicePricingCards } from "@/components/services/ServicePricingCards";
import { ServiceProcess } from "@/components/services/ServiceProcess";
import { ServiceFAQ } from "@/components/services/ServiceFAQ";
import { ServiceCTA } from "@/components/services/ServiceCTA";
import { SEO, createServiceSchema, createBreadcrumbSchema } from "@/components/SEO";
import virtualSecretaryHero from "@/assets/heroes/virtual-secretary.png";

const features = [
  {
    icon: ListChecks,
    title: "Task Prioritization",
    description: "We organize your tasks by importance and deadline, ensuring critical items get attention first.",
  },
  {
    icon: Calendar,
    title: "Scheduling",
    description: "Complete calendar management: scheduling meetings, sending reminders, and managing conflicts.",
  },
  {
    icon: Mail,
    title: "Professional Correspondence",
    description: "Email management, drafting responses, and maintaining professional communication on your behalf.",
  },
  {
    icon: HeadphonesIcon,
    title: "Customer Support",
    description: "Handle customer inquiries, process requests, and ensure your clients feel valued and heard.",
  },
  {
    icon: Briefcase,
    title: "Appointment Coordination",
    description: "Manage complex scheduling across multiple parties, time zones, and calendars.",
  },
  {
    icon: Clock,
    title: "24/7 Availability",
    description: "Administrative support whenever you need it, whether it's early mornings, late nights, or weekends.",
  },
];

const plans = [
  {
    name: "50 Minutes",
    price: "$199",
    description: "Essential administrative support",
    features: [
      "50 minutes/month",
      "14-hour daily coverage",
      "$2.50/min overage",
      "Full administrative support",
      "Calendar management",
      "Basic email handling",
    ],
  },
  {
    name: "250 Minutes",
    price: "$699",
    description: "Comprehensive support",
    features: [
      "250 minutes/month",
      "14-hour daily coverage",
      "$2.50/min overage",
      "Full administrative support",
      "Email inbox management",
      "Document preparation",
      "Customer follow-ups",
    ],
    popular: true,
  },
  {
    name: "1000 Minutes",
    price: "$1,999",
    description: "Executive-level support",
    features: [
      "1000 minutes/month",
      "14-hour daily coverage",
      "$2.50/min overage",
      "Dedicated secretary",
      "Complete inbox management",
      "Travel coordination",
      "Project support",
    ],
  },
];

const steps = [
  {
    number: 1,
    title: "Define Your Needs",
    description: "Tell us about your daily tasks, priorities, and how you like things organized.",
  },
  {
    number: 2,
    title: "Meet Your Secretary",
    description: "We match you with a trained professional who understands your industry and preferences.",
  },
  {
    number: 3,
    title: "Start Delegating",
    description: "Hand off tasks with confidence. Your virtual secretary keeps everything running smoothly.",
  },
];

const faqs = [
  {
    question: "What tasks can a virtual secretary handle?",
    answer: "Virtual secretaries handle calendar management, email correspondence, appointment scheduling, document preparation, customer follow-ups, travel booking, and general administrative support. Think of them as your remote right hand.",
  },
  {
    question: "Will I work with the same person?",
    answer: "Professional and Enterprise plans include a dedicated secretary who gets to know your preferences and workflow. Basic plans have access to our trained team with consistent documentation of your preferences.",
  },
  {
    question: "How do you ensure confidentiality?",
    answer: "All team members sign NDAs and undergo background checks. We use secure, encrypted systems for all communications and document handling. We're also HIPAA compliant for healthcare-related tasks.",
  },
  {
    question: "Can my secretary access my email and calendar?",
    answer: "Yes, with your permission. We use secure OAuth connections to access only what's needed. You control exactly what level of access to grant, and you can revoke it anytime.",
  },
];

const VirtualSecretary = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Virtual Secretary - Free Up 10+ Hours Every Week"
        description="Stop drowning in admin work. Get dedicated support for scheduling, correspondence, and task management so you can focus on growth."
        canonical="/solutions/virtual-secretary"
        jsonLd={[
          createServiceSchema("Virtual Secretary", "Full administrative support for busy professionals", "/solutions/virtual-secretary"),
          createBreadcrumbSchema([{ name: "Home", url: "/" }, { name: "Solutions", url: "/solutions" }, { name: "Virtual Secretary", url: "/solutions/virtual-secretary" }])
        ]}
      />
      <Navigation />
      <main>
        <ServiceHero
          title="Free Up 10+ Hours Every Week"
          tagline="VIRTUAL SECRETARY"
          description="Stop drowning in admin work. Get back hours each week with dedicated support for scheduling, correspondence, and task management so you can focus on growth."
          icon={Briefcase}
          heroImage={virtualSecretaryHero}
          ctaText="Start with Virtual Secretary"
          ctaLink="/get-started?service=virtual-secretary"
          serviceSlug="virtual-secretary"
        />
        <ServiceFeatureGrid
          title="How We Help Your Business"
          subtitle="Comprehensive administrative support that frees you to focus on what matters most"
          features={features}
        />
        <ServicePricingCards
          title={{ primary: "Simple", highlight: "Transparent Pricing" }}
          subtitle="Choose the support level that matches your needs"
          plans={plans}
          serviceSlug="virtual-secretary"
        />
        <ServiceProcess
          title="Get Started in 3 Easy Steps"
          subtitle="We match you with the right support fast"
          steps={steps}
        />
        <ServiceFAQ
          title="Virtual Secretary FAQs"
          subtitle="Common questions about our administrative support"
          faqs={faqs}
        />
        <ServiceCTA
          title="Ready for Expert Administrative Support?"
          subtitle="Free up your time for what really matters"
          ctaText="Get Started Today"
          ctaLink="/get-started?service=virtual-secretary"
        />
      </main>
      <Footer />
    </div>
  );
};

export default VirtualSecretary;
