import { MessageCircle, Bell, Shield, Zap, Users, HeartHandshake } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ServiceHero } from "@/components/services/ServiceHero";
import { ServiceFeatureGrid } from "@/components/services/ServiceFeatureGrid";
import { ServicePricingCards } from "@/components/services/ServicePricingCards";
import { ServiceProcess } from "@/components/services/ServiceProcess";
import { ServiceFAQ } from "@/components/services/ServiceFAQ";
import { ServiceCTA } from "@/components/services/ServiceCTA";
import { SEO, createServiceSchema, createBreadcrumbSchema } from "@/components/SEO";
import messageAssistantHero from "@/assets/heroes/message-assistant.png";

const features = [
  {
    icon: MessageCircle,
    title: "Prompt Message Taking",
    description: "Every detail captured accurately. Our receptionists are trained to ask the right questions and document everything clearly.",
  },
  {
    icon: Shield,
    title: "Secure Message Delivery",
    description: "Messages delivered securely via your preferred channel, whether that's email or direct integration with your systems.",
  },
  {
    icon: Bell,
    title: "Custom Delivery Channels",
    description: "Route messages to the right person based on topic, urgency, or caller type. Set up custom rules that fit your workflow.",
  },
  {
    icon: Zap,
    title: "Efficiency",
    description: "Never check voicemail again. Get messages instantly with all the information you need to respond effectively.",
  },
  {
    icon: Users,
    title: "Personal Support",
    description: "Real people taking your messages, not robots. Your callers get the professional experience they deserve.",
  },
  {
    icon: HeartHandshake,
    title: "Enhanced Customer Experience",
    description: "Callers appreciate speaking to a live person. It builds trust and shows you care about their time.",
  },
];

const plans = [
  {
    name: "50 Minutes",
    price: "$89",
    description: "Essential message taking",
    features: [
      "50 minutes/month",
      "14-hour daily coverage",
      "$1.75/min overage",
      "Max 5 details from caller",
      "Email delivery",
      "Basic caller info capture",
    ],
  },
  {
    name: "250 Minutes",
    price: "$349",
    description: "Most popular choice",
    features: [
      "250 minutes/month",
      "14-hour daily coverage",
      "$1.75/min overage",
      "Max 5 details from caller",
      "Email delivery",
      "Custom intake questions",
      "Priority flagging",
    ],
    popular: true,
  },
  {
    name: "1000 Minutes",
    price: "$1,249",
    description: "High-volume businesses",
    features: [
      "1000 minutes/month",
      "14-hour daily coverage",
      "$1.75/min overage",
      "Max 5 details from caller",
      "Multi-channel delivery",
      "Advanced routing rules",
      "Dedicated account manager",
    ],
  },
];

const steps = [
  {
    number: 1,
    title: "Define Your Script",
    description: "Tell us what information to capture and any specific questions to ask callers.",
  },
  {
    number: 2,
    title: "Set Up Delivery",
    description: "Choose how and where you want messages delivered: email, app, or CRM.",
  },
  {
    number: 3,
    title: "Start Receiving",
    description: "Forward your calls and start receiving accurate, detailed messages instantly.",
  },
];

const faqs = [
  {
    question: "What information do you capture?",
    answer: "We capture caller name, phone number, company (if applicable), reason for calling, and any custom fields you specify. You can create intake forms tailored to your business needs.",
  },
  {
    question: "How quickly are messages delivered?",
    answer: "Messages are delivered immediately after the call ends. Professional and Enterprise plans include instant push notifications to your phone.",
  },
  {
    question: "Can I customize the questions asked?",
    answer: "Absolutely! You can specify exactly what questions to ask and in what order. We can also add conditional questions based on caller responses.",
  },
  {
    question: "Do you integrate with my CRM?",
    answer: "Yes, we integrate with popular CRMs including Salesforce, HubSpot, Zoho, and many others. Enterprise plans include custom integration support.",
  },
];

const MessageAssistant = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Message Assistant - Never Miss a Message Again"
        description="Every caller gets a professional response, every message lands in your inbox. Stop losing leads to voicemail."
        canonical="/solutions/message-assistant"
        jsonLd={[
          createServiceSchema("Message Assistant", "Professional message taking and delivery", "/solutions/message-assistant"),
          createBreadcrumbSchema([{ name: "Home", url: "/" }, { name: "Solutions", url: "/solutions" }, { name: "Message Assistant", url: "/solutions/message-assistant" }])
        ]}
      />
      <Navigation />
      <main>
        <ServiceHero
          title="Never Miss a Message Again"
          tagline="MESSAGE ASSISTANT"
          description="Every caller gets a professional response, every message lands in your inbox. Stop losing leads to voicemail and start capturing every opportunity."
          icon={MessageCircle}
          heroImage={messageAssistantHero}
          ctaText="Start with Message Assistant"
          ctaLink="/get-started?service=message-assistant"
          serviceSlug="message-assistant"
        />
        <ServiceFeatureGrid
          title="How We Help Your Business"
          subtitle="Focus on your work while we capture every message with precision and deliver it exactly how you want"
          features={features}
        />
        <ServicePricingCards
          title={{ primary: "Simple", highlight: "Transparent Pricing" }}
          subtitle="Plans designed for every message volume"
          plans={plans}
          serviceSlug="message-assistant"
        />
        <ServiceProcess
          title="Get Started in 3 Easy Steps"
          subtitle="Quick setup means you start receiving messages faster"
          steps={steps}
        />
        <ServiceFAQ
          title="Message Assistant FAQs"
          subtitle="Common questions about our message taking service"
          faqs={faqs}
        />
        <ServiceCTA
          title="Ready to Capture Every Message?"
          subtitle="Professional message taking that keeps you informed"
          ctaText="Get Started Now"
          ctaLink="/get-started?service=message-assistant"
        />
      </main>
      <Footer />
    </div>
  );
};

export default MessageAssistant;
