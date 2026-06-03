import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowRight, 
  Bot, 
  Users, 
  Zap, 
  Clock, 
  DollarSign, 
  Shield, 
  Phone,
  CheckCircle,
  PhoneIncoming,
  Route,
  Headphones
} from "lucide-react";
import { motion } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEO, createBreadcrumbSchema } from "@/components/SEO";
import { HybridPlanSelector } from "@/components/hybrid/HybridPlanSelector";
import { HybridPricingCards } from "@/components/hybrid/HybridPricingCards";
import { ServiceCTA } from "@/components/services/ServiceCTA";
import { ServiceFAQ } from "@/components/services/ServiceFAQ";
import { getHybridPlanById, type HybridPlanType } from "@/lib/hybridPricingData";

const features = [
  {
    icon: Zap,
    title: "Instant AI Response",
    description: "Routine calls answered immediately, 24/7, with zero wait time.",
  },
  {
    icon: Users,
    title: "Human Expertise",
    description: "Complex conversations handled by trained professionals who understand nuance.",
  },
  {
    icon: Route,
    title: "Smart Routing",
    description: "Intelligent call routing based on caller intent and conversation complexity.",
  },
  {
    icon: DollarSign,
    title: "Cost Optimized",
    description: "Pay AI rates for routine calls, human rates only when needed.",
  },
  {
    icon: Clock,
    title: "24/7 Coverage",
    description: "AI provides round-the-clock availability with human backup during peak hours.",
  },
  {
    icon: Shield,
    title: "Seamless Handoff",
    description: "Callers never know when they're transferred. Consistent experience throughout.",
  },
];

const callFlowSteps = [
  {
    icon: PhoneIncoming,
    title: "Call Received",
    description: "Customer calls your business number",
  },
  {
    icon: Bot,
    title: "AI Answers",
    description: "AI receptionist answers instantly, gathers initial info",
  },
  {
    icon: Route,
    title: "Smart Analysis",
    description: "System determines: routine or complex?",
  },
  {
    icon: Headphones,
    title: "Right Handler",
    description: "AI resolves routine calls; humans handle complex ones",
  },
];

const useCases = [
  {
    industry: "Medical Practices",
    routine: "Appointment confirmations, office hours, directions",
    complex: "Symptom triage, urgent care coordination, insurance questions",
  },
  {
    industry: "Legal Services",
    routine: "Office hours, attorney availability, general info",
    complex: "Case intake, confidential consultations, urgent matters",
  },
  {
    industry: "Home Services",
    routine: "Service area questions, basic pricing, hours",
    complex: "Emergency dispatch, detailed estimates, complaints",
  },
];

const faqs = [
  {
    question: "How does the hybrid system decide which calls go to AI vs humans?",
    answer: "Our smart routing analyzes caller intent, conversation complexity, and your custom rules. Simple inquiries like office hours, appointment confirmations, and basic questions go to AI. Complex matters like complaints, emergencies, or sales opportunities route to human receptionists.",
  },
  {
    question: "Can callers request to speak with a human?",
    answer: "Absolutely! Callers can say 'speak to a person' at any time during an AI interaction and will be immediately transferred to a human receptionist. The system also automatically escalates when it detects frustration or confusion.",
  },
  {
    question: "How are minutes tracked in hybrid plans?",
    answer: "You have two separate minute pools: AI minutes and human minutes. Each is tracked independently. AI handles routine calls from the AI pool; human receptionists use the human pool. You can see real-time usage in your dashboard.",
  },
  {
    question: "What happens if I run out of one type of minutes?",
    answer: "If you exhaust your AI minutes, calls continue to be answered by AI at the overage rate ($0.75/min). Same for human minutes at the respective service rate. You're never cut off, and service continues uninterrupted.",
  },
  {
    question: "Can I customize what AI handles vs what goes to humans?",
    answer: "Yes! You define the routing rules. Want all new callers to go to humans? Done. Prefer AI for after-hours only? Easy. Our team helps you set up rules that match your business needs.",
  },
];

export default function HybridReceptionist() {
  const [activePlan, setActivePlan] = useState<HybridPlanType>("pro");
  const currentPlan = getHybridPlanById(activePlan);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Hybrid Receptionist - AI Speed + Human Expertise"
        description="Combine AI efficiency with human warmth. Routine calls answered instantly by AI while trained receptionists handle complex conversations. Starting at $99/mo."
        canonical="/solutions/hybrid-receptionist"
        jsonLd={createBreadcrumbSchema([{ name: "Home", url: "/" }, { name: "Solutions", url: "/solutions" }, { name: "Hybrid Receptionist", url: "/solutions/hybrid-receptionist" }])}
      />
      <Navigation />

      {/* Hero Section */}
      <section className="gradient-hero pt-32 pb-20">
        <div className="container-custom">
          <motion.div
            className="max-w-4xl mx-auto text-center space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="secondary" className="text-sm px-4 py-1">
              <Zap className="w-3 h-3 mr-1" />
              BEST OF BOTH WORLDS
            </Badge>
            <h1 className="text-balance">
              AI Speed + Human Expertise = Perfect Balance
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Let AI handle routine calls instantly while your dedicated receptionists 
              focus on complex conversations. The smartest way to never miss a call.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button variant="cta" size="lg" asChild>
                <Link to="/get-started?service=hybrid-receptionist">
                  Get Started
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/pricing?service=hybrid-receptionist">View Pricing</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Plans starting at <span className="font-semibold text-primary">$99/mo</span>
            </p>
          </motion.div>
        </div>
      </section>

      {/* How It Works - Call Flow */}
      <section className="section-spacing bg-accent/30">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="mb-4">How Hybrid Receptionist Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Smart routing ensures every caller gets the right experience
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-4 gap-6">
              {callFlowSteps.map((step, index) => (
                <motion.div
                  key={index}
                  className="relative"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Card className="text-center h-full">
                    <CardContent className="p-6 space-y-4">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                        <step.icon className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="font-semibold text-heading">{step.title}</h3>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </CardContent>
                  </Card>
                  {index < callFlowSteps.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                      <ArrowRight className="w-6 h-6 text-primary" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">~70%</p>
              <p className="text-sm text-muted-foreground">Calls handled by AI</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">~30%</p>
              <p className="text-sm text-muted-foreground">Escalated to humans</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">0 sec</p>
              <p className="text-sm text-muted-foreground">AI wait time</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">24/7</p>
              <p className="text-sm text-muted-foreground">Coverage</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="section-spacing bg-background">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="mb-4">Why Choose Hybrid?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get the benefits of both AI and human receptionists without the drawbacks
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-heading">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="section-spacing bg-accent/30">
        <div className="container-custom">
          <div className="text-center mb-8">
            <h2 className="mb-4">Choose Your Hybrid Plan</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Select the human service level that fits your business needs
            </p>
          </div>

          <div className="space-y-8">
            <HybridPlanSelector activePlan={activePlan} onPlanChange={setActivePlan} />
            
            <motion.div
              key={activePlan}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h3 className="text-xl font-semibold text-heading mb-1">
                {currentPlan.name}
              </h3>
              <p className="text-muted-foreground">
                AI Receptionist + {currentPlan.humanService}
              </p>
            </motion.div>

            <HybridPricingCards plan={currentPlan} />
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="section-spacing bg-background">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="mb-4">Hybrid in Action</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See how different industries leverage AI + Human routing
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {useCases.map((useCase, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className="h-full">
                  <CardContent className="p-6 space-y-4">
                    <h3 className="font-semibold text-heading text-lg">{useCase.industry}</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Bot className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">AI Handles:</span>
                        </div>
                        <p className="text-sm text-muted-foreground pl-6">{useCase.routine}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="w-4 h-4 text-secondary-foreground" />
                          <span className="text-sm font-medium">Humans Handle:</span>
                        </div>
                        <p className="text-sm text-muted-foreground pl-6">{useCase.complex}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Steps */}
      <section className="section-spacing bg-accent/30">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="mb-4">Get Started in 3 Steps</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Go live with hybrid receptionist service in as little as 24 hours
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: 1, title: "Choose Your Plan", description: "Select Lite, Pro, or Executive based on your needs" },
              { step: 2, title: "Set Your Rules", description: "Define what AI handles vs what goes to humans" },
              { step: 3, title: "Go Live", description: "Forward your calls and start capturing every opportunity" },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                  {item.step}
                </div>
                <h3 className="font-semibold text-heading mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="section-spacing bg-background">
        <div className="container-custom">
          <ServiceFAQ 
            title="Hybrid Receptionist FAQs"
            faqs={faqs}
          />
        </div>
      </section>

      {/* CTA */}
      <ServiceCTA
        title="Ready for the Best of Both Worlds?"
        subtitle="Start with AI + Human receptionist service today"
        ctaText="Get Started"
        ctaLink="/get-started?service=hybrid-receptionist"
      />

      <Footer />
    </div>
  );
}
