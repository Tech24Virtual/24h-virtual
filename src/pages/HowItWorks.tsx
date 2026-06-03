import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, FileText, Target, Calendar, MessageSquare, CreditCard, Rocket, Phone, PhoneIncoming, PhoneForwarded, Headphones, CheckCircle, Bot, Users, Zap, Wand2, ClipboardList, FlaskConical } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ServiceCTA } from "@/components/services/ServiceCTA";
import { SEO, createHowToSchema, createBreadcrumbSchema } from "@/components/SEO";

const steps = [
  { label: "Business Info", description: "Tell us about your company, industry, and call volume", icon: FileText },
  { label: "Service Selection", description: "Choose from AI, Live, or Hybrid receptionist options", icon: Target },
  { label: "Plan Selection", description: "Pick the minute tier that fits your needs", icon: CreditCard },
  { label: "Contact Details", description: "Provide your business contact information", icon: Phone },
  { label: "Customization", description: "Set up scripts, greetings, and call handling rules", icon: MessageSquare },
  { label: "Confirmation", description: "Review and launch your service", icon: Rocket },
];

const callFlow = [
  { icon: PhoneIncoming, title: "Call Received", description: "Customer calls your business number" },
  { icon: PhoneForwarded, title: "Forwarded to 24H Virtual", description: "Call routes to our system via call forwarding" },
  { icon: Headphones, title: "Professional Greeting", description: "Our receptionist answers in your business name" },
  { icon: CheckCircle, title: "Call Handled", description: "Message taken, appointment scheduled, or call transferred" },
];

const serviceComparison = [
  {
    title: "AI Receptionist",
    icon: Bot,
    features: ["24/7/365 instant answering", "Lowest cost per minute", "Handles unlimited concurrent calls", "Best for high-volume, routine calls"],
    best: "Best for: After-hours, overflow, simple inquiries",
  },
  {
    title: "Live Receptionist",
    icon: Users,
    features: ["Human touch and empathy", "Complex problem solving", "Industry-specific training", "Personalized caller experience"],
    best: "Best for: High-value calls, complex situations",
  },
  {
    title: "Hybrid Receptionist",
    icon: Zap,
    features: ["AI handles routine calls", "Humans handle complex calls", "Seamless handoff between both", "Optimized cost & quality"],
    best: "Best for: Businesses wanting both efficiency and personal touch",
  },
];

const integrations = [
  { title: "Call Forwarding", description: "Simply forward your existing number to our dedicated line" },
  { title: "VoIP Integration", description: "Connect through RingCentral, Vonage, 8x8, and more" },
  { title: "Softphone", description: "Use our app for direct integration with your phone system" },
  { title: "Toll-Free Numbers", description: "We provide local or toll-free numbers if needed" },
];

const deepSteps = [
  {
    id: "blueprint",
    eyebrow: "Step 2",
    title: "Build Your Blueprint",
    icon: ClipboardList,
    description:
      "After your free consultation we draft your custom Call Blueprint, the single source of truth that runs every call. It captures your brand voice, business hours, services, pricing rules, FAQs, escalation paths, and edge cases. We map exactly how each type of caller should be handled, from new lead to existing customer to emergency. You review the blueprint, suggest changes, and approve in under 48 hours. Nothing goes live until you sign off.",
    bullets: [
      "Custom call scripts and greeting written to your brand",
      "Decision trees for booking, qualifying, transferring, and messaging",
      "Industry specific compliance language baked in",
      "Approval and revision workflow built into your dashboard",
    ],
  },
  {
    id: "encode",
    eyebrow: "Step 3",
    title: "Encode and Test",
    icon: FlaskConical,
    description:
      "We encode your blueprint into our AI plus train your dedicated human agents on every detail. Then we run rigorous test calls covering happy paths, edge cases, escalations, and after hours scenarios. You listen to test recordings and request adjustments before launch. We tune voice, pacing, and decision logic until it feels exactly like your best receptionist on their best day.",
    bullets: [
      "AI voice and decision engine trained on your blueprint",
      "Human agents complete vertical specific training modules",
      "End to end test calls with recordings shared for your approval",
      "Quality assurance review before any live traffic is routed",
    ],
  },
  {
    id: "golive",
    eyebrow: "Step 4",
    title: "Go Live in Days",
    icon: Rocket,
    description:
      "Launch is simple. You forward your existing number to a dedicated 24H Virtual line, or we provide a new local or toll free number. Calls start flowing within minutes. Your dashboard lights up with live call data, recordings, and bookings. Your dedicated success manager monitors the first week closely and tunes anything that needs adjusting.",
    bullets: [
      "Number porting or call forwarding setup in under 30 minutes",
      "Live launch dashboard with real time monitoring",
      "Dedicated success manager for the first 14 days",
      "Continuous tuning included in every plan, no extra cost",
    ],
  },
];

export default function HowItWorks() {
  const location = useLocation();

  // Smooth scroll to anchor when arriving with a hash
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    }
  }, [location.hash]);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Be Answering Calls in 24 Hours"
        description="No IT team needed. No complicated setup. Just professional call handling that starts fast and runs smoothly. 6 simple steps to never missing a call."
        canonical="/how-it-works"
        jsonLd={[
          createHowToSchema(
            "How to Set Up a Virtual Receptionist with 24H Virtual",
            "6 simple steps to start answering calls professionally within 24 hours. No IT team needed.",
            [
              { name: "Share Your Business Info", text: "Tell us about your company, industry, and call volume." },
              { name: "Select Your Service", text: "Choose from AI, Live, or Hybrid receptionist options." },
              { name: "Pick Your Plan", text: "Select the minute tier that fits your needs." },
              { name: "Provide Contact Details", text: "Share your business contact information." },
              { name: "Customize Your Setup", text: "Set up scripts, greetings, and call handling rules." },
              { name: "Review and Launch", text: "Confirm your setup and go live within 24 hours." },
            ],
            "P1D"
          ),
          createBreadcrumbSchema([{ name: "Home", url: "/" }, { name: "How It Works", url: "/how-it-works" }])
        ]}
      />
      <Navigation />

      {/* Hero */}
      <section className="gradient-hero pt-32 pb-20">
        <div className="container-custom">
          <motion.div
            className="max-w-4xl mx-auto text-center space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-balance">Be Answering Calls Professionally Within 24 Hours</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              No IT team needed. No complicated setup. Just professional call handling 
              that starts fast and runs smoothly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button variant="cta" size="lg" asChild>
                <Link to="/get-started">
                  Start Your Setup
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/demo">Book Free Consultation</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 6-Step Process */}
      <section className="section-spacing bg-background">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="mb-4">6 Simple Steps to Never Missing a Call</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our guided wizard walks you through everything. Takes about 5 minutes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-bold text-primary">{index + 1}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <step.icon className="w-5 h-5 text-primary" />
                          <h3 className="text-lg font-semibold text-heading">{step.label}</h3>
                        </div>
                        <p className="text-muted-foreground text-sm">{step.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Deep Step Sections (anchor targets from mega menu) */}
      {deepSteps.map((s, idx) => {
        const Icon = s.icon;
        const isAlt = idx % 2 === 1;
        return (
          <section
            key={s.id}
            id={s.id}
            className={`section-spacing scroll-mt-24 ${isAlt ? "bg-accent/30" : "bg-background"}`}
          >
            <div className="container-custom">
              <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center max-w-6xl mx-auto">
                <motion.div
                  className={`lg:col-span-7 space-y-6 ${isAlt ? "lg:order-2" : ""}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                >
                  <p className="text-sm font-semibold text-primary uppercase tracking-wider">{s.eyebrow}</p>
                  <h2>{s.title}</h2>
                  <p className="text-lg text-muted-foreground leading-relaxed">{s.description}</p>
                  <ul className="space-y-3 pt-2">
                    {s.bullets.map((b, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{b}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-4">
                    <Button variant="cta" size="lg" asChild>
                      <Link to="/get-started">
                        Book FREE Consultation
                        <ArrowRight className="ml-2 w-5 h-5" />
                      </Link>
                    </Button>
                  </div>
                </motion.div>
                <motion.div
                  className={`lg:col-span-5 ${isAlt ? "lg:order-1" : ""}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="relative aspect-square max-w-sm mx-auto rounded-3xl bg-gradient-to-br from-primary/10 via-secondary/10 to-primary/5 flex items-center justify-center shadow-card">
                    <div className="absolute inset-0 rounded-3xl bg-grid-pattern opacity-10" />
                    <div className="relative w-32 h-32 rounded-3xl bg-primary text-primary-foreground flex items-center justify-center shadow-elevated">
                      <Icon className="w-16 h-16" />
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
        );
      })}

      {/* Call Flow */}
      <section className="section-spacing bg-accent/30">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="mb-4">Every Caller Gets a Professional Experience</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every call follows a seamless process designed to give your callers the best experience.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-4 gap-6">
              {callFlow.map((item, index) => (
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
                        <item.icon className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="font-semibold text-heading">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </CardContent>
                  </Card>
                  {index < callFlow.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                      <ArrowRight className="w-6 h-6 text-primary" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Service Comparison */}
      <section className="section-spacing bg-background">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="mb-4">Find Your Perfect Fit</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              AI, Live, or Hybrid: find the perfect fit for your business needs.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {serviceComparison.map((service, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader className="text-center pb-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <service.icon className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{service.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {service.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-sm font-medium text-primary pt-4 border-t">{service.best}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Integration Options */}
      <section className="section-spacing bg-accent/30">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="mb-4">Connect in Minutes Not Days</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Connect your existing phone system in minutes. No technical expertise required.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {integrations.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className="h-full text-center hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 space-y-3">
                    <Phone className="w-8 h-8 text-primary mx-auto" />
                    <h3 className="font-semibold text-heading">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <ServiceCTA
        title="Ready to Stop Missing Calls?"
        subtitle="Most businesses go live within 24 hours"
        ctaText="Start Your 6-Step Setup"
        ctaLink="/get-started"
      />

      <Footer />
    </div>
  );
}
