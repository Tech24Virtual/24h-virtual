import { AlertTriangle, Phone, Clock, MapPin, FileText, TrendingUp } from "lucide-react";
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
    title: "Instant Triage",
    description: "Every call is answered immediately and prioritized based on urgency. True emergencies get escalated instantly.",
  },
  {
    icon: Clock,
    title: "On-Call Dispatch",
    description: "We reach your technicians quickly using your preferred contact methods and escalation protocols.",
  },
  {
    icon: AlertTriangle,
    title: "After-Hours Coverage",
    description: "24/7/365 coverage means you never miss an emergency call, whether it's nights, weekends, or holidays.",
  },
  {
    icon: MapPin,
    title: "Service Area Verification",
    description: "We verify caller locations against your service area before dispatching, saving time and fuel costs.",
  },
  {
    icon: FileText,
    title: "Detailed Ticketing",
    description: "Every call creates a comprehensive ticket with caller info, problem description, and urgency level.",
  },
  {
    icon: TrendingUp,
    title: "Escalation Protocols",
    description: "Custom escalation paths ensure the right person is notified based on call type, time, and urgency.",
  },
];

const plans = [
  {
    name: "50 Minutes",
    price: "$149",
    description: "For small service teams",
    features: [
      "50 minutes/month",
      "24/7 emergency dispatch",
      "$2.00/min overage",
      "Basic call routing",
      "Email notifications",
      "Service area verification",
    ],
  },
  {
    name: "250 Minutes",
    price: "$499",
    description: "Most popular for contractors",
    features: [
      "250 minutes/month",
      "24/7 emergency dispatch",
      "$2.00/min overage",
      "Custom escalation protocols",
      "Multi-technician routing",
      "Priority triage",
      "Call recording",
    ],
    popular: true,
  },
  {
    name: "1000 Minutes",
    price: "$1,499",
    description: "For high-volume operations",
    features: [
      "1000 minutes/month",
      "24/7 emergency dispatch",
      "$2.00/min overage",
      "Advanced escalation trees",
      "Multi-location support",
      "Real-time analytics",
      "CRM integration",
      "Dedicated account manager",
    ],
  },
];

const steps = [
  {
    number: 1,
    title: "Define Your Protocols",
    description: "Tell us how you want different call types handled: true emergencies, urgent requests, and routine inquiries.",
  },
  {
    number: 2,
    title: "Set Up Your Team",
    description: "Provide your on-call schedule and contact preferences for each technician. We handle the rest.",
  },
  {
    number: 3,
    title: "Go Live 24/7",
    description: "Forward your after-hours calls and never worry about missing an emergency again.",
  },
];

const faqs = [
  {
    question: "How quickly do you answer emergency calls?",
    answer: "Our average answer time is within 3 rings. True emergencies are never put on hold. We answer immediately and begin triage right away.",
  },
  {
    question: "Can you dispatch to multiple technicians?",
    answer: "Yes! We can manage complex on-call rotations, try multiple contacts simultaneously, and escalate if the primary technician doesn't respond.",
  },
  {
    question: "How do you determine if it's a true emergency?",
    answer: "We use your custom triage questions to assess urgency. You define what constitutes an emergency for your business, such as flooding, gas leaks, no heat in winter, and more.",
  },
  {
    question: "Do you integrate with field service software?",
    answer: "We integrate with ServiceTitan, Housecall Pro, Jobber, and many other field service platforms to create tickets and update job status automatically.",
  },
];

const EmergencyServices = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="24/7 Emergency Dispatch Answering Service"
        description="Never miss an emergency call. Instant triage, immediate dispatch, and 24/7/365 coverage for HVAC, plumbing, restoration, and service contractors."
        canonical="/industries/emergency-services"
        jsonLd={[
          createServiceSchema("24/7 Emergency Dispatch Service", "Instant call triage, emergency dispatch, and 24/7/365 coverage for service contractors.", "/industries/emergency-services"),
          createFAQSchema(faqs),
          createBreadcrumbSchema([{ name: "Home", url: "/" }, { name: "Industries", url: "/industries" }, { name: "Emergency Services", url: "/industries/emergency-services" }])
        ]}
      />
      <Navigation />
      <main>
        <ServiceHero
          title={{ primary: "Respond to Every Emergency", highlight: "Win More Jobs" }}
          tagline="EMERGENCY SERVICES"
          description="Never miss a 3am call again. Instant triage, immediate dispatch, and 24/7 coverage that keeps your customers safe and your business growing."
          icon={AlertTriangle}
          ctaText="Get 24/7 Coverage"
          ctaLink="/get-started?industry=emergency-services"
        />
        <ServiceFeatureGrid
          title="Built for Emergency Response"
          subtitle="We understand that when disaster strikes, your customers need help fast, and so do you"
          features={features}
        />
        <ServicePricingCards
          title={{ primary: "Reliable Coverage", highlight: "Predictable Pricing" }}
          subtitle="Plans designed for service contractors"
          plans={plans}
          serviceSlug="emergency-services"
        />
        <ServiceProcess
          title="Set Up Your Emergency Line"
          subtitle="Be ready for any call, any time"
          steps={steps}
        />
        <ServiceFAQ
          title="Emergency Services FAQs"
          subtitle="Questions from HVAC, plumbing, and restoration contractors"
          faqs={faqs}
        />
        <ServiceCTA
          title="Ready for True 24/7 Coverage?"
          subtitle="Join contractors who never miss an emergency call"
          ctaText="Start Your Coverage"
          ctaLink="/get-started?industry=emergency-services"
        />
      </main>
      <Footer />
    </div>
  );
};

export default EmergencyServices;
