import { Building2, Shield, Clock, Calendar, FileText, Phone } from "lucide-react";
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
    icon: Shield,
    title: "Compliance-Ready",
    description: "Our receptionists understand financial services regulations and handle calls with appropriate discretion.",
  },
  {
    icon: Calendar,
    title: "Appointment Scheduling",
    description: "Schedule consultations, reviews, and meetings. We coordinate with your calendar in real-time.",
  },
  {
    icon: Phone,
    title: "Client Call Screening",
    description: "Prioritize urgent client matters while filtering routine inquiries for scheduled callbacks.",
  },
  {
    icon: Clock,
    title: "After-Hours Support",
    description: "High-net-worth clients expect availability. We provide professional coverage when you're unavailable.",
  },
  {
    icon: FileText,
    title: "Document Reminders",
    description: "Follow up with clients about missing documents and upcoming deadlines.",
  },
  {
    icon: Building2,
    title: "Industry Knowledge",
    description: "Our team understands financial terminology, including investments, insurance, planning, and more.",
  },
];

const plans = [
  {
    name: "50 Minutes",
    price: "$149",
    description: "For independent advisors",
    features: [
      "50 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "Appointment scheduling",
      "Client screening",
      "Message taking",
    ],
  },
  {
    name: "250 Minutes",
    price: "$499",
    description: "For growing practices",
    features: [
      "250 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "New client intake",
      "Document follow-ups",
      "Meeting confirmations",
      "Priority routing",
    ],
    popular: true,
  },
  {
    name: "1000 Minutes",
    price: "$1,499",
    description: "For established firms",
    features: [
      "1000 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "Multi-advisor routing",
      "Client relationship tracking",
      "Event coordination",
      "Analytics dashboard",
    ],
  },
];

const steps = [
  {
    number: 1,
    title: "Define Your Protocols",
    description: "Share how you want calls handled, client tiers, and any compliance requirements.",
  },
  {
    number: 2,
    title: "Train Our Team",
    description: "We learn your services, key clients, and the specific way you want to be represented.",
  },
  {
    number: 3,
    title: "Elevate Your Service",
    description: "Deliver white-glove client experience while focusing on what you do best: advising.",
  },
];

const faqs = [
  {
    question: "How do you handle sensitive financial discussions?",
    answer: "Our receptionists never provide financial advice or access account information. We take messages, schedule appointments, and route calls appropriately while maintaining strict confidentiality.",
  },
  {
    question: "Can you differentiate between client tiers?",
    answer: "Yes! We can identify VIP clients and handle them according to your preferences, whether that's immediate escalation, priority scheduling, or special routing to specific team members.",
  },
  {
    question: "What about compliance with financial regulations?",
    answer: "We're trained not to make representations about services or provide advice. Our role is administrative—scheduling, messaging, and routing—keeping you compliant.",
  },
  {
    question: "Do you integrate with financial planning software?",
    answer: "We work with popular platforms like Redtail, Wealthbox, Salesforce Financial Services Cloud, and others for scheduling and client management.",
  },
];

const FinancialServices = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Virtual Receptionist for Financial Services"
        description="Professional, compliant call handling for financial advisors and firms. Client screening, appointment scheduling, and after-hours coverage."
        canonical="/industries/financial-services"
        jsonLd={[
          createServiceSchema("Virtual Receptionist for Financial Services", "Compliance-ready call handling, client screening, and appointment scheduling for financial professionals.", "/industries/financial-services"),
          createFAQSchema(faqs),
          createBreadcrumbSchema([{ name: "Home", url: "/" }, { name: "Industries", url: "/industries" }, { name: "Financial Services", url: "/industries/financial-services" }])
        ]}
      />
      <Navigation />
      <main>
        <ServiceHero
          title="Build Trust With Every Client Interaction"
          tagline="FINANCIAL SERVICES"
          description="Deliver the professional, compliant service your clients expect. Never miss a call from high-value clients, even when you're in meetings."
          icon={Building2}
          ctaText="Get Started Today"
          ctaLink="/get-started?industry=financial-services"
        />
        <ServiceFeatureGrid
          title="Built for Financial Professionals"
          subtitle="From independent advisors to large firms, we understand the importance of client relationships"
          features={features}
        />
        <ServicePricingCards
          title="Plans for Every Practice"
          subtitle="Flexible options for financial service professionals"
          plans={plans}
          serviceSlug="financial-services"
        />
        <ServiceProcess
          title="Getting Started is Easy"
          subtitle="Be up and running in days, not weeks"
          steps={steps}
        />
        <ServiceFAQ
          title="Financial Services FAQs"
          subtitle="Common questions from financial professionals"
          faqs={faqs}
        />
        <ServiceCTA
          title="Ready to Elevate Your Client Service?"
          subtitle="Join hundreds of financial professionals who deliver exceptional experiences"
          ctaText="Start Today"
          ctaLink="/get-started?industry=financial-services"
        />
      </main>
      <Footer />
    </div>
  );
};

export default FinancialServices;
