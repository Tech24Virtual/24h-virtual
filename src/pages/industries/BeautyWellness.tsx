import { Sparkles, Calendar, Heart, Moon, Globe, Shield } from "lucide-react";
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
    icon: Calendar,
    title: "Appointment Management",
    description: "Never miss a booking. Our receptionists handle scheduling, rescheduling, and confirmations seamlessly across all your services.",
  },
  {
    icon: Heart,
    title: "Client Retention",
    description: "Build lasting relationships with personalized service. We remember client preferences and follow up on their satisfaction.",
  },
  {
    icon: Sparkles,
    title: "Product Inquiries",
    description: "Answer questions about treatments, products, and pricing with accurate, up-to-date information about your offerings.",
  },
  {
    icon: Moon,
    title: "After-Hours Booking",
    description: "Capture bookings 24/7. Clients can schedule appointments anytime, even when your salon or spa is closed.",
  },
  {
    icon: Globe,
    title: "Trilingual Support",
    description: "Serve your diverse clientele with English, Spanish, and French speaking receptionists. Spanish and French available during business hours.",
  },
  {
    icon: Shield,
    title: "HIPAA Compliant",
    description: "For medical spas and wellness centers, we ensure all client information is handled with the highest privacy standards.",
  },
];

const plans = [
  {
    name: "50 Minutes",
    price: "$149",
    description: "Perfect for independent stylists",
    features: [
      "50 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "Appointment scheduling",
      "Message taking",
      "Email notifications",
    ],
  },
  {
    name: "250 Minutes",
    price: "$499",
    description: "Ideal for growing salons",
    features: [
      "250 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "Appointment scheduling",
      "Cancellation management",
      "Email notifications",
      "Service inquiries",
    ],
    popular: true,
  },
  {
    name: "1000 Minutes",
    price: "$1,499",
    description: "For busy spas & wellness centers",
    features: [
      "1000 minutes/month",
      "14hr + afterhours coverage",
      "$2.00/min overage",
      "Multi-location support",
      "Waitlist management",
      "Client preferences tracking",
      "Analytics dashboard",
    ],
  },
];

const steps = [
  {
    number: 1,
    title: "Share Your Services",
    description: "Tell us about your treatments, pricing, and booking policies. We'll learn your business inside and out.",
  },
  {
    number: 2,
    title: "Connect Your Calendar",
    description: "We integrate with your existing scheduling software to book appointments in real-time.",
  },
  {
    number: 3,
    title: "Start Booking",
    description: "Your calls are answered professionally, and your calendar fills up without you lifting a finger.",
  },
];

const faqs = [
  {
    question: "Can you handle appointments for multiple stylists?",
    answer: "Absolutely! We manage individual calendars for each team member, ensuring appointments are booked with the right person based on service type and availability.",
  },
  {
    question: "What scheduling software do you integrate with?",
    answer: "We work with popular platforms like Vagaro, Booker, Mindbody, Schedulicity, and many others. If you use a different system, we can likely integrate with it too.",
  },
  {
    question: "How do you handle last-minute cancellations?",
    answer: "We can immediately reach out to clients on your waitlist to fill the opening, minimizing lost revenue from no-shows and cancellations.",
  },
  {
    question: "Do you handle product sales inquiries?",
    answer: "Yes! We can provide information about the products you carry, answer questions, and even take orders over the phone if you'd like.",
  },
];

const BeautyWellness = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Virtual Receptionist for Salons & Spas"
        description="Keep your chairs full and clients happy. 24/7 appointment booking, cancellation management, and after-hours scheduling for beauty and wellness businesses."
        canonical="/industries/beauty-wellness"
        jsonLd={[
          createServiceSchema("Virtual Receptionist for Beauty & Wellness", "Appointment scheduling, cancellation management, and after-hours booking for salons, spas, and wellness centers.", "/industries/beauty-wellness"),
          createFAQSchema(faqs),
          createBreadcrumbSchema([{ name: "Home", url: "/" }, { name: "Industries", url: "/industries" }, { name: "Beauty & Wellness", url: "/industries/beauty-wellness" }])
        ]}
      />
      <Navigation />
      <main>
        <ServiceHero
          title={{ primary: "Keep Your Chairs Full", highlight: "Your Clients Happy" }}
          tagline="BEAUTY & WELLNESS"
          description="Capture every booking, reduce no-shows, and fill cancellations instantly. Professional call handling that keeps your business thriving."
          icon={Sparkles}
          ctaText="Get Started Today"
          ctaLink="/get-started?industry=beauty-wellness"
        />
        <ServiceFeatureGrid
          title="Designed for Beauty Professionals"
          subtitle="From solo stylists to multi-location spas, we understand the unique needs of the beauty and wellness industry"
          features={features}
        />
        <ServicePricingCards
          title="Affordable Plans for Every Salon"
          subtitle="Choose the plan that fits your business size"
          plans={plans}
          serviceSlug="beauty-wellness"
        />
        <ServiceProcess
          title="Getting Started is Easy"
          subtitle="Be up and running in days, not weeks"
          steps={steps}
        />
        <ServiceFAQ
          title="Beauty & Wellness FAQs"
          subtitle="Common questions from salon and spa owners"
          faqs={faqs}
        />
        <ServiceCTA
          title="Ready to Fill Your Appointment Book?"
          subtitle="Join hundreds of beauty professionals who never miss a booking"
          ctaText="Start Booking More Clients"
          ctaLink="/get-started?industry=beauty-wellness"
        />
      </main>
      <Footer />
    </div>
  );
};

export default BeautyWellness;
