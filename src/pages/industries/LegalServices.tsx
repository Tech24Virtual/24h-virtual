import { Scale, Clock, Shield, Phone, Calendar, FileText } from "lucide-react";
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
    title: "Client Confidentiality",
    description: "Attorney-client privilege is paramount. Our receptionists are trained in legal confidentiality requirements.",
  },
  {
    icon: Phone,
    title: "New Client Intake",
    description: "Capture potential clients 24/7. We gather case details and schedule consultations while leads are hot.",
  },
  {
    icon: Calendar,
    title: "Appointment Scheduling",
    description: "Manage your calendar efficiently with booking, rescheduling, and reminder calls to reduce no-shows.",
  },
  {
    icon: Clock,
    title: "After-Hours Availability",
    description: "Legal emergencies don't wait. We answer calls around the clock and escalate urgent matters immediately.",
  },
  {
    icon: FileText,
    title: "Message Management",
    description: "Detailed, accurate messages delivered via email or your practice management software.",
  },
  {
    icon: Scale,
    title: "Legal Terminology",
    description: "Our team is trained in legal terminology and understands the nuances of law firm communications.",
  },
];

const plans = [
  {
    name: "50 Minutes",
    price: "$149",
    description: "For solo attorneys",
    features: [
      "50 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "New client intake",
      "Appointment scheduling",
      "Message taking",
    ],
  },
  {
    name: "250 Minutes",
    price: "$499",
    description: "For small firms",
    features: [
      "250 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "New client intake",
      "Conflict checking support",
      "Court date reminders",
      "Priority call routing",
    ],
    popular: true,
  },
  {
    name: "1000 Minutes",
    price: "$1,499",
    description: "For established practices",
    features: [
      "1000 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "Multi-attorney routing",
      "Case status updates",
      "Detailed call analytics",
      "Custom intake scripts",
    ],
  },
];

const steps = [
  {
    number: 1,
    title: "Define Your Protocols",
    description: "Share your intake questions, scheduling preferences, and how you want different call types handled.",
  },
  {
    number: 2,
    title: "Train Our Team",
    description: "We learn your practice areas, key personnel, and specific procedures to represent you professionally.",
  },
  {
    number: 3,
    title: "Never Miss a Lead",
    description: "Every call is answered promptly and professionally, capturing new clients and serving existing ones.",
  },
];

const faqs = [
  {
    question: "How do you handle attorney-client confidentiality?",
    answer: "All our receptionists sign confidentiality agreements and are trained specifically on legal ethics. We never share case information and follow strict protocols for message handling.",
  },
  {
    question: "Can you handle new client intake for different practice areas?",
    answer: "Yes! We customize intake scripts for each practice area, including personal injury, family law, criminal defense, corporate law, and more. We ask the right questions to qualify leads.",
  },
  {
    question: "What if I'm in court and can't take calls?",
    answer: "We handle everything while you're unavailable. Routine matters get scheduled for callback, urgent matters are handled per your protocols, and you receive detailed summaries.",
  },
  {
    question: "Do you integrate with legal practice management software?",
    answer: "We work with Clio, MyCase, PracticePanther, Lawmatics, and many other legal software platforms for seamless scheduling and lead capture.",
  },
];

const LegalServices = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Virtual Receptionist for Law Firms"
        description="Capture new clients 24/7 with confidential call handling for law firms. New client intake, appointment scheduling, and after-hours coverage."
        canonical="/industries/legal-services"
        jsonLd={[
          createServiceSchema("Virtual Receptionist for Legal Services", "Confidential call answering, new client intake, and appointment scheduling for law firms.", "/industries/legal-services"),
          createFAQSchema(faqs),
          createBreadcrumbSchema([{ name: "Home", url: "/" }, { name: "Industries", url: "/industries" }, { name: "Legal Services", url: "/industries/legal-services" }])
        ]}
      />
      <Navigation />
      <main>
        <ServiceHero
          title="Sign More Clients While You Practice Law"
          tagline="LEGAL SERVICES"
          description="Capture new leads 24/7, maintain confidentiality, and never miss a potential client. Focus on practicing law, not answering phones."
          icon={Scale}
          ctaText="Get Started Today"
          ctaLink="/get-started?industry=legal-services"
        />
        <ServiceFeatureGrid
          title="Built for Law Firms"
          subtitle="From solo practitioners to multi-partner firms, we understand the demands of legal practice"
          features={features}
        />
        <ServicePricingCards
          title="Plans for Every Firm Size"
          subtitle="Flexible options that scale with your caseload"
          plans={plans}
          serviceSlug="legal-services"
        />
        <ServiceProcess
          title="Getting Started is Easy"
          subtitle="Be up and running in days, not weeks"
          steps={steps}
        />
        <ServiceFAQ
          title="Legal Services FAQs"
          subtitle="Common questions from law firms"
          faqs={faqs}
        />
        <ServiceCTA
          title="Ready to Capture More Clients?"
          subtitle="Join hundreds of law firms that never miss a lead"
          ctaText="Start Today"
          ctaLink="/get-started?industry=legal-services"
        />
      </main>
      <Footer />
    </div>
  );
};

export default LegalServices;
