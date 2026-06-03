import { Truck, Clock, Phone, MapPin, Package, Radio } from "lucide-react";
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
    title: "24/7 Dispatch Support",
    description: "Freight doesn't sleep and neither do we. Handle dispatch calls, delivery updates, and driver check-ins around the clock.",
  },
  {
    icon: MapPin,
    title: "Shipment Tracking",
    description: "Answer customer inquiries about delivery status, ETAs, and pickup schedules with accurate information.",
  },
  {
    icon: Radio,
    title: "Driver Communication",
    description: "Relay messages to drivers, handle check-ins, and coordinate route changes efficiently.",
  },
  {
    icon: Package,
    title: "Load Booking",
    description: "Capture new freight inquiries, gather shipment details, and route leads to your sales team.",
  },
  {
    icon: Clock,
    title: "After-Hours Coverage",
    description: "Late-night pickups and early morning deliveries? We're there when your customers and drivers need support.",
  },
  {
    icon: Truck,
    title: "Fleet Coordination",
    description: "Manage calls across multiple trucks, routes, and drivers with organized, efficient handling.",
  },
];

const plans = [
  {
    name: "50 Minutes",
    price: "$149",
    description: "For small fleets",
    features: [
      "50 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "Dispatch support",
      "Driver messages",
      "Customer inquiries",
    ],
  },
  {
    name: "250 Minutes",
    price: "$499",
    description: "For growing operations",
    features: [
      "250 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "Load booking",
      "Multi-driver routing",
      "Shipment tracking",
      "Email notifications",
    ],
    popular: true,
  },
  {
    name: "1000 Minutes",
    price: "$1,499",
    description: "For large carriers",
    features: [
      "1000 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "Dedicated account team",
      "Complex dispatch",
      "24/7 driver support",
      "Quality assurance",
    ],
  },
];

const steps = [
  {
    number: 1,
    title: "Share Your Operations",
    description: "Tell us about your fleet, routes, dispatch procedures, and how you want different call types handled.",
  },
  {
    number: 2,
    title: "Connect Your Systems",
    description: "We integrate with your TMS and dispatch software to provide accurate information and log calls.",
  },
  {
    number: 3,
    title: "Keep Freight Moving",
    description: "Focus on operations while we handle the phones, keeping customers informed and drivers connected.",
  },
];

const faqs = [
  {
    question: "Can you handle dispatch calls overnight?",
    answer: "Absolutely. We provide true 24/7 coverage for late-night pickups, early deliveries, and around-the-clock dispatch support. Your operations never have to pause.",
  },
  {
    question: "How do you handle shipment tracking inquiries?",
    answer: "We access your TMS or dispatch system to provide accurate ETAs, delivery status, and pickup information. Customers get the answers they need without waiting for a callback.",
  },
  {
    question: "Can you coordinate with drivers?",
    answer: "Yes! We relay messages, handle check-ins, and communicate route changes. We're an extension of your dispatch team, not a replacement.",
  },
  {
    question: "What TMS systems do you work with?",
    answer: "We integrate with popular transportation management systems including McLeod, TMW, MercuryGate, and others. We adapt to your existing workflows.",
  },
];

const TransportationLogistics = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Virtual Receptionist for Transportation & Logistics"
        description="24/7 dispatch support, shipment tracking, and driver coordination for trucking companies, carriers, and logistics firms."
        canonical="/industries/transportation-logistics"
        jsonLd={[
          createServiceSchema("Virtual Receptionist for Transportation & Logistics", "24/7 dispatch support, shipment tracking, and driver coordination for transportation companies.", "/industries/transportation-logistics"),
          createFAQSchema(faqs),
          createBreadcrumbSchema([{ name: "Home", url: "/" }, { name: "Industries", url: "/industries" }, { name: "Transportation & Logistics", url: "/industries/transportation-logistics" }])
        ]}
      />
      <Navigation />
      <main>
        <ServiceHero
          title={{ primary: "Keep Freight Moving", highlight: "Customers Happy" }}
          tagline="TRANSPORTATION & LOGISTICS"
          description="24/7 dispatch support, shipment tracking, and driver coordination so your operations run smoothly around the clock."
          icon={Truck}
          ctaText="Get Started Today"
          ctaLink="/get-started?industry=transportation-logistics"
        />
        <ServiceFeatureGrid
          title="Built for Transportation Companies"
          subtitle="From small fleets to large carriers, we keep your lines open"
          features={features}
        />
        <ServicePricingCards
          title="Plans for Every Fleet Size"
          subtitle="Flexible options that scale with your operations"
          plans={plans}
          serviceSlug="transportation-logistics"
        />
        <ServiceProcess
          title="Getting Started is Easy"
          subtitle="Be up and running in days, not weeks"
          steps={steps}
        />
        <ServiceFAQ
          title="Transportation FAQs"
          subtitle="Common questions from carriers and logistics companies"
          faqs={faqs}
        />
        <ServiceCTA
          title="Ready to Improve Your Operations?"
          subtitle="Join hundreds of transportation companies with 24/7 phone coverage"
          ctaText="Start Today"
          ctaLink="/get-started?industry=transportation-logistics"
        />
      </main>
      <Footer />
    </div>
  );
};

export default TransportationLogistics;
