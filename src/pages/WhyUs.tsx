import { Link } from "react-router-dom";
import { ArrowRight, Cpu, Rocket, Building2, Bot, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const pillars = [
  {
    icon: Cpu,
    title: "Built for Operations, Not Just Scripts",
    description: "Most answering services hand agents a script and hope for the best. We take a fundamentally different approach.",
    details: [
      "Your business rules, escalation paths, and decision trees are encoded into our platform as structured flows—not just text on a screen.",
      "Agents don't interpret scripts; they follow encoded logic that enforces your exact requirements on every call.",
      "The result: fewer mistakes, consistent caller experiences, and operational reliability you can measure.",
    ],
  },
  {
    icon: Rocket,
    title: "Launch New Campaigns in Days",
    description: "Need a new number, a new brand, or a seasonal campaign? We regularly launch new campaigns within 7–14 days from kickoff.",
    details: [
      "Once your playbook is encoded, spinning up new campaigns is mainly configuration—not re-training an entire team.",
      "New locations, services, or promotions go live fast because the underlying flows and routing are already built.",
      "Your business moves quickly. Your call handling should too.",
    ],
  },
  {
    icon: Building2,
    title: "Enterprise-Grade Multi-Brand Support",
    description: "Managing multiple brands, franchises, or locations? Each one gets isolated rules, data, and call flows.",
    details: [
      "Every brand or location operates with its own scripts, routing rules, and reporting—completely isolated from the others.",
      "Add or remove brands without disrupting existing operations. Scale from one location to hundreds with the same platform.",
      "Your callers experience a seamless, branded interaction every time—regardless of which brand they're reaching.",
    ],
  },
  {
    icon: Bot,
    title: "Future-Proofed for AI",
    description: "Whether calls are answered by human agents, AI, or a mix—the same flows and rules keep everything on track.",
    details: [
      "Our platform doesn't care who executes the flow—human or AI. The encoded logic is the same either way.",
      "Start with human agents today, blend in AI for after-hours tomorrow, and go fully hybrid when you're ready.",
      "You'll never have to rebuild your call handling when technology changes. The rules persist across any execution model.",
    ],
  },
];

export default function WhyUs() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Why 24H Virtual | Fast Launch, Encoded Rules, Perfect Calls"
        description="Discover why businesses choose 24H Virtual: encoded call flows, 7-14 day campaign launches, multi-brand support, and AI-ready architecture."
        canonical="/why-24h-virtual"
      />
      <Navigation />

      {/* Hero */}
      <section className="gradient-hero pt-32 pb-20">
        <div className="container-custom">
          <motion.div
            className="max-w-3xl mx-auto text-center space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-balance">Why Choose 24H Virtual?</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Virtual reception and call handling that is fast to launch, easy to manage, and obsessively accurate.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pillars */}
      <section className="section-spacing bg-background">
        <div className="container-custom">
          <div className="space-y-12 max-w-4xl mx-auto">
            {pillars.map((pillar, index) => (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="overflow-hidden border-0 shadow-card hover:shadow-card-hover transition-shadow">
                  <CardContent className="p-8 md:p-10">
                    <div className="flex items-start gap-5 mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-secondary/10 flex items-center justify-center flex-shrink-0">
                        <pillar.icon className="w-7 h-7 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-heading mb-2">{pillar.title}</h2>
                        <p className="text-lg text-muted-foreground">{pillar.description}</p>
                      </div>
                    </div>
                    <div className="space-y-4 pl-0 md:pl-[4.75rem]">
                      {pillar.details.map((detail, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <p className="text-foreground leading-relaxed">{detail}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-spacing bg-primary text-primary-foreground">
        <div className="container-custom">
          <motion.div
            className="max-w-3xl mx-auto text-center space-y-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold">
              Ready to Launch Your Call Handling in Days?
            </h2>
            <p className="text-lg opacity-90">
              Book a strategy session and see how fast we can encode your playbook.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" variant="cta" className="text-base px-8 h-14" asChild>
                <Link to="/get-started">
                  Get Started
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8 h-14 border-white/30 text-white hover:bg-white/10" asChild>
                <Link to="/launch-estimator">Estimate Your Launch Time</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
