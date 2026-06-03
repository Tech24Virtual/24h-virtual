import { Wrench, Clock, Calendar, Phone, MapPin, DollarSign } from "lucide-react";
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
    title: "24/7 Call Answering",
    description: "Emergencies happen anytime. We answer calls around the clock so you never miss a job opportunity.",
  },
  {
    icon: Calendar,
    title: "Job Scheduling",
    description: "Book appointments directly into your calendar. We handle scheduling, rescheduling, and confirmations.",
  },
  {
    icon: MapPin,
    title: "Service Area Screening",
    description: "We verify caller locations match your service area before booking, saving you wasted trips.",
  },
  {
    icon: DollarSign,
    title: "Quote Requests",
    description: "Gather job details and provide basic pricing information based on your rate cards.",
  },
  {
    icon: Clock,
    title: "Dispatch Coordination",
    description: "Coordinate with your technicians in the field for same-day appointments and emergency calls.",
  },
  {
    icon: Wrench,
    title: "Service Knowledge",
    description: "Our team learns your services and can answer common questions about what you offer.",
  },
];

const plans = [
  {
    name: "50 Minutes",
    price: "$149",
    description: "For independent contractors",
    features: [
      "50 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "Job scheduling",
      "Service area screening",
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
      "Job scheduling",
      "Quote collection",
      "Dispatch coordination",
      "Email notifications",
    ],
    popular: true,
  },
  {
    name: "1000 Minutes",
    price: "$1,499",
    description: "For established businesses",
    features: [
      "1000 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "Multi-technician routing",
      "Emergency prioritization",
      "Follow-up calls",
      "Call analytics",
    ],
  },
];

const steps = [
  {
    number: 1,
    title: "Share Your Services",
    description: "Tell us about your service offerings, pricing, service area, and how you want calls handled.",
  },
  {
    number: 2,
    title: "Connect Your Calendar",
    description: "We integrate with your scheduling software to book jobs in real-time without double-booking.",
  },
  {
    number: 3,
    title: "Start Booking Jobs",
    description: "Every call becomes an opportunity. We book appointments while you focus on the work.",
  },
];

const faqs = [
  {
    question: "Can you handle emergency service calls?",
    answer: "Absolutely. We follow your emergency protocols, whether that means reaching your on-call technician immediately or scheduling priority service for the next available slot.",
  },
  {
    question: "How do you handle service area questions?",
    answer: "We verify the caller's location against your service area map before booking. If they're outside your area, we politely let them know and can refer them elsewhere if you'd like.",
  },
  {
    question: "Can you provide job estimates?",
    answer: "Yes! We use your rate cards and pricing guidelines to give callers accurate estimates for common services. Complex jobs get scheduled for an on-site assessment.",
  },
  {
    question: "What scheduling software do you work with?",
    answer: "We integrate with ServiceTitan, Jobber, Housecall Pro, ServiceM8, and many other field service platforms. We can also work with Google Calendar or other tools.",
  },
];

const HomeServices = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Virtual Receptionist for Home Services"
        description="Capture every service call, schedule jobs, and dispatch emergencies. 24/7 call answering for contractors, plumbers, electricians, and HVAC companies."
        canonical="/industries/home-services"
        jsonLd={[
          createServiceSchema("Virtual Receptionist for Home Services", "24/7 call answering, job scheduling, and emergency dispatch for home service contractors.", "/industries/home-services"),
          createFAQSchema(faqs),
          createBreadcrumbSchema([{ name: "Home", url: "/" }, { name: "Industries", url: "/industries" }, { name: "Home Services", url: "/industries/home-services" }])
        ]}
      />
      <Navigation />
      <main>
        <ServiceHero
          title={{ primary: "Book More Jobs", highlight: "Dispatch Emergencies Instantly" }}
          tagline="HOME SERVICES"
          description="Capture every lead, schedule appointments, and keep your crews busy while you're on the job. Never miss another service call."
          icon={Wrench}
          ctaText="Get Started Today"
          ctaLink="/get-started?industry=home-services"
        />
        <ServiceFeatureGrid
          title="Built for Contractors"
          subtitle="From independent tradespeople to multi-crew operations, we keep your schedule full"
          features={features}
        />
        <ServicePricingCards
          title="Plans for Every Business Size"
          subtitle="Affordable options that grow with your business"
          plans={plans}
          serviceSlug="home-services"
        />
        <ServiceProcess
          title="Getting Started is Easy"
          subtitle="Be up and running in days, not weeks"
          steps={steps}
        />
        <ServiceFAQ
          title="Home Services FAQs"
          subtitle="Common questions from contractors and service companies"
          faqs={faqs}
        />
        <ServiceCTA
          title="Ready to Fill Your Schedule?"
          subtitle="Join hundreds of home service companies that never miss a call"
          ctaText="Start Today"
          ctaLink="/get-started?industry=home-services"
        />
      </main>
      <Footer />
    </div>
  );
};

export default HomeServices;
