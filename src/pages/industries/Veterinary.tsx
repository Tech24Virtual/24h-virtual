import { Stethoscope, Heart, Clock, Calendar, Phone, AlertTriangle } from "lucide-react";
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
    icon: AlertTriangle,
    title: "Emergency Triage",
    description: "Assess urgent calls and route true emergencies to on-call staff while scheduling routine appointments.",
  },
  {
    icon: Calendar,
    title: "Appointment Scheduling",
    description: "Book wellness visits, follow-ups, and procedures. We manage your calendar so every slot gets filled.",
  },
  {
    icon: Clock,
    title: "After-Hours Coverage",
    description: "Pet emergencies don't wait for business hours. We're there when worried pet owners call at midnight.",
  },
  {
    icon: Phone,
    title: "New Client Intake",
    description: "Capture new patients with warm, professional intake that gathers pet and owner information.",
  },
  {
    icon: Heart,
    title: "Compassionate Care",
    description: "Pet owners need empathy. Our team handles calls with the care and understanding your clients expect.",
  },
  {
    icon: Stethoscope,
    title: "Veterinary Knowledge",
    description: "We understand common pet health terms and can communicate effectively about appointments and follow-ups.",
  },
];

const plans = [
  {
    name: "50 Minutes",
    price: "$149",
    description: "For small clinics",
    features: [
      "50 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "Appointment scheduling",
      "Emergency triage",
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
      "Multi-vet routing",
      "Prescription refill requests",
      "Email notifications",
    ],
    popular: true,
  },
  {
    name: "1000 Minutes",
    price: "$1,499",
    description: "For animal hospitals",
    features: [
      "1000 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "Dedicated account team",
      "Complex scheduling",
      "Lab result callbacks",
      "Quality assurance",
    ],
  },
];

const steps = [
  {
    number: 1,
    title: "Share Your Protocols",
    description: "Tell us your emergency triage criteria, scheduling preferences, and how different call types should be handled.",
  },
  {
    number: 2,
    title: "Connect Your Systems",
    description: "We integrate with your practice management software to book appointments and access schedules.",
  },
  {
    number: 3,
    title: "Focus on Patients",
    description: "Spend more time with animals and their owners while we handle the phones with care.",
  },
];

const faqs = [
  {
    question: "How do you handle after-hours emergencies?",
    answer: "We follow your triage protocol to assess urgency. True emergencies are escalated immediately to on-call staff, while non-urgent calls are scheduled for the next business day or directed to emergency clinics as needed.",
  },
  {
    question: "Can you schedule for multiple veterinarians?",
    answer: "Yes! We manage calendars for multiple vets, matching appointments to the right provider based on availability, specialty, and patient needs.",
  },
  {
    question: "How do you handle prescription refill requests?",
    answer: "We take down the details, including pet name, medication, and pharmacy preference, then send the request to your team for approval. No medical decisions, just efficient message handling.",
  },
  {
    question: "What practice management systems do you work with?",
    answer: "We integrate with popular veterinary software including Cornerstone, AVImark, eVetPractice, and others. Appointments flow directly into your system.",
  },
];

const Veterinary = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Virtual Receptionist for Veterinary Clinics"
        description="Compassionate call handling for vet clinics. Emergency triage, appointment scheduling, and new client intake so you can focus on patient care."
        canonical="/industries/veterinary"
        jsonLd={[
          createServiceSchema("Virtual Receptionist for Veterinary Practices", "Emergency triage, appointment scheduling, and compassionate call handling for veterinary clinics.", "/industries/veterinary"),
          createFAQSchema(faqs),
          createBreadcrumbSchema([{ name: "Home", url: "/" }, { name: "Industries", url: "/industries" }, { name: "Veterinary", url: "/industries/veterinary" }])
        ]}
      />
      <Navigation />
      <main>
        <ServiceHero
          title={{ primary: "More Time for Patients", highlight: "Less Time on Hold" }}
          tagline="VETERINARY SERVICES"
          description="Capture every call, triage emergencies with care, and keep your schedule full so you can focus on healing pets and supporting their families."
          icon={Stethoscope}
          ctaText="Get Started Today"
          ctaLink="/get-started?industry=veterinary"
        />
        <ServiceFeatureGrid
          title="Built for Veterinary Practices"
          subtitle="From small clinics to animal hospitals, we understand pet care"
          features={features}
        />
        <ServicePricingCards
          title="Plans for Every Practice Size"
          subtitle="Flexible options that grow with your patient base"
          plans={plans}
          serviceSlug="veterinary"
        />
        <ServiceProcess
          title="Getting Started is Easy"
          subtitle="Be up and running in days, not weeks"
          steps={steps}
        />
        <ServiceFAQ
          title="Veterinary FAQs"
          subtitle="Common questions from veterinary practices"
          faqs={faqs}
        />
        <ServiceCTA
          title="Ready to Focus on Your Patients?"
          subtitle="Join hundreds of veterinary practices that trust us with their calls"
          ctaText="Start Today"
          ctaLink="/get-started?industry=veterinary"
        />
      </main>
      <Footer />
    </div>
  );
};

export default Veterinary;
