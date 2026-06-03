import { Headphones, Phone, Calendar, Globe, Shield, Clock, MessageSquare, Sparkles } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ServiceHero } from "@/components/services/ServiceHero";
import { ServiceFeatureGrid } from "@/components/services/ServiceFeatureGrid";
import { ServicePricingCards } from "@/components/services/ServicePricingCards";
import { ServiceProcess } from "@/components/services/ServiceProcess";
import { ServiceFAQ } from "@/components/services/ServiceFAQ";
import { ServiceCTA } from "@/components/services/ServiceCTA";
import { SEO, createServiceSchema, createBreadcrumbSchema } from "@/components/SEO";
import virtualReceptionistHero from "@/assets/heroes/virtual-receptionist.png";

const features = [
  {
    icon: Phone,
    title: "Professional Answering",
    description: "Live US-based receptionists answer in your business name, following your custom scripts and protocols.",
  },
  {
    icon: Calendar,
    title: "Appointment Setting",
    description: "Book appointments directly into your calendar. We integrate with Google Calendar, Outlook, Calendly, and more.",
  },
  {
    icon: MessageSquare,
    title: "Custom Message Taking",
    description: "Detailed message capture with custom intake questions. Get the information you need, every time.",
  },
  {
    icon: Clock,
    title: "24/7 Availability",
    description: "Never miss a call, whether it's nights, weekends, or holidays. Your callers always reach a friendly, professional voice.",
  },
  {
    icon: Globe,
    title: "Trilingual Options",
    description: "English, Spanish, and French fluency available. Spanish and French during business hours (8 AM - 8 PM ET).",
  },
  {
    icon: Shield,
    title: "HIPAA Compliant",
    description: "Secure, compliant call handling for medical practices. We're trained on healthcare privacy requirements.",
  },
];

const plans = [
  {
    name: "50 Minutes",
    price: "$149",
    description: "Small business essentials",
    features: [
      "50 minutes/month",
      "14-hour daily coverage",
      "$2.00/min overage",
      "Max 10 details from caller",
      "Professional answering",
      "Call transfer included",
    ],
  },
  {
    name: "250 Minutes",
    price: "$499",
    description: "Growing businesses",
    features: [
      "250 minutes/month",
      "14-hour daily coverage",
      "$2.00/min overage",
      "Max 10 details from caller",
      "Appointment scheduling",
      "Trilingual support",
      "Email notifications",
    ],
    popular: true,
  },
  {
    name: "1000 Minutes",
    price: "$1,499",
    description: "High-volume needs",
    features: [
      "1000 minutes/month",
      "14-hour daily coverage",
      "$2.00/min overage",
      "Max 10 details from caller",
      "CRM integration",
      "Advanced reporting",
      "Dedicated account manager",
    ],
  },
];

const steps = [
  {
    number: 1,
    title: "Share Your Requirements",
    description: "Tell us about your business, how you want calls handled, and any specific protocols to follow.",
  },
  {
    number: 2,
    title: "We Train Your Team",
    description: "Our receptionists learn your business inside and out, including your services, FAQs, and preferences.",
  },
  {
    number: 3,
    title: "Go Live",
    description: "Forward your calls and let our team represent your business professionally, 24/7.",
  },
];

const faqs = [
  {
    question: "Will callers know they're speaking to a virtual receptionist?",
    answer: "No. Our receptionists answer in your business name and are trained on your specific business. To callers, it's indistinguishable from an in-house receptionist.",
  },
  {
    question: "How do you handle appointment scheduling?",
    answer: "We integrate directly with your calendar system (Google Calendar, Outlook, Calendly, etc.) and book appointments based on your availability rules. You stay in control of your schedule.",
  },
  {
    question: "What happens if I'm available to take a call?",
    answer: "You can set up warm transfers where we screen calls and transfer them to you when appropriate. You can also update your availability in real-time through our app.",
  },
  {
    question: "Are your receptionists really trilingual?",
    answer: "Yes! Our receptionists are fluent in English, Spanish, and French. English is available 24/7, while Spanish and French support is available during business hours (8 AM - 8 PM ET). They can handle complex calls in any of these languages seamlessly.",
  },
];

const VirtualReceptionist = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Virtual Receptionist - Live Professional Call Answering"
        description="Give callers a friendly, professional voice that books appointments, answers questions, and represents your brand perfectly, 24/7."
        canonical="/solutions/virtual-receptionist"
        jsonLd={[
          createServiceSchema("Virtual Receptionist", "Live professional receptionists for your business", "/solutions/virtual-receptionist"),
          createBreadcrumbSchema([{ name: "Home", url: "/" }, { name: "Solutions", url: "/solutions" }, { name: "Virtual Receptionist", url: "/solutions/virtual-receptionist" }])
        ]}
      />
      <Navigation />
      <main>
        <ServiceHero
          title="Make Every Caller Your Most Loyal Customer"
          tagline="VIRTUAL RECEPTIONIST"
          description="Your callers deserve more than voicemail. Give them a friendly, professional voice that books appointments, answers questions, and represents your brand perfectly, 24/7."
          icon={Headphones}
          heroImage={virtualReceptionistHero}
          ctaText="Start with Virtual Receptionist"
          ctaLink="/get-started?service=virtual-receptionist"
          serviceSlug="virtual-receptionist"
        />
        <ServiceFeatureGrid
          title="How We Help Your Business"
          subtitle="Real people providing real connections with your callers, backed by technology for seamless service"
          features={features}
        />
        <ServicePricingCards
          title={{ primary: "Simple", highlight: "Transparent Pricing" }}
          subtitle="Choose the coverage level that fits your call volume"
          plans={plans}
          serviceSlug="virtual-receptionist"
        />
        <ServiceProcess
          title="Get Started in 3 Easy Steps"
          subtitle="We make onboarding simple and fast"
          steps={steps}
        />
        <ServiceFAQ
          title="Virtual Receptionist FAQs"
          subtitle="Common questions about our live receptionist service"
          faqs={faqs}
        />
        <ServiceCTA
          title="Ready for Professional 24/7 Coverage?"
          subtitle="Join hundreds of businesses who never miss a call"
          ctaText="Get Started Today"
          ctaLink="/get-started?service=virtual-receptionist"
        />
      </main>
      <Footer />
    </div>
  );
};

export default VirtualReceptionist;
