import { Brain, Shield, Clock, Calendar, Phone, MessageSquare } from "lucide-react";
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
    description: "Client privacy protected at every call. Our team follows strict confidentiality protocols for mental health practices.",
  },
  {
    icon: Phone,
    title: "Crisis Protocol",
    description: "Immediate escalation for urgent calls. We follow your crisis procedures and connect clients to appropriate resources.",
  },
  {
    icon: Calendar,
    title: "Appointment Reminders",
    description: "Reduce no-shows with confirmation calls and reminders. Keep your schedule full and clients engaged.",
  },
  {
    icon: Clock,
    title: "After-Hours Coverage",
    description: "Support clients beyond business hours. Evening and weekend calls handled with care and compassion.",
  },
  {
    icon: MessageSquare,
    title: "Confidential Messaging",
    description: "Secure message delivery that protects sensitive information while keeping you informed.",
  },
  {
    icon: Brain,
    title: "Insurance Verification",
    description: "Pre-appointment eligibility checks to ensure clients understand their coverage before arriving.",
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
      "Crisis escalation",
    ],
  },
  {
    name: "250 Minutes",
    price: "$499",
    description: "For group practices",
    features: [
      "250 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "Multi-therapist routing",
      "New client intake",
      "Insurance verification",
      "No-show follow-up",
    ],
    popular: true,
  },
  {
    name: "1000 Minutes",
    price: "$1,499",
    description: "For larger clinics",
    features: [
      "1000 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "Dedicated account team",
      "Custom protocols",
      "Detailed reporting",
      "Quality assurance",
    ],
  },
];

const steps = [
  {
    number: 1,
    title: "Share Your Protocols",
    description: "Tell us your scheduling preferences, crisis procedures, and how you want different call types handled.",
  },
  {
    number: 2,
    title: "Train Our Team",
    description: "We learn your practice's approach, including therapist specialties and client intake requirements.",
  },
  {
    number: 3,
    title: "Focus on Healing",
    description: "Spend more time with clients while we handle the phones with compassion and confidentiality.",
  },
];

const faqs = [
  {
    question: "How do you handle crisis calls?",
    answer: "We follow your specific crisis protocol exactly. This may include immediate escalation to on-call staff, providing crisis hotline numbers, or following your emergency procedures. We take these calls seriously and handle them with appropriate urgency.",
  },
  {
    question: "Is your service truly HIPAA compliant?",
    answer: "Yes. Our team undergoes HIPAA training, we sign Business Associate Agreements (BAAs), and all call information is handled according to strict privacy standards. Your clients' confidentiality is protected.",
  },
  {
    question: "Can you do intake for new clients?",
    answer: "Absolutely. We gather the information you need, including contact details, insurance information, reason for seeking therapy, and any specific requirements, so you're prepared for the first session.",
  },
  {
    question: "How do you handle sensitive topics?",
    answer: "Our team is trained to handle calls with empathy and discretion. We never ask for details about the nature of therapy—we simply schedule appointments and take messages with care and respect.",
  },
];

const CounselingTherapy = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Virtual Receptionist for Therapists & Counselors"
        description="HIPAA-compliant call handling for mental health practices. Crisis protocols, confidential messaging, and appointment reminders."
        canonical="/industries/counseling-therapy"
        jsonLd={[
          createServiceSchema("Virtual Receptionist for Counseling & Therapy", "HIPAA-compliant call handling, crisis protocols, and appointment management for mental health practices.", "/industries/counseling-therapy"),
          createFAQSchema(faqs),
          createBreadcrumbSchema([{ name: "Home", url: "/" }, { name: "Industries", url: "/industries" }, { name: "Counseling & Therapy", url: "/industries/counseling-therapy" }])
        ]}
      />
      <Navigation />
      <main>
        <ServiceHero
          title={{ primary: "Focus on Healing", highlight: "Not the Phone" }}
          tagline="COUNSELING & THERAPY"
          description="Protect client confidentiality, reduce no-shows, and fill your schedule with HIPAA-compliant call handling designed for mental health professionals."
          icon={Brain}
          ctaText="Get Started Today"
          ctaLink="/get-started?industry=counseling-therapy"
        />
        <ServiceFeatureGrid
          title="Built for Mental Health Professionals"
          subtitle="From solo practitioners to group practices, we handle calls with care"
          features={features}
        />
        <ServicePricingCards
          title="Plans for Every Practice"
          subtitle="Flexible options that grow with your client base"
          plans={plans}
          serviceSlug="counseling-therapy"
        />
        <ServiceProcess
          title="Getting Started is Easy"
          subtitle="Be up and running in days, not weeks"
          steps={steps}
        />
        <ServiceFAQ
          title="Counseling & Therapy FAQs"
          subtitle="Common questions from mental health practices"
          faqs={faqs}
        />
        <ServiceCTA
          title="Ready to Focus on Your Clients?"
          subtitle="Join hundreds of therapists who trust us with their practice calls"
          ctaText="Start Today"
          ctaLink="/get-started?industry=counseling-therapy"
        />
      </main>
      <Footer />
    </div>
  );
};

export default CounselingTherapy;
