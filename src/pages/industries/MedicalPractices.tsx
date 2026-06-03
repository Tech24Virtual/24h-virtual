import { Stethoscope, Clock, Shield, Phone, Calendar, FileText } from "lucide-react";
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
    title: "HIPAA Compliant",
    description: "Keep patients protected and keep your practice compliant, with zero extra work from your staff.",
  },
  {
    icon: Calendar,
    title: "Appointment Scheduling",
    description: "Fewer no-shows, fuller schedules. We book, confirm, and reschedule so your chairs stay full.",
  },
  {
    icon: Clock,
    title: "After-Hours Coverage",
    description: "Never miss urgent patient calls. We triage after-hours inquiries and escalate emergencies appropriately.",
  },
  {
    icon: Phone,
    title: "Patient Call Screening",
    description: "Reduce interruptions during exams. We screen calls and only transfer truly urgent matters.",
  },
  {
    icon: FileText,
    title: "Insurance Verification",
    description: "Help patients with basic insurance questions and gather pre-visit information to streamline check-in.",
  },
  {
    icon: Stethoscope,
    title: "Medical Terminology",
    description: "Our receptionists are trained in healthcare terminology to communicate professionally with your patients.",
  },
];

const plans = [
  {
    name: "50 Minutes",
    price: "$149",
    description: "For solo practitioners",
    features: [
      "50 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "HIPAA compliant",
      "Appointment scheduling",
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
      "HIPAA compliant",
      "Patient screening",
      "Insurance pre-verification",
      "Urgent call escalation",
    ],
    popular: true,
  },
  {
    name: "1000 Minutes",
    price: "$1,499",
    description: "For multi-physician clinics",
    features: [
      "1000 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "Multi-provider scheduling",
      "Referral coordination",
      "Patient recall campaigns",
      "Analytics dashboard",
    ],
  },
];

const steps = [
  {
    number: 1,
    title: "Share Your Protocols",
    description: "Tell us your scheduling rules, emergency protocols, and how you want calls handled.",
  },
  {
    number: 2,
    title: "Connect Your Systems",
    description: "We integrate with your EHR and scheduling software for seamless appointment management.",
  },
  {
    number: 3,
    title: "Go Live",
    description: "Your calls are answered by trained medical receptionists who represent your practice professionally.",
  },
];

const faqs = [
  {
    question: "Are your services HIPAA compliant?",
    answer: "Absolutely. All our receptionists undergo HIPAA training, and we have strict protocols for handling protected health information (PHI). We sign Business Associate Agreements (BAAs) with all medical clients.",
  },
  {
    question: "Can you handle prescription refill requests?",
    answer: "Yes, we can take messages for refill requests and relay them to your staff according to your protocols. We never provide medical advice or approve refills. That's always handled by your clinical team.",
  },
  {
    question: "What happens with urgent after-hours calls?",
    answer: "We follow your custom triage protocols. Truly urgent matters are immediately escalated to your on-call provider, while routine matters are scheduled for next-day follow-up.",
  },
  {
    question: "Do you integrate with EHR systems?",
    answer: "We work with most major EHR and practice management systems including Epic, Cerner, athenahealth, and many others for appointment scheduling.",
  },
];

const MedicalPractices = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Virtual Receptionist for Medical Practices"
        description="HIPAA-compliant virtual receptionists for medical practices. Reduce no-shows by 40%, capture after-hours calls, and let staff focus on patient care."
        canonical="/industries/medical-practices"
        jsonLd={[
          createServiceSchema("Virtual Receptionist for Medical Practices", "HIPAA-compliant call answering, appointment scheduling, and patient intake for medical practices.", "/industries/medical-practices"),
          createFAQSchema(faqs),
          createBreadcrumbSchema([{ name: "Home", url: "/" }, { name: "Industries", url: "/industries" }, { name: "Medical Practices", url: "/industries/medical-practices" }])
        ]}
      />
      <Navigation />
      <main>
        <ServiceHero
          title={{ primary: "Focus on Patients", highlight: "Not the Phone" }}
          tagline="MEDICAL PRACTICES"
          description="Reduce no-shows by 40%, capture every after-hours call, and give your staff time to focus on what matters most: patient care."
          icon={Stethoscope}
          ctaText="Get Started Today"
          ctaLink="/get-started?industry=medical-practices"
        />
        <ServiceFeatureGrid
          title="Built for Healthcare"
          subtitle="From solo practitioners to multi-location clinics, we understand the unique demands of medical practices"
          features={features}
        />
        <ServicePricingCards
          title="Plans for Every Practice Size"
          subtitle="Scalable solutions that grow with your patient volume"
          plans={plans}
          serviceSlug="medical-practices"
        />
        <ServiceProcess
          title="Getting Started is Easy"
          subtitle="Be up and running in days, not weeks"
          steps={steps}
        />
        <ServiceFAQ
          title="Medical Practice FAQs"
          subtitle="Common questions from healthcare providers"
          faqs={faqs}
        />
        <ServiceCTA
          title="Ready to Reduce No-Shows and Capture More Patients?"
          subtitle="Join hundreds of medical practices that trust us with their calls"
          ctaText="Start Today"
          ctaLink="/get-started?industry=medical-practices"
        />
      </main>
      <Footer />
    </div>
  );
};

export default MedicalPractices;
