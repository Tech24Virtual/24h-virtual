import { Monitor, Clock, Shield, Phone, Ticket, Headphones } from "lucide-react";
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
    title: "24/7 Call Coverage",
    description: "Tech emergencies happen anytime. We answer calls around the clock and escalate critical issues immediately.",
  },
  {
    icon: Ticket,
    title: "Ticket Creation",
    description: "Log support requests directly into your ticketing system with detailed issue descriptions.",
  },
  {
    icon: Shield,
    title: "Tier 1 Triage",
    description: "Gather technical details, troubleshoot basic issues, and route complex problems to the right technician.",
  },
  {
    icon: Clock,
    title: "SLA Management",
    description: "Track response times and ensure tickets are escalated according to your service level agreements.",
  },
  {
    icon: Headphones,
    title: "Help Desk Overflow",
    description: "Handle call spikes and overflow when your internal team is overwhelmed.",
  },
  {
    icon: Monitor,
    title: "Technical Vocabulary",
    description: "Our team speaks tech. We understand IT terminology and can communicate effectively with your clients.",
  },
];

const plans = [
  {
    name: "50 Minutes",
    price: "$149",
    description: "For small IT shops",
    features: [
      "50 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "Ticket creation",
      "Basic troubleshooting",
      "Escalation routing",
    ],
  },
  {
    name: "250 Minutes",
    price: "$499",
    description: "For MSPs & IT companies",
    features: [
      "250 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "Multi-client support",
      "SLA tracking",
      "Priority escalation",
      "Status updates",
    ],
    popular: true,
  },
  {
    name: "1000 Minutes",
    price: "$1,499",
    description: "For enterprise support",
    features: [
      "1000 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "Dedicated account team",
      "Custom escalation paths",
      "Detailed reporting",
      "Quality assurance",
    ],
  },
];

const steps = [
  {
    number: 1,
    title: "Share Your Process",
    description: "Tell us your ticketing workflow, escalation paths, and how different issues should be handled.",
  },
  {
    number: 2,
    title: "Connect Your Systems",
    description: "We integrate with your ticketing platform to create and update tickets in real-time.",
  },
  {
    number: 3,
    title: "Never Miss a Ticket",
    description: "Every call is logged, triaged, and routed correctly. Your team stays focused on resolving issues.",
  },
];

const faqs = [
  {
    question: "Can you create tickets in our system?",
    answer: "Yes! We integrate with ConnectWise, Autotask, Zendesk, Freshdesk, ServiceNow, and many other ticketing platforms. Tickets are created with detailed information in real-time.",
  },
  {
    question: "How do you handle multi-tenant MSP environments?",
    answer: "We manage multiple client profiles and greet callers based on their caller ID or company identification. Each client gets a customized experience.",
  },
  {
    question: "What about after-hours critical issues?",
    answer: "We follow your escalation procedures exactly. Critical issues trigger immediate technician notification via call, text, or your preferred alerting system.",
  },
  {
    question: "Can you do basic troubleshooting?",
    answer: "Yes, we can walk callers through standard procedures like password resets, connectivity checks, and basic diagnostics following your scripts and knowledge base.",
  },
];

const ITTechSupport = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Virtual Receptionist for IT & Tech Support"
        description="24/7 help desk overflow, ticket creation, and Tier 1 triage for MSPs and IT companies. Never miss a support call again."
        canonical="/industries/it-tech-support"
        jsonLd={[
          createServiceSchema("Virtual Receptionist for IT & Tech Support", "24/7 help desk support, ticket creation, and call triage for MSPs and IT companies.", "/industries/it-tech-support"),
          createFAQSchema(faqs),
          createBreadcrumbSchema([{ name: "Home", url: "/" }, { name: "Industries", url: "/industries" }, { name: "IT & Tech Support", url: "/industries/it-tech-support" }])
        ]}
      />
      <Navigation />
      <main>
        <ServiceHero
          title={{ primary: "Faster Resolution", highlight: "Happier Customers" }}
          tagline="IT & TECH SUPPORT"
          description="Capture every ticket, triage effectively, and scale your support operations without scaling your team. Your help desk that never sleeps."
          icon={Monitor}
          ctaText="Get Started Today"
          ctaLink="/get-started?industry=it-tech-support"
        />
        <ServiceFeatureGrid
          title="Built for IT Professionals"
          subtitle="From small IT shops to enterprise MSPs, we speak your language"
          features={features}
        />
        <ServicePricingCards
          title="Plans for Every Support Team"
          subtitle="Scalable solutions that grow with your client base"
          plans={plans}
          serviceSlug="it-tech-support"
        />
        <ServiceProcess
          title="Getting Started is Easy"
          subtitle="Be up and running in days, not weeks"
          steps={steps}
        />
        <ServiceFAQ
          title="IT & Tech Support FAQs"
          subtitle="Common questions from MSPs and IT companies"
          faqs={faqs}
        />
        <ServiceCTA
          title="Ready to Scale Your Support?"
          subtitle="Join hundreds of IT companies that deliver 24/7 support without 24/7 staffing"
          ctaText="Start Today"
          ctaLink="/get-started?industry=it-tech-support"
        />
      </main>
      <Footer />
    </div>
  );
};

export default ITTechSupport;
