import { Wrench, Clock, Phone, Calendar, Shield, ThermometerSun } from "lucide-react";
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
    title: "24/7 Emergency Dispatch",
    description: "Capture urgent repair calls anytime. HVAC failures, appliance breakdowns, and equipment emergencies dispatched immediately.",
  },
  {
    icon: Calendar,
    title: "Service Scheduling",
    description: "Book appointments, manage technician calendars, and send confirmations without lifting a finger.",
  },
  {
    icon: Clock,
    title: "After-Hours Coverage",
    description: "Equipment doesn't break on a schedule. We're there when your customers need help most.",
  },
  {
    icon: Shield,
    title: "Lead Qualification",
    description: "Screen callers to identify the issue, urgency level, and equipment type before dispatching your team.",
  },
  {
    icon: ThermometerSun,
    title: "HVAC Expertise",
    description: "Our team understands heating, cooling, and ventilation terminology to communicate effectively with your customers.",
  },
  {
    icon: Wrench,
    title: "Multi-Trade Support",
    description: "Whether it's appliances, HVAC, plumbing, or electrical, we handle calls for all your service lines.",
  },
];

const plans = [
  {
    name: "50 Minutes",
    price: "$149",
    description: "For solo technicians",
    features: [
      "50 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "Emergency dispatch",
      "Appointment booking",
      "Message taking",
    ],
  },
  {
    name: "250 Minutes",
    price: "$499",
    description: "For growing companies",
    features: [
      "250 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "Lead qualification",
      "Multi-technician routing",
      "Service area screening",
      "Email notifications",
    ],
    popular: true,
  },
  {
    name: "1000 Minutes",
    price: "$1,499",
    description: "For large operations",
    features: [
      "1000 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "Dedicated account team",
      "Priority dispatching",
      "Parts ordering support",
      "Quality assurance",
    ],
  },
];

const steps = [
  {
    number: 1,
    title: "Share Your Services",
    description: "Tell us your service areas, equipment types, and how you want calls prioritized and dispatched.",
  },
  {
    number: 2,
    title: "Connect Your Calendar",
    description: "We integrate with your scheduling system to book appointments and manage technician availability.",
  },
  {
    number: 3,
    title: "Capture Every Job",
    description: "Never miss an emergency call or scheduled maintenance request. Your phones are always answered.",
  },
];

const faqs = [
  {
    question: "Can you dispatch emergency calls immediately?",
    answer: "Absolutely. We follow your emergency protocols exactly, calling technicians, sending texts, or using your dispatch system to get someone on the job fast.",
  },
  {
    question: "How do you handle different types of repairs?",
    answer: "We're trained on HVAC, appliance, plumbing, electrical, and general repair terminology. We gather the right details for each service type so your technicians arrive prepared.",
  },
  {
    question: "Can you screen for service area?",
    answer: "Yes! We check caller zip codes or addresses against your service area and politely redirect calls outside your coverage zone.",
  },
  {
    question: "What scheduling software do you work with?",
    answer: "We integrate with ServiceTitan, Housecall Pro, Jobber, FieldEdge, and many other field service platforms. Appointments flow directly into your system.",
  },
];

const MaintenanceRepair = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Virtual Receptionist for HVAC & Repair Companies"
        description="24/7 emergency dispatch, service scheduling, and lead qualification for HVAC, appliance repair, and maintenance companies."
        canonical="/industries/maintenance-repair"
        jsonLd={[
          createServiceSchema("Virtual Receptionist for Maintenance & Repair", "Emergency dispatch, service scheduling, and lead qualification for repair and maintenance companies.", "/industries/maintenance-repair"),
          createFAQSchema(faqs),
          createBreadcrumbSchema([{ name: "Home", url: "/" }, { name: "Industries", url: "/industries" }, { name: "Maintenance & Repair", url: "/industries/maintenance-repair" }])
        ]}
      />
      <Navigation />
      <main>
        <ServiceHero
          title="Never Miss an Emergency Call Again"
          tagline="MAINTENANCE & REPAIR"
          description="Capture every service call, dispatch emergencies instantly, and book more jobs, even at 2am when the furnace goes out."
          icon={Wrench}
          ctaText="Get Started Today"
          ctaLink="/get-started?industry=maintenance-repair"
        />
        <ServiceFeatureGrid
          title="Built for Repair Professionals"
          subtitle="From solo technicians to multi-trade companies, we keep your phones covered"
          features={features}
        />
        <ServicePricingCards
          title="Plans for Every Service Company"
          subtitle="Flexible options that scale with your business"
          plans={plans}
          serviceSlug="maintenance-repair"
        />
        <ServiceProcess
          title="Getting Started is Easy"
          subtitle="Be up and running in days, not weeks"
          steps={steps}
        />
        <ServiceFAQ
          title="Maintenance & Repair FAQs"
          subtitle="Common questions from service companies"
          faqs={faqs}
        />
        <ServiceCTA
          title="Ready to Capture More Jobs?"
          subtitle="Join hundreds of repair companies that never miss an emergency call"
          ctaText="Start Today"
          ctaLink="/get-started?industry=maintenance-repair"
        />
      </main>
      <Footer />
    </div>
  );
};

export default MaintenanceRepair;
