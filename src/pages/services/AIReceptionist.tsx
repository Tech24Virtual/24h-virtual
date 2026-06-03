import { Bot, Zap, TrendingUp, Clock, DollarSign, Headphones } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ServiceHero } from "@/components/services/ServiceHero";
import { ServiceFeatureGrid } from "@/components/services/ServiceFeatureGrid";
import { ServicePricingCards } from "@/components/services/ServicePricingCards";
import { ServiceProcess } from "@/components/services/ServiceProcess";
import { ServiceFAQ } from "@/components/services/ServiceFAQ";
import { ServiceCTA } from "@/components/services/ServiceCTA";
import { SEO, createServiceSchema, createBreadcrumbSchema } from "@/components/SEO";
import aiReceptionistHero from "@/assets/heroes/ai-receptionist.png";

const features = [
  {
    icon: Zap,
    title: "Efficiency",
    description: "Instant response times with zero wait. Handle multiple calls simultaneously without ever putting a caller on hold.",
  },
  {
    icon: TrendingUp,
    title: "Scalability",
    description: "Easily scale from 10 to 10,000 calls per day. Our AI grows with your business needs without additional staffing.",
  },
  {
    icon: Bot,
    title: "Expertise",
    description: "Advanced natural language processing understands caller intent and provides accurate, helpful responses every time.",
  },
  {
    icon: DollarSign,
    title: "Cost Savings",
    description: "Reduce receptionist costs by up to 70% while maintaining 24/7 coverage. No overtime, no sick days, no turnover.",
  },
  {
    icon: Clock,
    title: "24/7 Availability",
    description: "Never miss a call, day or night, weekends or holidays. Your AI receptionist is always ready to help.",
  },
  {
    icon: Headphones,
    title: "Seamless Handoff",
    description: "Complex calls are smoothly transferred to human agents when needed, with full context preserved.",
  },
];

const plans = [
  {
    name: "50 Minutes",
    price: "$49",
    description: "Perfect for small businesses",
    features: [
      "50 minutes/month",
      "24/7 coverage",
      "$0.75/min overage",
      "AI-powered answering",
      "Message taking",
      "Email notifications",
    ],
  },
  {
    name: "250 Minutes",
    price: "$199",
    description: "Most popular for growing businesses",
    features: [
      "250 minutes/month",
      "24/7 coverage",
      "$0.75/min overage",
      "AI-powered answering",
      "Appointment scheduling",
      "Email notifications",
      "Call recording",
    ],
    popular: true,
  },
  {
    name: "1000 Minutes",
    price: "$599",
    description: "For high-volume businesses",
    features: [
      "1000 minutes/month",
      "24/7 coverage",
      "$0.75/min overage",
      "AI-powered answering",
      "CRM integration",
      "Custom AI training",
      "Analytics dashboard",
      "Priority support",
    ],
  },
];

const steps = [
  {
    number: 1,
    title: "Quick Setup",
    description: "Tell us about your business, call flow preferences, and common caller questions. Takes just 5 minutes.",
  },
  {
    number: 2,
    title: "AI Training",
    description: "We train your AI receptionist on your specific scripts, FAQs, and business protocols.",
  },
  {
    number: 3,
    title: "Go Live",
    description: "Start forwarding calls to your new AI receptionist. Monitor performance and refine as needed.",
  },
];

const faqs = [
  {
    question: "How natural does the AI sound?",
    answer: "Our AI uses advanced text-to-speech technology that sounds remarkably human. Callers often can't tell the difference. We continuously improve voice quality and conversation flow based on real interactions.",
  },
  {
    question: "Can the AI handle complex questions?",
    answer: "Yes! The AI is trained on your specific business information and can handle most routine inquiries. For complex questions outside its training, it smoothly transfers to a human agent or takes a detailed message.",
  },
  {
    question: "What happens if the AI can't help a caller?",
    answer: "The AI recognizes when a caller needs human assistance and offers to transfer the call or take a message. You control the escalation rules based on topics, caller requests, or detected frustration.",
  },
  {
    question: "How quickly can I get started?",
    answer: "Most businesses are live within 24-48 hours. Basic setup takes about 5 minutes, and our team handles the AI training and testing before you go live.",
  },
];

const AIReceptionist = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="AI Receptionist - Answer Every Call Instantly 24/7"
        description="Never put a caller on hold. Never miss a 3am lead. AI-powered receptionist that sounds natural and handles calls like your best employee."
        canonical="/solutions/ai-receptionist"
        jsonLd={[
          createServiceSchema("AI Receptionist", "24/7 AI-powered call answering that never sleeps", "/solutions/ai-receptionist"),
          createBreadcrumbSchema([{ name: "Home", url: "/" }, { name: "Solutions", url: "/solutions" }, { name: "AI Receptionist", url: "/solutions/ai-receptionist" }])
        ]}
      />
      <Navigation />
      <main>
        <ServiceHero
          title="Answer Every Call Instantly, 24/7"
          tagline="AI RECEPTIONIST"
          description="Never put a caller on hold. Never miss a 3am lead. Never pay overtime. AI that sounds natural and handles calls like your best employee."
          icon={Bot}
          heroImage={aiReceptionistHero}
          ctaText="Start with AI Receptionist"
          ctaLink="/get-started?service=ai-receptionist"
          serviceSlug="ai-receptionist"
        />
        <ServiceFeatureGrid
          title="What You Get"
          subtitle="Leverage AI technology to handle calls efficiently while maintaining a professional, helpful experience for every caller"
          features={features}
        />
        <ServicePricingCards
          title={{ primary: "Simple", highlight: "Transparent Pricing" }}
          subtitle="Choose the plan that matches your call volume"
          plans={plans}
          serviceSlug="ai-receptionist"
        />
        <ServiceProcess
          title="Get Started in 3 Easy Steps"
          subtitle="We make setup simple so you can focus on your business"
          steps={steps}
        />
        <ServiceFAQ
          title="AI Receptionist FAQs"
          subtitle="Common questions about our AI-powered solution"
          faqs={faqs}
        />
        <ServiceCTA
          title={{ primary: "Ready to Answer Every Call", highlight: "Instantly?" }}
          subtitle="Join hundreds of businesses using AI to never miss a call"
          ctaText="Get Started with AI"
          ctaLink="/get-started?service=ai-receptionist"
        />
      </main>
      <Footer />
    </div>
  );
};

export default AIReceptionist;
