import { useState } from "react";
import { Link } from "react-router-dom";
import { Bot, MessageCircle, Headphones, Briefcase, Users, Zap, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ComingSoonBadge } from "@/components/ComingSoonBadge";
import { useGatedServices } from "@/hooks/useLaunchFlags";

const services = [
  {
    id: "virtual-receptionist",
    name: "Virtual Receptionist",
    icon: Headphones,
    description: "Live trilingual receptionists who answer, screen, qualify, and warm-transfer the right calls.",
    benefits: [
      "Professional call answering",
      "Appointment setting and scheduling",
      "Trilingual (English 24/7, Spanish and French in business hours)",
      "HIPAA compliant handling",
    ],
    coverage: "Business hours or 24/7",
    useCase: "Client-facing businesses, professional services",
    priceRange: "From $149/mo",
    popular: true,
  },
  {
    id: "message-assistant",
    name: "Message Assistant",
    icon: MessageCircle,
    description: "Capture every caller. Clean message, accurate details, delivered to your inbox.",
    benefits: [
      "Prompt and accurate message taking",
      "Secure message delivery via email",
      "Custom delivery channels",
      "Best for overflow and message-only lines",
    ],
    coverage: "24/7/365",
    useCase: "Overflow handling, message-only lines",
    priceRange: "From $89/mo",
    popular: false,
  },
  {
    id: "virtual-secretary",
    name: "Virtual Secretary",
    icon: Briefcase,
    description: "Receptionist coverage plus admin work. Calendar, correspondence, and follow-ups handled.",
    benefits: [
      "Task prioritization and management",
      "Scheduling and calendar coordination",
      "Professional correspondence",
      "Receptionist coverage included",
    ],
    coverage: "Business hours or 24/7",
    useCase: "Executives, small business owners",
    priceRange: "From $199/mo",
    popular: false,
  },
  {
    id: "virtual-assistants",
    name: "Virtual Assistant",
    icon: Users,
    description: "A dedicated assistant or small team that learns your business inside out.",
    benefits: [
      "Dedicated capacity",
      "Email and calendar management",
      "Project coordination",
      "Onshore, nearshore, or offshore options",
    ],
    coverage: "Flexible hours",
    useCase: "Growing businesses, specialized tasks",
    priceRange: "From $1,899/mo",
    popular: false,
  },
  {
    id: "ai-receptionist",
    name: "AI Receptionist",
    icon: Bot,
    description: "Always-on AI call answering with zero wait times. Currently in waitlist.",
    benefits: [
      "Instant response with zero wait times",
      "Built on encoded scripts and FAQs",
      "Cost-effective scalability",
      "Pairs with human escalation",
    ],
    coverage: "24/7/365",
    useCase: "High-volume call handling, after-hours support",
    priceRange: "Launching Soon",
    popular: false,
  },
  {
    id: "hybrid-receptionist",
    name: "Hybrid Receptionist",
    icon: Zap,
    description: "AI handles routine calls, humans take complex ones. Currently in waitlist.",
    benefits: [
      "AI handles routine calls instantly",
      "Humans manage complex conversations",
      "Smart routing based on caller intent",
      "Cost-effective 24/7 coverage",
    ],
    coverage: "24/7/365",
    useCase: "Best balance of speed and personal touch",
    priceRange: "Launching Soon",
    popular: false,
  },
];

export function ServicesSection() {
  const [activeTab, setActiveTab] = useState("virtual-receptionist");
  const activeService = services.find(s => s.id === activeTab) || services[0];
  const { isGated } = useGatedServices();
  const activeGated = isGated(activeService.id);

  return (
    <section className="section-spacing bg-background">
      <div className="container-custom">
        {/* Section Header */}
        <motion.div 
          className="text-center max-w-3xl mx-auto mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="mb-4">Pick the level of call handling your business needs</h2>
          <p className="text-lg text-muted-foreground">
            Live human receptionists today, AI and Hybrid coverage launching soon. Same encoded scripts, same per-second billing, same client portal across every service.
          </p>
        </motion.div>

        {/* Modern Pill Tabs */}
        <div className="flex gap-2 mb-10 overflow-x-auto no-scrollbar px-4 -mx-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-center pb-2">
          {services.map((service) => {
            const gated = isGated(service.id);
            return (
              <button
                key={service.id}
                onClick={() => setActiveTab(service.id)}
                className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeTab === service.id
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "bg-accent/50 text-foreground hover:bg-accent hover:shadow-subtle"
                }`}
              >
                <service.icon className="w-4 h-4" />
                {service.name}
                {service.popular && !gated && (
                  <Badge className="ml-1 bg-secondary text-secondary-foreground text-[10px] px-1.5 py-0 rounded-full">
                    Popular
                  </Badge>
                )}
                {gated && <ComingSoonBadge className="ml-1" />}
              </button>
            );
          })}
        </div>

        {/* Content Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card className="glass-card border-white/30 shadow-elevated overflow-hidden">
              <CardContent className="p-0">
                <div className="grid lg:grid-cols-2">
                  {/* Left - Benefits */}
                  <div className="p-8 lg:p-10 space-y-6">
                    <div className="flex items-center gap-4">
                      <motion.div 
                        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <activeService.icon className="w-7 h-7" />
                      </motion.div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-semibold">{activeService.name}</h3>
                          {activeGated && <ComingSoonBadge label="Launching Soon" />}
                        </div>
                        <p className="text-muted-foreground">{activeService.description}</p>
                      </div>
                    </div>

                    <ul className="space-y-4">
                      {activeService.benefits.map((benefit, index) => (
                        <motion.li 
                          key={index} 
                          className="flex items-start gap-3"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-secondary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="w-2 h-2 rounded-full bg-primary" />
                          </div>
                          <span className="text-foreground">{benefit}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>

                  {/* Right - Specs */}
                  <div className="bg-gradient-to-br from-accent/30 to-background p-4 sm:p-8 lg:p-10 flex flex-col justify-center">
                    <Card className="bg-card/80 backdrop-blur-sm border-border/50 shadow-soft">
                      <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 pb-4 border-b border-border/50">
                          <span className="text-sm text-muted-foreground">Coverage</span>
                          <span className="font-semibold text-heading">{activeService.coverage}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 pb-4 border-b border-border/50">
                          <span className="text-sm text-muted-foreground">Best for</span>
                          <span className="font-medium text-heading sm:text-right text-sm">
                            {activeService.useCase}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 pb-4 border-b border-border/50">
                          <span className="text-sm text-muted-foreground">{activeGated ? "Status" : "Starting price"}</span>
                          <span className="font-semibold text-primary text-lg">{activeService.priceRange}</span>
                        </div>
                        {activeGated ? (
                          <Button className="w-full rounded-full group" variant="cta" asChild>
                            <Link to={`/solutions/${activeService.id}`}>
                              Join Waitlist
                              <ArrowRight className="ml-2 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                            </Link>
                          </Button>
                        ) : (
                          <Button className="w-full rounded-full group" variant="cta" asChild>
                            <Link to="/get-started">
                              Book FREE Consultation
                              <ArrowRight className="ml-2 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                            </Link>
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* See All Link */}
        <div className="text-center mt-10">
          <Link
            to="/solutions"
            className="group inline-flex items-center gap-2 text-primary font-medium hover:text-primary/80 transition-colors"
          >
            Explore all solutions
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
