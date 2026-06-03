import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageCircle, PhoneForwarded, Briefcase, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ladder = [
  {
    icon: MessageCircle,
    tier: "Messages",
    service: "Message Assistant",
    from: "From $89/mo",
    description: "We answer, take a clean message, and route it to your inbox.",
  },
  {
    icon: PhoneForwarded,
    tier: "Screening + Transfers",
    service: "Virtual Receptionist",
    from: "From $149/mo",
    description: "Live receptionists screen, qualify, and warm-transfer the right calls.",
  },
  {
    icon: Briefcase,
    tier: "Admin Support",
    service: "Virtual Secretary",
    from: "From $199/mo",
    description: "Calendar, correspondence, and follow-ups handled by trained admins.",
  },
  {
    icon: Users,
    tier: "Dedicated Capacity",
    service: "Virtual Assistants",
    from: "From $1,899/mo",
    description: "A dedicated assistant or team that learns your business inside out.",
  },
];

export function PricingLadderTeaser() {
  return (
    <section className="section-spacing bg-accent/30">
      <div className="container-custom">
        <motion.div
          className="text-center max-w-2xl mx-auto mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <Badge variant="outline" className="mb-4 bg-background">Why Pricing Differs</Badge>
          <h2 className="mb-4">Pay for the level of handling you actually need</h2>
          <p className="text-lg text-muted-foreground">
            Some businesses just need messages taken. Others need screening, admin work, or a dedicated assistant. The price reflects the work, not the minute.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {ladder.map((step, i) => (
            <motion.div
              key={step.service}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="relative glass-card p-6 rounded-2xl border-border/40 hover:shadow-elevated transition-all"
            >
              <div className="absolute top-4 right-4 text-xs font-bold text-muted-foreground/40">
                0{i + 1}
              </div>
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                <step.icon className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">
                {step.tier}
              </p>
              <h3 className="font-semibold text-heading text-lg mb-2">{step.service}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                {step.description}
              </p>
              <p className="text-sm font-semibold text-heading">{step.from}</p>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-12 flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" variant="cta" className="rounded-full px-8 h-14" asChild>
            <Link to="/get-started">
              Book FREE Consultation
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="rounded-full px-8 h-14" asChild>
            <Link to="/pricing">See Full Pricing</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
